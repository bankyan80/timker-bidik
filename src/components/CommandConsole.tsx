import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import {
  Terminal,
  Send,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'system';
  text: string;
  timestamp: string;
}

export default function CommandConsole() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'system',
      text: 'SISTEM AKTIF: INTI KOGNITIF TIMKER BIDIK SIAP.\nTanyakan kepada saya mengenai status sekolah daerah, kekosongan guru, rasio siswa-ke-guru, alur sertifikasi, atau dampak kebijakan.',
      timestamp: '08:00'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const predefinedPrompts = [
    'Prediksi krisis guru tahun depan?',
    'Rencana redistribusi guru matematika',
    'Identifikasi kerusakan infrastruktur kritis',
    'Daftar penundaan sertifikasi guru (backlog)'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Add user message
    const userMsg: ChatMessage = {
      sender: 'user',
      text,
      timestamp: timeStr
    };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const response = await api('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await response.json();

      const systemMsg: ChatMessage = {
        sender: 'system',
        text: data.reply,
        timestamp: timeStr
      };
      setMessages(prev => [...prev, systemMsg]);
    } catch (err) {
      console.error('Error in chat:', err);
      const systemErrorMsg: ChatMessage = {
        sender: 'system',
        text: 'ERROR: Gagal membangun koneksi aman dengan sistem kecerdasan AI. Silakan periksa konfigurasi jaringan Anda.',
        timestamp: timeStr
      };
      setMessages(prev => [...prev, systemErrorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="chat-module">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[580px]">
        {/* Chat History Panel (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col justify-between border bg-[#11141a]/60 border-[#1f2937] rounded-xl overflow-hidden h-full">
          {/* Console Header */}
          <div className="p-3 bg-[#0c0e12] border-b border-[#1f2937] flex justify-between items-center text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-400">
              <Terminal className="h-4 w-4 animate-pulse" />
              <span className="font-bold tracking-wider uppercase">TIMKER COGNITIVE CONSOLE v1.2</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">● CORE CONTEXT ACTIVE</span>
          </div>

          {/* Messages stream */}
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin space-y-4 font-mono text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar Watermark */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                  m.sender === 'user' ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300' : 'bg-slate-900/40 border-slate-700 text-slate-300'
                }`}>
                  {m.sender === 'user' ? 'ADM' : 'AI'}
                </div>

                {/* Msg text bubble */}
                <div className="space-y-1">
                  <div className={`p-3 rounded-lg leading-relaxed whitespace-pre-wrap border ${
                    m.sender === 'user' 
                      ? 'bg-cyan-950/40 text-cyan-100 border-cyan-500/30' 
                      : 'bg-[#0c0e12]/60 text-slate-200 border-[#1f2937]'
                  }`}>
                    {m.text}
                  </div>
                  <div className={`text-[9px] text-slate-500 font-bold ${m.sender === 'user' ? 'text-right' : ''}`}>
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="h-8 w-8 rounded-full bg-slate-900/40 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  AI
                </div>
                <div className="flex items-center gap-1.5 p-3 rounded-lg bg-[#0c0e12]/60 border border-[#1f2937] text-slate-500">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input panel */}
          <div className="p-3 bg-[#11141a]/80 border-t border-[#1f2937]">
            <form
              id="chat-send-form"
              onSubmit={(e) => { e.preventDefault(); sendMessage(inputVal); }}
              className="flex gap-2"
            >
              <input
                type="text"
                id="chat-input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type your natural language query or selection here..."
                className="flex-1 bg-[#0c0e12] border border-[#1f2937] text-slate-200 px-4 py-3 rounded-lg text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                id="chat-submit-btn"
                disabled={loading || !inputVal.trim()}
                className="px-4 bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/50 disabled:opacity-40 text-cyan-400 hover:text-white rounded-lg transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Suggestion Prompts Sidebar Panel (4 Columns) */}
        <div className="lg:col-span-4 p-5 border bg-[#11141a]/60 border-[#1f2937] rounded-xl flex flex-col justify-between h-full">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1f2937] pb-2.5">
              <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">
                SUGGESTED ANALYTICS SHORT-KEYS
              </span>
            </div>

            <div className="space-y-2.5">
              {predefinedPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  className="w-full text-left p-3 rounded bg-[#0c0e12] hover:bg-[#11141a] border border-[#1f2937] text-xs font-mono text-slate-300 hover:text-cyan-400 hover:border-cyan-500/20 transition-all leading-normal cursor-pointer"
                >
                  &rarr; {p}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Security Compliance Shield */}
          <div className="p-3 bg-cyan-950/5 rounded-lg border border-cyan-500/20 space-y-1 text-[10px] font-mono text-slate-400 leading-normal">
            <div className="flex items-center gap-1 text-cyan-300 font-bold">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>COGNITIVE CORE SECURE</span>
            </div>
            <span>All AI responses are filtered and grounded on verified regional data warehouses of Lemahabang, with active compliance guidelines.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
