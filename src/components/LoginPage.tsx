import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, AlertCircle, Eye, EyeOff, Sparkles, School } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Masukkan username dan password');
      return;
    }
    setLoading(true);
    setError('');
    const errMsg = await login(username, password);
    if (errMsg) {
      setError(errMsg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-[#d1d5db] font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl border border-cyan-500/30 bg-[#11141a] mb-4">
            <img src="/tutwuri.png" alt="Tut Wuri Handayani" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl font-light tracking-widest">
            TIMKER <span className="font-bold text-cyan-400">BIDIK</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-2 tracking-wider">
            PLATFORM MANAJEMEN PENDIDIKAN
          </p>
          <p className="text-[10px] text-slate-600 font-mono mt-1">
            KECAMATAN LEMAHABANG
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0c0e12] border border-[#1f2937] rounded-2xl p-8 space-y-5 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[#1f2937] pb-4">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase font-bold">VERIFIKASI AKSES</span>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs font-mono text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Username / NPSN</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username atau NPSN"
              className="w-full bg-[#151922] border border-[#1f2937] rounded-lg px-4 py-3 text-sm font-mono text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-800 transition-all"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full bg-[#151922] border border-[#1f2937] rounded-lg pl-4 pr-10 py-3 text-sm font-mono text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-800 transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-mono font-bold bg-cyan-600/20 border border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white disabled:opacity-40 transition-all"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? 'MEMVERIFIKASI...' : 'MASUK'}
          </button>

          <div className="pt-2 border-t border-[#1f2937]">
            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
              <School className="h-3 w-3" />
              <span>Operator sekolah: login menggunakan NPSN sebagai username</span>
            </div>
          </div>
        </form>

        <p className="text-center text-[10px] text-slate-700 font-mono mt-6">
          TIMKER BIDIK 360 v1.0 — Sistem Informasi Manajemen Pendidikan
        </p>
      </div>
    </div>
  );
}
