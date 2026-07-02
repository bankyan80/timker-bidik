import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, BarChart3, Users, School, Award, ChevronDown } from 'lucide-react';
import { ALL_SCHOOLS, GET_VILLAGE_STATS } from '../data/mockData';

const THEME = 'dark';
const npsnToSchool = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.name]));

interface SchoolStat {
  npsn: string; name: string; village: string; healthScore: number;
  students: { total: number }; teachers: { total: number; certified: number };
}

export default function TargetKPI() {
  const [schools, setSchools] = useState<SchoolStat[]>([]);
  const [view, setView] = useState<'sekolah' | 'desa'>('sekolah');
  const [sortBy, setSortBy] = useState('healthScore');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/schools/stats');
        if (r.ok) setSchools(await r.json());
      } catch {}
    })();
  }, []);

  const sorted = [...schools].sort((a, b) => {
    if (sortBy === 'healthScore') return b.healthScore - a.healthScore;
    if (sortBy === 'students') return (b.students?.total || 0) - (a.students?.total || 0);
    if (sortBy === 'ratio') {
      const rA = (a.students?.total || 0) / (a.teachers?.total || 1);
      const rB = (b.students?.total || 0) / (b.teachers?.total || 1);
      return rA - rB;
    }
    return 0;
  });

  const villageStats = GET_VILLAGE_STATS();
  const avgHealth = schools.reduce((s, sc) => s + sc.healthScore, 0) / (schools.length || 1);
  const totalSiswa = schools.reduce((s, sc) => s + (sc.students?.total || 0), 0);
  const totalGuru = schools.reduce((s, sc) => s + (sc.teachers?.total || 0), 0);
  const avgRatio = totalGuru > 0 ? (totalSiswa / totalGuru).toFixed(1) : '0';
  const totalCertified = schools.reduce((s, sc) => s + (sc.teachers?.certified || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white tracking-tight">Target & KPI</h1><p className="text-sm text-slate-400 mt-1">Capaian indikator kinerja pendidikan Kecamatan Lemahabang</p></div>
        <div className="flex gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
          <button onClick={() => setView('sekolah')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'sekolah' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>Per Sekolah</button>
          <button onClick={() => setView('desa')} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'desa' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>Per Desa</button>
        </div>
      </div>

      {/* Global KPI */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Rata-rata Health Score', value: avgHealth.toFixed(0), suffix: '/100', icon: Target, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-900', trend: avgHealth > 50 ? 'naik' : 'turun' },
          { label: 'Total Siswa', value: totalSiswa.toLocaleString(), suffix: '', icon: Users, color: 'text-blue-400 bg-blue-950/40 border-blue-900', trend: 'naik' },
          { label: 'Total Guru', value: totalGuru, suffix: '', icon: Users, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900', trend: 'stabil' },
          { label: 'Rasio S:G', value: avgRatio, suffix: ':1', icon: BarChart3, color: 'text-amber-400 bg-amber-950/40 border-amber-900', trend: Number(avgRatio) > 20 ? 'turun' : 'baik' },
          { label: 'Sertifikasi', value: totalCertified, suffix: `/${totalGuru}`, icon: Award, color: 'text-purple-400 bg-purple-950/40 border-purple-900', trend: 'naik' },
        ].map((c, i) => (
          <div key={i} className={`p-4 rounded-xl border ${c.color}`}>
            <div className="flex items-center gap-2">
              <c.icon className="h-4 w-4 opacity-70" />
              <span className="text-[10px] font-mono opacity-60">{c.label}</span>
            </div>
            <p className="text-2xl font-bold mt-1 tracking-tight text-white">{c.value}<span className="text-sm font-normal text-slate-500">{c.suffix}</span></p>
            <span className={`text-[10px] ${c.trend === 'naik' ? 'text-emerald-400' : c.trend === 'turun' ? 'text-red-400' : 'text-amber-400'}`}>{c.trend === 'naik' ? '↑ Naik' : c.trend === 'turun' ? '↓ Turun' : '→ Stabil'}</span>
          </div>
        ))}
      </div>

      {view === 'sekolah' ? (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Peringkat Sekolah</h3>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300">
              <option value="healthScore">Health Score</option>
              <option value="students">Jumlah Siswa</option>
              <option value="ratio">Rasio S:G (terbaik)</option>
            </select>
          </div>
          <div className="divide-y divide-slate-800">
            {sorted.map((s, i) => {
              const ratio = (s.students?.total || 0) / (s.teachers?.total || 1);
              return (
                <div key={s.npsn} className="flex items-center px-4 py-3 hover:bg-slate-800/30 transition-colors">
                  <span className={`w-6 text-sm font-bold ${i < 3 ? 'text-cyan-400' : 'text-slate-500'}`}>#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{s.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{s.village}</p>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-slate-400">
                    <span>{s.students?.total || 0} siswa</span>
                    <span>1:{ratio.toFixed(0)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.healthScore >= 60 ? 'bg-emerald-500' : s.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{width: `${s.healthScore}%`}} />
                      </div>
                      <span className={`text-sm font-bold ${s.healthScore >= 60 ? 'text-emerald-400' : s.healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{s.healthScore}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {villageStats.map(v => (
            <div key={v.name} className="border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{v.name}</h3>
                <span className={`text-xs font-bold ${v.avgHealthScore >= 60 ? 'text-emerald-400' : v.avgHealthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{v.avgHealthScore}/100</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-lg font-bold text-white">{v.totalSchools}</p><p className="text-[10px] text-slate-500 font-mono">Sekolah</p></div>
                <div><p className="text-lg font-bold text-white">{v.totalStudents}</p><p className="text-[10px] text-slate-500 font-mono">Siswa</p></div>
                <div><p className="text-lg font-bold text-white">{v.totalTeachers}</p><p className="text-[10px] text-slate-500 font-mono">Guru</p></div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Kekurangan Guru</span><span className={v.teacherShortage > 0 ? 'text-red-400' : 'text-emerald-400'}>{v.teacherShortage > 0 ? `-${v.teacherShortage}` : '0'}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Pertumbuhan Siswa</span><span className={v.studentGrowthRate > 0 ? 'text-emerald-400' : 'text-red-400'}>{v.studentGrowthRate > 0 ? '+' : ''}{v.studentGrowthRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
