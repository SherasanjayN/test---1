import type { User } from './db';

interface LoanContext {
  member_name?: string;
  status: string;
  amount: number;
  total_paid: number;
  remaining_balance: number;
  repayment_frequency: string;
  next_due_date: string | null;
}

interface InvestmentContext {
  frequency: string;
  planned_amount_per_period: number;
  actual_contribution_total: number;
  contribution_count: number;
}

interface MeetingContext {
  group_name: string;
  date: string;
  topic: string;
  total_savings_collected: number;
  resolutions?: string;
  attendance_count: number;
}

interface NoticeContext {
  title: string;
  message: string;
  created_at: string;
}

export interface SheAiFallbackContext {
  group: { name: string; area: string; district: string; approved_member_count?: number } | null;
  loans: LoanContext[];
  my_private_investments: InvestmentContext[];
  my_admin_messages: NoticeContext[];
  recent_meetings: MeetingContext[];
  recent_announcements: NoticeContext[];
}

const patterns = {
  loan: /(loan|கடன்)/i,
  repayment: /(repay|repayment|installment|emi|balance|paid|payment|due|தவணை|திருப்பிச்|செலுத்த|மீதம்|கட்டணம்)/i,
  investment: /(investment|contribution|savings|முதலீடு|பங்களிப்பு|சேமிப்பு)/i,
  meeting: /(meeting|minutes|கூட்டம்|கூட்டக் குறிப்புகள்)/i,
  announcement: /(announcement|announcements|அறிவிப்பு|அறிவிப்புகள்)/i,
  adminMessage: /(admin message|message from admin|administrator message|நிர்வாகி செய்தி|நிர்வாகச் செய்தி)/i,
  group: /(my group|group name|group details|என் குழு|குழுவின் பெயர்|குழு விவரம்)/i,
  applyLoan: /(apply|application|request|how.*loan|எப்படி.*கடன்|விண்ணப்பி|விண்ணப்பம்)/i,
  navigation: /(where|how|open|find|எங்கே|எப்படி|திறக்க|செல்ல)/i,
};

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function date(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN');
}

function loanStatus(status: string, language: 'en' | 'ta'): string {
  if (language === 'ta') {
    const tamilStatuses: Record<string, string> = {
      PENDING_GROUP_ADMIN: 'குழு நிர்வாகி மதிப்பாய்வில் உள்ளது',
      PENDING_SUPER_ADMIN: 'சூப்பர் நிர்வாகி மதிப்பாய்வில் உள்ளது',
      APPROVED: 'அங்கீகரிக்கப்பட்டது',
      REJECTED: 'நிராகரிக்கப்பட்டது',
      DISBURSED: 'வழங்கப்பட்டது',
      COMPLETED: 'முழுமையாக செலுத்தப்பட்டது',
    };
    return tamilStatuses[status] ?? status.replaceAll('_', ' ').toLowerCase();
  }
  return status.replaceAll('_', ' ').toLowerCase();
}

export function getSheAiFallbackAnswer(
  question: string,
  language: 'en' | 'ta',
  user: Pick<User, 'name' | 'role' | 'status'>,
  context: SheAiFallbackContext
): string {
  const ta = language === 'ta';
  const relevantLoans = context.loans.filter(loan =>
    user.role !== 'USER' || !loan.member_name || loan.member_name === user.name
  );

  if (patterns.loan.test(question) || patterns.repayment.test(question)) {
    if (relevantLoans.length === 0) {
      return ta
        ? 'உங்கள் கணக்கில் தற்போது கடன் பதிவு எதுவும் இல்லை. கடனுக்கு விண்ணப்பிக்க My Loans பகுதிக்குச் சென்று புதிய கோரிக்கையை சமர்ப்பிக்கவும்.'
        : 'There are no loan records available for your account right now. To apply, open My Loans and submit a new request.';
    }

    return relevantLoans.slice(0, 5).map((loan, index) => {
      const owner = loan.member_name && user.role !== 'USER' ? `${loan.member_name}: ` : '';
      const due = loan.next_due_date
        ? ta ? ` அடுத்த தவணை தேதி: ${date(loan.next_due_date)}.` : ` Next due date: ${date(loan.next_due_date)}.`
        : '';
      return ta
        ? `${owner}கடன் ${index + 1}: ${loanStatus(loan.status, language)}. தொகை ${money(loan.amount)}, செலுத்தியது ${money(loan.total_paid)}, மீதம் ${money(loan.remaining_balance)}.${due}`
        : `${owner}Loan ${index + 1}: ${loanStatus(loan.status, language)}. Amount ${money(loan.amount)}, paid ${money(loan.total_paid)}, remaining ${money(loan.remaining_balance)}.${due}`;
    }).join('\n');
  }

  if (patterns.investment.test(question)) {
    if (context.my_private_investments.length === 0) {
      return ta
        ? 'உங்கள் கணக்கில் முதலீட்டுத் திட்டம் இல்லை. My Investment பகுதியில் திட்டத்தை உருவாக்கி, உண்மையில் செலுத்திய பங்களிப்புகளை பதிவு செய்யலாம்.'
        : 'You do not have an investment plan recorded yet. Open My Investment to create a plan and record contributions you have actually paid.';
    }
    return context.my_private_investments.slice(0, 5).map((investment, index) => ta
      ? `திட்டம் ${index + 1}: ${investment.frequency.toLowerCase()} திட்டமிட்ட பங்களிப்பு ${money(investment.planned_amount_per_period)}. பதிவு செய்யப்பட்ட உண்மையான பங்களிப்பு மொத்தம் ${money(investment.actual_contribution_total)} (${investment.contribution_count} பதிவுகள்).`
      : `Plan ${index + 1}: planned ${investment.frequency.toLowerCase()} contribution ${money(investment.planned_amount_per_period)}. Actual recorded contributions total ${money(investment.actual_contribution_total)} (${investment.contribution_count} records).`
    ).join('\n');
  }

  if (patterns.meeting.test(question)) {
    if (context.recent_meetings.length === 0) {
      return ta ? 'உங்கள் குழுவிற்கான கூட்டப் பதிவுகள் எதுவும் கிடைக்கவில்லை.' : 'No meeting records are available for your group.';
    }
    return context.recent_meetings.slice(0, 5).map(meeting => ta
      ? `${meeting.group_name} — ${date(meeting.date)}: ${meeting.topic}. சேகரிக்கப்பட்ட சேமிப்பு ${money(meeting.total_savings_collected)}; வருகை ${meeting.attendance_count}.${meeting.resolutions ? ` தீர்மானம்: ${meeting.resolutions}` : ''}`
      : `${meeting.group_name} — ${date(meeting.date)}: ${meeting.topic}. Savings collected ${money(meeting.total_savings_collected)}; attendance ${meeting.attendance_count}.${meeting.resolutions ? ` Resolutions: ${meeting.resolutions}` : ''}`
    ).join('\n');
  }

  if (patterns.adminMessage.test(question)) {
    if (context.my_admin_messages.length === 0) {
      return ta ? 'உங்களுக்கு நிர்வாகியிடமிருந்து புதிய செய்தி எதுவும் இல்லை.' : 'There are no admin messages available for you.';
    }
    return context.my_admin_messages.slice(0, 5).map(item =>
      `${item.title}: ${item.message}`
    ).join('\n');
  }

  if (patterns.announcement.test(question)) {
    if (context.recent_announcements.length === 0) {
      return ta ? 'தற்போது அறிவிப்புகள் எதுவும் இல்லை.' : 'There are no announcements available right now.';
    }
    return context.recent_announcements.slice(0, 5).map(item =>
      `${item.title}: ${item.message}`
    ).join('\n');
  }

  if (patterns.group.test(question)) {
    if (!context.group) {
      return ta ? 'உங்கள் கணக்கிற்கு குழு ஒதுக்கப்படவில்லை.' : 'There is no group assigned to your account.';
    }
    return ta
      ? `உங்கள் குழு ${context.group.name}. பகுதி: ${context.group.area}; மாவட்டம்: ${context.group.district}.${context.group.approved_member_count === undefined ? '' : ` அங்கீகரிக்கப்பட்ட உறுப்பினர்கள்: ${context.group.approved_member_count}.`}`
      : `Your group is ${context.group.name}. Area: ${context.group.area}; district: ${context.group.district}.${context.group.approved_member_count === undefined ? '' : ` Approved members: ${context.group.approved_member_count}.`}`;
  }

  if (patterns.applyLoan.test(question) || patterns.navigation.test(question)) {
    return ta
      ? 'Magalir Connect உதவி: கடனுக்கு My Loans பகுதியில் விண்ணப்பித்து நிலையைப் பார்க்கலாம்; உண்மையான சேமிப்பு பங்களிப்புகளை My Investment பகுதியில் பதிவு செய்யலாம்; கூட்டங்கள், நிர்வாகி செய்திகள், அறிவிப்புகளை அதற்குரிய பகுதிகளில் பார்க்கலாம். நீங்கள் உறுப்பினரா, குழு நிர்வாகியா அல்லது சூப்பர் நிர்வாகியா என்பதைச் சொல்லி, என்ன செய்ய விரும்புகிறீர்கள் என்று கேளுங்கள்.'
      : 'Magalir Connect help: apply for and track loans in My Loans; record actual savings contributions in My Investment; view meetings, admin messages, and announcements in their respective sections. Tell me whether you are a member, Group Admin, or Super Admin and what you want to do.';
  }

  if (/^(hi|hello|hey)\b|^(வணக்கம்|ஹாய்)/i.test(question.trim())) {
    return ta
      ? `வணக்கம் ${user.name}! கடன், திருப்பிச் செலுத்துதல், சேமிப்பு, கூட்டங்கள் அல்லது இந்த செயலியைப் பற்றி கேளுங்கள்.`
      : `Hello ${user.name}! Ask me about loans, repayments, savings, meetings, or how to use this app.`;
  }

  return ta
    ? 'நான் தற்போது செயலி உதவியில் கவனம் செலுத்துகிறேன். கடன், தவணை, சேமிப்பு, குழுக் கூட்டம், நிர்வாகி செய்தி அல்லது அறிவிப்பு பற்றி கேளுங்கள்.'
    : 'I can help with Magalir Connect right now. Ask me about your loans, repayments, savings, group meetings, admin messages, announcements, or how to use the app.';
}
