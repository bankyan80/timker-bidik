import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, Users, Wifi, Building2, Award, ChevronLeft, AlertTriangle, GraduationCap, Search, School as SchoolIcon } from 'lucide-react';
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

function SchoolCard({ school, onClick }: { school: any; onClick: () => void }) {
  const s = school;
  const studentCount = s.students?.total || s.studentStats?.total || 0;
  const teacherCount = s.teachers?.total || s.teacherStats?.total || 0;
  const ratio = teacherCount > 0 ? (studentCount / teacherCount).toFixed(1) : '-';
  const certified = s.teachers?.certified || s.teacherStats?.certified || 0;
  return (
    <div onClick={onClick} className="border border-slate-800 rounded-xl p-4 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{s.name}</h3>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">NPSN: {s.npsn} • {s.village}</p>
        </div>
        <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${
          s.accreditation === 'A' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800' :
          s.accreditation === 'B' ? 'text-amber-400 bg-amber-950/40 border border-amber-800' :
          'text-slate-400 bg-slate-800 border border-slate-700'
        }`}>{s.accreditation}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div><p className="text-lg font-bold text-white">{studentCount}</p><p className="text-[9px] text-slate-500 font-mono">Siswa</p></div>
        <div><p className="text-lg font-bold text-white">{teacherCount}</p><p className="text-[9px] text-slate-500 font-mono">Guru</p></div>
        <div><p className="text-lg font-bold text-white">1:{ratio}</p><p className="text-[9px] text-slate-500 font-mono">S:G</p></div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono">{certified} sertifikasi</span>
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${s.healthScore >= 60 ? 'bg-emerald-500' : s.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{width: `${s.healthScore}%`}} />
          </div>
          <span className={`text-xs font-bold ${s.healthScore >= 60 ? 'text-emerald-400' : s.healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{s.healthScore}</span>
        </div>
      </div>
    </div>
  );
}

export default function SchoolProfile({ selectedNpsn, onBack }: { selectedNpsn?: string; onBack?: () => void }) {
  const [npsn, setNpsn] = useState(selectedNpsn || null);
  const [data, setData] = useState<SchoolDetail | null>(null);
  const [tab, setTab] = useState<'siswa' | 'guru' | 'fasilitas'>('siswa');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'students'>('name');

  useEffect(() => {
    if (!selectedNpsn) return;
    setNpsn(selectedNpsn);
  }, [selectedNpsn]);

  useEffect(() => {
    if (!npsn) return;
    (async () => {
      try {
        const r = await api(`/api/schools/${npsn}`);
        if (r.ok) setData(await r.json());
      } catch {}
    })();
  }, [npsn]);

  // List view (no school selected)
  if (!npsn) {
    let filtered = [...ALL_SCHOOLS];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.npsn.includes(q) || s.village.toLowerCase().includes(q));
    }
    if (sortBy === 'health') filtered.sort((a, b) => b.healthScore - a.healthScore);
    else if (sortBy === 'students') filtered.sort((a, b) => b.students.total - a.students.total);
    else filtered.sort((a, b) => a.name.localeCompare(b.name));

    const avgHealth = Math.round(filtered.reduce((s, sc) => s + sc.healthScore, 0) / filtered.length);
    const totalStudents = filtered.reduce((s, sc) => s + sc.students.total, 0);
    const totalTeachers = filtered.reduce((s, sc) => s + sc.teachers.total, 0);
    const critical = filtered.filter(s => s.healthScore < 40).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Profil Sekolah</h1>
            <p className="text-sm text-slate-400 mt-1">{ALL_SCHOOLS.length} sekolah di Kecamatan Lemahabang</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/40">
            <p className="text-[10px] font-mono text-slate-400 mb-1">Total Sekolah</p>
            <p className="text-3xl font-bold text-white">{ALL_SCHOOLS.length}</p>
          </div>
          <div className="p-4 rounded-xl border border-blue-900 bg-blue-950/20">
            <p className="text-[10px] font-mono text-blue-400 mb-1">Total Siswa</p>
            <p className="text-3xl font-bold text-white">{totalStudents.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-900 bg-emerald-950/20">
            <p className="text-[10px] font-mono text-emerald-400 mb-1">Total Guru</p>
            <p className="text-3xl font-bold text-white">{totalTeachers}</p>
          </div>
          <div className="p-4 rounded-xl border border-amber-900 bg-amber-950/20">
            <p className="text-[10px] font-mono text-amber-400 mb-1">Rata-rata Health</p>
            <p className="text-3xl font-bold text-white">{avgHealth}<span className="text-sm text-slate-500">/100</span></p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari sekolah, NPSN, desa..." className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700"/>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="name">Nama A-Z</option>
            <option value="health">Health Score</option>
            <option value="students">Jumlah Siswa</option>
          </select>
        </div>

        {/* School Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(s => (
            <SchoolCard key={s.npsn} school={s} onClick={() => setNpsn(s.npsn)} />
          ))}
        </div>
        {filtered.length === 0 && <p className="text-center text-slate-500 py-8">Tidak ada sekolah ditemukan</p>}
      </div>
    );
  }

  // Detail view
  const school = ALL_SCHOOLS.find(s => s.npsn === npsn);
  if (!school && !data) {
    return <p className="text-slate-500">Memuat...</p>;
  }

  const d = data || school;
  const s = d as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => { setNpsn(null); setData(null); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="h-5 w-5" /></button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{d.name}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${d.accreditation === 'A' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800' : d.accreditation === 'B' ? 'text-amber-400 bg-amber-950/40 border border-amber-800' : 'text-slate-400 bg-slate-800 border border-slate-700'}`}>{d.accreditation}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">NPSN: {d.npsn} • {d.village} • {d.status} • {d.level}</p>
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
            ) : <p className="text-sm text-slate-500">Data per kelas tidak tersedia</p>}
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
