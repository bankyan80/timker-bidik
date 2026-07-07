import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Search, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface LogRow {
  id: string;
  user_id: string;
  username: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: number;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  create: 'Tambah',
  update: 'Ubah',
  delete: 'Hapus',
  upload: 'Upload',
  verify: 'Verifikasi',
  apply: 'Terapkan',
  graduate: 'Luluskan',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
  create: 'text-blue-400 bg-blue-950/40 border-blue-800',
  update: 'text-amber-400 bg-amber-950/40 border-amber-800',
  delete: 'text-red-400 bg-red-950/40 border-red-800',
  upload: 'text-cyan-400 bg-cyan-950/40 border-cyan-800',
  verify: 'text-green-400 bg-green-950/40 border-green-800',
  apply: 'text-purple-400 bg-purple-950/40 border-purple-800',
  graduate: 'text-pink-400 bg-pink-950/40 border-pink-800',
};

const ENTITY_LABELS: Record<string, string> = {
  auth: 'Autentikasi',
  employee: 'Pegawai',
  employee_period: 'Periode Pegawai',
  student: 'Siswa',
  student_detail: 'Detail Siswa',
  document: 'Dokumen',
  calendar_event: 'Kalender',
  user: 'Pengguna',
  alumni: 'Alumni',
  recommendation: 'Rekomendasi',
};

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));
      if (actionFilter) params.set('action', actionFilter);
      const res = await api(`/api/activity-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.rows || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  const filtered = logs.filter(l =>
    !search || l.username?.toLowerCase().includes(search.toLowerCase()) ||
    (ENTITY_LABELS[l.entity_type] || l.entity_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Riwayat Aktivitas</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Semua aktivitas login, tambah, ubah, hapus dari akun staff dan operator
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari aktivitas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-700"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(0); }}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-800/60 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-700"
            >
              <option value="">Semua Aksi</option>
              {Object.entries(ACTION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-sm">Belum ada aktivitas tercatat</p>
        </div>
      ) : (
        <div className="border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Tanggal & Waktu</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Pengguna</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Entitas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">ID Entitas</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                      <div className="font-medium">{formatDate(log.created_at)}</div>
                      <div className="text-[10px] text-slate-500">{formatTime(log.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap">
                      {log.username || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-600 text-slate-300">
                        {log.user_role === 'admin' ? 'Super Admin' : log.user_role === 'staff_kecamatan' ? 'Staf Kecamatan' : 'Operator'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ACTION_COLORS[log.action] || 'text-slate-400 bg-slate-800 border-slate-600'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[10px] max-w-[120px] truncate whitespace-nowrap">
                      {log.entity_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[10px] max-w-[200px] truncate">
                      {log.details && log.details !== '{}' ? log.details : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            {total} total aktivitas
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-slate-400 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
