import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { api } from '../api';
import { Message } from '../types';
import { Send, MessageSquare, ShieldCheck, UserCheck, User as UserIcon, RefreshCw, Pencil, Trash2, Check, X, Mic } from 'lucide-react';
import { VoiceInputModal } from './VoiceInputModal';

interface GroupChatProps {
  groupId: string;
  groupName?: string;
}

export const GroupChat: React.FC<GroupChatProps> = ({ groupId, groupName }) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [voiceTarget, setVoiceTarget] = useState<'message' | 'edit' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (silent = false) => {
    if (!groupId) return;
    try {
      if (!silent) setLoading(true);
      const data = await api.getMessages(groupId);
      setMessages(data.messages || []);
      setError(null);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(false);

    // Near real-time polling every 2.5 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      setSending(true);
      const newMsg = await api.sendMessage(groupId, textToSend);
      setMessages((prev) => [...prev, newMsg]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setInputText(textToSend); // restore on fail
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (messageId: string) => {
    const text = editText.trim();
    if (!text || text.length > 2000) return;
    try {
      const updated = await api.updateMessage(groupId, messageId, text);
      setMessages(current => current.map(message => message.id === messageId ? updated : message));
      setEditingId(null);
      setEditText('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit message.');
    }
  };

  const handleDelete = async (messageId: string) => {
    const confirmed = window.confirm(language === 'ta' ? 'இந்த செய்தியை நீக்க விரும்புகிறீர்களா?' : 'Delete this message?');
    if (!confirmed) return;
    try {
      const deleted = await api.deleteMessage(groupId, messageId);
      setMessages(current => current.map(message => message.id === messageId ? deleted : message));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-300">
            <ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-amber-700" />
            {t.roleSuperAdmin}
          </span>
        );
      case 'GROUP_ADMIN':
        return (
          <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-bold border border-emerald-300">
            <UserCheck className="w-2.5 h-2.5 mr-0.5 text-emerald-700" />
            {t.roleGroupAdmin}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
            {t.roleMember}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Chat header */}
      <div className="px-4 py-3 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {groupName ? `${groupName} ${t.chatRoomTitle}` : t.groupChat}
            </h3>
            <p className="text-[11px] text-emerald-800 font-medium">
              {t.groupChatSubtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchMessages(false)}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
          title={t.refresh}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
        {error && (
          <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg text-center">
            {error}
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">{t.noMessagesYet}</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              {t.startTheConversation}
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const canModerate = user?.role === 'GROUP_ADMIN' || user?.role === 'SUPER_ADMIN';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center space-x-1.5 mb-1 px-1">
                <span className="text-[11px] font-bold text-slate-700">
                  {isMe ? (language === 'ta' ? 'நான் (You)' : 'You') : msg.sender_name}
                </span>
                {getRoleBadge(msg.sender_role)}
                <span className="text-[10px] text-slate-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                  isMe
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                }`}
              >
                {msg.is_deleted ? (
                  <p className="italic text-slate-400">{language === 'ta' ? 'இந்த செய்தி நீக்கப்பட்டது' : 'This message was deleted'}</p>
                ) : editingId === msg.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editText}
                      maxLength={2000}
                      onChange={event => setEditText(event.target.value)}
                      aria-label={language === 'ta' ? 'செய்தியைத் திருத்து' : 'Edit message'}
                      className="min-w-0 flex-1 rounded-lg px-2 py-1 text-slate-900"
                    />
                    <button type="button" onClick={() => setVoiceTarget('edit')} aria-label="Enter edited message by voice" className="p-1 text-emerald-700">
                      <Mic className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => void handleEdit(msg.id)} aria-label="Save edit" className="p-1 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => { setEditingId(null); setEditText(''); }} aria-label="Cancel edit" className="p-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    {msg.is_edited && <span className="mt-1 block text-[9px] opacity-70">{language === 'ta' ? 'திருத்தப்பட்டது' : 'edited'}</span>}
                    <div className="mt-1 flex justify-end gap-2">
                      {(isMe || canModerate) && (
                        <button
                          type="button"
                          onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                          aria-label={language === 'ta' ? 'செய்தியைத் திருத்து' : 'Edit message'}
                          className="opacity-70 hover:opacity-100"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {(isMe || canModerate) && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(msg.id)}
                          aria-label={language === 'ta' ? 'செய்தியை நீக்கு' : 'Delete message'}
                          className="opacity-70 hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          maxLength={2000}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.typeMessagePlaceholder}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
        />
        <button type="button" onClick={() => setVoiceTarget('message')} aria-label="Enter chat message by voice" className="rounded-xl border border-slate-300 p-2.5 text-emerald-700">
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
          title={t.send}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      <VoiceInputModal
        isOpen={voiceTarget !== null}
        onClose={() => setVoiceTarget(null)}
        fieldName="purpose"
        fieldLabel={language === 'ta' ? 'குழு செய்தி' : 'Group chat message'}
        onApplyValue={value => {
          if (voiceTarget === 'edit') setEditText(String(value));
          else setInputText(String(value));
        }}
      />
    </div>
  );
};
