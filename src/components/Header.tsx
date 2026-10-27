import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { AiTechExplanationModal } from './AiTechExplanationModal';
import {
  Users,
  LogOut,
  ShieldCheck,
  UserCheck,
  User as UserIcon,
  Building2,
  Globe,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenSos?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSos }) => {
  const { user, group, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showAiModal, setShowAiModal] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: t.roleSuperAdmin,
          icon: ShieldCheck,
          className: 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold',
        };
      case 'GROUP_ADMIN':
        return {
          label: t.roleGroupAdmin,
          icon: UserCheck,
          className: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold',
        };
      default:
        return {
          label: t.roleMember,
          icon: UserIcon,
          className: 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold',
        };
    }
  };

  const badge = getRoleBadge(user?.role);
  const IconComponent = badge.icon;

  return (
    <>
      <header className="bg-white text-slate-900 border-b border-emerald-100 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">{t.systemTitle}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    {t.tamilBadge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">{t.systemSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'ta' ? 'AI தொழில்நுட்ப விளக்கம்' : 'AI Architecture'}</span>
              </button>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  aria-label="Switch to English"
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    language === 'en' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ta')}
                  aria-label="Switch to Tamil"
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    language === 'ta' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  தமிழ்
                </button>
              </div>

              {user && user.status === 'APPROVED' && onOpenSos && (
                <button
                  onClick={onOpenSos}
                  className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs border border-rose-600 transition-colors"
                >
                  <span>🚨 {language === 'ta' ? 'அவசர SOS' : 'Emergency SOS'}</span>
                </button>
              )}

              {user && (
                <div className="flex items-center space-x-2 sm:space-x-3 border-l border-slate-200 pl-2 sm:pl-3">
                  {group && (
                    <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-emerald-900">{group.group_name}</span>
                    </div>
                  )}
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <div className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg ${badge.className}`}>
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    title={t.signOut}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <AiTechExplanationModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
    </>
  );
};
