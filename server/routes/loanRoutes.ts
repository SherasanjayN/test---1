import { Router } from 'express';
import { db, Loan, LoanStatusEntry, generateInstallments, RepaymentFrequency } from '../db';
import { authenticate, requireRole, AuthRequest } from '../auth';

const router = Router();

function reviewNote(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim().slice(0, 500) || fallback : fallback;
}

// GET /api/loans - Filtered by role
router.get('/', authenticate, (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const allLoans = db.getLoans();

  if (req.user.role === 'SUPER_ADMIN') {
    res.json(allLoans);
    return;
  }

  if (req.user.role === 'GROUP_ADMIN') {
    if (!req.user.group_id) {
      res.json([]);
      return;
    }
    const groupLoans = allLoans.filter(l => l.group_id === req.user!.group_id);
    res.json(groupLoans);
    return;
  }

  // Regular member
  const userLoans = allLoans.filter(l => l.user_id === req.user!.id);
  res.json(userLoans);
});

// GET /api/loans/:id
router.get('/:id', authenticate, (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan request not found' });
    return;
  }

  // Check authorization
  if (
    req.user?.role !== 'SUPER_ADMIN' &&
    !(req.user?.role === 'GROUP_ADMIN' && req.user?.group_id === loan.group_id) &&
    req.user?.id !== loan.user_id
  ) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  res.json(loan);
});

// POST /api/loans/request - Member submits loan request
router.post('/request', authenticate, (req: AuthRequest, res) => {
  const user = req.user!;

  if (user.status !== 'APPROVED') {
    res.status(403).json({ error: 'Only approved members can request loans.' });
    return;
  }

  if (!user.group_id) {
    res.status(400).json({ error: 'You must be assigned to an active Magalir Kuzhu group before requesting a loan.' });
    return;
  }

  const group = db.findGroupById(user.group_id);
  if (!group) {
    res.status(400).json({ error: 'Assigned group could not be found.' });
    return;
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'A loan request body is required.' });
    return;
  }

  const { amount, payment_mode, upi_email, purpose, repayment_frequency, tenure_period } = req.body;

  // Validation: Amount must be number ≤ 10,000
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 500 ||
    !Number.isSafeInteger(Math.round(parsedAmount * 100)) ||
    Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 1e-7) {
    res.status(400).json({ error: 'Loan amount must be at least ₹500 and may contain no more than two decimal places.' });
    return;
  }

  if (parsedAmount > 10000) {
    res.status(400).json({ error: 'Loan amount cannot exceed the ₹10,000 cap per Magalir Kuzhu regulations.' });
    return;
  }

  // Payment mode check
  if (!['UPI', 'CASH'].includes(payment_mode)) {
    res.status(400).json({ error: 'Disbursal mode must be either UPI or CASH.' });
    return;
  }

  // Repayment model: WEEKLY vs MONTHLY
  if (repayment_frequency !== undefined && repayment_frequency !== 'WEEKLY' && repayment_frequency !== 'MONTHLY') {
    res.status(400).json({ error: 'Repayment frequency must be WEEKLY or MONTHLY.' });
    return;
  }
  const freq: RepaymentFrequency = repayment_frequency === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY';
  const tenure = tenure_period === undefined ? (freq === 'WEEKLY' ? 10 : 6) : Number(tenure_period);
  const allowedTenures = freq === 'WEEKLY' ? [10, 12, 20, 52] : [3, 6, 9, 12];
  if (!Number.isSafeInteger(tenure) || !allowedTenures.includes(tenure)) {
    res.status(400).json({ error: `Invalid ${freq.toLowerCase()} repayment tenure.` });
    return;
  }

  if (purpose !== undefined && (typeof purpose !== 'string' || purpose.length > 1000)) {
    res.status(400).json({ error: 'Loan purpose must be a text value of at most 1,000 characters.' });
    return;
  }

  // If UPI: require entering and verifying registered email ID
  if (payment_mode === 'UPI') {
    if (!upi_email || typeof upi_email !== 'string') {
      res.status(400).json({ error: 'UPI payment requires entering your registered email ID for verification.' });
      return;
    }

    if (upi_email.trim().toLowerCase() !== user.email.toLowerCase()) {
      res.status(400).json({
        error: `UPI verification failed: Entered email does not match your registered email address (${user.email}).`,
      });
      return;
    }
  }

  const now = new Date().toISOString();
  const initialHistory: LoanStatusEntry = {
    status: 'PENDING_GROUP_ADMIN',
    updated_at: now,
    updated_by_name: user.name,
    updated_by_role: 'USER',
    note: `Loan requested for ₹${parsedAmount.toLocaleString('en-IN')} via ${payment_mode} (${freq} repayment across ${tenure} cycles)${
      payment_mode === 'UPI' ? ' (UPI ID verified: ' + upi_email.trim() + ')' : ' (Cash at group meeting)'
    }${purpose ? ' - Purpose: ' + purpose.trim() : ''}`,
  };

  const newLoan: Loan = {
    id: 'loan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    user_id: user.id,
    user_name: user.name,
    user_phone: user.phone,
    user_email: user.email,
    group_id: group.id,
    group_name: group.group_name,
    amount: parsedAmount,
    payment_mode,
    upi_email: payment_mode === 'UPI' ? upi_email.trim().toLowerCase() : undefined,
    purpose: purpose ? purpose.trim() : '',
    status: 'PENDING_GROUP_ADMIN',
    requested_at: now,
    status_history: [initialHistory],
    repayment_frequency: freq,
    tenure_period: tenure,
    total_paid: 0,
    remaining_balance: parsedAmount,
  };

  db.addLoan(newLoan, { id: user.id, role: user.role });

  res.status(201).json({
    message: 'Loan application submitted successfully. Forwarded to your Group Admin for first-tier review.',
    loan: newLoan,
  });
});

// POST /api/loans/:id/group-approve - Group Admin review
router.post('/:id/group-approve', authenticate, requireRole('GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  // Ensure group admin is reviewing their own group's member
  if (req.user?.role === 'GROUP_ADMIN' && req.user?.group_id !== loan.group_id) {
    res.status(403).json({ error: 'You can only review loan requests for your own group.' });
    return;
  }

  if (loan.status !== 'PENDING_GROUP_ADMIN') {
    res.status(400).json({ error: `Cannot approve from current state: ${loan.status}` });
    return;
  }

  const now = new Date().toISOString();
  const note = reviewNote(
    req.body?.note,
    'Approved by Group Admin. Forwarded to Super Admin for final sanction.'
  );

  const historyEntry: LoanStatusEntry = {
    status: 'PENDING_SUPER_ADMIN',
    updated_at: now,
    updated_by_name: req.user!.name,
    updated_by_role: req.user!.role,
    note,
  };

  const updated = db.transitionLoan(
    loan.id,
    'PENDING_SUPER_ADMIN',
    historyEntry,
    { id: req.user!.id, role: req.user!.role },
    `${req.user!.role}_APPROVED`,
    note
  );

  res.json({
    message: 'Loan approved by Group Admin and forwarded to Super Admin.',
    loan: updated,
  });
});

// POST /api/loans/:id/group-reject - Group Admin rejects
router.post('/:id/group-reject', authenticate, requireRole('GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  if (req.user?.role === 'GROUP_ADMIN' && req.user?.group_id !== loan.group_id) {
    res.status(403).json({ error: 'You can only review loan requests for your own group.' });
    return;
  }

  if (loan.status !== 'PENDING_GROUP_ADMIN') {
    res.status(409).json({ error: `Cannot reject a loan from current state: ${loan.status}.` });
    return;
  }

  const now = new Date().toISOString();
  const note = reviewNote(
    req.body?.note,
    `Rejected by ${req.user!.role === 'GROUP_ADMIN' ? 'Group Admin' : 'Super Admin'} during group verification.`
  );

  const historyEntry: LoanStatusEntry = {
    status: 'REJECTED',
    updated_at: now,
    updated_by_name: req.user!.name,
    updated_by_role: req.user!.role,
    note,
  };

  const updated = db.transitionLoan(
    loan.id,
    'REJECTED',
    historyEntry,
    { id: req.user!.id, role: req.user!.role },
    `${req.user!.role}_DENIED`,
    note
  );

  res.json({
    message: 'Loan application was rejected.',
    loan: updated,
  });
});

// POST /api/loans/:id/super-approve - Super Admin final sanction
router.post('/:id/super-approve', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  if (loan.status !== 'PENDING_SUPER_ADMIN') {
    res.status(409).json({ error: `Only loans reviewed by a Group Admin can be sanctioned. Current status: ${loan.status}.` });
    return;
  }

  const now = new Date().toISOString();
  const note = reviewNote(
    req.body?.note,
    'Final loan sanction granted by Super Admin. Funds released for disbursal.'
  );

  const historyEntry: LoanStatusEntry = {
    status: 'APPROVED',
    updated_at: now,
    updated_by_name: req.user!.name,
    updated_by_role: 'SUPER_ADMIN',
    note,
  };

  const installments = loan.installments && loan.installments.length > 0
    ? loan.installments
    : generateInstallments(loan.amount, loan.repayment_frequency || 'WEEKLY', loan.tenure_period);

  const updated = db.transitionLoan(
    loan.id,
    'APPROVED',
    historyEntry,
    { id: req.user!.id, role: req.user!.role },
    'SUPER_ADMIN_APPROVED',
    note,
    {
      sanction_date: now,
      installments,
      total_paid: loan.total_paid || 0,
      remaining_balance: loan.approved_amount ?? loan.amount,
      next_due_date: installments[0]?.due_date,
    }
  );
  if (!updated) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  res.json({
    message: 'Loan sanctioned successfully.',
    loan: updated,
  });
});

// POST /api/loans/:id/super-reject - Super Admin rejects
router.post('/:id/super-reject', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  if (loan.status !== 'PENDING_SUPER_ADMIN') {
    res.status(409).json({ error: `Only loans awaiting Super Admin review can be rejected. Current status: ${loan.status}.` });
    return;
  }

  const now = new Date().toISOString();
  const note = reviewNote(req.body?.note, 'Application rejected by Super Admin during central review.');

  const historyEntry: LoanStatusEntry = {
    status: 'REJECTED',
    updated_at: now,
    updated_by_name: req.user!.name,
    updated_by_role: 'SUPER_ADMIN',
    note,
  };

  const updated = db.transitionLoan(
    loan.id,
    'REJECTED',
    historyEntry,
    { id: req.user!.id, role: req.user!.role },
    'SUPER_ADMIN_DENIED',
    note
  );

  res.json({
    message: 'Loan application was rejected by Super Admin.',
    loan: updated,
  });
});

// POST /api/loans/:id/repay - Record installment repayment (Group Admin or Super Admin)
router.post('/:id/repay', authenticate, requireRole('GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  if (loan.status !== 'APPROVED') {
    res.status(400).json({ error: 'Cannot record repayments on un-sanctioned loans.' });
    return;
  }

  if (req.user?.role === 'GROUP_ADMIN' && req.user?.group_id !== loan.group_id) {
    res.status(403).json({ error: 'You can only record repayments for members of your own group.' });
    return;
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'A repayment request body is required.' });
    return;
  }

  const { installment_number, amount, payment_mode, note, idempotency_key } = req.body;
  const numInst = Number(installment_number);
  const numAmount = Number(amount);

  if (!Number.isSafeInteger(numInst) || numInst <= 0) {
    res.status(400).json({ error: 'Invalid installment cycle number.' });
    return;
  }

  if (!Number.isFinite(numAmount) || numAmount <= 0 ||
    !Number.isSafeInteger(Math.round(numAmount * 100)) ||
    Math.abs(numAmount * 100 - Math.round(numAmount * 100)) > 1e-7) {
    res.status(400).json({ error: 'Please enter a valid repayment amount with no more than two decimal places.' });
    return;
  }

  if (payment_mode !== 'UPI' && payment_mode !== 'CASH') {
    res.status(400).json({ error: 'Payment mode must be UPI or CASH.' });
    return;
  }

  if (typeof idempotency_key !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotency_key)) {
    res.status(400).json({ error: 'Invalid repayment submission key.' });
    return;
  }

  const keyMatch = db.findRepaymentByIdempotencyKey(idempotency_key);
  if (keyMatch && (keyMatch.loan_id !== loan.id || keyMatch.recorded_by_id !== req.user!.id)) {
    res.status(409).json({ error: 'This repayment submission key has already been used.' });
    return;
  }

  const noteText = typeof note === 'string' ? note.trim().slice(0, 500) : undefined;
  let result;
  try {
    result = db.recordRepayment(loan.id, numInst, {
      amount: numAmount,
      mode: payment_mode,
      recorded_by_id: req.user!.id,
      recorded_by_name: req.user!.name,
      recorded_by_role: req.user!.role,
      idempotency_key,
      note: noteText,
    });
  } catch (error) {
    if (error instanceof RangeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  if (!result) {
    res.status(400).json({ error: 'Failed to record installment payment.' });
    return;
  }

  res.json({
    message: result.duplicate
      ? 'This repayment was already recorded. The existing transaction is shown below.'
      : `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded successfully for Cycle #${numInst}.`,
    loan: result.loan,
    repayment: result.repayment,
    duplicate: result.duplicate ?? false,
  });
});

// GET /api/loans/:id/ledger - Get full repayment ledger
router.get('/:id/ledger', authenticate, (req: AuthRequest, res) => {
  const loan = db.findLoanById(req.params.id);
  if (!loan) {
    res.status(404).json({ error: 'Loan not found.' });
    return;
  }

  if (
    req.user?.role !== 'SUPER_ADMIN' &&
    !(req.user?.role === 'GROUP_ADMIN' && req.user?.group_id === loan.group_id) &&
    req.user?.id !== loan.user_id
  ) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  // Ensure installments exist if approved
  if (loan.status === 'APPROVED' && (!loan.installments || loan.installments.length === 0)) {
    loan.installments = generateInstallments(loan.amount, loan.repayment_frequency || 'WEEKLY', loan.tenure_period);
    loan.total_paid = 0;
    loan.remaining_balance = loan.amount;
    loan.next_due_date = loan.installments[0]?.due_date;
    db.save();
  }

  res.json({
    loan_id: loan.id,
    user_name: loan.user_name,
    amount: loan.amount,
    frequency: loan.repayment_frequency || 'WEEKLY',
    total_paid: loan.total_paid || 0,
    remaining_balance: loan.remaining_balance !== undefined ? loan.remaining_balance : loan.amount,
    next_due_date: loan.next_due_date,
    installments: loan.installments || [],
    repayments: db.getRepayments(loan.id),
    audit_log: db.getLoanAuditLogs(loan.id),
  });
});

export default router;
