import assert from 'node:assert/strict';
import test from 'node:test';
import { getSheAiFallbackAnswer, SheAiFallbackContext } from './sheAiFallback';

const member = { name: 'Kavitha', role: 'USER' as const, status: 'APPROVED' as const };

const context: SheAiFallbackContext = {
  group: { name: 'Hope SHG', area: 'Mylapore', district: 'Chennai', approved_member_count: 12 },
  loans: [{
    status: 'APPROVED',
    amount: 5000,
    total_paid: 1500,
    remaining_balance: 3500,
    repayment_frequency: 'WEEKLY',
    next_due_date: '2026-10-30',
  }],
  my_private_investments: [{
    frequency: 'WEEKLY',
    planned_amount_per_period: 200,
    actual_contribution_total: 600,
    contribution_count: 3,
  }],
  my_admin_messages: [],
  recent_meetings: [],
  recent_announcements: [],
};

test('answers loan questions with authorized account-specific balances without Gemini', () => {
  const answer = getSheAiFallbackAnswer('What is my loan balance?', 'en', member, context);
  assert.match(answer, /remaining ₹3,500/);
  assert.match(answer, /paid ₹1,500/);
});

test('answers personal savings questions with actual contribution history', () => {
  const answer = getSheAiFallbackAnswer('எனது சேமிப்பு எவ்வளவு?', 'ta', member, context);
  assert.match(answer, /₹600/);
  assert.match(answer, /3 பதிவுகள்/);
});

test('answers general navigation questions in the selected language', () => {
  const answer = getSheAiFallbackAnswer('How can I apply for a loan?', 'en', member, {
    ...context,
    loans: [],
  });
  assert.match(answer, /My Loans/);
});

test('provides useful app-specific guidance for questions outside supported topics', () => {
  const answer = getSheAiFallbackAnswer('What can you help me with?', 'en', member, context);
  assert.match(answer, /Magalir Connect/);
  assert.doesNotMatch(answer, /not configured/i);
});
