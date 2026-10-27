import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AdminMessage, Group, User } from '../types';
import { useLanguage } from '../utils/translations';
import { VoiceInputModal } from './VoiceInputModal';
import { Mic, Send } from 'lucide-react';

interface AdminMessageCenterProps {
  user: User;
  groupId?: string | null;
}

export const AdminMessageCenter: React.FC<AdminMessageCenterProps> = ({ user, groupId }) => {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [audience, setAudience] = useState<'ALL' | 'GROUP' | 'SELECTED'>('ALL');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<'title' | 'body' | null>(null);

  const refresh = async () => {
    try {
      const inbox = await api.getAdminMessages();
      setMessages(inbox);
      if (user.role === 'SUPER_ADMIN') {
        const [allUsers, allGroups] = await Promise.all([api.getUsers(), api.getGroups()]);
        setUsers(allUsers.filter(item => item.status === 'APPROVED' && item.role !== 'SUPER_ADMIN'));
        setGroups(allGroups);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load admin messages.');
    }
  };

  useEffect(() => { void refresh(); }, [user.role]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSending(true);
    try {
      await api.createAdminMessage({
        title,
        message: body,
        audience: user.role === 'GROUP_ADMIN' ? 'ALL' : audience,
        group_id: user.role === 'GROUP_ADMIN' ? groupId || undefined : audience === 'GROUP' ? targetGroupId : undefined,
        user_ids: audience === 'SELECTED' ? selectedUserIds : undefined,
      });
      setTitle('');
      setBody('');
      setSelectedUserIds([]);
      setStatus(language === 'ta' ? 'செய்தி செயலியில் உள்ள பெறுநர்களுக்கு அனுப்பப்பட்டது.' : 'In-app message delivered to its recipients.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send admin message.');
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedUserIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <form onSubmit={send} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">{language === 'ta' ? 'நிர்வாக தகவல்' : 'Admin information'}</h2>
          <p className="mt-1 text-xs text-slate-500">{language === 'ta' ? 'மின்னஞ்சல் இல்லை; செயலிக்குள் மட்டுமே பெறுநர்களுக்கு அனுப்பப்படும்.' : 'Messages are delivered only inside the app, not by email.'}</p>
        </div>
        {user.role === 'SUPER_ADMIN' && (
          <label className="block text-xs font-semibold text-slate-700">
            {language === 'ta' ? 'பெறுநர்கள்' : 'Recipients'}
            <select value={audience} onChange={event => setAudience(event.target.value as typeof audience)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="ALL">{language === 'ta' ? 'அனைத்து உறுப்பினர்களும்' : 'All approved members'}</option>
              <option value="GROUP">{language === 'ta' ? 'ஒரு குழு' : 'A group'}</option>
              <option value="SELECTED">{language === 'ta' ? 'தேர்ந்தெடுத்த உறுப்பினர்கள்' : 'Selected members'}</option>
            </select>
          </label>
        )}
        {user.role === 'SUPER_ADMIN' && audience === 'GROUP' && (
          <label className="block text-xs font-semibold text-slate-700">
            {language === 'ta' ? 'குழு' : 'Group'}
            <select required value={targetGroupId} onChange={event => setTargetGroupId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="">{language === 'ta' ? 'குழுவைத் தேர்ந்தெடுக்கவும்' : 'Select a group'}</option>
              {groups.map(group => <option key={group.id} value={group.id}>{group.group_name}</option>)}
            </select>
          </label>
        )}
        {user.role === 'SUPER_ADMIN' && audience === 'SELECTED' && (
          <fieldset className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">{language === 'ta' ? 'பெறுநர்களைத் தேர்ந்தெடுக்கவும்' : 'Choose recipients'}</legend>
            {users.map(item => (
              <label key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={selectedUserIds.includes(item.id)} onChange={() => toggleRecipient(item.id)} />
                {item.name} {item.group_name ? `· ${item.group_name}` : ''}
              </label>
            ))}
          </fieldset>
        )}
        {user.role === 'GROUP_ADMIN' && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{language === 'ta' ? 'இந்த செய்தி உங்கள் குழுவில் மட்டுமே பகிரப்படும்.' : 'This message will reach members of your group only.'}</p>}
        <label className="block text-xs font-semibold text-slate-700">
          {language === 'ta' ? 'தலைப்பு' : 'Title'}
          <span className="mt-1 flex gap-2">
            <input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            <button type="button" onClick={() => setVoiceTarget('title')} aria-label="Enter message title by voice" className="rounded-xl border border-slate-300 px-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
          </span>
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          {language === 'ta' ? 'செய்தி' : 'Message'}
          <span className="mt-1 flex gap-2">
            <textarea required maxLength={4000} rows={5} value={body} onChange={event => setBody(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            <button type="button" onClick={() => setVoiceTarget('body')} aria-label="Enter message body by voice" className="self-start rounded-xl border border-slate-300 px-3 py-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
          </span>
        </label>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        {status && <p role="status" className="text-xs text-emerald-700">{status}</p>}
        <button disabled={sending || (audience === 'SELECTED' && selectedUserIds.length === 0)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
          <Send className="h-4 w-4" /> {sending ? (language === 'ta' ? 'அனுப்புகிறது...' : 'Sending...') : (language === 'ta' ? 'செய்தியை அனுப்பு' : 'Send in-app message')}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">{language === 'ta' ? 'எனக்கு வந்த நிர்வாக செய்திகள்' : 'Admin messages for me'}</h2>
        {messages.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">{language === 'ta' ? 'செய்திகள் இல்லை.' : 'No admin messages yet.'}</p> : messages.map(message => (
          <article key={message.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">{message.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{message.message}</p>
            <p className="mt-3 text-[10px] text-slate-500">{message.author_name} · {new Date(message.created_at).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN')}</p>
          </article>
        ))}
      </div>
      <VoiceInputModal
        isOpen={voiceTarget !== null}
        onClose={() => setVoiceTarget(null)}
        fieldName="purpose"
        fieldLabel={voiceTarget === 'title' ? (language === 'ta' ? 'செய்தி தலைப்பு' : 'Message title') : (language === 'ta' ? 'செய்தி' : 'Message')}
        onApplyValue={value => {
          if (voiceTarget === 'title') setTitle(String(value));
          else if (voiceTarget === 'body') setBody(String(value));
        }}
      />
    </section>
  );
};
