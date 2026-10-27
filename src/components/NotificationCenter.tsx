import React, { useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { api } from '../api';
import { Notification } from '../types';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const result = await api.getNotifications();
      setNotifications(result.notifications);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load notifications.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const markRead = async (notification: Notification) => {
    if (notification.read_at) return;
    try {
      const updated = await api.markNotificationRead(notification.id);
      setNotifications(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to mark notification as read.');
    }
  };

  const unreadCount = notifications.filter(notification => !notification.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(value => !value);
          if (!open) void refresh(true);
        }}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
            <button type="button" onClick={() => void refresh(true)} className="text-xs text-emerald-700 hover:underline">
              Refresh
            </button>
          </div>
          {error && <p role="alert" className="px-4 py-2 text-xs text-rose-700 bg-rose-50">{error}</p>}
          {loading && notifications.length === 0 ? (
            <div className="p-6 flex justify-center text-emerald-700"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">You are all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {notifications.map(notification => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(notification)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${notification.read_at ? '' : 'bg-emerald-50/60'}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-xs font-bold text-slate-900">{notification.title}</span>
                        <span className="mt-1 block text-xs text-slate-600">{notification.message}</span>
                        <span className="mt-1.5 block text-[10px] text-slate-400">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </span>
                      {notification.read_at && <Check className="mt-0.5 w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
