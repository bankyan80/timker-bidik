import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { ALL_SCHOOLS } from '../data/mockData';
import {
  Search, Users, Shield, Loader2, X, Plus, Trash2, Pencil, Save, School, AlertTriangle, KeyRound
} from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  role: string;
  school_npsn: string | null;
  school_name: string | null;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'operator_sekolah', school_npsn: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api('/api/users');
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    (u.school_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditId(null);
    setForm({ username: '', password: '', role: 'operator_sekolah', school_npsn: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditId(u.id);
    setForm({ username: u.username, password: '', role: u.role, school_npsn: u.school_npsn || '' });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.username.trim()) { setError('Username wajib diisi'); return; }
    if (!editId && !form.password.trim()) { setError('Password wajib diisi'); return; }
    if (form.password.length > 0 && form.password.length < 6) { setError('Password minimal 6 karakter'); return; }
    setSaving(true);
    try {
      let res: Response;
      if (editId) {
        res = await api(`/api/users/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ username: form.username.trim(), password: form.password || undefined, role: form.role, school_npsn: form.school_npsn || null }),
        });
      } else {
        res = await api('/api/users', {
          method: 'POST',
          body: JSON.stringify({ username: form.username.trim(), password: form.password, role: form.role, school_npsn: form.school_npsn || null }),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan');
        return;
      }
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Hapus user "${username}"?`)) return;
    try {
      const res = await api(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) load();
    } catch {}
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-950/40 text-red-400 border-red-800',
      staff_kecamatan: 'bg-purple-950/40 text-purple-400 border-purple-800',
      operator_sekolah: 'bg-cyan-950/40 text-cyan-400 border-cyan-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${colors[role] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
        {role === 'operator_sekolah' ? 'Operator' : role === 'staff_kecamatan' ? 'Staff Kec.' : 'Admin'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="h-6 w-6 text-cyan-400" />
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-slate-400 mt-1">{users.length} pengguna terdaftar</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> Tambah Pengguna
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari username, role, sekolah..." className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700" />
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800">
              <th className="text-left px-4 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Username</th>
              <th className="text-left px-4 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Sekolah</th>
              <th className="text-right px-4 py-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center text-slate-500 py-8">Tidak ada pengguna ditemukan</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.username}</p>
                      <p className="text-[10px] font-mono text-slate-500">{u.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{roleBadge(u.role)}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{u.school_name || <span className="text-slate-600">-</span>}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(u.id, u.username)} disabled={u.id === user?.id} className={`p-1.5 rounded-lg transition-colors ${u.id === user?.id ? 'text-slate-700 cursor-not-allowed' : 'hover:bg-red-950/30 text-slate-400 hover:text-red-400'}`} title={u.id === user?.id ? 'Tidak bisa menghapus diri sendiri' : 'Hapus'}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800 rounded-lg text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700" />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Password {editId && <span className="text-slate-600">(kosongkan jika tidak diubah)</span>}
                </label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? 'Biarkan kosong jika tidak diubah' : 'Min. 6 karakter'} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700" />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, school_npsn: e.target.value === 'operator_sekolah' ? f.school_npsn : '' }))} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
                  <option value="admin">Admin</option>
                  <option value="staff_kecamatan">Staff Kecamatan</option>
                  <option value="operator_sekolah">Operator Sekolah</option>
                </select>
              </div>

              {form.role === 'operator_sekolah' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Sekolah</label>
                  <select value={form.school_npsn} onChange={e => setForm(f => ({ ...f, school_npsn: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
                    <option value="">Pilih sekolah...</option>
                    {ALL_SCHOOLS.map(s => (
                      <option key={s.npsn} value={s.npsn}>{s.name} ({s.npsn})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}