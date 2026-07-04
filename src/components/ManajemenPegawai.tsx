import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import {
  Search, Users, Building2, School,
  Loader2, X, Calendar, Plus, Trash2
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

export default function ManajemenPegawai() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'Negeri' | 'Swasta'>('Negeri');
  const [levelTab, setLevelTab] = useState<string>('SD');
  const [periodModal, setPeriodModal] = useState<{ emp: Pegawai; periods: EmployeePeriod[]; loading: boolean } | null>(null);
  const [addingPeriod, setAddingPeriod] = useState(false);

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
        }));
        setPegawai(mapped);
      } catch { /* fallback mock */ }
      setLoading(false);
    })();
  }, []);

  const openPeriodModal = async (emp: Pegawai) => {
    setPeriodModal({ emp, periods: [], loading: true });
    try {
      const res = await api(`/api/employees/${emp.id}/periods`);
      const periods = res.ok ? await res.json() : [];
      setPeriodModal({ emp, periods, loading: false });
    } catch {
      setPeriodModal({ emp, periods: [], loading: false });
    }
  };

  const addPeriod = async () => {
    if (!periodModal) return;
    const { emp, periods } = periodModal;
    const isPppkPw = emp.status_pegawai === 'PPPK PW' || emp.status_pegawai?.toLowerCase().includes('paruh');
    const tahun = isPppkPw ? 1 : 5;
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setFullYear(end.getFullYear() + tahun);
    const endDate = end.toISOString().slice(0, 10);
    setAddingPeriod(true);
    try {
      const res = await api(`/api/employees/${emp.id}/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal_mulai: today, tanggal_selesai: endDate }),
      });
      if (!res.ok) return;
      const result = await res.json();
      setPeriodModal({
        emp,
        periods: [...periods, {
          id: result.id,
          employee_id: emp.id,
          tanggal_mulai: today,
          tanggal_selesai: endDate,
          status: 'aktif',
          created_at: Date.now(),
          updated_at: Date.now(),
        }],
        loading: false,
      });
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

  const levels = ['SD', 'TK', 'KB'];
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
                  <th className="text-left p-3 font-semibold">NIP/NIK</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Jabatan</th>
                  <th className="text-left p-3 font-semibold">Sekolah</th>
                  <th className="text-center p-3 font-semibold">Dok</th>
                  <th className="text-center p-3 pr-4 font-semibold">Periode</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="border-t border-[#1f2937] hover:bg-[#1a1f2c] transition-all">
                    <td className="p-3 pl-4 text-slate-200 font-bold whitespace-nowrap">{emp.nama}</td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">{emp.nipNik}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        emp.status_pegawai?.toLowerCase().includes('pns') ? 'bg-blue-950 text-blue-300 border border-blue-900' :
                        emp.status_pegawai?.toLowerCase().includes('pppk') ? 'bg-purple-950 text-purple-300 border border-purple-900' :
                        emp.status_pegawai?.toLowerCase() === 'lainnya' || emp.status_pegawai === '-' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        'bg-amber-950 text-amber-300 border border-amber-900'
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

              <button onClick={addPeriod} disabled={addingPeriod}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono font-bold bg-indigo-950/40 text-indigo-300 border border-dashed border-indigo-800 hover:bg-indigo-900/40 disabled:opacity-40 transition-all cursor-pointer">
                {addingPeriod ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {periodModal.emp.status_pegawai === 'PPPK PW' || periodModal.emp.status_pegawai?.toLowerCase().includes('paruh') ? 'Tambah Periode (1 tahun)' : 'Tambah Periode (5 tahun)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
