import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../utils/translations';
import { api } from '../api';
import { User, MeetingRecord, AttendanceEntry } from '../types';
import jsPDF from 'jspdf';
import {
  Calendar,
  FileText,
  Download,
  PlusCircle,
  IndianRupee,
  Building,
  Save,
  Printer,
  X,
  CheckCircle2,
  Mic,
} from 'lucide-react';
import { VoiceInputModal } from './VoiceInputModal';

interface MeetingMinutesManagerProps {
  groupId: string;
  groupName: string;
  members: User[];
}

export const MeetingMinutesManager: React.FC<MeetingMinutesManagerProps> = ({
  groupId,
  groupName,
  members,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);

  // New Meeting Form
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('Weekly Group Savings & Micro-Credit Assessment');
  const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [savingsCollected, setSavingsCollected] = useState<string>('2000');
  const [resolutions, setResolutions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [voiceField, setVoiceField] = useState<'topic' | 'savings' | 'resolutions' | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.getMeetings();
      const groupMeetings = user?.role === 'SUPER_ADMIN' ? data : data.filter((m) => m.group_id === groupId);
      setMeetings(groupMeetings);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [groupId]);

  // Initialize attendance for all members
  useEffect(() => {
    const initial: Record<string, 'PRESENT' | 'ABSENT' | 'LATE'> = {};
    members.forEach((m) => {
      initial[m.id] = 'PRESENT';
    });
    setAttendance(initial);
  }, [members]);

  const handleAttendanceToggle = (memberId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendance((prev) => ({ ...prev, [memberId]: status }));
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    try {
      setSubmitting(true);
      setMessage(null);

      const attendanceList: AttendanceEntry[] = members.map((m) => ({
        user_id: m.id,
        user_name: m.name,
        status: attendance[m.id] || 'PRESENT',
      }));

      await api.createMeeting({
        group_id: groupId,
        date: meetingDate,
        topic: topic.trim(),
        attendance: attendanceList,
        total_savings_collected: Number(savingsCollected) || 0,
        resolutions: resolutions.trim(),
      });

      setMessage(language === 'ta' ? 'கூட்ட குறிப்பு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Meeting record saved successfully!');
      await fetchMeetings();
      setTimeout(() => {
        setShowNewMeetingModal(false);
        setMessage(null);
        setResolutions('');
      }, 1500);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPdf = (record: MeetingRecord) => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(5, 150, 105); // emerald
      doc.text('MAGALIR KUZHU MANAGEMENT SYSTEM', 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Official Minutes of Meeting (MoM)`, 14, 28);
      doc.text(`Self-Help Group: ${record.group_name}`, 14, 35);
      doc.text(`Meeting Date: ${record.date}`, 14, 42);
      doc.text(`Recorded By: ${record.created_by_name}`, 14, 49);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 53, 196, 53);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Agenda & Topic:', 14, 62);
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(record.topic, 14, 69);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`Total Savings Deposited: INR ${record.total_savings_collected.toLocaleString('en-IN')}`, 14, 82);

      doc.text('Member Attendance Record:', 14, 96);
      let y = 104;
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      record.attendance.forEach((att, idx) => {
        doc.text(`${idx + 1}. ${att.user_name} - [${att.status}]`, 20, y);
        y += 7;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 5;
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Resolutions & Group Decisions:', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      const splitResolutions = doc.splitTextToSize(record.resolutions || 'No specific resolutions recorded.', 180);
      doc.text(splitResolutions, 14, y);

      doc.save(`MoM_${record.group_name.replace(/\s+/g, '_')}_${record.date}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>{t.recordMeetingMinutes}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {t.momSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNewMeetingModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.newMeetingButton}</span>
        </button>
      </div>

      {/* Historical Meeting Archive */}
      <div>
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          {t.pastMeetingsTitle} ({meetings.length})
        </h3>

        {meetings.length === 0 && !loading ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
            {t.noMeetingsYet}
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{m.topic}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      ₹{m.total_savings_collected.toLocaleString('en-IN')} {language === 'ta' ? 'சேமிப்பு' : 'Savings'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {m.date}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {m.group_name}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      {m.attendance.filter((a) => a.status === 'PRESENT').length} / {m.attendance.length} {t.present}
                    </span>
                  </div>
                  {m.resolutions && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                      "{m.resolutions}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleExportPdf(m)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-300 inline-flex items-center space-x-1.5 transition-colors self-start md:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.exportPdf}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Meeting Record Modal */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-emerald-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.recordMeetingMinutes}
                </h3>
                <p className="text-xs text-slate-500">
                  {groupName} · {members.length} {t.activeMembersCount}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMeetingModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {message && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSaveMeeting} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.meetingDate} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t.totalSavingsCollected} <span className="text-rose-500">*</span>
                  </label>
                  <span className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={savingsCollected}
                      onChange={(e) => setSavingsCollected(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                    />
                    <button type="button" onClick={() => setVoiceField('savings')} aria-label="Enter savings amount by voice" className="rounded-xl border border-slate-300 px-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.meetingTopic} <span className="text-rose-500">*</span>
                </label>
                <span className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Weekly micro-savings deposit & loan review"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <button type="button" onClick={() => setVoiceField('topic')} aria-label="Enter meeting topic by voice" className="rounded-xl border border-slate-300 px-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
                </span>
              </div>

              {/* Attendance Table */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t.memberAttendance} ({members.length} {language === 'ta' ? 'உறுப்பினர்கள்' : 'members'})
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {members.map((m) => {
                    const status = attendance[m.id] || 'PRESENT';
                    return (
                      <div
                        key={m.id}
                        className="p-2.5 px-3 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800">{m.name}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleAttendanceToggle(m.id, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              status === 'PRESENT'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t.present}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceToggle(m.id, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              status === 'ABSENT'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t.absent}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendanceToggle(m.id, 'LATE')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                              status === 'LATE'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t.late}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resolutions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t.resolutionsNotes}
                </label>
                <span className="flex gap-2">
                  <textarea
                    rows={3}
                    value={resolutions}
                    onChange={(e) => setResolutions(e.target.value)}
                    placeholder={t.resolutionsPlaceholder}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                  <button type="button" onClick={() => setVoiceField('resolutions')} aria-label="Enter resolutions by voice" className="self-start rounded-xl border border-slate-300 px-3 py-3 text-emerald-700"><Mic className="h-4 w-4" /></button>
                </span>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewMeetingModal(false)}
                  className="flex-1 py-2 px-4 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? t.savingMeeting : t.saveMeetingMinutes}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <VoiceInputModal
        isOpen={voiceField !== null}
        onClose={() => setVoiceField(null)}
        fieldName={voiceField === 'savings' ? 'investmentAmount' : 'purpose'}
        fieldLabel={voiceField === 'savings' ? t.totalSavingsCollected : voiceField === 'topic' ? t.meetingTopic : t.resolutionsNotes}
        onApplyValue={value => {
          if (voiceField === 'savings') setSavingsCollected(String(value));
          else if (voiceField === 'topic') setTopic(String(value));
          else if (voiceField === 'resolutions') setResolutions(String(value));
        }}
      />
    </div>
  );
};
