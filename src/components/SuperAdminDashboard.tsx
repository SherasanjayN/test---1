import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { api } from '../api';
import { User, Group, Loan, Announcement } from '../types';
import { LoanTimeline } from './LoanTimeline';
import { GroupChat } from './GroupChat';
import { AnnouncementsFeed } from './AnnouncementsFeed';
import { AdminMessageCenter } from './AdminMessageCenter';
import { LoanEmiCalculator } from './LoanEmiCalculator';
import { SosAlertBanner } from './SosAlertBanner';
import { RepaymentLedger } from './RepaymentLedger';
import { generateLoanSanctionPdf } from '../utils/pdfGenerator';
import {
  ShieldCheck,
  Users,
  Building,
  CreditCard,
  Bell,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Send,
  MessageSquare,
  X,
  Download,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Home,
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    'home' | 'pending' | 'users' | 'groups' | 'loans' | 'calculator' | 'announcements' | 'messages'
  >('home');

  const [activeLedgerLoanId, setActiveLedgerLoanId] = useState<string | null>(null);

  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group Suggestion & Approval modal state
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [designateGroupAdmin, setDesignateGroupAdmin] = useState(false);
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupArea, setNewGroupArea] = useState('');
  const [newGroupDistrict, setNewGroupDistrict] = useState('');

  // Loan action modal / note
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sanctionNote, setSanctionNote] = useState<Record<string, string>>({});

  // Active chat modal for Super Admin
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annLoading, setAnnLoading] = useState(false);

  // User search/filter
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'REMOVED'>('ALL');

  // Loan status filter
  const [loanFilter, setLoanFilter] = useState<'ALL' | 'PENDING_SUPER_ADMIN' | 'PENDING_GROUP_ADMIN' | 'APPROVED' | 'REJECTED'>('PENDING_SUPER_ADMIN');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [pendingRes, usersRes, groupsRes, loansRes, annRes] = await Promise.all([
        api.getPendingUsers(),
        api.getUsers(),
        api.getGroups(),
        api.getLoans(),
        api.getAnnouncements(),
      ]);
      setPendingUsers(pendingRes);
      setAllUsers(usersRes);
      setGroups(groupsRes);
      setLoans(loansRes);
      setAnnouncements(annRes);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Open Approval Dialog & Auto-suggest groups
  const handleOpenApproveModal = async (u: User) => {
    setApprovingUser(u);
    setIsCreatingNewGroup(false);
    setNewGroupName(`${u.area} Magalir Kuzhu`);
    setNewGroupArea(u.area);
    setNewGroupDistrict(u.district);
    setDesignateGroupAdmin(false);

    try {
      const suggestions = await api.suggestGroups(u.area, u.district);
      const matched = [...suggestions.exact_matches, ...suggestions.district_matches];
      setSuggestedGroups(matched.length > 0 ? matched : groups);
      if (matched.length > 0) {
        setSelectedGroupId(matched[0].id);
      } else if (groups.length > 0) {
        setSelectedGroupId(groups[0].id);
      } else {
        setSelectedGroupId('');
        setIsCreatingNewGroup(true);
      }
    } catch (err) {
      setSuggestedGroups(groups);
      if (groups.length > 0) setSelectedGroupId(groups[0].id);
    }
  };

  // Submit User Approval
  const handleSubmitApproval = async () => {
    if (!approvingUser) return;

    try {
      let finalGroupId = selectedGroupId;

      if (isCreatingNewGroup) {
        if (!newGroupName.trim() || !newGroupArea.trim() || !newGroupDistrict.trim()) {
          showToast('error', language === 'ta' ? 'அனைத்து குழு விவரங்களையும் உள்ளிடவும்' : 'Please fill all group fields');
          return;
        }
        const createdGroup = await api.createGroup({
          group_name: newGroupName.trim(),
          area: newGroupArea.trim(),
          district: newGroupDistrict.trim(),
          group_admin_id: designateGroupAdmin ? approvingUser.id : undefined,
        });
        finalGroupId = createdGroup.id;
      }

      await api.approveUser(approvingUser.id, {
        group_id: finalGroupId || undefined,
        is_group_admin: designateGroupAdmin,
      });

      showToast('success', `${approvingUser.name} - ${language === 'ta' ? 'ஒப்புதல் அளிக்கப்பட்டு குழு ஒதுக்கப்பட்டது!' : 'Approved and allocated to group!'}`);
      setApprovingUser(null);
      await fetchAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve user');
    }
  };

  // Reject User
  const handleRejectUser = async (userId: string, userName: string) => {
    if (!confirm(language === 'ta' ? `${userName} விண்ணப்பத்தை நிராகரிக்க உறுதியாக உள்ளீர்களா?` : `Are you sure you want to reject ${userName}?`)) return;
    try {
      await api.rejectUser(userId);
      showToast('success', `${userName} - ${language === 'ta' ? 'விண்ணப்பம் நிராகரிக்கப்பட்டது' : 'Application rejected'}`);
      await fetchAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject user');
    }
  };

  // Loan Final Sanction (Super Admin)
  const handleSuperApproveLoan = async (loan: Loan) => {
    try {
      setActionLoading(loan.id);
      const note = sanctionNote[loan.id] || (language === 'ta' ? 'முதன்மை நிர்வாகியால் இறுதி கடன் ஒப்புதல் அளிக்கப்பட்டது.' : 'Final loan sanction approved by Super Admin.');
      await api.superApproveLoan(loan.id, note);

      showToast('success', language === 'ta' ? 'கடன் ஒப்புதல் அளிக்கப்பட்டது.' : 'Loan sanctioned successfully.');
      await fetchAllData();
    } catch (err: any) {
      showToast('error', `Failed to sanction loan: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Loan Reject (Super Admin)
  const handleSuperRejectLoan = async (loan: Loan) => {
    try {
      setActionLoading(loan.id);
      const note = sanctionNote[loan.id] || (language === 'ta' ? 'முதன்மை நிர்வாகியால் சரிபார்ப்பின் போது நிராகரிக்கப்பட்டது.' : 'Application rejected by Super Admin during central verification.');
      await api.superRejectLoan(loan.id, note);
      showToast('success', `${loan.user_name} - ${language === 'ta' ? 'கடன் நிராகரிக்கப்பட்டது.' : 'Loan application rejected.'}`);
      await fetchAllData();
    } catch (err: any) {
      showToast('error', `Failed to reject loan: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Broadcast announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;

    try {
      setAnnLoading(true);
      await api.createAnnouncement({
        title: annTitle.trim(),
        message: annMessage.trim(),
      });
      showToast('success', language === 'ta' ? 'அனைத்து உறுப்பினர்களுக்கும் பொது அறிவிப்பு வெளியிடப்பட்டது!' : 'Announcement broadcasted to all users!');
      setAnnTitle('');
      setAnnMessage('');
      await fetchAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to publish announcement');
    } finally {
      setAnnLoading(false);
    }
  };

  // Filter calculations
  const pendingSuperAdminLoans = loans.filter((l) => l.status === 'PENDING_SUPER_ADMIN');
  const approvedLoans = loans.filter((l) => l.status === 'APPROVED');
  const totalSanctionedAmount = approvedLoans.reduce((acc, l) => acc + l.amount, 0);

  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch);
    const matchesStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredLoans = loans.filter((l) => {
    if (loanFilter === 'ALL') return true;
    return l.status === loanFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="font-extrabold text-sm ml-2">
            ✕
          </button>
        </div>
      )}

      {/* High-priority Emergency SOS Alert Banner */}
      <SosAlertBanner onResolved={fetchAllData} />

      {/* Top Banner - White with Green Theme */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-amber-800 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>{t.superAdminMasterTitle}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              {t.systemTitle}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {language === 'ta' ? 'முதன்மை கணக்கு:' : 'Logged in as'}{' '}
              <span className="font-bold text-slate-900">{user?.email}</span> ({t.roleSuperAdmin})
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{t.refresh}</span>
            </button>
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
            <div className="text-amber-800 text-xs font-bold">{t.metricPendingApprovals}</div>
            <div className="text-2xl font-extrabold text-amber-900 mt-1 flex items-center justify-between">
              <span>{pendingUsers.length}</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              {language === 'ta' ? 'குழு ஒதுக்கீட்டிற்கு காத்திருப்போர்' : 'Awaiting group allocation'}
            </div>
          </div>

          <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4">
            <div className="text-sky-800 text-xs font-bold">{t.metricLoanQueue}</div>
            <div className="text-2xl font-extrabold text-sky-900 mt-1 flex items-center justify-between">
              <span>{pendingSuperAdminLoans.length}</span>
              <CreditCard className="w-5 h-5 text-sky-600" />
            </div>
            <div className="text-[11px] text-sky-700 mt-1">
              {language === 'ta' ? 'இறுதி ஒப்புதல் தேவை' : 'Tier-2 central clearance'}
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
            <div className="text-emerald-800 text-xs font-bold">{t.metricActiveGroups}</div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-1 flex items-center justify-between">
              <span>{groups.length}</span>
              <Building className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              {language === 'ta' ? 'பல்வேறு மாவட்டங்களில்' : 'Across various districts'}
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
            <div className="text-emerald-800 text-xs font-bold">{language === 'ta' ? 'வழங்கப்பட்ட மொத்த கடன்' : 'Total Sanctioned Disbursals'}</div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-1 flex items-center justify-between">
              <span>₹{totalSanctionedAmount.toLocaleString('en-IN')}</span>
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              {approvedLoans.length} {language === 'ta' ? 'கடன்கள் வழங்கப்பட்டன' : 'loans sanctioned'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab('home')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'home' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>
          <Home className="h-4 w-4" />{language === 'ta' ? 'முகப்பு' : 'Home'}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'pending'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t.pendingRegistrationsTab} ({pendingUsers.length})</span>
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
          <span>
            {t.loanSanctionTab} ({pendingSuperAdminLoans.length})
          </span>
        </button>

        <button onClick={() => setActiveTab('calculator')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'calculator' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>
          <CreditCard className="h-4 w-4" />{t.loanCalculator}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.registeredUsersTab} ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'groups'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{t.groupsDirectoryTab} ({groups.length})</span>
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
          <span>{t.broadcastTab}</span>
        </button>

        <button onClick={() => setActiveTab('messages')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === 'messages' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50'}`}>
          <Send className="h-4 w-4" />{language === 'ta' ? 'நிர்வாக செய்திகள்' : 'Admin messages'}
        </button>
      </div>

      {activeTab === 'home' && (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold text-amber-800">{language === 'ta' ? 'நிலுவை பதிவுகள்' : 'Pending registrations'}</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-950">{pendingUsers.length}</p>
            <button onClick={() => setActiveTab('pending')} className="mt-3 text-xs font-bold text-amber-900 hover:underline">{language === 'ta' ? 'பதிவுகளை மதிப்பாய்வு செய்' : 'Review registrations'}</button>
          </article>
          <article className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-xs font-semibold text-sky-800">{language === 'ta' ? 'இறுதி ஒப்புதலுக்கான கடன்கள்' : 'Loans awaiting final review'}</p>
            <p className="mt-2 text-2xl font-extrabold text-sky-950">{pendingSuperAdminLoans.length}</p>
            <button onClick={() => setActiveTab('loans')} className="mt-3 text-xs font-bold text-sky-900 hover:underline">{language === 'ta' ? 'கடன் பகுதியைத் திற' : 'Open loan review'}</button>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold text-emerald-800">{language === 'ta' ? 'குழுக்கள்' : 'Groups'}</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-950">{groups.length}</p>
            <button onClick={() => setActiveTab('groups')} className="mt-3 text-xs font-bold text-emerald-900 hover:underline">{language === 'ta' ? 'குழுக்களை நிர்வகி' : 'Manage groups'}</button>
          </article>
        </section>
      )}
      {activeTab === 'messages' && user && <AdminMessageCenter user={user} />}
      {activeTab === 'calculator' && <LoanEmiCalculator />}

      {/* TAB 1: PENDING REGISTRATIONS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.pendingRegistrationsTab} ({pendingUsers.length})
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ta'
                  ? 'விண்ணப்பதாரர் விவரங்களை சரிபார்த்து பகுதி மற்றும் மாவட்டத்தின் அடிப்படையில் குழுவை ஒதுக்குக.'
                  : 'Review applicant credentials, auto-suggest groups by Area & District, and allocate members.'}
              </p>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-xs shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <div className="font-bold text-slate-800 text-sm">
                {language === 'ta' ? 'அனைத்து புதிய பதிவுகளும் ஒதுக்கப்பட்டுவிட்டன!' : 'All registration applications have been reviewed and allocated!'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((applicant) => (
                <div
                  key={applicant.id}
                  className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{applicant.name}</h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{applicant.phone}</span>
                        <span className="text-slate-300">·</span>
                        <Mail className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{applicant.email}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {language === 'ta' ? 'பரிசீலனையில்' : 'PENDING'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="text-slate-700 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      <span className="text-slate-500 mr-1">{t.areaLocality}:</span>
                      <span className="font-bold text-slate-900">{applicant.area}</span>
                    </div>
                    <div className="text-slate-700 flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      <span className="text-slate-500 mr-1">{t.district}:</span>
                      <span className="font-bold text-slate-900">{applicant.district}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                      {language === 'ta' ? 'விண்ணப்பிக்கப்பட்ட நாள்:' : 'Applied on:'}{' '}
                      {new Date(applicant.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => handleOpenApproveModal(applicant)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t.approveMemberButton}</span>
                    </button>
                    <button
                      onClick={() => handleRejectUser(applicant.id, applicant.name)}
                      className="py-2 px-3 bg-slate-50 hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 text-xs font-bold rounded-xl transition-colors"
                    >
                      {t.rejectMemberButton}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 3-TIER LOAN APPROVALS */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.threeTierLoans}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ta'
                  ? 'கடன்கள் ₹10,000 வரை வரம்பிடப்பட்டது. முதன்மை நிர்வாகியின் இறுதி ஒப்புதல் தானியங்கி மின்னஞ்சலை உடனடியாக அனுப்பும்.'
                  : 'Loans are reviewed by the Group Admin before final Super Admin sanction.'}
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setLoanFilter('PENDING_SUPER_ADMIN')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  loanFilter === 'PENDING_SUPER_ADMIN'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'ta' ? 'இறுதி அனுமதி தேவை' : 'Needs Final Sanction'} ({pendingSuperAdminLoans.length})
              </button>
              <button
                onClick={() => setLoanFilter('PENDING_GROUP_ADMIN')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  loanFilter === 'PENDING_GROUP_ADMIN'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.loanStatusPendingGroupAdmin}
              </button>
              <button
                onClick={() => setLoanFilter('APPROVED')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  loanFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.loanStatusApproved} ({approvedLoans.length})
              </button>
              <button
                onClick={() => setLoanFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  loanFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.allStatuses} ({loans.length})
              </button>
            </div>
          </div>

          {filteredLoans.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs shadow-xs">
              {language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட வடிகட்டலில் கடன்கள் எதுவும் இல்லை.' : 'No loan applications found matching selected filter.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLoans.map((loan) => (
                <div
                  key={loan.id}
                  className={`p-5 rounded-2xl bg-white border shadow-xs space-y-4 ${
                    loan.status === 'PENDING_SUPER_ADMIN'
                      ? 'border-sky-400 ring-2 ring-sky-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-extrabold text-slate-900 flex items-center">
                          <IndianRupee className="w-5 h-5 text-emerald-600" />
                          {loan.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {loan.payment_mode === 'UPI' ? t.modeUpi : t.modeCash}
                        </span>
                        {loan.status === 'PENDING_SUPER_ADMIN' && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-900 border border-sky-300 animate-pulse">
                            {language === 'ta' ? 'இறுதி ஒப்புதல் அளிக்க தயார்' : 'Action Needed: Final Sanction'}
                          </span>
                        )}
                        {loan.status === 'APPROVED' && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {t.loanStatusApproved}
                          </span>
                        )}
                        {loan.status === 'PENDING_GROUP_ADMIN' && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {t.loanStatusPendingGroupAdmin}
                          </span>
                        )}
                        {loan.status === 'REJECTED' && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            {t.loanStatusRejected}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-800 mt-1 font-bold">
                        {loan.user_name} · {loan.group_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t.phone}: {loan.user_phone} · {t.emailAddress}: {loan.user_email}{' '}
                        {loan.upi_email && `· UPI Email: ${loan.upi_email}`}
                      </div>
                      {loan.purpose && (
                        <div className="text-xs text-slate-600 mt-1 italic font-medium">
                          {t.loanPurpose}: "{loan.purpose}"
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-medium">
                      {new Date(loan.requested_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Super Admin Action Controls */}
                  {loan.status === 'PENDING_SUPER_ADMIN' && (
                    <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-sky-950 mb-1">
                          {language === 'ta' ? 'முதன்மை நிர்வாகி ஒப்புதல் குறிப்பு:' : 'Super Admin Sanction Remark (Recorded in audit history):'}
                        </label>
                        <input
                          type="text"
                          value={sanctionNote[loan.id] || ''}
                          onChange={(e) =>
                            setSanctionNote({ ...sanctionNote, [loan.id]: e.target.value })
                          }
                          placeholder={language === 'ta' ? 'எ.கா: கொள்கையின்படி கடன் ஒப்புதல் அளிக்கப்பட்டது. நிதி விடுவிக்கப்பட்டது.' : 'e.g. Micro-loan sanctioned under credit policy. Disbursal initiated.'}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center space-x-3 pt-1">
                        <button
                          onClick={() => handleSuperApproveLoan(loan)}
                          disabled={actionLoading === loan.id}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-2 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {actionLoading === loan.id
                              ? t.sanctioningAction
                              : t.confirmSanction}
                          </span>
                        </button>

                        <button
                          onClick={() => handleSuperRejectLoan(loan)}
                          disabled={actionLoading === loan.id}
                          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-300 inline-flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t.rejectLoan}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <LoanTimeline loan={loan} />

                  {/* Sanction Actions for Approved Loans */}
                  {loan.status === 'APPROVED' && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => generateLoanSanctionPdf(loan, language)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 inline-flex items-center space-x-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>{language === 'ta' ? 'அனுமதி சான்றிதழ் PDF' : 'Sanction Certificate PDF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveLedgerLoanId(activeLedgerLoanId === loan.id ? null : loan.id)
                          }
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all inline-flex items-center space-x-1.5 ${
                            activeLedgerLoanId === loan.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{language === 'ta' ? 'தவணை கணக்கு ஏடு' : 'Repayment Ledger & Passbook'}</span>
                          {activeLedgerLoanId === loan.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-500">
                        {loan.repayment_frequency || 'WEEKLY'} · {loan.tenure_period || 10} {language === 'ta' ? 'தவணைகள்' : 'cycles'}
                      </span>
                    </div>
                  )}

                  {/* Repayment Ledger Viewer */}
                  {loan.status === 'APPROVED' && activeLedgerLoanId === loan.id && (
                    <div className="pt-4 border-t border-slate-200">
                      <RepaymentLedger
                        loan={loan}
                        canRecordPayment={true}
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

      {/* TAB 3: ALL USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.allUsers}</h2>
              <p className="text-xs text-slate-500">
                {language === 'ta' ? 'பொறுப்புகள் மற்றும் குழு தலைவி ஒதுக்கீட்டை நிர்வகிக்கவும்.' : 'Manage roles, designated group admins, and member allocations.'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t.searchUsers}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e: any) => setUserStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="ALL">{t.allStatuses}</option>
                <option value="APPROVED">{language === 'ta' ? 'அங்கீகரிக்கப்பட்டது' : 'Approved'}</option>
                <option value="PENDING">{language === 'ta' ? 'நிலுவையில்' : 'Pending'}</option>
                <option value="REJECTED">{language === 'ta' ? 'நிராகரிக்கப்பட்டது' : 'Rejected'}</option>
                <option value="REMOVED">{language === 'ta' ? 'நீக்கப்பட்டது' : 'Removed (history retained)'}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 text-emerald-950 font-bold border-b border-emerald-100">
                <tr>
                  <th className="py-3 px-3">{language === 'ta' ? 'உறுப்பினர் பெயர்' : 'Member Name'}</th>
                  <th className="py-3 px-3">{language === 'ta' ? 'தொடர்பு' : 'Contact'}</th>
                  <th className="py-3 px-3">{language === 'ta' ? 'பகுதி & மாவட்டம்' : 'Area & District'}</th>
                  <th className="py-3 px-3">{language === 'ta' ? 'ஒதுக்கப்பட்ட குழு' : 'Assigned Group'}</th>
                  <th className="py-3 px-3">{language === 'ta' ? 'பொறுப்பு' : 'Role'}</th>
                  <th className="py-3 px-3">{t.status}</th>
                  <th className="py-3 px-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3">
                      <div>{u.phone}</div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      {u.area}, {u.district}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {u.group_name || (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : u.role === 'GROUP_ADMIN'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u.role === 'SUPER_ADMIN' ? t.roleSuperAdmin : u.role === 'GROUP_ADMIN' ? t.roleGroupAdmin : t.roleMember}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : u.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.role !== 'SUPER_ADMIN' && u.status === 'APPROVED' && u.group_id && (
                        <button
                          onClick={async () => {
                            const newRole = u.role === 'GROUP_ADMIN' ? 'USER' : 'GROUP_ADMIN';
                            await api.assignUserRole(u.id, newRole);
                            showToast('success', `${u.name} - ${language === 'ta' ? 'பொறுப்பு மாற்றப்பட்டது' : 'Role updated'}`);
                            await fetchAllData();
                          }}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline ml-2"
                        >
                          {u.role === 'GROUP_ADMIN' ? (language === 'ta' ? 'உறுப்பினராக்கு' : 'Make Member') : (language === 'ta' ? 'தலைவியாக நியமி' : 'Designate Group Admin')}
                        </button>
                      )}
                      {u.role !== 'SUPER_ADMIN' && u.status === 'APPROVED' && (
                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(language === 'ta'
                              ? `${u.name} கணக்கின் செயலில் உள்ள அணுகலை நீக்கவா? நிதி பதிவுகள் பாதுகாக்கப்படும்.`
                              : `Remove ${u.name}'s active access? Their loan and financial history will be retained.`);
                            if (!confirmed) return;
                            try {
                              const result = await api.removeUser(u.id);
                              showToast('success', result.message);
                              await fetchAllData();
                            } catch (requestError) {
                              showToast('error', requestError instanceof Error ? requestError.message : 'Could not remove user.');
                            }
                          }}
                          className="ml-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
                        >
                          {language === 'ta' ? 'அணுகலை நீக்கு' : 'Remove access'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GROUPS & CHAT ROOMS */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.activeGroups}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'ta' ? 'ஒவ்வொரு குழுவிற்கும் ஒரு தலைவி மற்றும் அரட்டை அறை உண்டு.' : 'Each group has a designated Group Admin and an automatic dedicated chatroom.'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsCreatingNewGroup(true);
                setApprovingUser(null);
                setNewGroupName('');
                setNewGroupArea('');
                setNewGroupDistrict('');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.createNewGroup}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((grp) => (
              <div
                key={grp.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{grp.group_name}</h3>
                    <p className="text-xs text-slate-500 flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                      {grp.area}, {grp.district}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    {grp.member_count || 0} {t.activeMembersCount}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t.groupAdminLabel}:</span>
                    <span className="font-bold text-emerald-800">
                      {grp.group_admin_name || 'Unassigned'}
                    </span>
                  </div>
                  {grp.group_admin_phone && (
                    <div className="text-[11px] text-slate-500 flex items-center">
                      <Phone className="w-3 h-3 mr-1 text-slate-400" />
                      {grp.group_admin_phone}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => setChatGroupId(grp.id)}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold rounded-xl inline-flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'ta' ? 'குழு அரட்டை திறக்க' : 'Open Group Chat'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Group Chat Modal for Super Admin */}
          {chatGroupId && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-900">
                    {t.roleSuperAdmin} View: {groups.find((g) => g.id === chatGroupId)?.group_name}
                  </span>
                  <button
                    onClick={() => setChatGroupId(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    ✕ {t.close}
                  </button>
                </div>
                <GroupChat
                  groupId={chatGroupId}
                  groupName={groups.find((g) => g.id === chatGroupId)?.group_name}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BROADCAST ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Send className="w-4 h-4 text-emerald-600 mr-2" />
                {t.broadcastTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {t.broadcastSubtitle}
              </p>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.announcementTitleLabel}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder={t.announcementTitlePlaceholder}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.announcementMessageLabel}
                </label>
                <textarea
                  required
                  rows={4}
                  autoComplete="off"
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder={t.announcementMessagePlaceholder}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={annLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {annLoading ? t.publishingAnnouncement : t.publishAnnouncementButton}
              </button>
            </form>
          </div>

          <div className="md:col-span-2">
            <AnnouncementsFeed />
          </div>
        </div>
      )}

      {/* APPROVE & AUTO-SUGGEST MODAL - White Theme */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  <UserCheck className="w-5 h-5 text-emerald-600 mr-2" />
                  {t.allocateGroupTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  Applicant: <span className="text-slate-900 font-bold">{approvingUser.name}</span> · {approvingUser.area}, {approvingUser.district}
                </p>
              </div>
              <button
                onClick={() => setApprovingUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode selection */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setIsCreatingNewGroup(false)}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${
                  !isCreatingNewGroup
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'ta' ? 'பொருத்தமான குழுக்கள்' : 'Auto-Suggested Groups'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNewGroup(true)}
                className={`flex-1 py-1.5 font-bold rounded-lg transition-colors ${
                  isCreatingNewGroup
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + {language === 'ta' ? 'புதிய குழுவை உருவாக்கு' : `Create New Group in ${approvingUser.area}`}
              </button>
            </div>

            {!isCreatingNewGroup ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  {t.suggestedMatchingGroups}
                </label>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {suggestedGroups.map((grp) => (
                    <label
                      key={grp.id}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        selectedGroupId === grp.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{grp.group_name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {grp.area}, {grp.district} · {grp.member_count || 0} {t.activeMembersCount}
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="groupSelection"
                        checked={selectedGroupId === grp.id}
                        onChange={() => setSelectedGroupId(grp.id)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t.groupNameLabel}
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={t.groupNamePlaceholder}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{t.groupAreaLabel}</label>
                    <input
                      type="text"
                      value={newGroupArea}
                      onChange={(e) => setNewGroupArea(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">{t.groupDistrictLabel}</label>
                    <input
                      type="text"
                      value={newGroupDistrict}
                      onChange={(e) => setNewGroupDistrict(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Designate as Group Admin checkbox */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center space-x-2">
              <input
                type="checkbox"
                id="designateAdmin"
                checked={designateGroupAdmin}
                onChange={(e) => setDesignateGroupAdmin(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded bg-white border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="designateAdmin" className="text-xs text-slate-800 cursor-pointer font-medium">
                {t.designateAsGroupAdmin} (<span className="font-bold text-slate-900">{approvingUser.name}</span>)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApprovingUser(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmitApproval}
                disabled={!isCreatingNewGroup && !selectedGroupId}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {t.confirmApproval}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL (Standalone) */}
      {isCreatingNewGroup && !approvingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Building className="w-4 h-4 text-emerald-600 mr-2" />
                {t.createNewGroup}
              </h3>
              <button
                onClick={() => setIsCreatingNewGroup(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.createGroup({
                    group_name: newGroupName.trim(),
                    area: newGroupArea.trim(),
                    district: newGroupDistrict.trim(),
                  });
                  showToast('success', `${newGroupName} - ${language === 'ta' ? 'குழு உருவாக்கப்பட்டது' : 'Group created'}`);
                  setIsCreatingNewGroup(false);
                  await fetchAllData();
                } catch (err: any) {
                  showToast('error', err.message);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-bold mb-1">{t.groupNameLabel}</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t.groupNamePlaceholder}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{t.groupAreaLabel}</label>
                  <input
                    type="text"
                    required
                    value={newGroupArea}
                    onChange={(e) => setNewGroupArea(e.target.value)}
                    placeholder="e.g. Simmakkal"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{t.groupDistrictLabel}</label>
                  <input
                    type="text"
                    required
                    value={newGroupDistrict}
                    onChange={(e) => setNewGroupDistrict(e.target.value)}
                    placeholder="e.g. Madurai"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewGroup(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  {t.createGroupButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
