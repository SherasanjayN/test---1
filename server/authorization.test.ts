import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { User } from './db';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magalir-connect-routes-'));
process.env.SHG_DATA_DIR = dataDir;
process.env.JWT_SECRET = 'authorization-route-test-secret-0123456789';

let server: Server;
let baseUrl: string;
let member: User;
let outsider: User;
let groupAdmin: User;
let superAdmin: User;
let db: typeof import('./db').db;
let memberToken: string;
let outsiderToken: string;
let groupAdminToken: string;
let superAdminToken: string;

function makeUser(id: string, role: User['role'], groupId: string | null): User {
  return {
    id,
    name: `Member ${id}`,
    phone: '9876543210',
    email: `${id}@example.test`,
    area: 'Area',
    district: 'District',
    password_hash: 'unused',
    status: 'APPROVED',
    role,
    group_id: groupId,
    created_at: new Date().toISOString(),
  };
}

async function request(pathname: string, token: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${pathname} returned ${response.status} non-JSON: ${text.slice(0, 300)}`);
  }
  return { response, data: data as any };
}

before(async () => {
  const [, auth, investmentRoutes, adminMessageRoutes, userRoutes, aiRoutes] = await Promise.all([
    import('./db'),
    import('./auth'),
    import('./routes/investmentRoutes'),
    import('./routes/adminMessageRoutes'),
    import('./routes/userRoutes'),
    import('./routes/aiRoutes'),
  ]);
  db = (await import('./db')).db;
  member = makeUser('private-member', 'USER', 'group-a');
  outsider = makeUser('other-member', 'USER', 'group-b');
  groupAdmin = makeUser('group-admin', 'GROUP_ADMIN', 'group-a');
  superAdmin = makeUser('super-admin', 'SUPER_ADMIN', null);
  for (const user of [member, outsider, groupAdmin, superAdmin]) db.addUser(user);
  db.addGroup({
    id: 'group-a', group_name: 'Group A', area: 'Area', district: 'District',
    group_admin_id: groupAdmin.id, created_at: new Date().toISOString(),
  });
  db.addGroup({
    id: 'group-b', group_name: 'Group B', area: 'Area', district: 'District',
    group_admin_id: null, created_at: new Date().toISOString(),
  });
  memberToken = auth.generateToken(member);
  outsiderToken = auth.generateToken(outsider);
  groupAdminToken = auth.generateToken(groupAdmin);
  superAdminToken = auth.generateToken(superAdmin);

  const express = (await import('express')).default;
  const app = express();
  app.use(express.json());
  app.use('/api/investments', investmentRoutes.default);
  app.use('/api/admin-messages', adminMessageRoutes.default);
  app.use('/api/users', userRoutes.default);
  app.use('/api/ai', aiRoutes.default);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('investment records, targeted admin messages, and member removal enforce ownership and preserve finance history', async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const aiAnswer = await request('/api/ai/chat', memberToken, 'POST', {
      message: 'Where can I find my group?',
      language: 'en',
      history: [],
    });
    assert.equal(aiAnswer.response.status, 200);
    assert.match(aiAnswer.data.answer, /Group A/);
    assert.doesNotMatch(aiAnswer.data.answer, /not configured/i);
  } finally {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  const createdPlan = await request('/api/investments', memberToken, 'POST', {
    amount_per_period: 500,
    frequency: 'WEEKLY',
  });
  assert.equal(createdPlan.response.status, 201);

  const invalidPlan = await request('/api/investments', memberToken, 'POST', {
    amount_per_period: 0,
    frequency: 'WEEKLY',
  });
  assert.equal(invalidPlan.response.status, 400);

  const fractionalPlan = await request('/api/investments', memberToken, 'POST', {
    amount_per_period: 1000.29,
    frequency: 'MONTHLY',
  });
  assert.equal(fractionalPlan.response.status, 201);

  const invalidPrecisionPlan = await request('/api/investments', memberToken, 'POST', {
    amount_per_period: 1000.291,
    frequency: 'MONTHLY',
  });
  assert.equal(invalidPrecisionPlan.response.status, 400);

  for (const started_at of [20260101, '2025-02-30']) {
    const invalidDatePlan = await request('/api/investments', memberToken, 'POST', {
      amount_per_period: 500,
      frequency: 'MONTHLY',
      started_at,
    });
    assert.equal(invalidDatePlan.response.status, 400);
  }

  const futurePlan = await request('/api/investments', memberToken, 'POST', {
    amount_per_period: 500,
    frequency: 'MONTHLY',
    started_at: '2999-01-01',
  });
  assert.equal(futurePlan.response.status, 400);

  const privateList = await request('/api/investments', outsiderToken);
  assert.equal(privateList.response.status, 200);
  assert.deepEqual(privateList.data, []);

  const crossAccountContribution = await request(
    `/api/investments/${createdPlan.data.id}/contributions`,
    outsiderToken,
    'POST',
    { amount: 100, payment_mode: 'CASH' }
  );
  assert.equal(crossAccountContribution.response.status, 404);

  const contribution = await request(
    `/api/investments/${createdPlan.data.id}/contributions`,
    memberToken,
    'POST',
    { amount: 125.5, payment_mode: 'UPI' }
  );
  assert.equal(contribution.response.status, 201);
  const refreshed = await request('/api/investments', memberToken);
  const refreshedPlan = refreshed.data.find((investment: { id: string }) => investment.id === createdPlan.data.id);
  assert.equal(refreshedPlan.total_contributed, 125.5);
  assert.equal(refreshedPlan.contributions.length, 1);
  assert.equal(refreshedPlan.contributions[0].amount, 125.5);

  const externalGroupBroadcast = await request('/api/admin-messages', groupAdminToken, 'POST', {
    title: 'Private group message',
    message: 'Hello',
    audience: 'GROUP',
    group_id: 'group-b',
  });
  assert.equal(externalGroupBroadcast.response.status, 403);

  const groupBroadcast = await request('/api/admin-messages', groupAdminToken, 'POST', {
    title: 'Group update',
    message: 'Meeting at 5.',
    audience: 'ALL',
    group_id: 'group-a',
  });
  assert.equal(groupBroadcast.response.status, 201);
  assert.equal((await request('/api/admin-messages', memberToken)).data.length, 1);
  assert.equal((await request('/api/admin-messages', outsiderToken)).data.length, 0);

  const selectedBroadcast = await request('/api/admin-messages', superAdminToken, 'POST', {
    title: 'Private notice',
    message: 'For one member.',
    audience: 'SELECTED',
    user_ids: [member.id],
  });
  assert.equal(selectedBroadcast.response.status, 201);
  assert.equal((await request('/api/admin-messages', outsiderToken)).data.length, 0);

  const now = new Date().toISOString();
  db.addLoan({
    id: 'retained-loan',
    user_id: member.id,
    user_name: member.name,
    user_phone: member.phone,
    user_email: member.email,
    group_id: 'group-a',
    group_name: 'Group A',
    amount: 1000,
    payment_mode: 'CASH',
    status: 'PENDING_GROUP_ADMIN',
    requested_at: now,
    status_history: [{ status: 'PENDING_GROUP_ADMIN', updated_at: now, updated_by_name: member.name, updated_by_role: member.role }],
  }, member);

  const removed = await request(`/api/users/${member.id}/remove`, superAdminToken, 'POST');
  assert.equal(removed.response.status, 200);
  assert.equal(removed.data.user.status, 'REMOVED');
  assert.equal(removed.data.user.group_id, null);
  assert.ok(db.findLoanById('retained-loan'));
  assert.equal((await request('/api/investments', memberToken)).response.status, 403);
});
