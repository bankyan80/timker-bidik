import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Plus, Edit3, Trash2, Users, BookOpen, School, Filter, GraduationCap, ChevronLeft, ChevronRight, Trash, ArrowUp, Eye, X, Loader2 } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';
import { useAuth } from './AuthContext';

interface Student {
  id: string; school_npsn: string; nama: string; nisn: string | null;
  nik: string | null; jenis_kelamin: string | null; tempat_lahir: string | null;
  tanggal_lahir: string | null; jenjang: string; kelas_kelompok: string;
  rombel: string | null; status_siswa: string; tahun_pelajaran: string;
}

const THEME = 'dark';
const npsnToSchool = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.name]));
const schoolLevel = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.level]));

const kelasByLevel: Record<string, string[]> = {
  SD: ['1', '2', '3', '4', '5', '6'],
  TK: ['TK A', 'TK B'],
  KB: ['Kelompok A', 'Kelompok B'],
};

export default function StudentManagement() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator_sekolah';
  const operatorNpsn = user?.schoolNpsn || '';
  const operatorName = user?.schoolName || '';

  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState(isOperator ? operatorNpsn : 'ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [levelTab, setLevelTab] = useState<string>('SD');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailTab, setDetailTab] = useState<'parents' | 'address' | 'health'>('parents');
  const [detailData, setDetailData] = useState<Record<string, any>>({ parents: null, address: null, health: null });
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailForm, setDetailForm] = useState<Record<string, string>>({});
  const [gradModalOpen, setGradModalOpen] = useState(false);
  const [gradStudents, setGradStudents] = useState<Student[]>([]);
  const [gradData, setGradData] = useState<Record<string, {status_lanjutan: string; tujuan_nama: string; tujuan_jenjang: string; alasan: string; alasan_detail: string}>>({});
  const [gradSaving, setGradSaving] = useState(false);
  const [nikLookup, setNikLookup] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [foundStudent, setFoundStudent] = useState<any>(null);

  const [form, setForm] = useState({
    school_npsn: isOperator ? operatorNpsn : '', nama: '', nisn: '', nik: '', jenis_kelamin: 'Laki-laki',
    tempat_lahir: '', tanggal_lahir: '', kelas_kelompok: 'Kelas 1',
    rombel: '', tahun_pelajaran: (() => { const y = new Date().getFullYear(); const m = new Date().getMonth(); return m >= 6 ? `${y}/${y+1}` : `${y-1}/${y}`; })()
  });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let f = students.filter(s => s.jenjang === levelTab);
    if (search) { const q = search.toLowerCase(); f = f.filter(s => s.nama.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q))); }
    if (filterSchool !== 'ALL') f = f.filter(s => s.school_npsn === filterSchool);
    if (filterKelas !== 'ALL') {
      if (levelTab === 'SD') f = f.filter(s => s.kelas_kelompok === 'Kelas ' + filterKelas);
      else f = f.filter(s => (s.rombel && s.rombel.toLowerCase() !== s.kelas_kelompok.toLowerCase() ? s.rombel : '-') === filterKelas);
    }
    setFiltered(f);
    setCurrentPage(1);
  }, [search, filterSchool, filterKelas, levelTab, students]);

  async function load() {
    setLoading(true);
    try {
      const r = await api('/api/students');
      if (r.ok) { const body = await r.json(); setStudents(body.data || body); }
    } catch {}
    setLoading(false);
  }

  async function save() {
    const selectedLevel = form.school_npsn ? (schoolLevel.get(form.school_npsn) || 'SD') : levelTab;
    // Map form values to DB format
    const kk = form.kelas_kelompok;
    const kelas_kelompok = selectedLevel === 'SD' ? (kk.match(/^Kelas /) ? kk : 'Kelas ' + kk) : kk;
    if (editId) {
      await api(`/api/students/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nama: form.nama, nisn: form.nisn || null, nik: form.nik || null,
        jenis_kelamin: form.jenis_kelamin, tempat_lahir: form.tempat_lahir || null,
        tanggal_lahir: form.tanggal_lahir || null, kelas_kelompok,
        rombel: form.rombel || null
      })});
    } else if (foundStudent) {
      // TK/KB student found by NIK — update jenjang to SD instead of creating new
      await api(`/api/students/${foundStudent.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nama: form.nama, nisn: form.nisn || null, nik: form.nik || null,
        jenis_kelamin: form.jenis_kelamin, tempat_lahir: form.tempat_lahir || null,
        tanggal_lahir: form.tanggal_lahir || null, kelas_kelompok,
        rombel: form.rombel || null, jenjang: 'SD', status_siswa: 'aktif'
      })});
    } else {
      await api('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        ...form, kelas_kelompok, nisn: form.nisn || null, nik: form.nik || null,
        jenjang: selectedLevel, status_siswa: 'aktif'
      })});
    }
    setFormOpen(false); setEditId(null); resetForm(); load();
  }

  async function remove(id: string) {
    if (!confirm('Hapus siswa ini?')) return;
    await api(`/api/students/${id}`, { method: 'DELETE' });
    load();
  }

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    const pageIds = paginated.filter(s => s.status_siswa === 'aktif').map(s => s.id);
    if (pageIds.every(id => checkedIds.has(id))) {
      setCheckedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.delete(id)); return next; });
    } else {
      setCheckedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.add(id)); return next; });
    }
  }

  async function bulkDelete() {
    if (checkedIds.size === 0) return;
    if (!confirm(`Hapus ${checkedIds.size} siswa yang dipilih?`)) return;
    for (const id of checkedIds) {
      await api(`/api/students/${id}`, { method: 'DELETE' });
    }
    setCheckedIds(new Set());
    load();
  }

  const GRADE_NEXT: Record<string, string> = {
    'Kelas 1': 'Kelas 2', 'Kelas 2': 'Kelas 3', 'Kelas 3': 'Kelas 4',
    'Kelas 4': 'Kelas 5', 'Kelas 5': 'Kelas 6',
    'Kelompok A': 'Kelompok B',
  };

  async function naikKelas() {
    if (checkedIds.size === 0) return;
    const selected = students.filter(s => checkedIds.has(s.id));
    const kelas6 = selected.filter(s => s.kelas_kelompok === 'Kelas 6');
    const non6 = selected.filter(s => s.kelas_kelompok !== 'Kelas 6');
    if (kelas6.length > 0 && non6.length === 0) {
      // Only Kelas 6 selected — show graduation modal directly
      setGradStudents(kelas6);
      const init: Record<string, any> = {};
      kelas6.forEach(s => { init[s.id] = { status_lanjutan: '', tujuan_nama: '', tujuan_jenjang: '', alasan: '', alasan_detail: '' }; });
      setGradData(init);
      setGradModalOpen(true);
      return;
    }
    if (kelas6.length > 0 && non6.length > 0) {
      // Mixed — promote non-6 first
      if (!confirm(`Naikkan ${non6.length} siswa ke kelas berikutnya? ${kelas6.length} siswa Kelas 6 akan diproses kelulusan.`)) return;
      for (const s of non6) {
        const next = GRADE_NEXT[s.kelas_kelompok];
        if (!next) continue;
        await api(`/api/students/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kelas_kelompok: next, rombel: null }) });
      }
      setGradStudents(kelas6);
      const init: Record<string, any> = {};
      kelas6.forEach(s => { init[s.id] = { status_lanjutan: '', tujuan_nama: '', tujuan_jenjang: '', alasan: '', alasan_detail: '' }; });
      setGradData(init);
      setGradModalOpen(true);
      load();
      return;
    }
    // No Kelas 6 — promote normally
    if (!confirm(`Naikkan ${non6.length} siswa yang dipilih ke kelas berikutnya?`)) return;
    let promoted = 0;
    for (const s of non6) {
      const next = GRADE_NEXT[s.kelas_kelompok];
      if (!next) continue;
      await api(`/api/students/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelas_kelompok: next, rombel: null }),
      });
      promoted++;
    }
    setCheckedIds(new Set());
    if (promoted > 0) load();
  }

  function resetForm() { setNikLookup('idle'); setFoundStudent(null); const y = new Date().getFullYear(); const m = new Date().getMonth(); const tp = m >= 6 ? `${y}/${y+1}` : `${y-1}/${y}`; setForm({ school_npsn: '', nama: '', nisn: '', nik: '', jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', kelas_kelompok: '1', rombel: '', tahun_pelajaran: tp }); }

    async function openDetail(s: Student) {
    setDetailStudent(s);
    setDetailTab('parents');
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailForm({});
    try {
      const r = await api(`/api/students/${s.id}/detail`);
      if (r.ok) {
        const data = await r.json();
        setDetailData(data);
        // Initialize form from whichever tab has data
        const source = data.parents || data.address || data.health || {};
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.parents || {})) if (v) flat[k] = String(v);
        for (const [k, v] of Object.entries(data.address || {})) if (v) flat[k] = String(v);
        for (const [k, v] of Object.entries(data.health || {})) if (v) flat[k] = String(v);
        setDetailForm(flat);
      }
    } catch {}
    setDetailLoading(false);
  }

  function detailField(key: string): string {
    return detailForm[key] || '';
  }

  function setDetailField(key: string, val: string) {
    setDetailForm(prev => ({ ...prev, [key]: val }));
  }

  async function saveDetail() {
    if (!detailStudent) return;
    setDetailSaving(true);
    try {
      // Build section data from form keys
      const pKeys = ['nama_ayah','nik_ayah','pendidikan_ayah','pekerjaan_ayah','penghasilan_ayah','no_hp_ayah','status_ayah','nama_ibu','nik_ibu','pendidikan_ibu','pekerjaan_ibu','penghasilan_ibu','no_hp_ibu','status_ibu','nama_wali','nik_wali','hubungan_wali','pendidikan_wali','pekerjaan_wali','penghasilan_wali','no_hp_wali'];
      const aKeys = ['provinsi','kabupaten','kecamatan','desa','dusun','alamat','rt','rw','kode_pos','lat','lng','jarak_sekolah','transportasi','waktu_tempuh'];
      const hKeys = ['golongan_darah','tinggi_badan','berat_badan','riwayat_penyakit','kebutuhan_khusus','catatan'];

      const parents: Record<string, string> = {};
      const address: Record<string, string> = {};
      const health: Record<string, string> = {};
      for (const k of pKeys) if (detailForm[k]) parents[k] = detailForm[k];
      for (const k of aKeys) if (detailForm[k]) address[k] = detailForm[k];
      for (const k of hKeys) if (detailForm[k]) health[k] = detailForm[k];

      const r = await api(`/api/students/${detailStudent.id}/detail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parents, address, health }),
      });
      if (r.ok) setDetailData(await r.json());
    } catch {}
    setDetailSaving(false);
  }

function normalizeGender(val: string | null | undefined): 'Laki-laki' | 'Perempuan' {
    if (!val) return 'Laki-laki';
    const low = val.toLowerCase();
    if (low.includes('perempuan') || low.includes('p')) return 'Perempuan';
    return 'Laki-laki';
  }

  function openEdit(s: Student) {
    setEditId(s.id);
    const kk = s.jenjang === 'SD' && s.kelas_kelompok?.startsWith('Kelas ') ? s.kelas_kelompok.slice(6) : s.kelas_kelompok;
    setForm({ school_npsn: s.school_npsn, nama: s.nama, nisn: s.nisn || '', nik: s.nik || '', jenis_kelamin: normalizeGender(s.jenis_kelamin), tempat_lahir: s.tempat_lahir || '', tanggal_lahir: s.tanggal_lahir || '', kelas_kelompok: kk, rombel: s.rombel || '', tahun_pelajaran: s.tahun_pelajaran });
    setFormOpen(true);
  }

  function handleSchoolChange(npsn: string) {
    const lv = schoolLevel.get(npsn) || 'SD';
    const groups = kelasByLevel[lv] || ['Kelas 1'];
    setForm({ ...form, school_npsn: npsn, kelas_kelompok: lv === 'SD' ? groups[0] : 'Kelompok A', rombel: '' });
  }

  const levels = ['SD', 'TK', 'KB'];
  const levelCount = (lv: string) => students.filter(s => s.jenjang === lv).length;
  const currentKelasList = kelasByLevel[levelTab] || ['Kelas 1'];
  const total = students.length;
  const filteredByLevel = students.filter(s => s.jenjang === levelTab);
  const laki = filteredByLevel.filter(s => (s.jenis_kelamin || '').toLowerCase().includes('laki') || s.jenis_kelamin === 'L').length;
  const perempuan = filteredByLevel.filter(s => (s.jenis_kelamin || '').toLowerCase().includes('perempuan') || s.jenis_kelamin === 'P').length;
  const schools = new Set(filteredByLevel.map(s => s.school_npsn));
  const formLevel = form.school_npsn ? (schoolLevel.get(form.school_npsn) || 'SD') : levelTab;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-cyan-400" /> Manajemen Siswa
          </h1>
          <p className="text-sm text-slate-400 mt-1">Data siswa se-Kecamatan Lemahabang — {total} total</p>
        </div>
        <button onClick={() => { setEditId(null); resetForm(); setFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> Tambah Siswa
        </button>
      </div>

      {/* Level Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-lg p-1 w-fit">
        {levels.map(lv => (
          <button key={lv} onClick={() => { setLevelTab(lv); setFilterSchool('ALL'); setFilterKelas('ALL'); }}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
              levelTab === lv ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {lv} ({levelCount(lv)})
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Siswa', value: filteredByLevel.length, icon: Users, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-900' },
          { label: 'Laki-laki', value: laki, icon: Users, color: 'text-blue-400 bg-blue-950/40 border-blue-900' },
          { label: 'Perempuan', value: perempuan, icon: Users, color: 'text-pink-400 bg-pink-950/40 border-pink-900' },
          { label: 'Sekolah', value: schools.size, icon: School, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900' },
        ].map((c, i) => (
          <div key={i} className={`p-4 rounded-xl border ${c.color}`}>
            <div className="flex items-center gap-3">
              <c.icon className="h-5 w-5 opacity-70" />
              <span className="text-xs font-mono opacity-60">{c.label}</span>
            </div>
            <p className="text-3xl font-bold mt-2 tracking-tight">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NISN..." className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700"/>
        </div>
        {!isOperator && (
          <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="ALL">Semua Sekolah</option>
            {ALL_SCHOOLS.filter(s => s.level === levelTab).map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
          </select>
        )}
        {levelTab === 'SD' ? (
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="ALL">Semua Tingkat</option>
            {currentKelasList.map(k => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
        ) : (
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="ALL">Semua Rombel</option>
            {[...new Set(filteredByLevel.map(s => s.rombel && s.rombel.toLowerCase() !== s.kelas_kelompok.toLowerCase() ? s.rombel : '-').filter(Boolean))].map(r => <option key={r} value={r}>{r === '-' ? '— (tanpa rombel)' : r}</option>)}
          </select>
        )}
      </div>

      {/* Bulk Delete */}
      {checkedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-900/50 rounded-lg">
          <span className="text-xs font-mono text-red-300">{checkedIds.size} siswa dipilih</span>
          <button onClick={naikKelas} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono rounded transition-colors cursor-pointer">
            <ArrowUp className="h-3 w-3" /> Naik Kelas
          </button>
          <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-mono rounded transition-colors cursor-pointer">
            <Trash className="h-3 w-3" /> Hapus Semua
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
                <th className="w-10 px-2 py-3 text-center">
                  <input type="checkbox" checked={paginated.length > 0 && paginated.filter(s => s.status_siswa === 'aktif').every(st => checkedIds.has(st.id))}
                    onChange={toggleAllPage}
                    className="accent-cyan-600 cursor-pointer" />
                </th>
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left px-4 py-3">NISN</th>
                <th className="text-left px-4 py-3">JK</th>
                <th className="text-left px-4 py-3">{levelTab === 'SD' ? 'Tingkat' : 'Rombel'}</th>
                {levelTab === 'SD' && <th className="text-left px-4 py-3">Rombel</th>}
                <th className="text-left px-4 py-3">Sekolah</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={levelTab === 'SD' ? 9 : 8} className="text-center py-12 text-slate-500">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={levelTab === 'SD' ? 9 : 8} className="text-center py-12 text-slate-500">Tidak ada data siswa untuk jenjang {levelTab}</td></tr>
              ) : paginated.map(s => (
                <tr key={s.id} className={`hover:bg-slate-800/30 transition-colors ${checkedIds.has(s.id) ? 'bg-cyan-950/20' : ''}`}>
                  <td className="w-10 px-2 py-3 text-center">
                    {s.status_siswa === 'aktif' ? (
                      <input type="checkbox" checked={checkedIds.has(s.id)} onChange={() => toggleCheck(s.id)} className="accent-cyan-600 cursor-pointer" />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{s.nama}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{s.nisn || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${(s.jenis_kelamin || '').toLowerCase().includes('laki') || s.jenis_kelamin === 'L' ? 'text-blue-400 bg-blue-950/40' : 'text-pink-400 bg-pink-950/40'}`}>
                      {(s.jenis_kelamin || '').toLowerCase().includes('laki') || s.jenis_kelamin === 'L' ? 'L' : 'P'}
                    </span>
                  </td>
                  {levelTab === 'SD' ? (
                    <>
                      <td className="px-4 py-3 text-slate-300">{s.kelas_kelompok}</td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{s.rombel && s.rombel.toLowerCase() !== s.kelas_kelompok.toLowerCase() ? s.rombel : '-'}</td>
                    </>
                  ) : (
                    <td className="px-4 py-3 text-slate-300">{s.rombel || s.kelas_kelompok}</td>
                  )}
                  <td className="px-4 py-3 text-slate-300 text-[11px]">{npsnToSchool.get(s.school_npsn) || s.school_npsn}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${s.status_siswa === 'aktif' ? 'text-emerald-400 bg-emerald-950/40' : 'text-red-400 bg-red-950/40'}`}>{s.status_siswa}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(s)} className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-emerald-400" title="Detail Siswa"><Eye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-cyan-400"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
          <span>Total: {filtered.length} siswa {levelTab} {filterSchool !== 'ALL' || filterKelas !== 'ALL' ? '(difilter)' : ''}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Hal {currentPage}/{totalPages || 1}</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 px-1 py-0.5 outline-none">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={999999}>Semua</option>
            </select>
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-all cursor-pointer">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-all cursor-pointer">
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setFormOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h2>
              {!editId && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  formLevel === 'SD' ? 'text-blue-400 bg-blue-950/40' :
                  formLevel === 'TK' ? 'text-pink-400 bg-pink-950/40' :
                  'text-emerald-400 bg-emerald-950/40'
                }`}>{formLevel}</span>
              )}
            </div>
            {!editId && (
              <p className="text-[11px] text-slate-400 font-mono -mt-1">
                {formLevel === 'SD' ? 'Masukkan NIK untuk cari data dari TK/KB, atau isi manual' :
                 formLevel === 'TK' ? 'Isi data siswa baru untuk jenjang TK' :
                 'Isi data siswa baru untuk jenjang KB'}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {/* SD: NIK lookup for auto-fill from TK/KB */}
              {formLevel === 'SD' && !editId && (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">
                    NIK <span className="text-cyan-400">(Cari data dari TK/KB)</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input value={form.nik} onChange={e => { setForm({...form, nik: e.target.value}); if (foundStudent) { setFoundStudent(null); setNikLookup('idle'); } }}
                      onBlur={async () => {
                        const nik = form.nik.trim();
                        if (nik.length < 5) return;
                        setNikLookup('loading');
                        try {
                          const r = await api('/api/students/lookup-by-nik/' + encodeURIComponent(nik));
                          if (r.ok) {
                            const data = await r.json();
                            if (data && data.id && data.jenjang !== 'SD') {
                              setFoundStudent(data);
                              setNikLookup('found');
                              setForm(p => ({
                                ...p, nama: data.nama || p.nama, nisn: data.nisn || p.nisn,
                                jenis_kelamin: data.jenis_kelamin?.toLowerCase().includes('laki') || data.jenis_kelamin === 'L' ? 'Laki-laki' : data.jenis_kelamin?.toLowerCase().includes('pere') || data.jenis_kelamin === 'P' ? 'Perempuan' : p.jenis_kelamin,
                                tempat_lahir: data.tempat_lahir || p.tempat_lahir, tanggal_lahir: data.tanggal_lahir || p.tanggal_lahir,
                              }));
                            } else {
                              setFoundStudent(null);
                              setNikLookup(data ? 'notfound' : 'notfound');
                            }
                          } else { setNikLookup('notfound'); }
                        } catch { setNikLookup('notfound'); }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"
                      placeholder="Masukkan NIK untuk cari data dari TK/KB" />
                    {nikLookup === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-cyan-400 mt-1 shrink-0" />}
                    {nikLookup === 'found' && <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded mt-1 shrink-0">Ditemukan!</span>}
                    {nikLookup === 'notfound' && <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-1 rounded mt-1 shrink-0">Isi manual</span>}
                  </div>
                  {foundStudent && (
                    <div className="mt-1 text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded px-2 py-1">
                      Data ditemukan dari {foundStudent.school_name || npsnToSchool.get(foundStudent.school_npsn) || foundStudent.school_npsn} ({foundStudent.jenjang}) — akan dipindahkan ke SD
                    </div>
                  )}
                </div>
              )}
              <div className="col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Nama Lengkap</label>
                <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
              {!editId && !isOperator && (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Sekolah</label>
                  <select value={form.school_npsn} onChange={e => handleSchoolChange(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                    <option value="">Pilih Sekolah {formLevel}</option>
                    {ALL_SCHOOLS.filter(s => s.level === formLevel).map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {!editId && isOperator && (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Sekolah</label>
                  <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 mt-1">{operatorName}</div>
                </div>
              )}
              {/* NISN: only for SD (TK/KB usually don't have NISN yet) */}
              {formLevel !== 'KB' && (
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">NISN</label>
                  <input value={form.nisn} onChange={e => setForm({...form, nisn: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
                </div>
              )}
              {/* NIK: hidden for SD (already input above), shown for TK/KB */}
              {formLevel !== 'SD' && (
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">NIK</label>
                  <input value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
                </div>
              )}
              {formLevel === 'SD' && !editId && (
                <div><label className="text-[10px] font-mono text-slate-400 uppercase">NIK</label><input value={form.nik} disabled className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400 mt-1"/></div>
              )}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Jenis Kelamin</label>
                <select value={form.jenis_kelamin} onChange={e => setForm({...form, jenis_kelamin: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                  <option>Laki-laki</option><option>Perempuan</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Tempat Lahir</label>
                <input value={form.tempat_lahir} onChange={e => setForm({...form, tempat_lahir: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Tgl Lahir</label>
                <input type="date" value={form.tanggal_lahir} onChange={e => setForm({...form, tanggal_lahir: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
              {formLevel === 'SD' ? (
                <>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Tingkat</label>
                    <select value={form.kelas_kelompok} onChange={e => setForm({...form, kelas_kelompok: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                      {kelasByLevel['SD']?.map(k => <option key={k} value={k}>Kelas {k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Nama Rombel</label>
                    <input value={form.rombel} onChange={e => setForm({...form, rombel: e.target.value})} placeholder="cth: A, B, C" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
                  </div>
                </>
              ) : formLevel === 'TK' ? (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Tingkat</label>
                  <select value={form.kelas_kelompok} onChange={e => setForm({...form, kelas_kelompok: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                    {kelasByLevel['TK']?.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Nama Rombel</label>
                  <select value={form.kelas_kelompok} onChange={e => setForm({...form, kelas_kelompok: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                    {kelasByLevel['KB']?.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Tahun Pelajaran</label>
                <input value={form.tahun_pelajaran} onChange={e => setForm({...form, tahun_pelajaran: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Batal</button>
              <button onClick={save} disabled={!form.nama || (!editId && !form.school_npsn)} className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors">
                {editId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetailOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Detail Siswa</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{detailStudent.nama} — {detailStudent.nisn || 'Tanpa NISN'}</p>
              </div>
              <button onClick={() => setDetailOpen(false)} className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-lg p-1 w-fit">
              {(['parents', 'address', 'health'] as const).map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    detailTab === tab ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                  }`}>
                  {tab === 'parents' ? 'Orang Tua' : tab === 'address' ? 'Alamat' : 'Kesehatan'}
                </button>
              ))}
            </div>

            {/* Content */}
            {detailLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {detailTab === 'parents' && <>
                  <Field label="Nama Ayah" value={detailField('nama_ayah')} onChange={v => setDetailField('nama_ayah', v)} />
                  <Field label="NIK Ayah" value={detailField('nik_ayah')} onChange={v => setDetailField('nik_ayah', v)} />
                  <Field label="Pendidikan Ayah" value={detailField('pendidikan_ayah')} onChange={v => setDetailField('pendidikan_ayah', v)} />
                  <Field label="Pekerjaan Ayah" value={detailField('pekerjaan_ayah')} onChange={v => setDetailField('pekerjaan_ayah', v)} />
                  <Field label="Penghasilan Ayah" value={detailField('penghasilan_ayah')} onChange={v => setDetailField('penghasilan_ayah', v)} />
                  <Field label="No HP Ayah" value={detailField('no_hp_ayah')} onChange={v => setDetailField('no_hp_ayah', v)} />
                  <Field label="Status Ayah" value={detailField('status_ayah')} onChange={v => setDetailField('status_ayah', v)} />
                  <Field label="Nama Ibu" value={detailField('nama_ibu')} onChange={v => setDetailField('nama_ibu', v)} />
                  <Field label="NIK Ibu" value={detailField('nik_ibu')} onChange={v => setDetailField('nik_ibu', v)} />
                  <Field label="Pendidikan Ibu" value={detailField('pendidikan_ibu')} onChange={v => setDetailField('pendidikan_ibu', v)} />
                  <Field label="Pekerjaan Ibu" value={detailField('pekerjaan_ibu')} onChange={v => setDetailField('pekerjaan_ibu', v)} />
                  <Field label="Penghasilan Ibu" value={detailField('penghasilan_ibu')} onChange={v => setDetailField('penghasilan_ibu', v)} />
                  <Field label="No HP Ibu" value={detailField('no_hp_ibu')} onChange={v => setDetailField('no_hp_ibu', v)} />
                  <Field label="Status Ibu" value={detailField('status_ibu')} onChange={v => setDetailField('status_ibu', v)} />
                  <div className="col-span-2 border-t border-slate-700/50 pt-3 mt-1">
                    <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Wali</p>
                  </div>
                  <Field label="Nama Wali" value={detailField('nama_wali')} onChange={v => setDetailField('nama_wali', v)} />
                  <Field label="NIK Wali" value={detailField('nik_wali')} onChange={v => setDetailField('nik_wali', v)} />
                  <Field label="Hubungan Wali" value={detailField('hubungan_wali')} onChange={v => setDetailField('hubungan_wali', v)} />
                  <Field label="Pendidikan Wali" value={detailField('pendidikan_wali')} onChange={v => setDetailField('pendidikan_wali', v)} />
                  <Field label="Pekerjaan Wali" value={detailField('pekerjaan_wali')} onChange={v => setDetailField('pekerjaan_wali', v)} />
                  <Field label="Penghasilan Wali" value={detailField('penghasilan_wali')} onChange={v => setDetailField('penghasilan_wali', v)} />
                  <Field label="No HP Wali" value={detailField('no_hp_wali')} onChange={v => setDetailField('no_hp_wali', v)} />
                </>}
                {detailTab === 'address' && <>
                  <Field label="Provinsi" value={detailField('provinsi')} onChange={v => setDetailField('provinsi', v)} />
                  <Field label="Kabupaten" value={detailField('kabupaten')} onChange={v => setDetailField('kabupaten', v)} />
                  <Field label="Kecamatan" value={detailField('kecamatan')} onChange={v => setDetailField('kecamatan', v)} />
                  <Field label="Desa" value={detailField('desa')} onChange={v => setDetailField('desa', v)} />
                  <Field label="Dusun" value={detailField('dusun')} onChange={v => setDetailField('dusun', v)} />
                  <div className="col-span-2">
                    <Field label="Alamat" value={detailField('alamat')} onChange={v => setDetailField('alamat', v)} />
                  </div>
                  <Field label="RT" value={detailField('rt')} onChange={v => setDetailField('rt', v)} />
                  <Field label="RW" value={detailField('rw')} onChange={v => setDetailField('rw', v)} />
                  <Field label="Kode Pos" value={detailField('kode_pos')} onChange={v => setDetailField('kode_pos', v)} />
                  <Field label="Jarak Sekolah" value={detailField('jarak_sekolah')} onChange={v => setDetailField('jarak_sekolah', v)} />
                  <Field label="Transportasi" value={detailField('transportasi')} onChange={v => setDetailField('transportasi', v)} />
                  <Field label="Waktu Tempuh" value={detailField('waktu_tempuh')} onChange={v => setDetailField('waktu_tempuh', v)} />
                </>}
                {detailTab === 'health' && <>
                  <Field label="Golongan Darah" value={detailField('golongan_darah')} onChange={v => setDetailField('golongan_darah', v)} />
                  <Field label="Tinggi Badan" value={detailField('tinggi_badan')} onChange={v => setDetailField('tinggi_badan', v)} />
                  <Field label="Berat Badan" value={detailField('berat_badan')} onChange={v => setDetailField('berat_badan', v)} />
                  <div className="col-span-2">
                    <Field label="Riwayat Penyakit" value={detailField('riwayat_penyakit')} onChange={v => setDetailField('riwayat_penyakit', v)} />
                  </div>
                  <div className="col-span-2">
                    <Field label="Kebutuhan Khusus" value={detailField('kebutuhan_khusus')} onChange={v => setDetailField('kebutuhan_khusus', v)} />
                  </div>
                  <div className="col-span-2">
                    <Field label="Catatan" value={detailField('catatan')} onChange={v => setDetailField('catatan', v)} />
                  </div>
                </>}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setDetailOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Tutup</button>
              <button onClick={saveDetail} disabled={detailSaving || detailLoading}
                className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2">
                {detailSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graduation Modal */}
      {gradModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setGradModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Luluskan Siswa Kelas 6</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{gradStudents.length} siswa akan diluluskan. Lengkapi data kelanjutan.</p>
              </div>
              <button onClick={() => setGradModalOpen(false)} className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {gradStudents.map(s => {
                const d = gradData[s.id] || {};
                return (
                  <div key={s.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-white">{s.nama}</span>
                        <span className="text-xs text-slate-400 font-mono ml-2">{s.nisn || '-'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Status Kelanjutan</label>
                        <select value={d.status_lanjutan} onChange={e => setGradData(p => ({ ...p, [s.id]: { ...p[s.id], status_lanjutan: e.target.value } }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                          <option value="">-- Pilih --</option>
                          <option value="melanjutkan">Melanjutkan</option>
                          <option value="tidak_melanjutkan">Tidak Melanjutkan</option>
                        </select>
                      </div>
                      {d.status_lanjutan === 'melanjutkan' && (
                        <>
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 uppercase">Jenjang Tujuan</label>
                            <select value={d.tujuan_jenjang} onChange={e => setGradData(p => ({ ...p, [s.id]: { ...p[s.id], tujuan_jenjang: e.target.value } }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                              <option value="">-- Pilih --</option>
                              <option value="formal">Formal (SMP/MTS)</option>
                              <option value="non_formal">Non-Formal</option>
                              <option value="pondok">Pondok Pesantren</option>
                              <option value="lainnya">Lainnya</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-mono text-slate-400 uppercase">Nama Sekolah / Lembaga Tujuan</label>
                            <input value={d.tujuan_nama} onChange={e => setGradData(p => ({ ...p, [s.id]: { ...p[s.id], tujuan_nama: e.target.value } }))} placeholder="cth: SMP NEGERI 1 LEMAHABANG" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                          </div>
                        </>
                      )}
                      {d.status_lanjutan === 'tidak_melanjutkan' && (
                        <>
                          <div>
                            <label className="text-[10px] font-mono text-slate-400 uppercase">Alasan</label>
                            <select value={d.alasan} onChange={e => setGradData(p => ({ ...p, [s.id]: { ...p[s.id], alasan: e.target.value } }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                              <option value="">-- Pilih --</option>
                              <option value="biaya">Biaya</option>
                              <option value="bekerja">Bekerja</option>
                              <option value="menikah">Menikah</option>
                              <option value="lainnya">Lainnya</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-mono text-slate-400 uppercase">Keterangan Tambahan</label>
                            <input value={d.alasan_detail} onChange={e => setGradData(p => ({ ...p, [s.id]: { ...p[s.id], alasan_detail: e.target.value } }))} placeholder="Opsional" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setGradModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Batal</button>
              <button onClick={async () => {
                setGradSaving(true);
                try {
                  const r = await api('/api/graduates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      student_ids: gradStudents.map(s => s.id),
                      tahun_pelajaran_lulus: (() => { const y = new Date().getFullYear(); const m = new Date().getMonth(); return m >= 6 ? `${y}/${y+1}` : `${y-1}/${y}`; })(),
                    }),
                  });
                  const rData = await r.json();
                  if (r.ok) {
                    // Update alumni with continuation data
                    for (const s of gradStudents) {
                      const d = gradData[s.id];
                      if (!d || !d.status_lanjutan) continue;
                      const alum = (rData.data || []).find((a: any) => a.student_id === s.id);
                      if (alum) {
                        await api(`/api/alumni/${alum.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            status_lanjutan: d.status_lanjutan,
                            tujuan_nama: d.tujuan_nama || null,
                            tujuan_jenjang: d.tujuan_jenjang || null,
                            alasan_tidak_melanjutkan: d.alasan || null,
                            alasan_detail: d.alasan_detail || null,
                          }),
                        });
                      }
                    }
                    setGradModalOpen(false);
                    setCheckedIds(new Set());
                    load();
                  } else {
                    alert('Gagal meluluskan: ' + (rData.error || 'Unknown error'));
                  }
                } catch (err: any) {
                  alert('Gagal meluluskan: ' + (err.message || 'Unknown error'));
                }
                setGradSaving(false);
              }} disabled={gradSaving}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2">
                {gradSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Luluskan {gradStudents.length} Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-mono text-slate-400 uppercase">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
    </div>
  );
}
