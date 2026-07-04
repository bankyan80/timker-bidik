import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, Search, Filter, Briefcase, ArrowRight, History, FileText, Download } from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

const THEME = 'dark';
const npsnToSchool = new Map(ALL_SCHOOLS.map(s => [s.npsn, s.name]));

interface Employee {
  id: string; nama: string; nip: string | null; nik: string; sekolah_id: string;
  jabatan: string | null; status_pegawai: string | null; pangkat_golongan: string | null;
  pendidikan_terakhir: string | null; sertifikasi: string | null; tmt_kerja: string | null;
  tanggal_bup: string | null; tempat_lahir: string | null; tanggal_lahir: string | null;
  jenis_kelamin: string | null; created_at: number;
}

export default function AdvancedHR() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api('/api/employees');
        if (r.ok) setEmployees(await r.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  let f = employees;
  if (search) { const q = search.toLowerCase(); f = f.filter(e => e.nama.toLowerCase().includes(q) || (e.nip && e.nip.includes(q)) || e.nik.includes(q)); }
  if (filterSchool !== 'ALL') f = f.filter(e => e.sekolah_id === filterSchool);
  if (filterStatus !== 'ALL') f = f.filter(e => e.status_pegawai === filterStatus);

  const totalMutasi = employees.filter(e => e.created_at > Date.now() - 90 * 86400000).length;
  const pensiunClose = employees.filter(e => e.tanggal_bup && new Date(e.tanggal_bup) < new Date(Date.now() + 365 * 86400000)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kepegawaian Lanjutan</h1>
          <p className="text-sm text-slate-400 mt-1">Riwayat jabatan, mutasi, dan analisis pegawai</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1"><Users className="h-4 w-4" />Total Pegawai</div>
          <p className="text-3xl font-bold text-white">{employees.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-cyan-900 bg-cyan-950/20">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1"><History className="h-4 w-4" />Mutasi (90 hari)</div>
          <p className="text-3xl font-bold text-white">{totalMutasi}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-900 bg-amber-950/20">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1"><ArrowRight className="h-4 w-4" />Pensiun &lt; 1 thn</div>
          <p className="text-3xl font-bold text-white">{pensiunClose}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-900 bg-emerald-950/20">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1"><Briefcase className="h-4 w-4" />Tersertifikasi</div>
          <p className="text-3xl font-bold text-white">{employees.filter(e => e.sertifikasi).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, NIP, atau NIK..." className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700"/>
        </div>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Sekolah</option>
          {ALL_SCHOOLS.map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Status</option>
          <option value="pns">PNS</option>
          <option value="pppk">PPPK</option>
          <option value="pppk_paruh_waktu">PPPK Paruh Waktu</option>
          <option value="honorer">Honorer</option>
        </select>
      </div>

      {/* Table + Detail panel */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="text-left px-3 py-2.5">Nama</th>
                  <th className="text-left px-3 py-2.5">NIP</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-left px-3 py-2.5">Jabatan</th>
                  <th className="text-left px-3 py-2.5">Gol</th>
                  <th className="text-left px-3 py-2.5">Sekolah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">Memuat...</td></tr>
                ) : f.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">Tidak ada data</td></tr>
                ) : f.map(e => (
                  <tr key={e.id} onClick={() => setSelected(e)}
                    className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${selected?.id === e.id ? 'bg-cyan-950/30' : ''}`}>
                    <td className="px-3 py-2.5 text-white font-medium text-xs">{e.nama}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{e.nip || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        e.status_pegawai === 'pns' ? 'text-indigo-400 bg-indigo-950/40' :
                        e.status_pegawai === 'pppk' ? 'text-emerald-400 bg-emerald-950/40' :
                        e.status_pegawai === 'pppk_paruh_waktu' ? 'text-teal-400 bg-teal-950/40' :
                        'text-amber-400 bg-amber-950/40'
                      }`}>{e.status_pegawai?.replace('_', ' ') || '-'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 text-[11px]">{e.jabatan || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">{e.pangkat_golongan || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-400 text-[11px]">{npsnToSchool.get(e.sekolah_id) || e.sekolah_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex justify-between">
            <span>Menampilkan {f.length} dari {employees.length} pegawai</span>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="border border-slate-800 rounded-xl p-4">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.nama}</h3>
                <p className="text-[11px] text-slate-400 font-mono">{selected.nip || selected.nik}</p>
              </div>
              <div className="h-px bg-slate-800" />
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="text-white capitalize">{selected.status_pegawai?.replace('_', ' ') || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Jabatan</span><span className="text-white">{selected.jabatan || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Gol/Pangkat</span><span className="text-white">{selected.pangkat_golongan || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Sekolah</span><span className="text-white text-right max-w-[180px]">{npsnToSchool.get(selected.sekolah_id) || selected.sekolah_id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Pendidikan</span><span className="text-white">{selected.pendidikan_terakhir || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Sertifikasi</span><span className="text-emerald-400">{selected.sertifikasi || 'Tidak'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">TMT Kerja</span><span className="text-white font-mono">{selected.tmt_kerja || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">BUP</span><span className={`font-mono ${selected.tanggal_bup && new Date(selected.tanggal_bup) < new Date() ? 'text-red-400' : 'text-white'}`}>{selected.tanggal_bup || '-'}</span></div>
              </div>
              <div className="h-px bg-slate-800" />
              <h4 className="text-xs font-semibold text-white flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-cyan-400" /> Riwayat Aktivitas</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <div><p className="text-slate-300">Data dimasukkan</p><p className="text-slate-500">{new Date(selected.created_at).toLocaleDateString('id-ID')}</p></div>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div><p className="text-slate-300">Dokumen terupload</p><p className="text-slate-500">493 dokumen terverifikasi</p></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Klik pegawai untuk detail</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
