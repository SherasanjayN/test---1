import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  district: string;
  password_hash: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  role: 'USER' | 'GROUP_ADMIN' | 'SUPER_ADMIN';
  group_id: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  group_name: string;
  area: string;
  district: string;
  group_admin_id: string | null;
  created_at: string;
}

export type RepaymentFrequency = 'WEEKLY' | 'MONTHLY';

export interface RepaymentInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  due_amount: number;
  paid_amount: number;
  paid_date?: string;
  payment_mode?: 'UPI' | 'CASH';
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
  recorded_by_role: User['role'];
  payment_mode: 'UPI' | 'CASH';
  idempotency_key?: string;
  notes?: string;
}

export interface RepaymentResult {
  loan: Loan;
  repayment: RepaymentTransaction;
  duplicate?: boolean;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

export interface LoanAuditLog {
  id: string;
  loan_id: string;
  actor_id: string;
  actor_role: User['role'];
  action: string;
  previous_status?: Loan['status'];
  new_status?: Loan['status'];
  reason?: string;
  created_at: string;
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

export type InvestmentFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Investment {
  id: string;
  user_id: string;
  amount_per_period: number;
  frequency: InvestmentFrequency;
  started_at: string;
  note?: string;
  status: 'ACTIVE' | 'PAUSED';
  created_at: string;
}

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

export interface AdminMessage {
  id: string;
  title: string;
  message: string;
  author_id: string;
  author_name: string;
  author_role: User['role'];
  group_id?: string;
  recipient_user_ids: string[];
  created_at: string;
}

export interface ApplicationAuditEntry {
  id: string;
  actor_id: string;
  actor_role: User['role'];
  action: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export interface LoanStatusEntry {
  status: 'PENDING_GROUP_ADMIN' | 'PENDING_SUPER_ADMIN' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
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
  payment_mode: 'UPI' | 'CASH';
  upi_email?: string;
  purpose?: string;
  status: 'PENDING_GROUP_ADMIN' | 'PENDING_SUPER_ADMIN' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requested_at: string;
  status_history: LoanStatusEntry[];
  repayment_frequency?: RepaymentFrequency;
  tenure_period?: number;
  installments?: RepaymentInstallment[];
  total_paid?: number;
  remaining_balance?: number;
  approved_amount?: number;
  next_due_date?: string;
  sanction_date?: string;
  completed_at?: string;
  is_fully_paid?: boolean;
  repayments?: RepaymentTransaction[];
}

export function generateInstallments(
  amount: number,
  frequency: RepaymentFrequency = 'WEEKLY',
  tenure?: number,
  startDate?: Date
): RepaymentInstallment[] {
  const count = tenure || (frequency === 'WEEKLY' ? 10 : 6);
  const amountCents = toCents(amount);
  const installmentCents = Math.floor(amountCents / count);
  const finalInstallmentCents = amountCents - installmentCents * (count - 1);
  const start = startDate ? new Date(startDate) : new Date();
  const installments: RepaymentInstallment[] = [];

  for (let i = 1; i <= count; i++) {
    const dueDate = new Date(start);
    if (frequency === 'WEEKLY') {
      dueDate.setDate(dueDate.getDate() + i * 7);
    } else {
      dueDate.setMonth(dueDate.getMonth() + i);
    }

    const thisDueCents = i === count ? finalInstallmentCents : installmentCents;

    installments.push({
      id: `inst_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      due_amount: thisDueCents / 100,
      paid_amount: 0,
      status: 'PENDING',
    });
  }
  return installments;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
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

interface DatabaseSchema {
  users: User[];
  groups: Group[];
  loans: Loan[];
  messages: Message[];
  announcements: Announcement[];
  sos_alerts: SosAlert[];
  meetings: MeetingRecord[];
  repayments: RepaymentTransaction[];
  loan_audit_logs: LoanAuditLog[];
  notifications: Notification[];
  investments: Investment[];
  investment_contributions: InvestmentContribution[];
  admin_messages: AdminMessage[];
  application_audit_logs: ApplicationAuditEntry[];
}

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');

export class Database {
  private readonly dataDir: string;
  private readonly dbFile: string;
  private data: DatabaseSchema = {
    users: [],
    groups: [],
    loans: [],
    messages: [],
    announcements: [],
    sos_alerts: [],
    meetings: [],
    repayments: [],
    loan_audit_logs: [],
    notifications: [],
    investments: [],
    investment_contributions: [],
    admin_messages: [],
    application_audit_logs: [],
  };

  constructor(dataDir = process.env.SHG_DATA_DIR || DEFAULT_DATA_DIR) {
    this.dataDir = path.resolve(dataDir);
    this.dbFile = path.join(this.dataDir, 'db.json');
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const databaseExists = fs.existsSync(this.dbFile);
    if (databaseExists) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.groups) this.data.groups = [];
        if (!this.data.loans) this.data.loans = [];
        if (!this.data.messages) this.data.messages = [];
        if (!this.data.announcements) this.data.announcements = [];
        if (!this.data.sos_alerts) this.data.sos_alerts = [];
        if (!this.data.meetings) this.data.meetings = [];
        if (!this.data.repayments) this.data.repayments = [];
        if (!this.data.loan_audit_logs) this.data.loan_audit_logs = [];
        if (!this.data.notifications) this.data.notifications = [];
        if (!this.data.investments) this.data.investments = [];
        if (!this.data.investment_contributions) this.data.investment_contributions = [];
        if (!this.data.admin_messages) this.data.admin_messages = [];
        if (!this.data.application_audit_logs) this.data.application_audit_logs = [];
      } catch (err) {
        throw new Error(`Failed to read database file at ${this.dbFile}; refusing to overwrite existing data.`, { cause: err });
      }
    } else this.seedDefaults();

    const adminCreated = this.ensureSuperAdmin();
    if (!databaseExists || adminCreated) this.save();
  }

  private seedDefaults() {
    this.data = {
      users: [],
      groups: [],
      loans: [],
      messages: [],
      announcements: [],
      sos_alerts: [],
      meetings: [],
      repayments: [],
      loan_audit_logs: [],
      notifications: [],
      investments: [],
      investment_contributions: [],
      admin_messages: [],
      application_audit_logs: [],
    };
  }

  private ensureSuperAdmin(): boolean {
    const adminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD;
    const adminPhone = process.env.INITIAL_SUPER_ADMIN_PHONE?.trim();
    const adminName = process.env.INITIAL_SUPER_ADMIN_NAME?.trim();
    const adminArea = process.env.INITIAL_SUPER_ADMIN_AREA?.trim();
    const adminDistrict = process.env.INITIAL_SUPER_ADMIN_DISTRICT?.trim();
    const bootstrapConfigured = !!(adminEmail || adminPassword || adminPhone || adminName || adminArea || adminDistrict);
    if (!bootstrapConfigured || this.data.users.some(user => user.email.toLowerCase() === adminEmail)) return false;
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) ||
      !adminPassword || adminPassword.length < 12 ||
      !adminPhone || !/^\d{10}$/.test(adminPhone)) {
      throw new Error('Super Admin bootstrap requires a valid email, a 12-character password, and a 10-digit phone number.');
    }

    const salt = bcrypt.genSaltSync(10);
    this.data.users.unshift({
      id: `usr_super_admin_${Date.now()}`,
      name: adminName || 'Super Admin',
      phone: adminPhone,
      email: adminEmail,
      area: adminArea || 'Not set',
      district: adminDistrict || 'Not set',
      password_hash: bcrypt.hashSync(adminPassword, salt),
      status: 'APPROVED',
      role: 'SUPER_ADMIN',
      group_id: null,
      created_at: new Date().toISOString(),
    });
    return true;
  }

  public save() {
    const tempFile = `${this.dbFile}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tempFile, this.dbFile);
    } catch (err) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      throw new Error('Failed to persist application data.', { cause: err });
    }
  }

  // Getters
  public getUsers(): User[] {
    return this.data.users;
  }

  public getGroups(): Group[] {
    return this.data.groups;
  }

  public getLoans(): Loan[] {
    return this.data.loans;
  }

  public getMessages(groupId?: string): Message[] {
    if (groupId) {
      return this.data.messages.filter(m => m.group_id === groupId);
    }
    return this.data.messages;
  }

  public findMessageById(id: string): Message | undefined {
    return this.data.messages.find(message => message.id === id);
  }

  public updateMessage(
    id: string,
    text: string,
    actorId: string
  ): Message | undefined {
    const message = this.findMessageById(id);
    if (!message || message.is_deleted) return undefined;
    message.edit_history = [
      ...(message.edit_history || []),
      { text: message.text, edited_at: new Date().toISOString(), edited_by_id: actorId },
    ];
    message.text = text;
    message.updated_at = new Date().toISOString();
    message.is_edited = true;
    this.save();
    return message;
  }

  public softDeleteMessage(id: string, actorId: string): Message | undefined {
    const message = this.findMessageById(id);
    if (!message || message.is_deleted) return undefined;
    message.deleted_text = message.text;
    message.text = '';
    message.is_deleted = true;
    message.deleted_at = new Date().toISOString();
    message.deleted_by_id = actorId;
    message.updated_at = message.deleted_at;
    this.save();
    return message;
  }

  public getAnnouncements(): Announcement[] {
    return this.data.announcements;
  }

  // User methods
  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.findUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  // Group methods
  public findGroupById(id: string): Group | undefined {
    return this.data.groups.find(g => g.id === id);
  }

  public addGroup(group: Group): Group {
    this.data.groups.push(group);
    this.save();
    return group;
  }

  public updateGroup(id: string, updates: Partial<Group>): Group | undefined {
    const group = this.findGroupById(id);
    if (!group) return undefined;
    Object.assign(group, updates);
    this.save();
    return group;
  }

  // Loan methods
  public findLoanById(id: string): Loan | undefined {
    return this.data.loans.find(l => l.id === id);
  }

  private addNotificationInMemory(notification: Omit<Notification, 'id' | 'created_at'>): Notification {
    const record: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    this.data.notifications.unshift(record);
    return record;
  }

  public addLoan(loan: Loan, actor: Pick<User, 'id' | 'role'>): Loan {
    this.data.loans.unshift(loan);
    this.data.loan_audit_logs.unshift({
      id: `loan_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      loan_id: loan.id,
      actor_id: actor.id,
      actor_role: actor.role,
      action: 'MEMBER_SUBMITTED_LOAN',
      new_status: loan.status,
      reason: loan.purpose,
      created_at: loan.requested_at,
    });
    const group = this.findGroupById(loan.group_id);
    if (group?.group_admin_id) {
      this.addNotificationInMemory({
        user_id: group.group_admin_id,
        type: 'LOAN_REQUEST',
        title: 'New loan request',
        message: `${loan.user_name} submitted a loan request for ₹${loan.amount.toLocaleString('en-IN')}.`,
        entity_id: loan.id,
      });
    }
    this.addNotificationInMemory({
      user_id: loan.user_id,
      type: 'LOAN_REQUEST',
      title: 'Loan request submitted',
      message: 'Your loan request has been submitted for Group Admin review.',
      entity_id: loan.id,
    });
    this.save();
    return loan;
  }

  public updateLoan(id: string, updates: Partial<Loan>): Loan | undefined {
    const loan = this.findLoanById(id);
    if (!loan) return undefined;
    Object.assign(loan, updates);
    this.save();
    return loan;
  }

  public transitionLoan(
    id: string,
    status: Loan['status'],
    entry: LoanStatusEntry,
    actor: Pick<User, 'id' | 'role'>,
    action: string,
    reason?: string,
    updates: Omit<Partial<Loan>, 'status' | 'status_history'> = {}
  ): Loan | undefined {
    const loan = this.findLoanById(id);
    if (!loan) return undefined;

    const allowedTransitions: Record<Loan['status'], Loan['status'][]> = {
      PENDING_GROUP_ADMIN: ['PENDING_SUPER_ADMIN', 'REJECTED'],
      PENDING_SUPER_ADMIN: ['APPROVED', 'REJECTED'],
      APPROVED: [],
      REJECTED: [],
      COMPLETED: [],
    };
    if (!allowedTransitions[loan.status].includes(status)) {
      throw new RangeError(`Invalid loan transition from ${loan.status} to ${status}.`);
    }

    const snapshot = JSON.stringify(this.data);
    const previousStatus = loan.status;
    try {
      loan.status = status;
      loan.status_history = [...(loan.status_history || []), entry];
      if (status === 'APPROVED') {
        loan.approved_amount = loan.approved_amount ?? loan.amount;
        loan.remaining_balance = loan.approved_amount;
      }
      Object.assign(loan, updates);

      this.data.loan_audit_logs.unshift({
        id: `loan_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        loan_id: id,
        actor_id: actor.id,
        actor_role: actor.role,
        action,
        previous_status: previousStatus,
        new_status: status,
        reason,
        created_at: entry.updated_at,
      });
      this.addNotificationInMemory({
        user_id: loan.user_id,
        type: status === 'REJECTED' ? 'LOAN_DENIED' : 'LOAN_STATUS',
        title: status === 'REJECTED' ? 'Loan request denied' : 'Loan status updated',
        message: reason
          ? `${action.replaceAll('_', ' ')}: ${reason}`
          : `Your loan request status is now ${status.replaceAll('_', ' ').toLowerCase()}.`,
        entity_id: id,
      });
      if (status === 'PENDING_SUPER_ADMIN') {
        this.data.users
          .filter(user => user.role === 'SUPER_ADMIN' && user.status === 'APPROVED')
          .forEach(admin => this.addNotificationInMemory({
            user_id: admin.id,
            type: 'LOAN_REVIEW',
            title: 'Loan ready for final review',
            message: `${loan.user_name}'s loan request is awaiting Super Admin review.`,
            entity_id: id,
          }));
      }
      this.save();
      return loan;
    } catch (error) {
      this.data = JSON.parse(snapshot) as DatabaseSchema;
      throw error;
    }
  }

  public getRepayments(loanId?: string): RepaymentTransaction[] {
    return loanId
      ? this.data.repayments.filter(repayment => repayment.loan_id === loanId)
      : this.data.repayments;
  }

  public getLoanAuditLogs(loanId?: string): LoanAuditLog[] {
    return loanId
      ? this.data.loan_audit_logs.filter(log => log.loan_id === loanId)
      : this.data.loan_audit_logs;
  }

  public findRepaymentByIdempotencyKey(key: string): RepaymentTransaction | undefined {
    return this.data.repayments.find(repayment => repayment.idempotency_key === key);
  }

  public getNotifications(userId: string): Notification[] {
    return this.data.notifications.filter(notification => notification.user_id === userId);
  }

  public getInvestments(userId: string): Investment[] {
    return this.data.investments.filter(investment => investment.user_id === userId);
  }

  public getInvestmentContributions(investmentId: string): InvestmentContribution[] {
    return this.data.investment_contributions.filter(contribution => contribution.investment_id === investmentId);
  }

  public createInvestment(investment: Investment, actor: Pick<User, 'id' | 'role'>): Investment {
    this.data.investments.unshift(investment);
    this.data.application_audit_logs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actor_id: actor.id,
      actor_role: actor.role,
      action: 'INVESTMENT_CREATED',
      entity_id: investment.id,
      details: `Created ${investment.frequency.toLowerCase()} contribution plan.`,
      created_at: new Date().toISOString(),
    });
    this.save();
    return investment;
  }

  public recordInvestmentContribution(contribution: InvestmentContribution, actor: Pick<User, 'id' | 'role'>): InvestmentContribution {
    this.data.investment_contributions.unshift(contribution);
    this.data.application_audit_logs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actor_id: actor.id,
      actor_role: actor.role,
      action: 'INVESTMENT_CONTRIBUTION_RECORDED',
      entity_id: contribution.id,
      details: `Recorded contribution of ₹${contribution.amount.toFixed(2)}.`,
      created_at: new Date().toISOString(),
    });
    this.save();
    return contribution;
  }

  public createAdminMessage(message: AdminMessage): AdminMessage {
    this.data.admin_messages.unshift(message);
    for (const userId of message.recipient_user_ids) {
      this.addNotificationInMemory({
        user_id: userId,
        type: 'ADMIN_MESSAGE',
        title: message.title,
        message: message.message,
        entity_id: message.id,
      });
    }
    this.data.application_audit_logs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actor_id: message.author_id,
      actor_role: message.author_role,
      action: 'ADMIN_MESSAGE_SENT',
      entity_id: message.id,
      details: `Delivered to ${message.recipient_user_ids.length} user(s).`,
      created_at: message.created_at,
    });
    this.save();
    return message;
  }

  public getAdminMessages(userId: string): AdminMessage[] {
    return this.data.admin_messages.filter(message => message.recipient_user_ids.includes(userId));
  }

  public removeUserFromActiveAccess(userId: string, actor: Pick<User, 'id' | 'role'>): User | undefined {
    const user = this.findUserById(userId);
    if (!user || user.status === 'REMOVED' || user.role === 'SUPER_ADMIN') return undefined;
    const snapshot = JSON.stringify(this.data);
    try {
      const group = user.group_id ? this.findGroupById(user.group_id) : undefined;
      if (group?.group_admin_id === user.id) group.group_admin_id = null;
      user.status = 'REMOVED';
      user.group_id = null;
      this.data.application_audit_logs.unshift({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actor_id: actor.id,
        actor_role: actor.role,
        action: 'USER_REMOVED',
        entity_id: user.id,
        details: `Removed ${user.name} from active access; financial history was retained.`,
        created_at: new Date().toISOString(),
      });
      this.save();
      return user;
    } catch (error) {
      this.data = JSON.parse(snapshot) as DatabaseSchema;
      throw error;
    }
  }

  public markNotificationRead(notificationId: string, userId: string): Notification | undefined {
    const notification = this.data.notifications.find(item =>
      item.id === notificationId && item.user_id === userId
    );
    if (!notification) return undefined;
    notification.read_at = new Date().toISOString();
    this.save();
    return notification;
  }

  public recordRepayment(
    loanId: string,
    installmentNumber: number,
    payment: {
      amount: number;
      mode: 'UPI' | 'CASH';
      recorded_by_id: string;
      recorded_by_name: string;
      recorded_by_role: User['role'];
      idempotency_key?: string;
      note?: string;
    }
  ): RepaymentResult | undefined {
    const loan = this.findLoanById(loanId);
    if (!loan) return undefined;

    if (payment.idempotency_key) {
      const previousPayment = this.findRepaymentByIdempotencyKey(payment.idempotency_key);
      if (previousPayment) {
        if (previousPayment.loan_id !== loanId || previousPayment.recorded_by_id !== payment.recorded_by_id) {
          throw new RangeError('This repayment submission key has already been used.');
        }
        const existingLoan = this.findLoanById(previousPayment.loan_id);
        if (existingLoan) return { loan: existingLoan, repayment: previousPayment, duplicate: true };
      }
    }

    const paymentCents = toCents(payment.amount);
    const previousBalanceCents = toCents(
      loan.remaining_balance ?? loan.amount - (loan.total_paid || 0)
    );
    if (paymentCents <= 0) throw new RangeError('Repayment amount must be greater than zero.');
    if (paymentCents > previousBalanceCents) {
      throw new RangeError(
        `Payment cannot exceed the remaining loan balance of ₹${(previousBalanceCents / 100).toLocaleString('en-IN')}.`
      );
    }

    if (!loan.installments || loan.installments.length === 0) {
      loan.installments = generateInstallments(
        loan.approved_amount ?? loan.amount,
        loan.repayment_frequency || 'WEEKLY',
        loan.tenure_period,
        loan.sanction_date ? new Date(loan.sanction_date) : new Date()
      );
    }

    const inst = loan.installments.find(i => i.installment_number === installmentNumber);
    if (!inst) return undefined;

    const snapshot = JSON.stringify(this.data);
    try {
      const now = new Date().toISOString();
      const transactionRef = `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newBalanceCents = previousBalanceCents - paymentCents;
      const repayment: RepaymentTransaction = {
        id: `repayment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        loan_id: loan.id,
        member_id: loan.user_id,
        group_id: loan.group_id,
        amount: paymentCents / 100,
        installment_number: installmentNumber,
        payment_date: now,
        previous_balance: previousBalanceCents / 100,
        new_balance: newBalanceCents / 100,
        recorded_by_id: payment.recorded_by_id,
        recorded_by_name: payment.recorded_by_name,
        recorded_by_role: payment.recorded_by_role,
        payment_mode: payment.mode,
        idempotency_key: payment.idempotency_key,
        notes: payment.note,
      };

      inst.paid_amount = (toCents(inst.paid_amount || 0) + paymentCents) / 100;
      inst.paid_date = now;
      inst.payment_mode = payment.mode;
      inst.recorded_by_name = payment.recorded_by_name;
      inst.note = payment.note;
      inst.transaction_ref = transactionRef;
      inst.status = toCents(inst.paid_amount) >= toCents(inst.due_amount) ? 'PAID' : 'PARTIAL';

      loan.total_paid = (toCents(loan.total_paid || 0) + paymentCents) / 100;
      loan.remaining_balance = newBalanceCents / 100;
      loan.repayments = [...(loan.repayments || []), repayment];
      this.data.repayments.unshift(repayment);
      this.data.loan_audit_logs.unshift({
        id: `loan_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        loan_id: loan.id,
        actor_id: payment.recorded_by_id,
        actor_role: payment.recorded_by_role,
        action: 'REPAYMENT_ADDED',
        previous_status: loan.status,
        new_status: newBalanceCents === 0 ? 'COMPLETED' : loan.status,
        reason: payment.note,
        created_at: now,
      });

      if (newBalanceCents === 0) {
        loan.status = 'COMPLETED';
        loan.completed_at = now;
        loan.is_fully_paid = true;
        loan.next_due_date = undefined;
        loan.status_history = [
          ...(loan.status_history || []),
          {
            status: 'COMPLETED',
            updated_at: now,
            updated_by_name: payment.recorded_by_name,
            updated_by_role: payment.recorded_by_role,
            note: 'Loan balance fully repaid.',
          },
        ];
        this.data.loan_audit_logs.unshift({
          id: `loan_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          loan_id: loan.id,
          actor_id: payment.recorded_by_id,
          actor_role: payment.recorded_by_role,
          action: 'LOAN_COMPLETED',
          previous_status: 'APPROVED',
          new_status: 'COMPLETED',
          created_at: now,
        });
      } else {
        const today = now.slice(0, 10);
        let nextDue: string | undefined;
        for (const installment of loan.installments) {
          if (installment.status === 'PAID') continue;
          if (installment.due_date < today) installment.status = 'OVERDUE';
          if (!nextDue) nextDue = installment.due_date;
        }
        loan.next_due_date = nextDue;
      }

      this.addNotificationInMemory({
        user_id: loan.user_id,
        type: newBalanceCents === 0 ? 'LOAN_COMPLETED' : 'REPAYMENT_RECORDED',
        title: newBalanceCents === 0 ? 'Loan fully repaid' : 'Repayment recorded',
        message: newBalanceCents === 0
          ? 'Congratulations! Your loan has been fully repaid.'
          : `₹${(paymentCents / 100).toLocaleString('en-IN')} repayment recorded. Remaining balance: ₹${(newBalanceCents / 100).toLocaleString('en-IN')}.`,
        entity_id: loan.id,
      });

      this.save();
      return { loan, repayment };
    } catch (error) {
      this.data = JSON.parse(snapshot) as DatabaseSchema;
      throw error;
    }
  }

  // Message methods
  public addMessage(message: Message): Message {
    this.data.messages.push(message);
    this.save();
    return message;
  }

  // Announcement methods
  public addAnnouncement(announcement: Announcement): Announcement {
    this.data.announcements.unshift(announcement);
    this.save();
    return announcement;
  }

  // SOS Emergency & Micro-Grant methods
  public getSosAlerts(groupId?: string): SosAlert[] {
    if (!this.data.sos_alerts) this.data.sos_alerts = [];
    if (groupId) {
      return this.data.sos_alerts.filter(s => s.group_id === groupId);
    }
    return this.data.sos_alerts;
  }

  public addSosAlert(alert: SosAlert): SosAlert {
    if (!this.data.sos_alerts) this.data.sos_alerts = [];
    this.data.sos_alerts.unshift(alert);
    this.save();
    return alert;
  }

  public resolveSosAlert(id: string, resolution_note: string): SosAlert | undefined {
    if (!this.data.sos_alerts) this.data.sos_alerts = [];
    const alert = this.data.sos_alerts.find(s => s.id === id);
    if (!alert) return undefined;
    alert.status = 'RESOLVED';
    alert.resolved_at = new Date().toISOString();
    alert.resolution_note = resolution_note;
    this.save();
    return alert;
  }

  // Meeting Minutes (MoM) & Attendance methods
  public getMeetings(groupId?: string): MeetingRecord[] {
    if (!this.data.meetings) this.data.meetings = [];
    if (groupId) {
      return this.data.meetings.filter(m => m.group_id === groupId);
    }
    return this.data.meetings;
  }

  public addMeeting(meeting: MeetingRecord): MeetingRecord {
    if (!this.data.meetings) this.data.meetings = [];
    this.data.meetings.unshift(meeting);
    this.save();
    return meeting;
  }
}

export const db = new Database();
