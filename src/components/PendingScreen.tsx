import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { Clock, RefreshCw, LogOut, CheckCircle2, MapPin, Building, Phone, Mail, User, ShieldAlert } from 'lucide-react';

export const PendingScreen: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { t, language } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setMessage(null);
      await refreshUser();
      setMessage(language === 'ta' ? 'நிலை மைய தரவுத்தளத்தில் இருந்து புதுப்பிக்கப்பட்டது.' : 'Status refreshed from central database.');
    } catch (err: any) {
      setMessage(language === 'ta' ? 'நிலையை புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Failed to refresh status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const isRejected = user?.status === 'REJECTED';
  const isRemoved = user?.status === 'REMOVED';
  const isInactive = isRejected || isRemoved;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-lg rounded-2xl border border-slate-200 text-center">
          <div className="flex justify-center mb-4">
            {isInactive ? (
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-300">
                <ShieldAlert className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-300 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            {isRemoved
              ? (language === 'ta' ? 'கணக்கு அணுகல் நீக்கப்பட்டது' : 'Account access removed')
              : isRejected ? t.rejectedScreenTitle : t.pendingScreenTitle}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {isRemoved
              ? (language === 'ta' ? 'உங்கள் செயலில் உள்ள அணுகல் நீக்கப்பட்டுள்ளது. உதவி தேவைப்பட்டால் நிர்வாகியைத் தொடர்பு கொள்ளவும்.' : 'Your active access has been removed. Contact an administrator if you need assistance.')
              : isRejected ? t.rejectedScreenSubtitle : t.pendingScreenSubtitle}
          </p>

          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
            <div className="font-semibold text-slate-700 pb-1 border-b border-slate-200">
              {t.applicantDetails}
            </div>
            <div className="flex items-center text-slate-700">
              <User className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
              <span className="text-slate-500 w-24">{t.fullName}:</span>
              <span className="font-bold text-slate-900">{user?.name}</span>
            </div>
            <div className="flex items-center text-slate-700">
              <Phone className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
              <span className="text-slate-500 w-24">{t.phone}:</span>
              <span className="font-medium text-slate-800">{user?.phone}</span>
            </div>
            <div className="flex items-center text-slate-700">
              <Mail className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
              <span className="text-slate-500 w-24">{t.emailAddress}:</span>
              <span className="font-medium text-slate-800">{user?.email}</span>
            </div>
            <div className="flex items-center text-slate-700">
              <MapPin className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
              <span className="text-slate-500 w-24">{t.areaLocality}:</span>
              <span className="font-medium text-slate-800">{user?.area}</span>
            </div>
            <div className="flex items-center text-slate-700">
              <Building className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
              <span className="text-slate-500 w-24">{t.district}:</span>
              <span className="font-medium text-slate-800">{user?.district}</span>
            </div>
          </div>

          {!isInactive && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left mb-6 space-y-1">
              <div className="font-bold flex items-center text-emerald-800">
                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                {t.nextStepWorkflowTitle}
              </div>
              <p className="text-slate-700">
                {t.nextStepWorkflowText}
              </p>
            </div>
          )}

          {message && (
            <p className="text-xs text-emerald-700 mb-4 bg-emerald-50 py-1.5 px-3 rounded-md border border-emerald-200 font-medium">
              {message}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {!isInactive && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-1 flex items-center justify-center py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t.statusChecking : t.checkStatusButton}
              </button>
            )}

            <button
              type="button"
              onClick={() => logout()}
              className="flex-1 flex items-center justify-center py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              {t.signOut}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
