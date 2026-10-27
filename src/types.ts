export type Role = 'USER' | 'GROUP_ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';

export type LoanStatus = 'PENDING_GROUP_ADMIN' | 'PENDING_SUPER_ADMIN' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export type PaymentMode = 'UPI' | 'CASH';

export type RepaymentFrequency = 'WEEKLY' | 'MONTHLY';

export interface RepaymentInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  due_amount: number;
  paid_amount: number;
  paid_date?: string;
  payment_mode?: PaymentMode;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  recorded_by_name?: string;
  transaction_ref?: string;
  note?: string;
}

export interface RepaymentTransaction {
  id: string;
  loan_id: string;
  member_id: string;
  group_id: string;
  amount: number;
  installment_number: number;
  payment_date: string;
  previous_balance: number;
  new_balance: number;
  recorded_by_id: string;
  recorded_by_name: string;
  recorded_by_role: Role;
  payment_mode: PaymentMode;
  idempotency_key?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_id?: string;
  created_at: string;
  read_at?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  district: string;
  status: UserStatus;
  role: Role;
  group_id: string | null;
  group_name?: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  group_name: string;
  area: string;
  district: string;
  group_admin_id: string | null;
  group_admin_name?: string;
  group_admin_email?: string | null;
  group_admin_phone?: string | null;
  member_count?: number;
  created_at: string;
}

export interface LoanStatusEntry {
  status: LoanStatus;
  updated_at: string;
  updated_by_name: string;
  updated_by_role: string;
  note?: string;
}

export interface Loan {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  group_id: string;
  group_name: string;
  amount: number;
  payment_mode: PaymentMode;
  upi_email?: string;
  purpose?: string;
  status: LoanStatus;
  requested_at: string;
  status_history: LoanStatusEntry[];
  repayment_frequency?: RepaymentFrequency;
  tenure_period?: number;
  installments?: RepaymentInstallment[];
  repayments?: RepaymentTransaction[];
  total_paid?: number;
  remaining_balance?: number;
  approved_amount?: number;
  next_due_date?: string;
  sanction_date?: string;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: Role;
  text: string;
  timestamp: string;
  updated_at?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by_id?: string;
  deleted_text?: string;
  edit_history?: Array<{ text: string; edited_at: string; edited_by_id: string }>;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  author_name: string;
  created_at: string;
}

export type InvestmentFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface InvestmentContribution {
  id: string;
  investment_id: string;
  user_id: string;
  amount: number;
  contributed_at: string;
  status: 'RECORDED';
  created_at: string;
  payment_mode: 'CASH' | 'UPI';
  note?: string;
}

export interface Investment {
  id: string;
  user_id: string;
  amount_per_period: number;
  frequency: InvestmentFrequency;
  started_at: string;
  note?: string;
  status: 'ACTIVE' | 'PAUSED';
  created_at: string;
  updated_at?: string;
  contributions: InvestmentContribution[];
  total_contributed: number;
}

export interface AdminMessage {
  id: string;
  title: string;
  message: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  group_id?: string;
  created_at: string;
}

export type CrisisType = 'HEALTH' | 'DOMESTIC' | 'ACCIDENT' | 'DISASTER' | 'OTHER';

export interface SosAlert {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  group_id: string;
  group_name: string;
  crisis_type: string;
  description: string;
  amount_requested?: number;
  status: 'ACTIVE' | 'RESOLVED';
  created_at: string;
  resolved_at?: string;
  resolution_note?: string;
}

export interface AttendanceEntry {
  user_id: string;
  user_name: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
}

export interface MeetingRecord {
  id: string;
  group_id: string;
  group_name: string;
  date: string;
  topic: string;
  attendance: AttendanceEntry[];
  total_savings_collected: number;
  resolutions: string;
  created_by_name: string;
  created_at: string;
}

export type Language = 'en' | 'ta';
