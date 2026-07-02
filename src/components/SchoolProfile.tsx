import React, { useState, useEffect } from 'react';
import { MapPin, Users, Wifi, Building2, Award, ChevronLeft, AlertTriangle, GraduationCap } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

interface SchoolDetail {
  npsn: string; name: string; level: string; status: string; village: string;
  accreditation: string; lat: number; lng: number; healthScore: number;
  students: { total: number; male: number; female: number; byGrade: Record<string, number>; growthTrend: number[] };
  teachers: { total: number; certified: number; pns: number; pppk: number; honorer: number; retiringSoon: number };
  facilities: { classroomCondition: { good: number; lightDamage: number; heavyDamage: number }; hasLibrary: boolean; hasLab: boolean; internetSpeedMbps: number };
  riskIndicators: { teacherShortage: boolean; studentOverload: boolean; infrastructureCritical: boolean; retirementExposure: boolean };
  studentStats: { total: number; male: number; female: number; byGrade: Record<string, number> } | null;
  teacherStats: { total: number; certified: number; pns: number; pppk: number; honorer: number } | null;
}

const THEME = 'dark';
const npsnToSchool = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.name]));
const npsnList = ALL_SCHOOLS.map(s => s.npsn);

export default function SchoolProfile({ selectedNpsn, onBack }: { selectedNpsn?: string; onBack?: () => void }) {
  const [npsn, setNpsn] = useState(selectedNpsn || npsnList[0]);
  const [data, setData] = useState<SchoolDetail | null>(null);
  const [tab, setTab] = useState<'siswa' | 'guru' | 'fasilitas'>('siswa');

  useEffect(() => {
    if (!selectedNpsn) return;
    setNpsn(selectedNpsn);
  }, [selectedNpsn]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/schools/${npsn}`);
        if (r.ok) setData(await r.json());
      } catch {}
    })();
  }, [npsn]);

  const school = ALL_SCHOOLS.find(s => s.npsn === npsn);
  if (!school && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="h-5 w-5" /></button>}
          <h1 className="text-2xl font-bold text-white">Profil Sekolah</h1>
        </div>
        <select value={npsn} onChange={e => setNpsn(e.target.value)} className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white">
          {ALL_SCHOOLS.map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
        </select>
        <p className="text-slate-500">Pilih sekolah untuk melihat profil.</p>
      </div>
    );
  }

  const d = data || school;
  const s = d as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="h-5 w-5" /></button>}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{d.name}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${d.accreditation === 'A' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800' : d.accreditation === 'B' ? 'text-amber-400 bg-amber-950/40 border border-amber-800' : 'text-slate-400 bg-slate-800 border border-slate-700'}`}>{d.accreditation}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            NPSN: {d.npsn} • {d.village} • {d.status} • {d.level}
          </p>
        </div>
      </div>

      {/* Score Card */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-900 bg-cyan-950/20">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-2"><Award className="h-4 w-4" /> HEALTH SCORE</div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{d.healthScore}</span>
            <span className="text-sm text-slate-500 mb-1">/100</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${d.healthScore >= 60 ? 'bg-emerald-500' : d.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${d.healthScore}%`}} />
          </div>
        </div>
        <div className="p-4 rounded-xl border border-blue-900 bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-mono mb-2"><Users className="h-4 w-4" /> SISWA</div>
          <p className="text-3xl font-bold text-white">{s.students?.total || s.studentStats?.total || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">L: {s.students?.male || 0} / P: {s.students?.female || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-900 bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-2"><GraduationCap className="h-4 w-4" /> GURU</div>
          <p className="text-3xl font-bold text-white">{s.teachers?.total || s.teacherStats?.total || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Sertifikasi: {s.teachers?.certified || 0}</p>
        </div>
        <div className={`p-4 rounded-xl border ${d.riskIndicators?.teacherShortage || d.riskIndicators?.infrastructureCritical ? 'border-red-900 bg-red-950/20' : 'border-slate-700 bg-slate-900/40'}`}>
          <div className="flex items-center gap-2 text-xs font-mono mb-2"><AlertTriangle className={`h-4 w-4 ${d.riskIndicators?.teacherShortage ? 'text-red-400' : 'text-slate-500'}`} /> RISIKO</div>
          {d.riskIndicators ? (
            <div className="space-y-1">
              {Object.entries(d.riskIndicators).filter(([, v]) => v).map(([k]) => (
                <span key={k} className="block text-[10px] text-red-400 font-mono">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
              ))}
              {!Object.values(d.riskIndicators).some(Boolean) && <span className="text-[11px] text-emerald-400">Tidak ada risiko</span>}
            </div>
          ) : <span className="text-slate-500 text-sm">-</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {[
          { id: 'siswa', label: 'Siswa', icon: Users },
          { id: 'guru', label: 'Guru & Pegawai', icon: GraduationCap },
          { id: 'fasilitas', label: 'Fasilitas', icon: Building2 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'siswa' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Distribusi per Kelas</h3>
            {s.students?.byGrade && Object.keys(s.students.byGrade).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(s.students.byGrade as Record<string, number>).map(([kelas, count]) => (
                  <div key={kelas}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{kelas}</span><span>{count} siswa</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{width: `${(count / (s.students?.total || 1)) * 100}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Data per kelas tidak tersedia</p>
            )}
          </div>
          <div className="border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tren Pertumbuhan</h3>
            {s.students?.growthTrend && s.students.growthTrend.length > 0 ? (
              <div className="flex items-end gap-2 h-32">
                {s.students.growthTrend.map((val: number, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-cyan-500/80 rounded-t" style={{height: `${(val / Math.max(...s.students.growthTrend)) * 100}%`}} />
                    <span className="text-[9px] text-slate-500 font-mono">{2021 + i}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Data tren tidak tersedia</p>}
          </div>
        </div>
      )}

      {tab === 'guru' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Komposisi Status</h3>
            <div className="space-y-3">
              {[
                { label: 'PNS', value: s.teachers?.pns || 0, color: 'bg-indigo-500' },
                { label: 'PPPK', value: s.teachers?.pppk || 0, color: 'bg-emerald-500' },
                { label: 'Honorer', value: s.teachers?.honorer || 0, color: 'bg-amber-500' },
                { label: 'Tersertifikasi', value: s.teachers?.certified || 0, color: 'bg-cyan-500' },
              ].map(item => {
                const total = s.teachers?.total || 1;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{item.label}</span><span>{item.value} orang</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{width: `${(item.value / total) * 100}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Informasi Guru</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Total Guru</span><span className="text-white font-semibold">{s.teachers?.total || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Pensiun &lt; 3 tahun</span><span className="text-red-400 font-semibold">{s.teachers?.retiringSoon || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Rasio Siswa:Guru</span><span className="text-white font-semibold">{((s.students?.total || 0) / ((s.teachers?.total || 1))).toFixed(1)}:1</span></div>
              {s.teachers?.subjects && (
                <div className="mt-4">
                  <p className="text-xs text-slate-400 font-mono mb-2">Guru per Mata Pelajaran</p>
                  {Object.entries(s.teachers.subjects as Record<string, number>).map(([mapel, count]) => (
                    <div key={mapel} className="flex justify-between text-xs py-0.5"><span className="text-slate-400">{mapel}</span><span className="text-slate-300">{count}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'fasilitas' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Kondisi Ruang Kelas</h3>
            {s.facilities?.classroomCondition ? (
              <div className="space-y-3">
                {[
                  { label: 'Baik', value: s.facilities.classroomCondition.good, color: 'bg-emerald-500' },
                  { label: 'Rusak Ringan', value: s.facilities.classroomCondition.lightDamage, color: 'bg-amber-500' },
                  { label: 'Rusak Berat', value: s.facilities.classroomCondition.heavyDamage, color: 'bg-red-500' },
                ].map(item => {
                  const total = s.facilities.classroomCondition.good + s.facilities.classroomCondition.lightDamage + s.facilities.classroomCondition.heavyDamage || 1;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{item.label}</span><span>{item.value} ruang</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{width: `${(item.value / total) * 100}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-slate-500">Data tidak tersedia</p>}
          </div>
          <div className="border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Fasilitas Lainnya</h3>
            {s.facilities ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 py-2 border-b border-slate-800">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  <span className="flex-1 text-slate-400">Perpustakaan</span>
                  <span className={s.facilities.hasLibrary ? 'text-emerald-400' : 'text-red-400'}>{s.facilities.hasLibrary ? 'Ada' : 'Tidak'}</span>
                </div>
                <div className="flex items-center gap-3 py-2 border-b border-slate-800">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  <span className="flex-1 text-slate-400">Lab Komputer</span>
                  <span className={s.facilities.hasLab ? 'text-emerald-400' : 'text-red-400'}>{s.facilities.hasLab ? 'Ada' : 'Tidak'}</span>
                </div>
                <div className="flex items-center gap-3 py-2 border-b border-slate-800">
                  <Wifi className="h-4 w-4 text-cyan-400" />
                  <span className="flex-1 text-slate-400">Internet</span>
                  <span className="text-slate-300">{s.facilities.internetSpeedMbps || 0} Mbps</span>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span className="flex-1 text-slate-400">Koordinat</span>
                  <span className="text-slate-300 text-[11px] font-mono">{d.lat?.toFixed(4)}, {d.lng?.toFixed(4)}</span>
                </div>
              </div>
            ) : <p className="text-sm text-slate-500">Data tidak tersedia</p>}
          </div>
        </div>
      )}
    </div>
  );
}
