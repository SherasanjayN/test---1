import { Router } from 'express';
import { db, Investment, InvestmentContribution } from '../db';
import { authenticate, AuthRequest, requireRole } from '../auth';

const router = Router();

function isValidAmount(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 1_000_000) {
    return false;
  }
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) <= Number.EPSILON * Math.max(1, Math.abs(cents)) * 2;
}

router.get('/', authenticate, requireRole('USER', 'GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  const investments = db.getInvestments(req.user!.id).map(investment => {
    const contributions = db.getInvestmentContributions(investment.id);
    return {
      ...investment,
      contributions,
      total_contributed: Math.round(contributions.reduce((total, item) => total + item.amount, 0) * 100) / 100,
    };
  });
  res.json(investments);
});

router.post('/', authenticate, requireRole('USER', 'GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  const { amount_per_period, frequency, started_at, note } = req.body;
  if (!isValidAmount(amount_per_period)) {
    res.status(400).json({ error: 'Contribution amount must be between ₹1 and ₹10,00,000, with at most two decimal places.' });
    return;
  }
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) {
    res.status(400).json({ error: 'Choose a daily, weekly, or monthly contribution frequency.' });
    return;
  }
  let startDate = new Date();
  if (started_at !== undefined) {
    if (typeof started_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(started_at)) {
      res.status(400).json({ error: 'Start date must be a valid date no later than today.' });
      return;
    }
    startDate = new Date(`${started_at}T00:00:00.000Z`);
    const today = new Date().toISOString().slice(0, 10);
    if (Number.isNaN(startDate.getTime()) || startDate.toISOString().slice(0, 10) !== started_at || started_at > today) {
      res.status(400).json({ error: 'Start date must be a valid date no later than today.' });
      return;
    }
  }
  if (note !== undefined && (typeof note !== 'string' || note.trim().length > 240)) {
    res.status(400).json({ error: 'The note must be 240 characters or fewer.' });
    return;
  }

  const investment: Investment = {
    id: `investment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: req.user!.id,
    amount_per_period,
    frequency,
    started_at: startDate.toISOString(),
    note: typeof note === 'string' ? note.trim() || undefined : undefined,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };
  res.status(201).json(db.createInvestment(investment, req.user!));
});

router.post('/:id/contributions', authenticate, requireRole('USER', 'GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  const investment = db.getInvestments(req.user!.id).find(item => item.id === req.params.id);
  if (!investment) {
    res.status(404).json({ error: 'Investment not found.' });
    return;
  }
  const { amount, payment_mode, note } = req.body;
  if (!isValidAmount(amount)) {
    res.status(400).json({ error: 'Contribution amount must be between ₹1 and ₹10,00,000, with at most two decimal places.' });
    return;
  }
  if (!['CASH', 'UPI'].includes(payment_mode)) {
    res.status(400).json({ error: 'Payment mode must be CASH or UPI.' });
    return;
  }
  if (note !== undefined && (typeof note !== 'string' || note.trim().length > 240)) {
    res.status(400).json({ error: 'The note must be 240 characters or fewer.' });
    return;
  }

  const contribution: InvestmentContribution = {
    id: `contribution_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    investment_id: investment.id,
    user_id: req.user!.id,
    amount,
    contributed_at: new Date().toISOString(),
    status: 'RECORDED',
    created_at: new Date().toISOString(),
    payment_mode,
    note: typeof note === 'string' ? note.trim() || undefined : undefined,
  };
  res.status(201).json(db.recordInvestmentContribution(contribution, req.user!));
});

export default router;
