import React from 'react';
import { Loan } from '../types';
import { useLanguage } from '../utils/translations';
import { Check, Clock, XCircle, Bell } from 'lucide-react';

interface LoanTimelineProps {
  loan: Loan;
}

export const LoanTimeline: React.FC<LoanTimelineProps> = ({ loan }) => {
  const { t, language } = useLanguage();

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' | 'rejected' => {
    if (loan.status === 'REJECTED') {
      const lastEntry = loan.status_history[loan.status_history.length - 1];
      if (lastEntry?.updated_by_role === 'GROUP_ADMIN' && stepIndex === 2) return 'rejected';
      if (lastEntry?.updated_by_role === 'SUPER_ADMIN' && stepIndex === 3) return 'rejected';
      if (stepIndex === 1) return 'completed';
      return 'upcoming';
    }

    if (stepIndex === 1) {
      return 'completed';
    }
    if (stepIndex === 2) {
      if (loan.status === 'PENDING_GROUP_ADMIN') return 'current';
      if (loan.status === 'PENDING_SUPER_ADMIN' || loan.status === 'APPROVED') return 'completed';
      return 'upcoming';
    }
    if (stepIndex === 3) {
      if (loan.status === 'PENDING_SUPER_ADMIN') return 'current';
      if (loan.status === 'APPROVED') return 'completed';
      return 'upcoming';
    }
    return 'upcoming';
  };

  const steps = [
    {
      index: 1,
      title: t.stepMemberApp,
      subtitle: `₹${loan.amount.toLocaleString('en-IN')} via ${loan.payment_mode === 'UPI' ? t.modeUpi : t.modeCash}${
        loan.payment_mode === 'UPI' ? ' (' + (loan.upi_email || loan.user_email) + ')' : ''
      }`,
      state: getStepStatus(1),
    },
    {
      index: 2,
      title: t.stepGroupAdminReview,
      subtitle: t.tier1GroupVerification,
      state: getStepStatus(2),
    },
    {
      index: 3,
      title: t.stepSuperAdminSanction,
      subtitle: t.tier2CentralClearance,
      state: getStepStatus(3),
    },
  ];

  const getLocalizedRole = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return t.roleSuperAdmin;
      case 'GROUP_ADMIN':
        return t.roleGroupAdmin;
      default:
        return t.roleMember;
    }
  };

  const getLocalizedStatus = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return t.loanStatusApproved;
      case 'REJECTED':
        return t.loanStatusRejected;
      case 'PENDING_SUPER_ADMIN':
        return t.loanStatusPendingSuperAdmin;
      default:
        return t.loanStatusPendingGroupAdmin;
    }
  };

  return (
    <div className="py-2">
      {/* 3-Step Visual Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            return (
              <React.Fragment key={step.index}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                      step.state === 'completed'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : step.state === 'current'
                        ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                        : step.state === 'rejected'
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-500'
                    }`}
                  >
                    {step.state === 'completed' ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : step.state === 'rejected' ? (
                      <XCircle className="w-4 h-4" />
                    ) : step.state === 'current' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      step.index
                    )}
                  </div>
                  <div className="text-center mt-2 px-1">
                    <div
                      className={`text-xs font-bold ${
                        step.state === 'completed'
                          ? 'text-emerald-800'
                          : step.state === 'current'
                          ? 'text-amber-800'
                          : step.state === 'rejected'
                          ? 'text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                      {step.subtitle}
                    </div>
                  </div>
                </div>

                {!isLast && (
                  <div
                    className={`h-1 flex-1 mb-7 transition-colors rounded-full ${
                      step.state === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Disbursal & Sanction Status Notice */}
      {loan.status === 'APPROVED' && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-start space-x-2">
          <Bell className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-800">
              {language === 'ta' ? 'கடன் ஒப்புதல் வழங்கப்பட்டது.' : 'Loan approved.'}
            </span>{' '}
            {language === 'ta' ? 'உங்கள் செயலி அறிவிப்புகளில் நிலை புதுப்பிப்பைப் பார்க்கவும்.' : 'Check your in-app notifications for status updates.'}
          </div>
        </div>
      )}

      {/* Audit History Log */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-700 mb-2">{t.workflowAuditHistory}</div>
        <div className="space-y-2">
          {loan.status_history.map((entry, i) => (
            <div
              key={i}
              className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-bold ${
                      entry.status === 'APPROVED'
                        ? 'text-emerald-700'
                        : entry.status === 'REJECTED'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {getLocalizedStatus(entry.status)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-700 font-semibold">{t.by} {entry.updated_by_name}</span>
                  <span className="text-slate-500 text-[11px]">({getLocalizedRole(entry.updated_by_role)})</span>
                </div>
                {entry.note && <div className="text-slate-600 mt-1">{entry.note}</div>}
              </div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap ml-3">
                {new Date(entry.updated_at).toLocaleString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
