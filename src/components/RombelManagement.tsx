import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { School, BookOpen, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthContext';

interface SchoolData {
  npsn: string;
  name: string;
  level: string;
  status: string;
  village: string;
}

interface RombelEntry {
  npsn: string;
  rombel: string;
  count: number;
  jenjang: string;
}

export default function RombelManagement() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator_sekolah';
  const operatorLevel = user?.schoolLevel || 'SD';
  const [levelTab, setLevelTab] = useState(operatorLevel);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [stats, setStats] = useState<Record<string, { rombels: number; siswa: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rSchools, rRombel] = await Promise.all([
          api('/api/schools').then(r => { if (!r.ok) throw new Error('Gagal memuat sekolah'); return r.json(); }),
          api('/api/students/rombels').then(r => { if (!r.ok) throw new Error('Gagal memuat rombel'); return r.json(); }),
        ]);
        setSchools(rSchools);

        const perSekolah: Record<string, { rombels: Set<string>; siswa: number }> = {};
        for (const r of rRombel as RombelEntry[]) {
          if (!perSekolah[r.npsn]) perSekolah[r.npsn] = { rombels: new Set(), siswa: 0 };
          perSekolah[r.npsn].rombels.add(r.rombel);
          perSekolah[r.npsn].siswa += r.count;
        }
        const result: Record<string, { rombels: number; siswa: number }> = {};
        for (const [npsn, v] of Object.entries(perSekolah)) {
          result[npsn] = { rombels: v.rombels.size, siswa: v.siswa };
        }
        setStats(result);
      } catch (e: any) {
        setError(e.message || 'Gagal memuat data');
      }
      setLoading(false);
    })();
  }, []);

  const levels = isOperator ? [operatorLevel] : ['SD', 'TK', 'KB'];
  const filteredSchools = schools
    .filter(s => s.level === levelTab)
    .sort((a, b) => a.name.localeCompare(b.name));

  const levelCounts = levels.reduce((acc, lv) => {
    acc[lv] = schools.filter(s => s.level === lv).length;
    return acc;
  }, {} as Record<string, number>);

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
            {lv} ({levelCounts[lv] || 0} sekolah)
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat data...</div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 py-12 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : filteredSchools.length === 0 ? (
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
              {filteredSchools.map(s => {
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
