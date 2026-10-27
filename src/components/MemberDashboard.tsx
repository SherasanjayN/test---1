import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { api } from '../api';
import { Loan, User, Group } from '../types';
import { LoanTimeline } from './LoanTimeline';
import { GroupChat } from './GroupChat';
import { AnnouncementsFeed } from './AnnouncementsFeed';
import { LoanEmiCalculator } from './LoanEmiCalculator';
import { EmergencySosModal } from './EmergencySosModal';
import { RepaymentLedger } from './RepaymentLedger';
import { VoiceInputModal } from './VoiceInputModal';
import { AiTechExplanationModal } from './AiTechExplanationModal';
import { InvestmentPortal } from './InvestmentPortal';
import { generateLoanSanctionPdf } from '../utils/pdfGenerator';
import {
  CreditCard,
  IndianRupee,
  MessageSquare,
  Bell,
  Users,
  Building,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  History,
  ShieldCheck,
  Phone,
  Mail,
  FileText,
  Calculator,
  AlertTriangle,
  X,
  Mic,
  Sparkles,
  Download,
  ChevronDown,
  ChevronUp,
  Home,
  TrendingUp,
} from 'lucide-react';

export const MemberDashboard: React.FC = () => {
  const { user, group } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'home' | 'loans' | 'investment' | 'chat' | 'announcements' | 'members'>('home');
  const [showLoanCalculator, setShowLoanCalculator] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [activeLedgerLoanId, setActiveLedgerLoanId] = useState<string | null>(null);
  const [voiceField, setVoiceField] = useState<'amount' | 'purpose' | null>(null);
  const [showAiExplanation, setShowAiExplanation] = useState(false);

  // Apply form state
  const [amount, setAmount] = useState<string>('5000');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH'>('UPI');
  const [repaymentFreq, setRepaymentFreq] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [tenurePeriod, setTenurePeriod] = useState<number>(10);
  const [upiEmail, setUpiEmail] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleSelectEmiPlan = (selectedAmount: number, tenure?: number) => {
    setAmount(selectedAmount.toString());
    if (tenure) {
      setTenurePeriod(tenure);
      setRepaymentFreq('MONTHLY');
    }
    setShowApplyModal(true);
    setFormError(null);
  };

  const fetchLoans = async () => {
    try {
      setLoadingLoans(true);
      const data = await api.getLoans();
      setLoans(data);
    } catch (err: any) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoadingLoans(false);
    }
  };

  const fetchGroupDetails = async () => {
    if (group?.id) {
      try {
        const data = await api.getGroup(group.id);
        setGroupMembers(data.members || []);
      } catch (err) {
        console.error('Error fetching group details:', err);
      }
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchGroupDetails();
  }, [group?.id]);

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError(language === 'ta' ? 'சரியான கடன் தொகையை உள்ளிடவும்.' : 'Please enter a valid loan amount.');
      return;
    }

    if (numAmount > 10000) {
      setFormError(t.maxCapNotice);
      return;
    }

    if (paymentMode === 'UPI') {
      if (!upiEmail.trim()) {
        setFormError(language === 'ta' ? 'UPI பரிமாற்றத்திற்கு உங்கள் பதிவு செய்யப்பட்ட மின்னஞ்சலை உள்ளிடவும்.' : 'UPI requires entering your registered email ID.');
        return;
      }
      if (upiEmail.trim().toLowerCase() !== user?.email.toLowerCase()) {
        setFormError(t.upiEmailMismatch);
        return;
      }
    }

    try {
      setSubmittingLoan(true);
      const res = await api.submitLoanRequest({
        amount: numAmount,
        payment_mode: paymentMode,
        upi_email: paymentMode === 'UPI' ? upiEmail.trim() : undefined,
        purpose: purpose.trim(),
        repayment_frequency: repaymentFreq,
        tenure_period: tenurePeriod,
      });

      setFormSuccess(res.message || t.loanSubmittedSuccess);
      setPurpose('');
      setUpiEmail('');
      await fetchLoans();
      setTimeout(() => {
        setShowApplyModal(false);
        setFormSuccess(null);
      }, 2000);
    } catch (err: any) {
      setFormError(err.message || (language === 'ta' ? 'கடன் விண்ணப்பம் தோல்வியடைந்தது.' : 'Failed to submit loan application.'));
    } finally {
      setSubmittingLoan(false);
    }
  };

  const upiMatches = upiEmail.trim().toLowerCase() === user?.email.toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Group Welcome Card - White with Green Theme */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-emerald-700 font-bold tracking-wide uppercase">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>{t.assignedGroup}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {group?.group_name || 'My Magalir Kuzhu'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                {group?.area}, {group?.district}
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center">
                <Users className="w-3.5 h-3.5 mr-1 text-slate-500" />
                {groupMembers.length} {t.activeMembersCount}
              </span>
              {group?.group_admin_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    {t.groupAdminLabel}: {group.group_admin_name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSosModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs border border-rose-600 transition-colors animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t.emergencySos}</span>
            </button>

            {activeTab === 'loans' && <button
              onClick={() => {
                setShowApplyModal(true);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.applyLoan}</span>
            </button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'}`}
        >
          <Home className="w-4 h-4" />
          <span>{language === 'ta' ? 'முகப்பு' : 'Home'}</span>
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
          <span>{t.myLoans} ({loans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('investment')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'investment'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{language === 'ta' ? 'எனது முதலீடு' : 'My Investment'}</span>
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

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'members'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.kuzhuDirectory} ({groupMembers.length})</span>
        </button>
      </div>

      {activeTab === 'home' && (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-500">{language === 'ta' ? 'எனது கடன் விண்ணப்பங்கள்' : 'My loan applications'}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{loans.length}</p>
            <button onClick={() => setActiveTab('loans')} className="mt-3 text-xs font-bold text-emerald-700 hover:underline">{language === 'ta' ? 'கடன் பகுதியைத் திற' : 'Open loans'}</button>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold text-emerald-800">{language === 'ta' ? 'குழு உறுப்பினர்கள்' : 'Group members'}</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-900">{groupMembers.length}</p>
            <button onClick={() => setActiveTab('members')} className="mt-3 text-xs font-bold text-emerald-800 hover:underline">{language === 'ta' ? 'உறுப்பினர்களைப் பார்க்க' : 'View members'}</button>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-500">{language === 'ta' ? 'தனிப்பட்ட சேமிப்பு' : 'Private savings'}</p>
            <p className="mt-2 text-sm text-slate-600">{language === 'ta' ? 'உண்மையான பங்களிப்புகளைப் பாதுகாப்பாக பதிவு செய்யுங்கள்.' : 'Track actual contributions privately.'}</p>
            <button onClick={() => setActiveTab('investment')} className="mt-3 text-xs font-bold text-emerald-700 hover:underline">{language === 'ta' ? 'முதலீட்டைப் பார்க்க' : 'Open investment'}</button>
          </article>
        </section>
      )}

      {activeTab === 'loans' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{language === 'ta' ? 'கடன் விண்ணப்பங்கள் மற்றும் திருப்பிச் செலுத்துதல்களை நிர்வகிக்கவும்.' : 'Manage loan applications and repayment history.'}</p>
          <button type="button" onClick={() => setShowLoanCalculator(current => !current)} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
            {showLoanCalculator ? (language === 'ta' ? 'கடன் வரலாற்றுக்குத் திரும்பு' : 'Back to loan history') : t.loanCalculator}
          </button>
        </div>
      )}

      {activeTab === 'loans' && showLoanCalculator && <LoanEmiCalculator onSelectPlan={handleSelectEmiPlan} />}

      {/* Tab 1: My Loans & Timeline */}
      {activeTab === 'loans' && !showLoanCalculator && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <History className="w-4 h-4 text-emerald-600 mr-2" />
              {t.loanHistoryTitle}
            </h2>
            <button
              onClick={fetchLoans}
              disabled={loadingLoans}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
            >
              {loadingLoans ? t.loading : t.refresh}
            </button>
          </div>

          {loans.length === 0 && !loadingLoans ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <IndianRupee className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{t.noLoansYet}</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {t.noLoansPrompt}
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {t.applyLoan}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-extrabold text-slate-900 flex items-center">
                          <IndianRupee className="w-5 h-5 text-emerald-600" />
                          {loan.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {loan.payment_mode === 'UPI' ? t.modeUpi : t.modeCash}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          {loan.repayment_frequency || 'WEEKLY'} ({loan.tenure_period || (loan.repayment_frequency === 'MONTHLY' ? 6 : 10)} {language === 'ta' ? 'தவணைகள்' : 'Cycles'})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {language === 'ta' ? 'விண்ணப்பிக்கப்பட்ட தேதி:' : 'Requested on:'}{' '}
                        {new Date(loan.requested_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {loan.purpose && (
                          <span className="ml-2 text-slate-700 font-medium">
                            · {loan.purpose}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold border self-start sm:self-auto ${
                          loan.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : loan.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : loan.status === 'PENDING_SUPER_ADMIN'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {loan.status === 'APPROVED'
                          ? t.loanStatusApproved
                          : loan.status === 'REJECTED'
                          ? t.loanStatusRejected
                          : loan.status === 'PENDING_SUPER_ADMIN'
                          ? t.loanStatusPendingSuperAdmin
                          : t.loanStatusPendingGroupAdmin}
                      </span>

                      {loan.status === 'APPROVED' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => generateLoanSanctionPdf(loan, language)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 inline-flex items-center space-x-1 transition-colors"
                            title="Download Official Loan Sanction Letter"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActiveLedgerLoanId(activeLedgerLoanId === loan.id ? null : loan.id)
                            }
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all inline-flex items-center space-x-1 ${
                              activeLedgerLoanId === loan.id
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            <span>{language === 'ta' ? 'கணக்கு ஏடு' : 'Passbook Ledger'}</span>
                            {activeLedgerLoanId === loan.id ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3-Step Approval Timeline */}
                  <div className="mt-4">
                    <LoanTimeline loan={loan} />
                  </div>

                  {/* Repayment Ledger Section */}
                  {loan.status === 'APPROVED' && activeLedgerLoanId === loan.id && (
                    <div className="mt-5 pt-4 border-t border-slate-200">
                      <RepaymentLedger
                        loan={loan}
                        canRecordPayment={false}
                        onLoanUpdated={(updated) => {
                          setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'investment' && <InvestmentPortal />}

      {/* Tab 3: Group Chat */}
      {activeTab === 'chat' && group && (
        <GroupChat groupId={group.id} groupName={group.group_name} />
      )}

      {/* Tab 4: Announcements Noticeboard */}
      {activeTab === 'announcements' && <AnnouncementsFeed />}

      {/* Tab 5: Group Members Directory */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.kuzhuDirectory}</h3>
              <p className="text-xs text-slate-500">
                {language === 'ta'
                  ? 'உங்கள் சுய உதவி குழுவின் பதிவு செய்யப்பட்ட அனைத்து உறுப்பினர்கள்'
                  : 'All registered and approved members of this SHG unit.'}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {groupMembers.length} {t.activeMembersCount}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupMembers.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 transition-all text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{m.name}</span>
                  {m.role === 'GROUP_ADMIN' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      {t.roleGroupAdmin}
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

      {/* Apply Loan Modal - White with Green Theme */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.applyLoanModalTitle}
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  {t.applyLoanModalSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLoan} className="space-y-4">
              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.loanAmount} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setVoiceField('amount')}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-300 inline-flex items-center space-x-1"
                    title="Speak loan amount"
                  >
                    <Mic className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'ta' ? 'குரல் வழி உள்ளீடு' : 'AI Voice Input'}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="500"
                    max="10000"
                    step="100"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t.loanAmountPlaceholder}
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t.maxCapNotice}
                </p>
              </div>

              {/* Repayment Frequency (Weekly vs Monthly) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ta' ? 'தவணை முறை (Weekly vs Monthly)' : 'Repayment Model & Cycles'} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRepaymentFreq('WEEKLY');
                      setTenurePeriod(10);
                    }}
                    className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                      repaymentFreq === 'WEEKLY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'ta' ? 'வாராந்திர தவணை' : 'Weekly EMI'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRepaymentFreq('MONTHLY');
                      setTenurePeriod(6);
                    }}
                    className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                      repaymentFreq === 'MONTHLY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {language === 'ta' ? 'மாதாந்திர தவணை' : 'Monthly EMI'}
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-600 font-semibold">
                    {repaymentFreq === 'WEEKLY'
                      ? (language === 'ta' ? 'வாரங்கள்:' : 'Weeks:')
                      : (language === 'ta' ? 'மாதங்கள்:' : 'Months:')}
                  </span>
                  <div className="flex space-x-1">
                    {(repaymentFreq === 'WEEKLY' ? [10, 12, 20, 52] : [3, 6, 9, 12]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTenurePeriod(c)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                          tenurePeriod === c
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {c}{repaymentFreq === 'WEEKLY' ? 'W' : 'M'}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-emerald-800 font-bold text-xs bg-white px-2 py-0.5 rounded border border-emerald-200">
                    ≈ ₹{Math.ceil(Number(amount || 0) / (tenurePeriod || 1))}/{repaymentFreq === 'WEEKLY' ? 'wk' : 'mo'}
                  </span>
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.disbursalMode} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                      paymentMode === 'UPI'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.modeUpi}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                      paymentMode === 'CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.modeCash}
                  </button>
                </div>
              </div>

              {/* UPI Verification Email */}
              {paymentMode === 'UPI' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t.upiEmailLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={upiEmail}
                      onChange={(e) => setUpiEmail(e.target.value)}
                      placeholder={user?.email || t.upiEmailPlaceholder}
                      className="block w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {upiEmail && (
                    <div className="text-[11px]">
                      {upiMatches ? (
                        <span className="text-emerald-700 font-bold flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t.upiEmailVerified}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-medium">
                          ⚠ {t.upiEmailMismatch} ({user?.email})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Purpose */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.loanPurpose}
                  </label>
                  <button
                    type="button"
                    onClick={() => setVoiceField('purpose')}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-300 inline-flex items-center space-x-1"
                    title="Speak loan purpose"
                  >
                    <Mic className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'ta' ? 'குரல் உள்ளீடு' : 'AI Voice Input'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t.loanPurposePlaceholder}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submittingLoan}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {submittingLoan ? t.submittingLoanApplication : t.submitLoanRequest}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency SOS Modal */}
      <EmergencySosModal
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
      />

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={voiceField !== null}
        onClose={() => setVoiceField(null)}
        fieldName={voiceField || 'amount'}
        fieldLabel={voiceField === 'amount' ? t.loanAmount : t.loanPurpose}
        onApplyValue={(val) => {
          if (voiceField === 'amount') {
            setAmount(val.toString());
          } else if (voiceField === 'purpose') {
            setPurpose(val.toString());
          }
        }}
        onOpenAiTech={() => setShowAiExplanation(true)}
      />

      {/* AI Technology Architecture Explanation Modal */}
      <AiTechExplanationModal
        isOpen={showAiExplanation}
        onClose={() => setShowAiExplanation(false)}
      />
    </div>
  );
};
