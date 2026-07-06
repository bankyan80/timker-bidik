import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import {
  Search, Users, Building2, School,
  Loader2, X, Calendar, Plus, Trash2, Pencil, Save, AlertTriangle
} from 'lucide-react';

interface Pegawai {
  id: string;
  nama: string;
  nipNik: string;
  status_pegawai: string;
  jabatan: string;
  sekolah_id: string;
  sekolah_nama: string;
  sekolah_level: string;
  sekolah_status: string;
  doc_count: number;
  _raw?: Record<string, any>;
}

interface EmployeePeriod {
  id: string;
  employee_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: string;
  created_at: number;
  updated_at: number;
}

interface SchoolOption {
  npsn: string;
  name: string;
  level: string;
  status: string;
}

interface EditData {
  gelar_depan: string;
  gelar_belakang: string;
  nama: string;
  nik: string;
  nip: string;
  nuptk: string;
  email: string;
  no_hp: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  jabatan: string;
  status_pegawai: string;
  pangkat_golongan: string;
  pendidikan_terakhir: string;
  jurusan: string;
  sertifikasi: string;
  tmt_kerja: string;
  tanggal_bup: string;
  sekolah_id: string;
}

const STATUS_OPTIONS_NEGERI = ['PNS', 'PPPK', 'PPPK Paruh Waktu', 'Honorer Sekolah/Daerah'];
const STATUS_OPTIONS_SWASTA = ['GTY/PTY', 'GTT/PTT'];
function getStatusOptions(sekolahStatus: string): string[] {
  return sekolahStatus === 'Negeri' ? STATUS_OPTIONS_NEGERI : STATUS_OPTIONS_SWASTA;
}
const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'];
const JABATAN_OPTIONS = ['Kepala Sekolah', 'Guru Kelas', 'Guru Agama', 'Guru PJOK', 'Guru Muatan Lokal', 'Kepala Tata Usaha', 'Staf Administrasi', 'Operator Sekolah', 'Pustakawan', 'Penjaga Sekolah', 'Petugas Kebersihan'];

export default function ManajemenPegawai() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator_sekolah';
  const operatorLevel = user?.schoolLevel || 'SD';
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'Negeri' | 'Swasta'>('Negeri');
  const [levelTab, setLevelTab] = useState<string>(operatorLevel);
  const [periodModal, setPeriodModal] = useState<{ emp: Pegawai; periods: EmployeePeriod[]; loading: boolean } | null>(null);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [editModal, setEditModal] = useState<{ emp: Pegawai; data: EditData; saving: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/employees-with-docs');
        if (!res.ok) throw new Error('API unavailable');
        const rows: any[] = await res.json();
        const mapped: Pegawai[] = rows.map(r => ({
          id: r.id,
          nama: r.nama,
          nipNik: r.nip || r.nik || '-',
          status_pegawai: r.status_pegawai || '-',
          jabatan: r.jabatan || '-',
          sekolah_id: r.sekolah_id,
          sekolah_nama: r.school_name || r.sekolah_id,
          sekolah_level: r.school_level || 'SD',
          sekolah_status: r.school_status || 'Negeri',
          doc_count: (r.documents || []).length,
          _raw: r,
        }));
        setPegawai(mapped);
      } catch { /* fallback mock */ }
      setLoading(false);
    })();
    (async () => {
      try {
        const res = await api('/api/schools');
        if (res.ok) {
          const data: any[] = await res.json();
          setSchools(data.map((s: any) => ({ npsn: s.npsn, name: s.name, level: s.level, status: s.status })));
        }
      } catch {}
    })();
  }, []);

  const openPeriodModal = async (emp: Pegawai) => {
    setPeriodModal({ emp, periods: [], loading: true });
    setNewPeriodStart('');
    try {
      const res = await api(`/api/employees/${emp.id}/periods`);
      const periods = res.ok ? await res.json() : [];
      setPeriodModal({ emp, periods, loading: false });
    } catch {
      setPeriodModal({ emp, periods: [], loading: false });
    }
  };

  const addPeriod = async () => {
    if (!periodModal || !newPeriodStart) return;
    const { emp, periods } = periodModal;
    const isPppkPw = emp.status_pegawai === 'PPPK PW' || emp.status_pegawai?.toLowerCase().includes('paruh');
    const tahun = isPppkPw ? 1 : 5;
    const startDate = new Date(newPeriodStart);
    const end = new Date(startDate);
    end.setFullYear(end.getFullYear() + tahun);
    const endDate = end.toISOString().slice(0, 10);
    setAddingPeriod(true);
    try {
      const res = await api(`/api/employees/${emp.id}/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal_mulai: newPeriodStart, tanggal_selesai: endDate }),
      });
      if (!res.ok) return;
      const result = await res.json();
      setPeriodModal({
        emp,
        periods: [...periods, {
          id: result.id,
          employee_id: emp.id,
          tanggal_mulai: newPeriodStart,
          tanggal_selesai: endDate,
          status: 'aktif',
          created_at: Date.now(),
          updated_at: Date.now(),
        }],
        loading: false,
      });
      setNewPeriodStart('');
    } catch {}
    setAddingPeriod(false);
  };

  const endPeriod = async (period: EmployeePeriod) => {
    if (!periodModal) return;
    try {
      const res = await api(`/api/employees/${periodModal.emp.id}/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'selesai' }),
      });
      if (!res.ok) return;
      setPeriodModal({
        ...periodModal,
        periods: periodModal.periods.map(p => p.id === period.id ? { ...p, status: 'selesai' } : p),
      });
    } catch {}
  };

  const deletePeriod = async (period: EmployeePeriod) => {
    if (!periodModal) return;
    try {
      const res = await api(`/api/employees/${periodModal.emp.id}/periods/${period.id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setPeriodModal({
        ...periodModal,
        periods: periodModal.periods.filter(p => p.id !== period.id),
      });
    } catch {}
  };

  const openEditModal = (emp: Pegawai) => {
    const r = emp._raw || {};
    setEditModal({
      emp,
      data: {
        gelar_depan: r.gelar_depan || '',
        gelar_belakang: r.gelar_belakang || '',
        nama: r.nama || '',
        nik: r.nik || '',
        nip: r.nip || '',
        nuptk: r.nuptk || '',
        email: r.email || '',
        no_hp: r.no_hp || '',
        tempat_lahir: r.tempat_lahir || '',
        tanggal_lahir: r.tanggal_lahir || '',
        jenis_kelamin: r.jenis_kelamin || '',
        jabatan: r.jabatan || '',
        status_pegawai: r.status_pegawai || '',
        pangkat_golongan: r.pangkat_golongan || '',
        pendidikan_terakhir: r.pendidikan_terakhir || '',
        jurusan: r.jurusan || '',
        sertifikasi: r.sertifikasi || '',
        tmt_kerja: r.tmt_kerja || '',
        tanggal_bup: r.tanggal_bup || '',
        sekolah_id: emp.sekolah_id || r.sekolah_id || '',
      },
      saving: false,
    });
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setEditModal({ ...editModal, saving: true });
    try {
      const res = await api(`/api/employees/${editModal.emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editModal.data),
      });
      if (!res.ok) return;
      const sc = schools.find(s => s.npsn === editModal.data.sekolah_id);
      setPegawai(prev => prev.map(p =>
        p.id === editModal.emp.id
          ? {
              ...p,
              nama: editModal.data.nama,
              nipNik: editModal.data.nip || editModal.data.nik || '-',
              status_pegawai: editModal.data.status_pegawai,
              jabatan: editModal.data.jabatan,
              sekolah_id: editModal.data.sekolah_id,
              sekolah_nama: sc ? sc.name : editModal.data.sekolah_id,
              sekolah_level: sc ? sc.level : p.sekolah_level,
              sekolah_status: sc ? sc.status : p.sekolah_status,
              _raw: { ...p._raw, ...editModal.data }
            }
          : p
      ));
      setEditModal(null);
    } catch {}
    setEditModal(prev => prev ? { ...prev, saving: false } : null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await api(`/api/employees/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setPegawai(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
    } catch {}
  };

  const updateEditField = (key: keyof EditData, value: string) => {
    setEditModal(prev => {
      if (!prev) return null;
      const data = { ...prev.data, [key]: value };
      // Auto-calculate BUP when tanggal_lahir or status_pegawai or jabatan changes
      if ((key === 'tanggal_lahir' || key === 'status_pegawai' || key === 'jabatan') && data.tanggal_lahir) {
        const parts = data.tanggal_lahir.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]); // 1-12
          const nonGuru = ['Kepala Tata Usaha', 'Staf Administrasi', 'Operator Sekolah', 'Pustakawan', 'Penjaga Sekolah', 'Petugas Kebersihan'];
          const retirementAge = nonGuru.includes(data.jabatan) ? 58 : 60;
          const retYear = year + retirementAge;
          // BUP = 1st day of month following retirement month
          const bupMonth = month + 1;
          const bupYear = bupMonth > 12 ? retYear + 1 : retYear;
          const bupMonthNormalized = bupMonth > 12 ? bupMonth - 12 : bupMonth;
          data.tanggal_bup = `${bupYear}-${String(bupMonthNormalized).padStart(2, '0')}-01`;
        }
      }
      return { ...prev, data };
    });
  };

  const levels = isOperator ? [operatorLevel] : ['SD', 'TK', 'KB'];
  const filtered = useMemo(() =>
    pegawai.filter(p =>
      p.sekolah_status === statusTab &&
      p.sekolah_level === levelTab &&
      (p.nama.toLowerCase().includes(search.toLowerCase()) ||
       p.nipNik.includes(search) ||
       p.sekolah_nama.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => a.sekolah_nama.localeCompare(b.sekolah_nama) || a.nama.localeCompare(b.nama)),
  [pegawai, statusTab, levelTab, search]);

  const statusCount = (status: string, level: string) =>
    pegawai.filter(p => p.sekolah_status === status && p.sekolah_level === level).length;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            MANAJEMEN PEGAWAI
          </h1>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {pegawai.length} pegawai terdaftar
          </p>
        </div>
      </div>

      {/* Tabs: Negeri / Swasta */}
      <div className="flex gap-1 bg-[#151922] border border-[#1f2937] rounded-lg p-1 w-fit">
        {(['Negeri', 'Swasta'] as const).map(st => (
          <button key={st} onClick={() => setStatusTab(st)}
            className={`px-4 py-1.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              statusTab === st ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {st.toUpperCase()} ({pegawai.filter(p => p.sekolah_status === st).length})
          </button>
        ))}
      </div>

      {/* Level tabs */}
      <div className="flex gap-1 bg-[#151922] border border-[#1f2937] rounded-lg p-1 w-fit">
        {levels.map(lv => (
          <button key={lv} onClick={() => setLevelTab(lv)}
            className={`px-4 py-1.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              levelTab === lv ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-800' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {lv} ({statusCount(statusTab, lv)})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, NIP, atau sekolah..."
          className="w-full bg-[#151922] border border-[#1f2937] rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-800 transition-all" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-xs font-mono">Memuat data...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-xs font-mono">{search ? 'Pencarian tidak ditemukan' : `Tidak ada pegawai untuk ${statusTab} / ${levelTab}`}</p>
        </div>
      ) : (
        <div className="bg-[#151922] border border-[#1f2937] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="bg-[#0c0e12] text-slate-400">
                  <th className="text-left p-3 pl-4 font-semibold">Nama</th>
                  <th className="text-left p-3 font-semibold">NUPTK</th>
                  <th className="text-left p-3 font-semibold">NIP/NIK</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Jabatan</th>
                  <th className="text-left p-3 font-semibold">Sekolah</th>
                  <th className="text-center p-3 font-semibold">Dok</th>
                  <th className="text-center p-3 pr-4 font-semibold">Periode</th>
                  <th className="text-center p-3 pr-4 font-semibold w-[80px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="border-t border-[#1f2937] hover:bg-[#1a1f2c] transition-all">
                    <td className="p-3 pl-4 text-slate-200 font-bold whitespace-nowrap">
                      {[emp._raw?.gelar_depan, emp.nama, emp._raw?.gelar_belakang ? `, ${emp._raw.gelar_belakang}` : ''].filter(Boolean).join(' ')}
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{emp._raw?.nuptk || '—'}</td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">{emp.nipNik}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        emp.status_pegawai?.toLowerCase().includes('pns') ? 'bg-blue-950 text-blue-300 border border-blue-900' :
                        emp.status_pegawai?.toLowerCase().includes('pppk') ? 'bg-purple-950 text-purple-300 border border-purple-900' :
                        emp.status_pegawai?.toLowerCase().includes('gty') || emp.status_pegawai?.toLowerCase().includes('pty') ? 'bg-emerald-950 text-emerald-300 border border-emerald-900' :
                        emp.status_pegawai?.toLowerCase().includes('gtt') || emp.status_pegawai?.toLowerCase().includes('ptt') ? 'bg-amber-950 text-amber-300 border border-amber-900' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {emp.status_pegawai || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{emp.jabatan}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{emp.sekolah_nama}</td>
                    <td className="p-3 text-center text-slate-400">{emp.doc_count}</td>
                    <td className="p-3 pr-4 text-center">
                      {emp.status_pegawai?.toLowerCase().includes('pppk') ? (
                        <button onClick={() => openPeriodModal(emp)}
                          className="text-[10px] px-2 py-1 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800 hover:bg-indigo-900/40 transition-all cursor-pointer">
                          <Calendar className="h-3 w-3 inline mr-1" />Periode
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-center whitespace-nowrap">
                      <button onClick={() => openEditModal(emp)}
                        className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30 rounded transition-all cursor-pointer"
                        title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(emp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-all cursor-pointer"
                        title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Period Modal */}
      {periodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPeriodModal(null)}>
          <div className="bg-[#151922] border border-[#1f2937] rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2937]">
              <div>
                <h2 className="text-sm font-bold text-slate-200 font-mono">Periode PPPK</h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{periodModal.emp.nama} — {periodModal.emp.nipNik}</p>
              </div>
              <button onClick={() => setPeriodModal(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-5 space-y-3">
              {periodModal.loading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs font-mono">Memuat...</span>
                </div>
              ) : periodModal.periods.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-mono">Belum ada periode</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {periodModal.periods.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-[#0c0e12] rounded-lg px-4 py-3 border border-[#1f2937]">
                      <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 rounded-full ${p.status === 'aktif' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        <div>
                          <span className="text-xs font-mono text-slate-200">
                            {p.tanggal_mulai} — {p.tanggal_selesai}
                          </span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            p.status === 'aktif' ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-500 bg-slate-800'
                          }`}>
                            {p.status === 'aktif' ? 'Aktif' : 'Selesai'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.status === 'aktif' && (
                          <button onClick={() => endPeriod(p)}
                            className="text-[10px] px-2 py-1 rounded bg-amber-950/40 text-amber-300 border border-amber-800 hover:bg-amber-900/40 transition-all cursor-pointer">
                            Akhiri
                          </button>
                        )}
                        <button onClick={() => deletePeriod(p)}
                          className="p-1 text-red-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-all cursor-pointer">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[#1f2937] pt-3 space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase">TMT Mulai Kontrak</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#0c0e12] border border-[#1f2937] rounded-lg text-xs font-mono text-slate-200" />
                  <button onClick={addPeriod} disabled={addingPeriod || !newPeriodStart}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold bg-indigo-950/40 text-indigo-300 border border-dashed border-indigo-800 hover:bg-indigo-900/40 disabled:opacity-40 transition-all cursor-pointer shrink-0">
                    {addingPeriod ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    {periodModal.emp.status_pegawai === 'PPPK PW' || periodModal.emp.status_pegawai?.toLowerCase().includes('paruh') ? 'Tambah (1 tahun)' : 'Tambah (5 tahun)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="bg-[#151922] border border-[#1f2937] rounded-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f2937] sticky top-0 bg-[#151922] z-10">
              <h2 className="text-sm font-bold text-slate-200 font-mono flex items-center gap-2">
                <Pencil className="h-4 w-4 text-cyan-400" /> Edit Pegawai
              </h2>
              <button onClick={() => setEditModal(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nama" value={editModal.data.nama} onChange={v => updateEditField('nama', v)} />
                <Field label="Gelar Depan" value={editModal.data.gelar_depan} onChange={v => updateEditField('gelar_depan', v)} />
                <Field label="Gelar Belakang" value={editModal.data.gelar_belakang} onChange={v => updateEditField('gelar_belakang', v)} />
                <Field label="NIK" value={editModal.data.nik} onChange={v => updateEditField('nik', v)} />
                <Field label="NIP" value={editModal.data.nip} onChange={v => updateEditField('nip', v)} />
                <Field label="NUPTK" value={editModal.data.nuptk} onChange={v => updateEditField('nuptk', v)} />
                <Field label="Email" value={editModal.data.email} onChange={v => updateEditField('email', v)} />
                <Field label="No. HP" value={editModal.data.no_hp} onChange={v => updateEditField('no_hp', v)} />
                <Field label="Tempat Lahir" value={editModal.data.tempat_lahir} onChange={v => updateEditField('tempat_lahir', v)} />
                <Field label="Tanggal Lahir" value={editModal.data.tanggal_lahir} onChange={v => updateEditField('tanggal_lahir', v)} />
                <Select label="Jenis Kelamin" value={editModal.data.jenis_kelamin} options={GENDER_OPTIONS} onChange={v => updateEditField('jenis_kelamin', v)} />
                <Select label="Jabatan" value={editModal.data.jabatan} options={JABATAN_OPTIONS} onChange={v => updateEditField('jabatan', v)} />
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider">Sekolah</label>
                  <select value={editModal.data.sekolah_id} onChange={e => updateEditField('sekolah_id', e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-800 transition-all cursor-pointer">
                    <option value="">—</option>
                    {schools.map(s => <option key={s.npsn} value={s.npsn}>{s.npsn} — {s.name}</option>)}
                  </select>
                </div>
                <Select label={`Status Pegawai (${(() => { const sc = schools.find(s => s.npsn === editModal.data.sekolah_id); return sc ? sc.status : editModal.emp.sekolah_status; })()})`} value={editModal.data.status_pegawai} options={getStatusOptions((() => { const sc = schools.find(s => s.npsn === editModal.data.sekolah_id); return sc ? sc.status : editModal.emp.sekolah_status; })())} onChange={v => updateEditField('status_pegawai', v)} />
                <Field label="Pangkat/Golongan" value={editModal.data.pangkat_golongan} onChange={v => updateEditField('pangkat_golongan', v)} />
                <Field label="Pendidikan Terakhir" value={editModal.data.pendidikan_terakhir} onChange={v => updateEditField('pendidikan_terakhir', v)} />
                <Field label="Jurusan" value={editModal.data.jurusan} onChange={v => updateEditField('jurusan', v)} />
                <Field label="Sertifikasi" value={editModal.data.sertifikasi} onChange={v => updateEditField('sertifikasi', v)} />
                <Field label="TMT Kerja" value={editModal.data.tmt_kerja} onChange={v => updateEditField('tmt_kerja', v)} />
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Tanggal BUP <span className="text-cyan-500">(otomatis)</span></label>
                  <input value={editModal.data.tanggal_bup} disabled
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400 mt-1 opacity-70 cursor-not-allowed" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#1f2937]">
              <button onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 border border-[#1f2937] hover:bg-[#1a1f2c] transition-all cursor-pointer">
                Batal
              </button>
              <button onClick={saveEdit} disabled={editModal.saving}
                className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-cyan-900/40 text-cyan-300 border border-cyan-800 hover:bg-cyan-900/60 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2">
                {editModal.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-[#151922] border border-[#1f2937] rounded-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 mx-auto text-red-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-200 font-mono">Hapus Pegawai</h2>
                <p className="text-[11px] text-slate-500 font-mono mt-1">Yakin ingin menghapus pegawai ini? Data akan dinonaktifkan.</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 border border-[#1f2937] hover:bg-[#1a1f2c] transition-all cursor-pointer">
                  Batal
                </button>
                <button onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-red-900/40 text-red-300 border border-red-800 hover:bg-red-900/60 transition-all cursor-pointer">
                  Ya, Hapus
                </button>
              </div>
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
      <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0c0e12] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-800 transition-all" />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0c0e12] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-800 transition-all cursor-pointer">
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
