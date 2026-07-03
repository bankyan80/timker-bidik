import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Users, BookOpen, School, Filter, GraduationCap, ChevronLeft, ChevronRight, Trash, ArrowUp } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

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
  SD: ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
  TK: ['Kelompok A', 'Kelompok B'],
  KB: ['Kelompok Bermain'],
};

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [levelTab, setLevelTab] = useState<string>('SD');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    school_npsn: '', nama: '', nisn: '', nik: '', jenis_kelamin: 'Laki-laki',
    tempat_lahir: '', tanggal_lahir: '', kelas_kelompok: 'Kelas 1',
    rombel: '', tahun_pelajaran: '2025/2026'
  });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let f = students.filter(s => s.jenjang === levelTab);
    if (search) { const q = search.toLowerCase(); f = f.filter(s => s.nama.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q))); }
    if (filterSchool !== 'ALL') f = f.filter(s => s.school_npsn === filterSchool);
    if (filterKelas !== 'ALL') f = f.filter(s => (s.rombel || s.kelas_kelompok) === filterKelas);
    setFiltered(f);
    setCurrentPage(1);
  }, [search, filterSchool, filterKelas, levelTab, students]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/students');
      if (r.ok) setStudents(await r.json());
    } catch {}
    setLoading(false);
  }

  async function save() {
    const selectedLevel = form.school_npsn ? (schoolLevel.get(form.school_npsn) || 'SD') : levelTab;
    if (editId) {
      await fetch(`/api/students/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        nama: form.nama, nisn: form.nisn || null, nik: form.nik || null,
        jenis_kelamin: form.jenis_kelamin, tempat_lahir: form.tempat_lahir || null,
        tanggal_lahir: form.tanggal_lahir || null, kelas_kelompok: form.kelas_kelompok,
        rombel: form.rombel || null
      })});
    } else {
      await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        ...form, nisn: form.nisn || null, nik: form.nik || null,
        jenjang: selectedLevel, status_siswa: 'aktif'
      })});
    }
    setFormOpen(false); setEditId(null); resetForm(); load();
  }

  async function remove(id: string) {
    if (!confirm('Hapus siswa ini?')) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE' });
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
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
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
    if (!confirm(`Naikkan ${checkedIds.size} siswa yang dipilih ke kelas berikutnya?`)) return;
    const selected = students.filter(s => checkedIds.has(s.id));
    let promoted = 0;
    for (const s of selected) {
      const next = GRADE_NEXT[s.kelas_kelompok];
      if (!next) continue;
      await fetch(`/api/students/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelas_kelompok: next, rombel: null }),
      });
      promoted++;
    }
    setCheckedIds(new Set());
    if (promoted > 0) load();
  }

  function resetForm() { setForm({ school_npsn: '', nama: '', nisn: '', nik: '', jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', kelas_kelompok: 'Kelas 1', rombel: '', tahun_pelajaran: '2025/2026' }); }

  function normalizeGender(val: string | null | undefined): 'Laki-laki' | 'Perempuan' {
    if (!val) return 'Laki-laki';
    const low = val.toLowerCase();
    if (low.includes('perempuan') || low.includes('p')) return 'Perempuan';
    return 'Laki-laki';
  }

  function openEdit(s: Student) {
    setEditId(s.id);
    setForm({ school_npsn: s.school_npsn, nama: s.nama, nisn: s.nisn || '', nik: s.nik || '', jenis_kelamin: normalizeGender(s.jenis_kelamin), tempat_lahir: s.tempat_lahir || '', tanggal_lahir: s.tanggal_lahir || '', kelas_kelompok: s.kelas_kelompok, rombel: s.rombel || '', tahun_pelajaran: s.tahun_pelajaran });
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
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Sekolah</option>
          {ALL_SCHOOLS.filter(s => s.level === levelTab).map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
        </select>
        {levelTab === 'SD' ? (
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="ALL">Semua Kelas</option>
            {currentKelasList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        ) : (
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="ALL">Semua Rombel</option>
            {[...new Set(filteredByLevel.map(s => s.rombel || s.kelas_kelompok).filter(Boolean))].map(r => <option key={r} value={r}>{r}</option>)}
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
                  <input type="checkbox" checked={paginated.length > 0 && paginated.filter(s => s.status_siswa === 'aktif').every(id => checkedIds.has(id))}
                    onChange={toggleAllPage}
                    className="accent-cyan-600 cursor-pointer" />
                </th>
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left px-4 py-3">NISN</th>
                <th className="text-left px-4 py-3">JK</th>
                <th className="text-left px-4 py-3">{levelTab === 'SD' ? 'Kelas' : 'Kelompok'}</th>
                {levelTab === 'SD' && <th className="text-left px-4 py-3">Rombel</th>}
                <th className="text-left px-4 py-3">Sekolah</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">Tidak ada data siswa untuk jenjang {levelTab}</td></tr>
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
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{s.rombel || '-'}</td>
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
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white">{editId ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Nama Lengkap</label>
                <input value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
              {!editId && (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Sekolah</label>
                  <select value={form.school_npsn} onChange={e => handleSchoolChange(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                    <option value="">Pilih Sekolah</option>
                    {ALL_SCHOOLS.map(s => <option key={s.npsn} value={s.npsn}>{s.name} ({s.level})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">NISN</label>
                <input value={form.nisn} onChange={e => setForm({...form, nisn: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">NIK</label>
                <input value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
              </div>
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
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Kelas</label>
                    <select value={form.kelas_kelompok} onChange={e => setForm({...form, kelas_kelompok: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                      {kelasByLevel['SD']?.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Rombel</label>
                    <input value={form.rombel} onChange={e => setForm({...form, rombel: e.target.value})} placeholder="cth: A, B, C" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Kelompok / Rombel</label>
                  <input value={form.rombel || form.kelas_kelompok} onChange={e => setForm({...form, rombel: e.target.value, kelas_kelompok: e.target.value || form.kelas_kelompok})} placeholder="cth: A, B, Bermain" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700"/>
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
    </div>
  );
}
