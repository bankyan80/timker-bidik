import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { GraduationCap, Search, Filter, X, Loader2, Check } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';
import { useAuth } from './AuthContext';

interface AlumniRecord {
  id: string; student_id: string | null; nama: string; nisn: string | null;
  jenis_kelamin: string | null; school_npsn: string;
  tahun_pelajaran_lulus: string; status_lanjutan: string | null;
  tujuan_nama: string | null; tujuan_jenjang: string | null; tujuan_npsn: string | null;
  alasan_tidak_melanjutkan: string | null; alasan_detail: string | null;
  created_at: number; updated_at: number;
}

const npsnToSchool = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.name]));
const schoolLevel = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.level]));

export default function DataKelulusan() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator_sekolah';
  const operatorNpsn = user?.schoolNpsn || '';

  const [data, setData] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState(isOperator ? operatorNpsn : 'ALL');
  const [filterTp, setFilterTp] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  const schools = isOperator
    ? ALL_SCHOOLS.filter(s => s.npsn === operatorNpsn)
    : ALL_SCHOOLS;

  const tahunPelajaranList = [...new Set(data.map(d => d.tahun_pelajaran_lulus))].sort().reverse();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSchool !== 'ALL') params.set('school', filterSchool);
      if (filterTp !== 'ALL') params.set('tahun_pelajaran_lulus', filterTp);
      if (filterStatus !== 'ALL') params.set('status_lanjutan', filterStatus);
      const r = await api('/api/alumni?' + params.toString());
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterSchool, filterTp, filterStatus]);

  function filtered() {
    let f = data;
    if (search) { const q = search.toLowerCase(); f = f.filter(d => d.nama.toLowerCase().includes(q) || (d.nisn && d.nisn.includes(q))); }
    return f;
  }

  const displayed = filtered();

  const statusLanjutanLabels: Record<string, string> = {
    melanjutkan: 'Melanjutkan',
    tidak_melanjutkan: 'Tidak Melanjutkan',
  };
  const tujuanJenjangLabels: Record<string, string> = {
    formal: 'Formal (SMP/MTS)', non_formal: 'Non-Formal', pondok: 'Pondok Pesantren', lainnya: 'Lainnya',
  };
  const alasanLabels: Record<string, string> = {
    biaya: 'Biaya', bekerja: 'Bekerja', menikah: 'Menikah', lainnya: 'Lainnya',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-cyan-400" /> Data Kelulusan
          </h1>
          <p className="text-sm text-slate-400 mt-1">Rekapitulasi siswa lulus — jenjang SD</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NISN..." className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 flex-1" />
        </div>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Sekolah</option>
          {schools.map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
        </select>
        <select value={filterTp} onChange={e => setFilterTp(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Tahun Pelajaran</option>
          {tahunPelajaranList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Status</option>
          <option value="melanjutkan">Melanjutkan</option>
          <option value="tidak_melanjutkan">Tidak Melanjutkan</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-slate-400 uppercase bg-slate-800/40">
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left px-4 py-3">NISN</th>
                <th className="text-left px-4 py-3">Sekolah</th>
                <th className="text-left px-4 py-3">Tahun Lulus</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Tujuan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin inline" /> Memuat...</td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Belum ada data kelulusan</td></tr>
              ) : displayed.map(d => (
                <tr key={d.id} className="hover:bg-slate-800/30 transition-colors border-t border-slate-800/50">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium text-sm">{d.nama}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{d.nisn || '-'}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{npsnToSchool.get(d.school_npsn) || d.school_npsn}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{d.tahun_pelajaran_lulus}</td>
                  <td className="px-4 py-3">
                    {d.status_lanjutan ? (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${d.status_lanjutan === 'melanjutkan' ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-400 bg-amber-950/40'}`}>
                        {statusLanjutanLabels[d.status_lanjutan] || d.status_lanjutan}
                      </span>
                    ) : (
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-mono text-slate-500 bg-slate-800/50">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.status_lanjutan === 'melanjutkan' && (
                        <span className="text-xs text-slate-300 truncate max-w-[150px]">{d.tujuan_nama || (d.tujuan_jenjang ? tujuanJenjangLabels[d.tujuan_jenjang] : '-')}</span>
                      )}
                      {d.status_lanjutan === 'tidak_melanjutkan' && (
                        <span className="text-xs text-slate-300">{d.alasan_tidak_melanjutkan ? alasanLabels[d.alasan_tidak_melanjutkan] : '-'}</span>
                      )}
                      <button onClick={() => { setEditId(d.id); setEditForm({ status_lanjutan: d.status_lanjutan || '', tujuan_nama: d.tujuan_nama || '', tujuan_jenjang: d.tujuan_jenjang || '', alasan: d.alasan_tidak_melanjutkan || '', alasan_detail: d.alasan_detail || '' }); }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline underline-offset-2">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditId(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit Data Kelulusan</h2>
              <button onClick={() => setEditId(null)} className="p-1.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Status Kelanjutan</label>
                <select value={editForm.status_lanjutan} onChange={e => setEditForm(p => ({ ...p, status_lanjutan: e.target.value }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                  <option value="">-- Pilih --</option>
                  <option value="melanjutkan">Melanjutkan</option>
                  <option value="tidak_melanjutkan">Tidak Melanjutkan</option>
                </select>
              </div>
              {editForm.status_lanjutan === 'melanjutkan' && (
                <>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Jenjang Tujuan</label>
                    <select value={editForm.tujuan_jenjang} onChange={e => setEditForm(p => ({ ...p, tujuan_jenjang: e.target.value }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                      <option value="">-- Pilih --</option>
                      <option value="formal">Formal (SMP/MTS)</option>
                      <option value="non_formal">Non-Formal</option>
                      <option value="pondok">Pondok Pesantren</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Nama Sekolah / Lembaga Tujuan</label>
                    <input value={editForm.tujuan_nama} onChange={e => setEditForm(p => ({ ...p, tujuan_nama: e.target.value }))} placeholder="cth: SMP NEGERI 1 LEMAHABANG" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                  </div>
                </>
              )}
              {editForm.status_lanjutan === 'tidak_melanjutkan' && (
                <>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Alasan</label>
                    <select value={editForm.alasan} onChange={e => setEditForm(p => ({ ...p, alasan: e.target.value }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700">
                      <option value="">-- Pilih --</option>
                      <option value="biaya">Biaya</option>
                      <option value="bekerja">Bekerja</option>
                      <option value="menikah">Menikah</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Keterangan Tambahan</label>
                    <input value={editForm.alasan_detail} onChange={e => setEditForm(p => ({ ...p, alasan_detail: e.target.value }))} placeholder="Opsional" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Batal</button>
              <button onClick={async () => {
                setEditSaving(true);
                try {
                  const r = await api(`/api/alumni/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      status_lanjutan: editForm.status_lanjutan || null,
                      tujuan_nama: editForm.tujuan_nama || null,
                      tujuan_jenjang: editForm.tujuan_jenjang || null,
                      alasan_tidak_melanjutkan: editForm.alasan || null,
                      alasan_detail: editForm.alasan_detail || null,
                    }),
                  });
                  if (r.ok) { setEditId(null); load(); }
                  else { const e = await r.json(); alert('Gagal: ' + (e.error || 'Unknown')); }
                } catch (err: any) { alert('Gagal: ' + (err.message || 'Unknown')); }
                setEditSaving(false);
              }} disabled={editSaving}
                className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2">
                {editSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
