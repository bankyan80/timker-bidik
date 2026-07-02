import React, { useState, useEffect } from 'react';
import { Users, School, BookOpen, Search, ChevronDown } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

const npsnToSchool = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.name]));
const THEME = 'dark';

interface RombelGroup {
  npsn: string; rombel: string; count: number; students: any[];
}

export default function RombelManagement() {
  const [groups, setGroups] = useState<RombelGroup[]>([]);
  const [filterSchool, setFilterSchool] = useState('ALL');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rRombel, rSiswa] = await Promise.all([
          fetch('/api/students/rombels').then(r => r.ok ? r.json() : []),
          fetch('/api/students').then(r => r.ok ? r.json() : []),
        ]);
        const siswaByNpsnRombel: Record<string, any[]> = {};
        for (const s of rSiswa) {
          if (!s.rombel) continue;
          const key = `${s.school_npsn}:${s.rombel}`;
          if (!siswaByNpsnRombel[key]) siswaByNpsnRombel[key] = [];
          siswaByNpsnRombel[key].push(s);
        }
        const g = rRombel.map((r: any) => ({
          ...r,
          students: siswaByNpsnRombel[`${r.npsn}:${r.rombel}`] || [],
        }));
        setGroups(g);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = filterSchool === 'ALL' ? groups : groups.filter(g => g.npsn === filterSchool);
  const grouped: Record<string, RombelGroup[]> = {};
  for (const g of filtered) {
    const key = g.npsn;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Manajemen Rombel</h1>
          <p className="text-sm text-slate-400 mt-1">Kelompok belajar (rombongan belajar) per sekolah</p>
        </div>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Sekolah</option>
          {ALL_SCHOOLS.map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Memuat data...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada data rombel</p>
        </div>
      ) : Object.entries(grouped).map(([npsn, rombels]) => (
        <div key={npsn} className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">{npsnToSchool.get(npsn) || npsn}</h3>
            <p className="text-[10px] text-slate-500 font-mono">{rombels.length} rombel • {rombels.reduce((s, r) => s + r.count, 0)} siswa</p>
          </div>
          <div className="divide-y divide-slate-800">
            {rombels.map(r => {
              const isExp = expanded.includes(r.rombel);
              return (
                <div key={r.rombel}>
                  <button onClick={() => setExpanded(prev => isExp ? prev.filter(p => p !== r.rombel) : [...prev, r.rombel])}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-white font-medium">{r.rombel}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{r.count} siswa</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                  </button>
                  {isExp && (
                    <div className="px-4 pb-3">
                      {r.students.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">Tidak ada data siswa</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {r.students.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-900/60 rounded text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full ${s.jenis_kelamin?.toLowerCase().includes('laki') ? 'bg-blue-400' : 'bg-pink-400'}`} />
                              <span className="text-slate-300">{s.nama}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
