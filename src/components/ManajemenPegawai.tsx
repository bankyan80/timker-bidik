import React, { useState, useEffect } from 'react';
import {
  Search, Users, Building2, School, ChevronDown, ChevronUp,
  Filter, Loader2, AlertCircle, CheckCircle, X, FileText
} from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';
import { School as SchoolType } from '../types';

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

export default function ManajemenPegawai() {
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'Negeri' | 'Swasta'>('Negeri');
  const [levelTab, setLevelTab] = useState<string>('SD');
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

  const schoolMap = new Map<string, SchoolType>();
  ALL_SCHOOLS.forEach(s => schoolMap.set(s.npsn, s));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/employees-with-docs');
        if (!res.ok) throw new Error('API unavailable');
        const rows: any[] = await res.json();
        const mapped: Pegawai[] = rows.map(r => {
          const s = schoolMap.get(r.sekolah_id);
          return {
            id: r.id,
            nama: r.nama,
            nipNik: r.nip || r.nik || '-',
            status_pegawai: r.status_pegawai || '-',
            jabatan: r.jabatan || '-',
            sekolah_id: r.sekolah_id,
            sekolah_nama: s?.name || r.sekolah_id,
            sekolah_level: s?.level || 'SD',
            sekolah_status: s?.status || 'Negeri',
            doc_count: (r.documents || []).length,
          };
        });
        setPegawai(mapped);
      } catch { /* fallback mock */ }
      setLoading(false);
    })();
  }, []);

  const levels = ['SD', 'TK', 'KB'];
  const filtered = pegawai.filter(p =>
    p.sekolah_status === statusTab &&
    p.sekolah_level === levelTab &&
    (p.nama.toLowerCase().includes(search.toLowerCase()) ||
     p.nipNik.includes(search) ||
     p.sekolah_nama.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedBySchool = new Map<string, Pegawai[]>();
  filtered.forEach(p => {
    const key = p.sekolah_nama;
    if (!groupedBySchool.has(key)) groupedBySchool.set(key, []);
    groupedBySchool.get(key)!.push(p);
  });

  const toggleSchool = (name: string) => {
    setExpandedSchools(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

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
      ) : groupedBySchool.size === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-xs font-mono">Tidak ada pegawai untuk {statusTab} / {levelTab}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...groupedBySchool.entries()].map(([schoolName, emps]) => (
            <div key={schoolName} className="bg-[#151922] border border-[#1f2937] rounded-lg overflow-hidden">
              <button onClick={() => toggleSchool(schoolName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a1f2c] transition-all cursor-pointer">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-200 font-mono">{schoolName}</span>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded">{emps.length} pegawai</span>
                </div>
                {expandedSchools.has(schoolName) ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>

              {expandedSchools.has(schoolName) && (
                <div className="border-t border-[#1f2937]">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="bg-[#0c0e12] text-slate-400">
                        <th className="text-left p-2 pl-4 font-semibold">Nama</th>
                        <th className="text-left p-2 font-semibold">NIP/NIK</th>
                        <th className="text-left p-2 font-semibold">Status</th>
                        <th className="text-left p-2 font-semibold">Jabatan</th>
                        <th className="text-center p-2 pr-4 font-semibold">Dokumen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emps.map(emp => (
                        <tr key={emp.id} className="border-t border-[#1f2937] hover:bg-[#1a1f2c] transition-all">
                          <td className="p-2 pl-4 text-slate-200 font-bold">{emp.nama}</td>
                          <td className="p-2 text-slate-300">{emp.nipNik}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              emp.status_pegawai?.toLowerCase().includes('pns') ? 'bg-blue-950 text-blue-300 border border-blue-900' :
                              emp.status_pegawai?.toLowerCase().includes('pppk') ? 'bg-purple-950 text-purple-300 border border-purple-900' :
                              'bg-amber-950 text-amber-300 border border-amber-900'
                            }`}>
                              {emp.status_pegawai || '-'}
                            </span>
                          </td>
                          <td className="p-2 text-slate-400">{emp.jabatan}</td>
                          <td className="p-2 pr-4 text-center">
                            <span className="text-slate-400">{emp.doc_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
