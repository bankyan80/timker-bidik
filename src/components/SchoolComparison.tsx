import React, { useState, useEffect } from 'react';
import { BarChart3, Users, GraduationCap, Building2, Award, Wifi, BookOpen, Plus, X, MapPin } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

interface SchoolStats {
  npsn: string; name: string; level: string; status: string; village: string;
  accreditation: string; healthScore: number;
  students: { total: number; male: number; female: number; byGrade: Record<string, number> };
  teachers: { total: number; certified: number; pns: number; pppk: number; honorer: number };
  riskIndicators: Record<string, boolean>;
}

export default function SchoolComparison() {
  const [schools, setSchools] = useState<SchoolStats[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/schools/stats');
        if (r.ok) setSchools(await r.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  const selData = schools.filter(s => selected.includes(s.npsn));

  function toggle(npsn: string) {
    setSelected(prev => prev.includes(npsn) ? prev.filter(p => p !== npsn) : [...prev, npsn]);
  }

  const metrics = [
    { key: 'healthScore', label: 'Health Score', color: 'text-cyan-400', barColor: 'bg-cyan-500' },
    { key: 'students.total', label: 'Total Siswa', color: 'text-blue-400', barColor: 'bg-blue-500' },
    { key: 'students.male', label: 'Siswa Laki-laki', color: 'text-indigo-400', barColor: 'bg-indigo-500' },
    { key: 'students.female', label: 'Siswa Perempuan', color: 'text-pink-400', barColor: 'bg-pink-500' },
    { key: 'teachers.total', label: 'Total Guru', color: 'text-emerald-400', barColor: 'bg-emerald-500' },
    { key: 'teachers.certified', label: 'Tersertifikasi', color: 'text-cyan-400', barColor: 'bg-cyan-500' },
    { key: 'teachers.pns', label: 'Guru PNS', color: 'text-purple-400', barColor: 'bg-purple-500' },
    { key: 'teachers.pppk', label: 'Guru PPPK', color: 'text-teal-400', barColor: 'bg-teal-500' },
    { key: 'teachers.honorer', label: 'Guru Honorer', color: 'text-amber-400', barColor: 'bg-amber-500' },
  ];

  function getVal(obj: any, path: string): number {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : 0), obj);
  }

  function maxVal(path: string): number {
    return Math.max(...selData.map(s => getVal(s, path)), 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Perbandingan Sekolah</h1>
          <p className="text-sm text-slate-400 mt-1">Bandingkan data sekolah secara side-by-side</p>
        </div>
      </div>

      {/* Selector */}
      <div className="border border-slate-800 rounded-xl p-4">
        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 block">Pilih Sekolah (klik untuk bandingkan)</label>
        <div className="flex flex-wrap gap-2">
          {ALL_SCHOOLS.map(s => {
            const isSel = selected.includes(s.npsn);
            return (
              <button key={s.npsn} onClick={() => toggle(s.npsn)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isSel ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}>
                {isSel && <X className="h-3 w-3 inline mr-1" />}
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {selData.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Pilih minimal 2 sekolah untuk memulai perbandingan</p>
        </div>
      ) : (
        <>
          {/* Header Cards */}
          <div className={`grid gap-4 ${selData.length <= 3 ? `grid-cols-${selData.length}` : 'grid-cols-3'}`}>
            {selData.map(s => (
              <div key={s.npsn} className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">{s.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.accreditation === 'A' ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-400 bg-amber-950/40'}`}>{s.accreditation}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">{s.village} • NPSN: {s.npsn}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.healthScore >= 60 ? 'bg-emerald-500' : s.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{width: `${s.healthScore}%`}} />
                  </div>
                  <span className="text-lg font-bold text-white">{s.healthScore}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Metric Bars */}
          <div className="border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Perbandingan Metrik</h2>
            {metrics.map(m => {
              const max = maxVal(m.key);
              return (
                <div key={m.key}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span className={m.color}>{m.label}</span>
                    <div className="flex gap-4">
                      {selData.map(s => (
                        <span key={s.npsn} className="w-20 text-right font-mono text-white">{getVal(s, m.key)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 h-6">
                    {selData.map(s => (
                      <div key={s.npsn} className="flex-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.barColor} opacity-80`}
                          style={{width: `${(getVal(s, m.key) / max) * 100}%`}} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Risk Indicators */}
          <div className="border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Indikator Risiko</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-mono text-slate-400 uppercase">
                  <th className="text-left px-3 py-2">Indikator</th>
                  {selData.map(s => <th key={s.npsn} className="text-center px-3 py-2">{s.name}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {['teacherShortage', 'studentOverload', 'infrastructureCritical', 'retirementExposure'].map(risk => (
                    <tr key={risk}>
                      <td className="px-3 py-2.5 text-slate-300 text-xs">{risk.replace(/([A-Z])/g, ' $1').trim()}</td>
                      {selData.map(s => (
                        <td key={s.npsn} className="text-center px-3 py-2.5">
                          {(s.riskIndicators as any)[risk]
                            ? <span className="text-red-400 text-lg">⚠</span>
                            : <span className="text-emerald-400 text-lg">✓</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
