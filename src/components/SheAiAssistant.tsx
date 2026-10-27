import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Mic, Send, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../utils/translations';
import {
  getInsecureContextMessage,
  getSpeechRecognitionErrorMessage,
  useOnDeviceSpeechRecognition,
} from '../utils/speechRecognition';

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const SheAiAssistant: React.FC = () => {
  const { language } = useLanguage();
  const [assistantLanguage, setAssistantLanguage] = useState<'en' | 'ta'>(language);
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [voicePreview, setVoicePreview] = useState('');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceFinalRef = useRef('');
  const cancelVoiceSubmitRef = useRef(false);

  useEffect(() => setAssistantLanguage(language), [language]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, open]);
  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const submitQuestion = async (rawQuestion: string, speakReply = false) => {
    const question = rawQuestion.trim();
    if (!question || sending) return;
    setInput('');
    setError(null);
    const conversation = entries.slice(-10).map(({ role, text }) => ({ role, text }));
    setEntries(current => [...current, {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
    }]);
    setSending(true);
    try {
      const { answer } = await api.askSheAi(question, assistantLanguage, conversation);
      setEntries(current => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: answer,
      }]);
      if (speakReply && voiceEnabled) speak(answer);
    } catch (requestError) {
      setInput(question);
      setError(requestError instanceof Error ? requestError.message : 'SHE AI could not answer right now.');
    } finally {
      setSending(false);
    }
  };

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    void submitQuestion(input);
  };

  const startVoiceInput = async () => {
    if (!voiceEnabled || sending) return;
    if (!window.isSecureContext) {
      setError(getInsecureContextMessage(assistantLanguage));
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(assistantLanguage === 'ta'
        ? 'இந்த உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.'
        : 'Voice input is not supported in this browser.');
      return;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
    } catch (recognitionError) {
      setError(getSpeechRecognitionErrorMessage(recognitionError, assistantLanguage));
      return;
    }
    recognition.lang = assistantLanguage === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    setListening(true);
    setError(null);
    try {
      await useOnDeviceSpeechRecognition(recognition, SpeechRecognition, recognition.lang);
      voiceFinalRef.current = '';
      cancelVoiceSubmitRef.current = false;
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript;
          if (event.results[index].isFinal) voiceFinalRef.current += `${transcript} `;
          else interim += transcript;
        }
        setVoicePreview(interim);
      };
      recognition.onerror = (event: any) => {
        cancelVoiceSubmitRef.current = true;
        setListening(false);
        setVoicePreview('');
        setError(getSpeechRecognitionErrorMessage(event, assistantLanguage));
      };
      recognition.onend = () => {
        const transcript = voiceFinalRef.current.trim();
        if (transcript && !cancelVoiceSubmitRef.current) {
          setInput(transcript);
          void submitQuestion(transcript, true);
        }
        cancelVoiceSubmitRef.current = false;
        setVoicePreview('');
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (recognitionError) {
      setListening(false);
      setError(getSpeechRecognitionErrorMessage(recognitionError, assistantLanguage));
    }
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    void startVoiceInput();
  };

  const closeAssistant = () => {
    cancelVoiceSubmitRef.current = true;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setListening(false);
    setSpeaking(false);
    setOpen(false);
  };

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    if (!('speechSynthesis' in window)) {
      setError(assistantLanguage === 'ta'
        ? 'இந்த உலாவியில் குரல் வாசிப்பு ஆதரிக்கப்படவில்லை.'
        : 'Speech playback is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0B80-\u0BFF]/.test(text) ? 'ta-IN' : 'en-IN';
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError(assistantLanguage === 'ta' ? 'குரல் பதிலை இயக்க முடியவில்லை.' : 'The spoken answer could not be played.');
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      cancelVoiceSubmitRef.current = true;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      setListening(false);
      setSpeaking(false);
    }
    setVoiceEnabled(current => !current);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      {open && (
        <section
          aria-label="SHE AI assistant"
          className="flex h-[min(24rem,calc(100vh-8rem))] w-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 bg-emerald-700 px-3 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <Bot className="h-5 w-5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold">SHE AI</h2>
                <p className="text-[10px] text-emerald-100">
                  {assistantLanguage === 'ta' ? 'உங்கள் செயலியின் உதவியாளர்' : 'Your application assistant'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setAssistantLanguage('en')}
                aria-pressed={assistantLanguage === 'en'}
                className={`rounded-md px-2 py-1 text-[10px] font-bold ${assistantLanguage === 'en' ? 'bg-white text-emerald-800' : 'text-white hover:bg-emerald-600'}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setAssistantLanguage('ta')}
                aria-pressed={assistantLanguage === 'ta'}
                className={`rounded-md px-2 py-1 text-[10px] font-bold ${assistantLanguage === 'ta' ? 'bg-white text-emerald-800' : 'text-white hover:bg-emerald-600'}`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={assistantLanguage === 'ta' ? (voiceEnabled ? 'குரலை முடக்கு' : 'குரலை இயக்கு') : (voiceEnabled ? 'Disable voice' : 'Enable voice')}
                aria-pressed={voiceEnabled}
                className="rounded-lg p-1.5 text-white hover:bg-emerald-600"
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button type="button" onClick={closeAssistant} aria-label="Close SHE AI" className="rounded-lg p-1.5 hover:bg-emerald-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {entries.length === 0 && (
              <p className="rounded-xl border border-emerald-100 bg-white p-3 text-xs leading-relaxed text-slate-600">
                {assistantLanguage === 'ta'
                  ? 'வணக்கம்! Magalir Connect செயலி, உங்கள் கடன், திருப்பிச் செலுத்துதல், குழு கூட்டங்கள் அல்லது அறிவிப்புகள் பற்றி கேளுங்கள்.'
                  : 'Hello! Ask about the Magalir Connect app, your loans and repayments, group meetings, or announcements.'}
              </p>
            )}
            {entries.map(entry => (
              <div key={entry.id} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  entry.role === 'user' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-800'
                }`}>
                  <p className="whitespace-pre-wrap">{entry.text}</p>
                  {entry.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => speak(entry.text)}
                      title={assistantLanguage === 'ta' ? 'பதிலை வாசி' : 'Read answer aloud'}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline"
                    >
                      <Volume2 className="h-3 w-3" /> {assistantLanguage === 'ta' ? 'கேளுங்கள்' : 'Listen'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                {assistantLanguage === 'ta' ? 'பதில் தயாராகிறது...' : 'Preparing an answer...'}
              </div>
            )}
            {speaking && <p aria-live="polite" className="text-xs font-semibold text-emerald-800">{assistantLanguage === 'ta' ? '🔊 பதில் பேசப்படுகிறது...' : '🔊 Speaking...'}</p>}
            <div ref={endRef} />
          </div>

          {listening && (
            <p aria-live="polite" className="border-t border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {voicePreview || (assistantLanguage === 'ta' ? 'கேட்கிறது... பேசுங்கள்.' : 'Listening... speak now.')}
            </p>
          )}
          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              maxLength={2000}
              aria-label={assistantLanguage === 'ta' ? 'உங்கள் கேள்வி' : 'Your question'}
              placeholder={assistantLanguage === 'ta' ? 'உங்கள் கேள்வியை எழுதுங்கள்...' : 'Ask a question...'}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={!voiceEnabled || sending}
              aria-label={assistantLanguage === 'ta' ? 'குரல் உள்ளீடு' : 'Voice input'}
              aria-pressed={listening}
              className={`rounded-xl p-2 ${listening ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-40`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label={assistantLanguage === 'ta' ? 'அனுப்பு' : 'Send'}
              className="rounded-xl bg-emerald-700 p-2 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => open ? closeAssistant() : setOpen(true)}
        aria-label={open ? 'Close SHE AI' : 'Open SHE AI'}
        aria-expanded={open}
        className="mt-2 flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-white shadow-sm transition hover:bg-emerald-800"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="text-xs font-bold">SHE AI</span>
      </button>
    </div>
  );
};
