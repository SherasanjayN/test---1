import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { PendingScreen } from './components/PendingScreen';
import { MemberDashboard } from './components/MemberDashboard';
import { GroupAdminPanel } from './components/GroupAdminPanel';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { SheAiAssistant } from './components/SheAiAssistant';
import { NotificationCenter } from './components/NotificationCenter';
import { LanguageProvider, useLanguage } from './utils/translations';
import { Users, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-4 shadow-md shadow-emerald-600/20">
          <Users className="w-7 h-7" />
        </div>
        <div className="flex items-center space-x-2 text-sm font-semibold text-emerald-800">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <AuthScreen />;
  }

  // Authenticated but registration is PENDING or REJECTED
  if (user.status === 'PENDING' || user.status === 'REJECTED' || user.status === 'REMOVED') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
        <Header />
        <PendingScreen />
      </div>
    );
  }

  // Approved User Routing based on Role
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-emerald-600 selection:text-white">
      <Header />
      <main className="flex-1 pb-10">
        <SheAiAssistant />
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-2 sm:px-6 lg:px-8">
          <NotificationCenter />
        </div>
        {user.role === 'SUPER_ADMIN' && <SuperAdminDashboard />}
        {user.role === 'GROUP_ADMIN' && <GroupAdminPanel />}
        {user.role === 'USER' && <MemberDashboard />}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-medium text-slate-700">
            {t.systemTitle} · {t.tamilNaduTagline}
          </div>
          <div className="text-slate-500">
            {t.officialPortalSubtitle}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
