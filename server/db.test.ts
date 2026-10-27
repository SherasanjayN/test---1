import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Database, Loan, User } from './db';

function createHarness() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magalir-connect-test-'));
  const database = new Database(dataDir);
  const admin: User = {
    id: 'admin-1',
    name: 'Group Admin',
    phone: '9876543210',
    email: 'admin@example.test',
    area: 'Area',
    district: 'District',
    password_hash: 'unused',
    status: 'APPROVED',
    role: 'GROUP_ADMIN',
    group_id: 'group-1',
    created_at: new Date().toISOString(),
  };
  const member: User = {
    ...admin,
    id: 'member-1',
    name: 'Member',
    email: 'member@example.test',
    role: 'USER',
  };
  database.addUser(admin);
  database.addUser(member);
  database.addGroup({
    id: 'group-1',
    group_name: 'Test SHG',
    area: 'Area',
    district: 'District',
    group_admin_id: admin.id,
    created_at: new Date().toISOString(),
  });
  return { dataDir, database, admin, member };
}

function createLoan(member: User): Loan {
  const now = new Date().toISOString();
  return {
    id: 'loan-1',
    user_id: member.id,
    user_name: member.name,
    user_phone: member.phone,
    user_email: member.email,
    group_id: 'group-1',
    group_name: 'Test SHG',
    amount: 1000,
    payment_mode: 'CASH',
    status: 'PENDING_GROUP_ADMIN',
    requested_at: now,
    status_history: [{
      status: 'PENDING_GROUP_ADMIN',
      updated_at: now,
      updated_by_name: member.name,
      updated_by_role: member.role,
    }],
    repayment_frequency: 'MONTHLY',
    tenure_period: 3,
    total_paid: 0,
    remaining_balance: 1000,
  };
}

test('loan transitions enforce the workflow and notify the next reviewer', () => {
  const { dataDir, database, admin, member } = createHarness();
  try {
    const loan = database.addLoan(createLoan(member), { id: member.id, role: member.role });
    const reviewEntry = {
      status: 'PENDING_SUPER_ADMIN' as const,
      updated_at: new Date().toISOString(),
      updated_by_name: admin.name,
      updated_by_role: admin.role,
    };
    assert.throws(
      () => database.transitionLoan(loan.id, 'APPROVED', {
        ...reviewEntry,
        status: 'APPROVED',
      }, admin, 'SUPER_ADMIN_APPROVED'),
      /Invalid loan transition/
    );
    database.transitionLoan(loan.id, 'PENDING_SUPER_ADMIN', reviewEntry, admin, 'GROUP_ADMIN_APPROVED');
    assert.equal(database.findLoanById(loan.id)?.status, 'PENDING_SUPER_ADMIN');
    assert.ok(database.getNotifications(member.id).some(notification => notification.type === 'LOAN_STATUS'));
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('repayments preserve transaction history, reject overpayment, and complete fully paid loans', () => {
  const { dataDir, database, admin, member } = createHarness();
  try {
    const loan = database.addLoan(createLoan(member), { id: member.id, role: member.role });
    const reviewedAt = new Date().toISOString();
    database.transitionLoan(loan.id, 'PENDING_SUPER_ADMIN', {
      status: 'PENDING_SUPER_ADMIN',
      updated_at: reviewedAt,
      updated_by_name: admin.name,
      updated_by_role: admin.role,
    }, admin, 'GROUP_ADMIN_APPROVED');
    database.transitionLoan(loan.id, 'APPROVED', {
      status: 'APPROVED',
      updated_at: reviewedAt,
      updated_by_name: 'Super Admin',
      updated_by_role: 'SUPER_ADMIN',
    }, { id: 'super-admin', role: 'SUPER_ADMIN' }, 'SUPER_ADMIN_APPROVED');

    const first = database.recordRepayment(loan.id, 1, {
      amount: 400,
      mode: 'CASH',
      recorded_by_id: admin.id,
      recorded_by_name: admin.name,
      recorded_by_role: admin.role,
      idempotency_key: 'repayment-key-0001',
    });
    assert.ok(first);
    assert.equal(first.loan.remaining_balance, 600);
    assert.equal(database.recordRepayment(loan.id, 1, {
      amount: 400,
      mode: 'CASH',
      recorded_by_id: admin.id,
      recorded_by_name: admin.name,
      recorded_by_role: admin.role,
      idempotency_key: 'repayment-key-0001',
    })?.duplicate, true);
    assert.throws(() => database.recordRepayment(loan.id, 2, {
      amount: 600.01,
      mode: 'CASH',
      recorded_by_id: admin.id,
      recorded_by_name: admin.name,
      recorded_by_role: admin.role,
    }), /cannot exceed the remaining loan balance/);

    const final = database.recordRepayment(loan.id, 2, {
      amount: 600,
      mode: 'UPI',
      recorded_by_id: admin.id,
      recorded_by_name: admin.name,
      recorded_by_role: admin.role,
      idempotency_key: 'repayment-key-0002',
    });
    assert.equal(final?.loan.status, 'COMPLETED');
    assert.equal(final?.loan.total_paid, 1000);
    assert.equal(database.getRepayments(loan.id).length, 2);
    assert.ok(database.getLoanAuditLogs(loan.id).some(log => log.action === 'LOAN_COMPLETED'));
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('chat edits are recorded and deletion is soft and repeat-safe', () => {
  const { dataDir, database, member } = createHarness();
  try {
    database.addMessage({
      id: 'message-1',
      group_id: 'group-1',
      sender_id: member.id,
      sender_name: member.name,
      sender_role: member.role,
      text: 'Original message',
      timestamp: new Date().toISOString(),
    });
    const updated = database.updateMessage('message-1', 'Updated message', member.id);
    assert.equal(updated?.is_edited, true);
    assert.equal(updated?.edit_history?.[0].text, 'Original message');
    const deleted = database.softDeleteMessage('message-1', 'admin-1');
    assert.equal(deleted?.is_deleted, true);
    assert.equal(deleted?.deleted_text, 'Updated message');
    assert.equal(database.softDeleteMessage('message-1', 'admin-1'), undefined);
    assert.equal(database.updateMessage('message-1', 'Changed again', member.id), undefined);
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
