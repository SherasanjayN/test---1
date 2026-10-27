import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Investment, InvestmentFrequency } from '../types';
import { useLanguage } from '../utils/translations';
import { VoiceInputModal } from './VoiceInputModal';
import { History, IndianRupee, Mic, PlusCircle, RefreshCw, TrendingUp } from 'lucide-react';

export const InvestmentPortal: React.FC = () => {
  const { language } = useLanguage();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [frequency, setFrequency] = useState<InvestmentFrequency>('WEEKLY');
  const [planAmount, setPlanAmount] = useState('');
  const [startedAt, setStartedAt] = useState(new Date().toISOString().slice(0, 10));
  const [planNote, setPlanNote] = useState('');
  const [contributionAmounts, setContributionAmounts] = useState<Record<string, string>>({});
  const [paymentModes, setPaymentModes] = useState<Record<string, 'CASH' | 'UPI'>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [voiceTarget, setVoiceTarget] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setInvestments(await api.getInvestments());
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load private investment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createInvestment({ amount_per_period: Number(planAmount), frequency, started_at: startedAt, note: planNote });
      setPlanAmount('');
      setPlanNote('');
      setSuccess(language === 'ta' ? 'சேமிப்பு திட்டம் உருவாக்கப்பட்டது.' : 'Contribution plan created.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create contribution plan.');
    } finally {
      setSaving(false);
    }
  };

  const addContribution = async (event: React.FormEvent, investmentId: string) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.addInvestmentContribution(investmentId, {
        amount: Number(contributionAmounts[investmentId]),
        payment_mode: paymentModes[investmentId] || 'CASH',
      });
      setContributionAmounts(current => ({ ...current, [investmentId]: '' }));
      setSuccess(language === 'ta' ? 'உங்கள் உண்மையான பங்களிப்பு பதிவு செய்யப்பட்டது.' : 'Your actual contribution was recorded.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not record this contribution.');
    } finally {
      setSaving(false);
    }
  };

  const frequencyLabel = (value: InvestmentFrequency) =>
    language === 'ta'
      ? ({ DAILY: 'தினசரி', WEEKLY: 'வாராந்திர', MONTHLY: 'மாதாந்திர' }[value])
      : ({ DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly' }[value]);

  return (
    <section className="space-y-5" aria-labelledby="investment-title">
      <header className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <h2 id="investment-title" className="text-lg font-bold text-slate-900">
              {language === 'ta' ? 'எனது முதலீடு' : 'My Investment'}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {language === 'ta'
                ? 'உங்கள் தனிப்பட்ட சேமிப்பு திட்டங்களையும் உண்மையில் பதிவு செய்யப்பட்ட பங்களிப்புகளையும் மட்டும் பார்க்கலாம். வட்டி அல்லது தானியங்கி வளர்ச்சி கணக்கிடப்படாது.'
                : 'Only you can see your plans and recorded contributions. No interest or automatic growth is calculated.'}
            </p>
          </div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{success}</p>}

      <form onSubmit={createPlan} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="text-xs font-semibold text-slate-700">
          {language === 'ta' ? 'ஒவ்வொரு காலத்திற்கான தொகை (₹)' : 'Planned contribution per period (₹)'}
          <span className="mt-1 flex gap-2">
            <input required min="1" max="1000000" step="0.01" type="number" value={planAmount} onChange={event => setPlanAmount(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => setVoiceTarget('plan')} aria-label="Enter plan amount by voice" className="rounded-xl border border-slate-300 px-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
          </span>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {language === 'ta' ? 'அடிக்கடி' : 'Frequency'}
          <select value={frequency} onChange={event => setFrequency(event.target.value as InvestmentFrequency)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(item => <option key={item} value={item}>{frequencyLabel(item)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {language === 'ta' ? 'தொடக்க தேதி' : 'Start date'}
          <input required type="date" max={new Date().toISOString().slice(0, 10)} value={startedAt} onChange={event => setStartedAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-700 lg:col-span-2">
          {language === 'ta' ? 'குறிப்புகள் (விருப்பம்)' : 'Notes (optional)'}
          <input maxLength={240} value={planNote} onChange={event => setPlanNote(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          <PlusCircle className="h-4 w-4" /> {language === 'ta' ? 'திட்டம் உருவாக்கு' : 'Create plan'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><History className="h-4 w-4 text-emerald-700" />{language === 'ta' ? 'பங்களிப்பு வரலாறு' : 'Contribution history'}</h3>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> {language === 'ta' ? 'புதுப்பி' : 'Refresh'}
        </button>
      </div>

      {!loading && investments.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          {language === 'ta' ? 'இன்னும் முதலீட்டு திட்டங்கள் இல்லை.' : 'You have not created an investment plan yet.'}
        </p>
      )}
      {investments.map(investment => (
        <article key={investment.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">{frequencyLabel(investment.frequency)} {language === 'ta' ? 'திட்டம்' : 'plan'}</p>
              <p className="mt-1 flex items-center text-xl font-extrabold text-slate-900"><IndianRupee className="h-5 w-5 text-emerald-700" />{investment.amount_per_period.toLocaleString('en-IN')}<span className="ml-1 text-xs font-medium text-slate-500">/ {frequencyLabel(investment.frequency).toLowerCase()}</span></p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase text-emerald-800">{language === 'ta' ? 'உண்மையான பங்களிப்பு மொத்தம்' : 'Actual contributions'}</p>
              <p className="text-lg font-bold text-emerald-900">₹{investment.total_contributed.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <form onSubmit={event => void addContribution(event, investment.id)} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-semibold text-slate-700">
              {language === 'ta' ? 'செலுத்திய தொகை (₹)' : 'Actual amount paid (₹)'}
              <span className="mt-1 flex gap-2">
                <input required min="1" max="1000000" step="0.01" type="number" value={contributionAmounts[investment.id] || ''} onChange={event => setContributionAmounts(current => ({ ...current, [investment.id]: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <button type="button" onClick={() => setVoiceTarget(investment.id)} aria-label="Enter contribution amount by voice" className="rounded-lg border border-slate-300 bg-white px-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
              </span>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              {language === 'ta' ? 'செலுத்திய முறை' : 'Payment method'}
              <select value={paymentModes[investment.id] || 'CASH'} onChange={event => setPaymentModes(current => ({ ...current, [investment.id]: event.target.value as 'CASH' | 'UPI' }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="CASH">{language === 'ta' ? 'பணம்' : 'Cash'}</option><option value="UPI">UPI</option>
              </select>
            </label>
            <button disabled={saving} className="rounded-lg bg-slate-800 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{language === 'ta' ? 'பங்களிப்பை பதிவு செய்' : 'Record contribution'}</button>
          </form>

          {investment.contributions.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {investment.contributions.map(contribution => (
                <li key={contribution.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="text-slate-600">{new Date(contribution.contributed_at).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN')} · {contribution.payment_mode}</span>
                  <strong className="text-slate-900">₹{contribution.amount.toLocaleString('en-IN')}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-slate-500">{language === 'ta' ? 'உண்மையான பங்களிப்புகள் எதுவும் பதிவு செய்யப்படவில்லை.' : 'No actual contributions have been recorded.'}</p>}
        </article>
      ))}
      <VoiceInputModal
        isOpen={voiceTarget !== null}
        onClose={() => setVoiceTarget(null)}
        fieldName="investmentAmount"
        fieldLabel={language === 'ta' ? 'முதலீட்டு பங்களிப்பு தொகை' : 'Investment contribution amount'}
        onApplyValue={value => {
          if (voiceTarget === 'plan') setPlanAmount(String(value));
          else if (voiceTarget) setContributionAmounts(current => ({ ...current, [voiceTarget]: String(value) }));
        }}
      />
    </section>
  );
};
