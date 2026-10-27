import React, { useEffect, useRef, useState } from 'react';
import { Loan, RepaymentInstallment, RepaymentTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { api } from '../api';
import { generateRepaymentPassbookPdf, generateLoanSanctionPdf } from '../utils/pdfGenerator';
import {
  IndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  CreditCard,
  PlusCircle,
  FileText,
  ShieldCheck,
  X,
  Check,
} from 'lucide-react';

interface RepaymentLedgerProps {
  loan: Loan;
  onLoanUpdated?: (updatedLoan: Loan) => void;
  canRecordPayment?: boolean;
}

export const RepaymentLedger: React.FC<RepaymentLedgerProps> = ({
  loan,
  onLoanUpdated,
  canRecordPayment = false,
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [recordingInstallment, setRecordingInstallment] = useState<RepaymentInstallment | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<'UPI' | 'CASH'>('CASH');
  const [payNote, setPayNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [repayments, setRepayments] = useState<RepaymentTransaction[]>(loan.repayments || []);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const totalPaid = loan.total_paid || 0;
  const remaining = loan.remaining_balance !== undefined ? loan.remaining_balance : loan.amount;
  const installments = loan.installments || [];
  const allowPaymentRecording = canRecordPayment && loan.status === 'APPROVED' && remaining > 0;

  useEffect(() => {
    let active = true;
    api.getLoanLedger(loan.id)
      .then(ledger => {
        if (!active) return;
        setRepayments(ledger.repayments);
        setLedgerError(null);
      })
      .catch(error => {
        if (active) setLedgerError(error instanceof Error ? error.message : 'Failed to load repayment history.');
      });
    return () => {
      active = false;
    };
  }, [loan.id, loan.total_paid, loan.status]);

  const handleOpenRecord = (inst: RepaymentInstallment) => {
    setRecordingInstallment(inst);
    idempotencyKeyRef.current = null;
    const defaultNeeded = Math.max(0, inst.due_amount - (inst.paid_amount || 0));
    setPayAmount(defaultNeeded > 0 ? defaultNeeded.toString() : inst.due_amount.toString());
    setPayNote('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingInstallment) return;

    const numAmount = Number(payAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage(language === 'ta' ? 'சரியான கட்டண தொகையை உள்ளிடவும்.' : 'Please enter a valid payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `repayment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const res = await api.recordLoanRepayment(loan.id, {
        installment_number: recordingInstallment.installment_number,
        amount: numAmount,
        payment_mode: payMode,
        note: payNote.trim(),
        idempotency_key: idempotencyKeyRef.current,
      });

      idempotencyKeyRef.current = null;
      setRepayments(current => [...current.filter(item => item.id !== res.repayment.id), res.repayment]);
      setSuccessMessage(res.message);
      if (onLoanUpdated) {
        onLoanUpdated(res.loan);
      }
      setTimeout(() => {
        setRecordingInstallment(null);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record repayment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Top Banner with Stats & PDF Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>
              {language === 'ta' ? 'கடன் திருப்பிச் செலுத்தும் கணக்கு ஏடு' : 'Loan Repayment Ledger & Passbook'}
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
            {loan.user_name} · ₹{loan.amount.toLocaleString('en-IN')}
          </h3>
          <p className="text-xs text-slate-500">
            {loan.repayment_frequency || 'WEEKLY'} {language === 'ta' ? 'தவணை முறை' : 'Repayment Cycles'} · {installments.length} {language === 'ta' ? 'தவணைகள்' : 'Installments'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => generateLoanSanctionPdf(loan, language)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 inline-flex items-center space-x-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ta' ? 'அனுமதி சான்றிதழ் PDF' : 'Sanction Certificate PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => generateRepaymentPassbookPdf(loan)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'ta' ? 'பாஸ்புக் PDF' : 'Download Passbook PDF'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
            {language === 'ta' ? 'அனுமதிக்கப்பட்ட கடன்' : 'Sanctioned Loan'}
          </span>
          <span className="text-base font-extrabold text-slate-900 mt-1 flex items-center">
            <IndianRupee className="w-4 h-4 text-emerald-600 mr-0.5" />
            {loan.amount.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block">
            {language === 'ta' ? 'செலுத்தப்பட்ட தொகை' : 'Total Paid'}
          </span>
          <span className="text-base font-extrabold text-emerald-700 mt-1 flex items-center">
            <IndianRupee className="w-4 h-4 text-emerald-600 mr-0.5" />
            {totalPaid.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block">
            {language === 'ta' ? 'மீதமுள்ள இருப்பு' : 'Remaining Balance'}
          </span>
          <span className="text-base font-extrabold text-amber-700 mt-1 flex items-center">
            <IndianRupee className="w-4 h-4 text-amber-600 mr-0.5" />
            {remaining.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
          <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wide block">
            {language === 'ta' ? 'அடுத்த தவணை தேதி' : 'Next Due Date'}
          </span>
          <span className="text-xs font-bold text-sky-900 mt-1.5 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-sky-600" />
            {loan.next_due_date || (remaining === 0 ? (language === 'ta' ? 'முழுவதும் செலுத்தப்பட்டது' : 'Fully Paid') : '-')}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5 font-semibold text-slate-600">
          <span>{language === 'ta' ? 'திருப்பிச் செலுத்தும் முன்னேற்றம்' : 'Repayment Progress'}</span>
          <span>{Math.round((totalPaid / (loan.amount || 1)) * 100)}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, Math.round((totalPaid / (loan.amount || 1)) * 100))}%` }}
          />
        </div>
      </div>

      {/* Installments Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50 text-slate-700 font-bold">
            <tr>
              <th className="px-3 py-2.5 text-left">{language === 'ta' ? 'தவணை' : 'Cycle #'}</th>
              <th className="px-3 py-2.5 text-left">{language === 'ta' ? 'தவணை தேதி' : 'Due Date'}</th>
              <th className="px-3 py-2.5 text-left">{language === 'ta' ? 'தொகை (₹)' : 'Due Amount'}</th>
              <th className="px-3 py-2.5 text-left">{language === 'ta' ? 'செலுத்தப்பட்டது' : 'Paid Amount'}</th>
              <th className="px-3 py-2.5 text-left">{language === 'ta' ? 'நிலை' : 'Status'}</th>
              <th className="px-3 py-2.5 text-left">{language === 'ta' ? 'செலுத்திய தேதி / முறை' : 'Paid Date / Mode'}</th>
              {allowPaymentRecording && (
                <th className="px-3 py-2.5 text-right">{language === 'ta' ? 'செயல்பாடு' : 'Action'}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {installments.length === 0 ? (
              <tr>
                <td colSpan={allowPaymentRecording ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
                  {language === 'ta' ? 'தவணை பட்டியல் தயார் செய்யப்படுகிறது...' : 'Generating installment schedule...'}
                </td>
              </tr>
            ) : (
              installments.map((inst) => {
                const isPaid = inst.status === 'PAID';
                const isOverdue = inst.status === 'OVERDUE';
                const isPartial = inst.status === 'PARTIAL';

                return (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      #{inst.installment_number}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {inst.due_date}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                      ₹{inst.due_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-700">
                      {inst.paid_amount > 0 ? `₹${inst.paid_amount.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : isPartial
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isPaid
                          ? language === 'ta' ? 'செலுத்தப்பட்டது' : 'PAID'
                          : isOverdue
                          ? language === 'ta' ? 'தாமதம்' : 'OVERDUE'
                          : isPartial
                          ? language === 'ta' ? 'பகுதி தொகை' : 'PARTIAL'
                          : language === 'ta' ? 'நிலுவை' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                      {inst.paid_date ? (
                        <div>
                          <span>{inst.paid_date.split('T')[0]}</span>
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                            {inst.payment_mode || 'CASH'}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    {allowPaymentRecording && (
                      <td className="px-3 py-2.5 text-right">
                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => handleOpenRecord(inst)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs inline-flex items-center space-x-1 transition-colors"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>{language === 'ta' ? 'வரவு வை' : 'Record'}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h4 className="text-xs font-bold text-slate-800">
            {language === 'ta' ? 'பரிவர்த்தனை வரலாறு' : 'Repayment Transaction History'}
          </h4>
        </div>
        {ledgerError && <p role="alert" className="px-4 py-2 text-xs text-rose-700">{ledgerError}</p>}
        {repayments.length === 0 ? (
          <p className="px-4 py-5 text-center text-xs text-slate-500">
            {language === 'ta' ? 'இதுவரை எந்த கட்டணமும் பதிவு செய்யப்படவில்லை.' : 'No repayments have been recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-white text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Cycle</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Recorded by</th>
                  <th className="px-3 py-2">Balance after payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...repayments].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).map(payment => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{new Date(payment.payment_date).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">#{payment.installment_number}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-emerald-700">₹{payment.amount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-slate-600">{payment.payment_mode}</td>
                    <td className="px-3 py-2 text-slate-600">{payment.recorded_by_name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">₹{payment.new_balance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record Repayment Modal */}
      {recordingInstallment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {language === 'ta' ? 'தவணைத் தொகை வரவு வைத்தல்' : 'Record Installment Payment'}
                </h4>
                <p className="text-xs text-slate-500">
                  {language === 'ta' ? `தவணை #${recordingInstallment.installment_number} (தேதி: ${recordingInstallment.due_date})` : `Cycle #${recordingInstallment.installment_number} (Due: ${recordingInstallment.due_date})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecordingInstallment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRepayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ta' ? 'செலுத்தும் தொகை (₹)' : 'Payment Amount (₹)'}
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={remaining}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ta' ? 'செலுத்தும் முறை' : 'Payment Mode'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMode('CASH')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                      payMode === 'CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {language === 'ta' ? 'ரொக்கம் (Cash)' : 'Cash at Meeting'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode('UPI')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                      payMode === 'UPI'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    UPI Direct
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ta' ? 'குறிப்பு (விருப்பமானது)' : 'Note / Receipt Ref (Optional)'}
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Received at Saturday meeting"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordingInstallment(null)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {language === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'ta' ? 'பதிவாகிறது...' : 'Recording...') : (language === 'ta' ? 'வரவு வை' : 'Confirm Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
