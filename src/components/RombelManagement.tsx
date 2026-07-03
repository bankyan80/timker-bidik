import React, { useState, useEffect } from 'react';
import { School, Users, BookOpen, Search } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

const THEME = 'dark';

export default function RombelManagement() {
  const [levelTab, setLevelTab] = useState<string>('SD');
  const [stats, setStats] = useState<Record<string, { rombels: number; siswa: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rRombel, rSiswa] = await Promise.all([
          fetch('/api/students/rombels').then(r => r.ok ? r.json() : []),
          fetch('/api/students').then(r => r.ok ? r.json() : []),
        ]);
        const perSekolah: Record<string, { rombels: Set<string>; siswa: number }> = {};
        for (const r of rRombel) {
          if (!perSekolah[r.npsn]) perSekolah[r.npsn] = { rombels: new Set(), siswa: 0 };
          perSekolah[r.npsn].rombels.add(r.rombel);
          perSekolah[r.npsn].siswa += r.count;
        }
        const result: Record<string, { rombels: number; siswa: number }> = {};
        for (const [npsn, v] of Object.entries(perSekolah)) {
          result[npsn] = { rombels: v.rombels.size, siswa: v.siswa };
        }
        setStats(result);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const levels = ['SD', 'TK', 'KB'];
  const schools = ALL_SCHOOLS.filter(s => s.level === levelTab).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-cyan-400" /> Manajemen Rombel
          </h1>
          <p className="text-sm text-slate-400 mt-1">Rombongan belajar per sekolah — {levelTab}</p>
        </div>
      </div>

      {/* Level Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-lg p-1 w-fit">
        {levels.map(lv => (
          <button key={lv} onClick={() => setLevelTab(lv)}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              levelTab === lv ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {lv} ({ALL_SCHOOLS.filter(s => s.level === lv).length} sekolah)
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat data...</div>
      ) : schools.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <School className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Tidak ada sekolah jenjang {levelTab}</p>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                <th className="text-left px-4 py-3">NPSN</th>
                <th className="text-left px-4 py-3">Nama Sekolah</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Desa</th>
                <th className="text-center px-4 py-3">Rombel</th>
                <th className="text-center px-4 py-3">Siswa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {schools.map(s => {
                const st = stats[s.npsn] || { rombels: 0, siswa: 0 };
                return (
                  <tr key={s.npsn} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{s.npsn}</td>
                    <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        s.status === 'Negeri' ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-400 bg-amber-950/40'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">{s.village}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-cyan-300 font-mono font-bold">{st.rombels}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-mono font-bold">{st.siswa}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
