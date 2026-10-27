import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { api } from '../api';
import { Loan, User } from '../types';
import { LoanTimeline } from './LoanTimeline';
import { GroupChat } from './GroupChat';
import { AnnouncementsFeed } from './AnnouncementsFeed';
import { MeetingMinutesManager } from './MeetingMinutesManager';
import { SosAlertBanner } from './SosAlertBanner';
import { RepaymentLedger } from './RepaymentLedger';
import { AdminMessageCenter } from './AdminMessageCenter';
import { LoanEmiCalculator } from './LoanEmiCalculator';
import {
  ShieldCheck,
  CreditCard,
  IndianRupee,
  Users,
  MessageSquare,
  Bell,
  CheckCircle,
  XCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Calendar,
  BookOpen,
  Download,
  Home,
  Send,
} from 'lucide-react';

export const GroupAdminPanel: React.FC = () => {
  const { user, group } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'home' | 'loans' | 'calculator' | 'ledgers' | 'members' | 'mom' | 'chat' | 'announcements' | 'messages'>('home');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLedgerLoanId, setSelectedLedgerLoanId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansData, groupData] = await Promise.all([
        api.getLoans(),
        group?.id ? api.getGroup(group.id) : Promise.resolve(null),
      ]);
      setLoans(loansData);
      if (groupData) {
        setMembers(groupData.members || []);
      }
    } catch (err: any) {
      console.error('Error fetching Group Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [group?.id]);

  const handleApprove = async (loanId: string) => {
    try {
      setActionLoading(loanId);
      setActionMessage(null);
      const note = reviewNote[loanId] || (language === 'ta' ? 'குழு நிர்வாகியால் சரிபார்க்கப்பட்டு அங்கீகரிக்கப்பட்டது.' : 'Verified and approved by Group Admin');
      const res = await api.groupApproveLoan(loanId, note);
      setActionMessage(res.message);
      await fetchData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (loanId: string) => {
    try {
      setActionLoading(loanId);
      setActionMessage(null);
      const note = reviewNote[loanId] || (language === 'ta' ? 'குழு நிர்வாகியால் நிராகரிக்கப்பட்டது.' : 'Rejected by Group Admin');
      const res = await api.groupRejectLoan(loanId, note);
      setActionMessage(res.message);
      await fetchData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter loans
  const pendingReview = loans.filter((l) => l.status === 'PENDING_GROUP_ADMIN');
  const otherLoans = loans.filter((l) => l.status !== 'PENDING_GROUP_ADMIN');
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklyCollection = loans.reduce((total, loan) =>
    total + (loan.installments || []).reduce((sum, installment) => {
      if (!installment.paid_date || new Date(installment.paid_date) < weekStart || installment.paid_amount <= 0) return sum;
      return sum + installment.paid_amount;
    }, 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* High-priority Emergency SOS Alert Banner */}
      <SosAlertBanner onResolved={fetchData} />

      {/* Header Banner - White with Green Theme */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-emerald-700 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.groupAdminOverview}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {group?.group_name || 'Group Admin Dashboard'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                {group?.area}, {group?.district}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center">
                <Users className="w-3.5 h-3.5 mr-1 text-slate-500" />
                {members.length} {t.activeMembersCount}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {t.groupAdminLabel}: {user?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 inline-flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{t.refresh}</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center justify-between font-semibold">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab('home')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'home' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>
          <Home className="h-4 w-4" />{language === 'ta' ? 'முகப்பு' : 'Home'}
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'loans'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{t.threeTierLoans}</span>
          {pendingReview.length > 0 && (
            <span className="ml-1.5 px-2 py-0.2 rounded-full bg-amber-400 text-amber-950 font-extrabold text-[11px]">
              {pendingReview.length}
            </span>
          )}
        </button>

        <button onClick={() => setActiveTab('calculator')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'calculator' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>
          <CreditCard className="h-4 w-4" />{t.loanCalculator}
        </button>

        <button
          onClick={() => setActiveTab('ledgers')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'ledgers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{language === 'ta' ? 'தவணை கணக்கு ஏடுகள்' : 'Repayment Ledgers'}</span>
          {loans.filter((l) => l.status === 'APPROVED').length > 0 && (
            <span className="ml-1.5 px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px]">
              {loans.filter((l) => l.status === 'APPROVED').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'members'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.groupMembersList} ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mom')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'mom'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t.meetingMinutes}</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'chat'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.groupChat}</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'announcements'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t.noticeboard}</span>
        </button>

        <button onClick={() => setActiveTab('messages')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'messages' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>
          <Send className="h-4 w-4" />{language === 'ta' ? 'நிர்வாக செய்திகள்' : 'Admin messages'}
        </button>
      </div>

      {activeTab === 'home' && (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold text-amber-800">{language === 'ta' ? 'மதிப்பாய்வு நிலுவையில்' : 'Awaiting your review'}</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-950">{pendingReview.length}</p>
            <button onClick={() => setActiveTab('loans')} className="mt-3 text-xs font-bold text-amber-900 hover:underline">{language === 'ta' ? 'கடன் கோரிக்கைகளைப் பார்க்க' : 'Review loan requests'}</button>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold text-emerald-800">{language === 'ta' ? 'இந்த வார வசூல்' : 'This week’s collections'}</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-950">₹{weeklyCollection.toLocaleString('en-IN')}</p>
            <button onClick={() => setActiveTab('ledgers')} className="mt-3 text-xs font-bold text-emerald-900 hover:underline">{language === 'ta' ? 'வசூல் பதிவுகளைப் பார்க்க' : 'Open collection ledgers'}</button>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-500">{language === 'ta' ? 'செயலில் உள்ள உறுப்பினர்கள்' : 'Active group members'}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{members.length}</p>
            <button onClick={() => setActiveTab('members')} className="mt-3 text-xs font-bold text-emerald-700 hover:underline">{language === 'ta' ? 'உறுப்பினர் பட்டியல்' : 'Open member directory'}</button>
          </article>
        </section>
      )}
      {activeTab === 'calculator' && <LoanEmiCalculator />}

      {/* Tab: Loans Review Queue */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {/* Section 1: Pending Group Admin Review */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <span>{t.pendingMemberLoans}</span>
                <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
                  {pendingReview.length} {language === 'ta' ? 'விண்ணப்பங்கள்' : 'Action Required'}
                </span>
              </h2>
            </div>

            {pendingReview.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-xs">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  {language === 'ta' ? 'அனைத்து விண்ணப்பங்களும் சரிபார்க்கப்பட்டன!' : 'All member loan applications up to date!'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ta' ? 'புதிய விண்ணப்பங்கள் வரும்போது இங்கே தோன்றும்.' : 'No pending loans awaiting Group Admin review at this time.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReview.map((loan) => (
                  <div
                    key={loan.id}
                    className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-base text-slate-900">
                            {loan.user_name}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            {t.loanStatusPendingGroupAdmin}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            {loan.user_phone}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-slate-400" />
                            {loan.user_email}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-emerald-700 flex items-center justify-end">
                          <IndianRupee className="w-6 h-6" />
                          <span>{loan.amount.toLocaleString('en-IN')}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {loan.payment_mode === 'UPI' ? t.modeUpi : t.modeCash}
                        </span>
                      </div>
                    </div>

                    {loan.purpose && (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
                        <span className="font-bold text-slate-900">{t.loanPurpose}:</span> {loan.purpose}
                      </div>
                    )}

                    {/* Timeline */}
                    <LoanTimeline loan={loan} />

                    {/* Action form */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        value={reviewNote[loan.id] || ''}
                        onChange={(e) =>
                          setReviewNote((prev) => ({ ...prev, [loan.id]: e.target.value }))
                        }
                        placeholder={t.reviewNotePlaceholder}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleReject(loan.id)}
                          disabled={actionLoading === loan.id}
                          className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 transition-colors disabled:opacity-50 inline-flex items-center justify-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t.rejectLoan}</span>
                        </button>

                        <button
                          onClick={() => handleApprove(loan.id)}
                          disabled={actionLoading === loan.id}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center justify-center space-x-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{t.approveAndForward}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Other Loans history */}
          {otherLoans.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-slate-200">
              <h2 className="text-base font-bold text-slate-900">{t.allGroupLoans}</h2>
              <div className="space-y-3">
                {otherLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{loan.user_name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          (₹{loan.amount.toLocaleString('en-IN')} - {loan.payment_mode})
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          loan.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : loan.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-sky-50 text-sky-800 border-sky-300'
                        }`}
                      >
                        {loan.status === 'APPROVED'
                          ? t.loanStatusApproved
                          : loan.status === 'REJECTED'
                          ? t.loanStatusRejected
                          : t.loanStatusPendingSuperAdmin}
                      </span>
                    </div>
                    <LoanTimeline loan={loan} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Repayment Ledgers & Weekly Collection Tracking */}
      {activeTab === 'ledgers' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <span>
                    {language === 'ta'
                      ? 'குழு உறுப்பினர் கடன் தவணை கணக்கு ஏடுகள்'
                      : 'Group Member Repayment Ledgers & Collections'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'ta'
                    ? 'வாராந்திர கூட்டத்தில் சேகரிக்கப்படும் கடன் தவணை ரொக்கம் / UPI தொகையை பதிவு செய்யவும்.'
                    : 'Record weekly/monthly installment collections and print passbooks.'}
                </p>
              </div>
            </div>

            {loans.filter((l) => l.status === 'APPROVED').length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                {language === 'ta'
                  ? 'உங்கள் குழுவில் இதுவரை கடன் அனுமதிக்கப்படவில்லை.'
                  : 'No sanctioned loans available for repayment tracking in this group yet.'}
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                {/* Loan Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {loans
                    .filter((l) => l.status === 'APPROVED')
                    .map((loan) => {
                      const isSelected =
                        (selectedLedgerLoanId || loans.filter((l) => l.status === 'APPROVED')[0]?.id) === loan.id;
                      const paid = loan.total_paid || 0;
                      const bal = loan.remaining_balance !== undefined ? loan.remaining_balance : loan.amount;

                      return (
                        <div
                          key={loan.id}
                          onClick={() => setSelectedLedgerLoanId(loan.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{loan.user_name}</span>
                            <span className="text-xs font-extrabold text-emerald-700">
                              ₹{loan.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {loan.repayment_frequency || 'WEEKLY'} · {loan.tenure_period || 10} cycles
                          </div>
                          <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-200">
                            <span className="text-emerald-700 font-semibold">
                              Paid: ₹{paid.toLocaleString('en-IN')}
                            </span>
                            <span className="text-amber-700 font-semibold">
                              Bal: ₹{bal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Detailed Active Ledger Card with Recording Capability */}
                {(() => {
                  const activeLoan =
                    loans.find(
                      (l) => l.id === (selectedLedgerLoanId || loans.filter((l) => l.status === 'APPROVED')[0]?.id)
                    ) || loans.filter((l) => l.status === 'APPROVED')[0];

                  if (!activeLoan) return null;

                  return (
                    <RepaymentLedger
                      loan={activeLoan}
                      canRecordPayment={true}
                      onLoanUpdated={(updated) => {
                        setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                      }}
                    />
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Members Directory */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t.groupMembersList}</h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {members.length} {t.activeMembersCount}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 transition-all text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{m.name}</span>
                  {m.id === user?.id && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      {t.groupAdminLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-slate-600">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <span>{m.phone}</span>
                </div>
                <div className="flex items-center text-slate-600 truncate">
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <span className="truncate">{m.email}</span>
                </div>
                <div className="flex items-center text-slate-500 text-[11px]">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                  <span>{m.area}, {m.district}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Meeting Minutes (MoM) */}
      {activeTab === 'mom' && group && (
        <MeetingMinutesManager
          groupId={group.id}
          groupName={group.group_name}
          members={members}
        />
      )}

      {/* Tab: Group Chat */}
      {activeTab === 'chat' && group && (
        <GroupChat groupId={group.id} groupName={group.group_name} />
      )}

      {/* Tab: Announcements */}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'messages' && user && <AdminMessageCenter user={user} groupId={group?.id} />}
    </div>
  );
};
