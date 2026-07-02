import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, List, BarChart3, X, Plus, Edit3, Trash2,
  BookOpen, Sun, AlertTriangle, Users, GraduationCap, FileText, Flag, CheckCircle,
  Printer, Download, Search, Filter, Clock, MapPin, User, Save, Bell
} from 'lucide-react';
import type { CalendarEvent } from '../types';

// ── PDF-sourced event data (fallback when API unavailable) ──
const FALLBACK_EVENTS: CalendarEvent[] = [
  { id: 'fb-1', title: 'Penyelarasan Kurikulum SMK', category: 'teacher_event', semester: 1, start_date: '2026-07-14', end_date: '2026-07-14', description: 'Penyelarasan kurikulum untuk satuan pendidikan SMK', education_level: 'SMK', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-2', title: 'Hari Pertama Masuk Sekolah', category: 'academic', semester: 1, start_date: '2026-07-15', end_date: '2026-07-15', description: 'Hari pertama masuk sekolah Tahun Pelajaran 2026/2027', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-3', title: 'MPLS SD/MI', category: 'student_event', semester: 1, start_date: '2026-07-15', end_date: '2026-07-21', description: 'Masa Pengenalan Lingkungan Sekolah untuk kelas 1 (15-17 & 20-21 Juli 2026)', education_level: 'SD', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-4', title: 'Sulingjar', category: 'assessment', semester: 1, start_date: '2026-08-03', end_date: '2026-08-31', description: 'Survei Lingkungan Belajar — pengisian instrumen lingkungan belajar oleh satuan pendidikan', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-5', title: 'TKA SMA/SMK', category: 'assessment', semester: 1, start_date: '2026-10-26', end_date: '2026-11-08', description: 'Tes Kemampuan Akademik untuk jenjang SMA dan SMK', education_level: 'SMA,SMK', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-6', title: 'Penetapan Rapor Semester 1', category: 'reports', semester: 1, start_date: '2026-12-23', end_date: '2026-12-23', description: 'Penetapan hasil penilaian rapor semester ganjil', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-7', title: 'Pembagian Rapor Semester 1', category: 'reports', semester: 1, start_date: '2026-12-23', end_date: '2026-12-23', description: 'Pembagian rapor kepada siswa semester ganjil', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-8', title: 'Libur Semester 1', category: 'holiday', semester: 1, start_date: '2026-12-28', end_date: '2027-01-08', description: 'Libur akhir semester ganjil', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-9', title: 'Hari Pertama Semester 2', category: 'academic', semester: 2, start_date: '2027-01-11', end_date: '2027-01-11', description: 'Hari pertama masuk sekolah semester genap', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-10', title: 'Libur Awal Ramadan', category: 'holiday', semester: 2, start_date: '2027-02-08', end_date: '2027-02-12', description: 'Libur awal bulan Ramadan 1448 H', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-11', title: 'Libur Idul Fitri', category: 'holiday', semester: 2, start_date: '2027-03-08', end_date: '2027-03-19', description: 'Libur Hari Raya Idul Fitri 1448 H', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-12', title: 'Penetapan Rapor Semester 2', category: 'reports', semester: 2, start_date: '2027-06-25', end_date: '2027-06-25', description: 'Penetapan hasil penilaian rapor semester genap', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-13', title: 'Pembagian Rapor Semester 2', category: 'reports', semester: 2, start_date: '2027-06-25', end_date: '2027-06-25', description: 'Pembagian rapor dan kenaikan kelas', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
  { id: 'fb-14', title: 'Libur Akhir Tahun Ajaran', category: 'holiday', semester: 2, start_date: '2027-06-28', end_date: '2027-07-09', description: 'Libur akhir tahun pelajaran 2026/2027', education_level: 'ALL', created_by: null, created_at: Date.now(), updated_at: Date.now(), completed: 0 },
];

// ── Helpers ──
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const SEMESTER_RANGES = { 1: { start: '2026-07-15', end: '2026-12-23' }, 2: { start: '2027-01-11', end: '2027-06-25' } };

const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  academic:      { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-900', dot: 'bg-blue-500', label: 'Akademik' },
  holiday:       { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-900', dot: 'bg-red-500', label: 'Libur' },
  assessment:    { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-900', dot: 'bg-orange-500', label: 'Asesmen' },
  student_event: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-900', dot: 'bg-emerald-500', label: 'Keg. Siswa' },
  teacher_event: { bg: 'bg-teal-950/40', text: 'text-teal-400', border: 'border-teal-900', dot: 'bg-teal-500', label: 'Keg. Guru' },
  national_event:{ bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-900', dot: 'bg-amber-500', label: 'Nasional' },
  reports:       { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-900', dot: 'bg-purple-500', label: 'Rapor' },
};

const CATEGORY_ICON: Record<string, any> = {
  academic: BookOpen, holiday: Sun, assessment: AlertTriangle,
  student_event: Users, teacher_event: GraduationCap, national_event: Flag, reports: FileText,
};

function fmtDate(dateStr: string, long?: boolean): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (long) return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000) + 1);
}

// ── Component ──
export default function AcademicCalendar() {
  const now = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>(FALLBACK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'agenda' | 'timeline'>('calendar');
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [filterSemester, setFilterSemester] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [role, setRole] = useState<string>(() => localStorage.getItem('kaldik-role') || 'operator');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [showSchoolPrep, setShowSchoolPrep] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (filterSemester) params.set('semester', String(filterSemester));
        if (filterCategory) params.set('category', filterCategory);
        if (filterLevel !== 'ALL') params.set('level', filterLevel);
        const r = await fetch(`/api/calendar?${params}`);
        if (r.ok) { const data = await r.json(); setEvents(data); }
      } catch { /* use fallback */ }
      setLoading(false);
    })();
  }, [filterSemester, filterCategory, filterLevel]);

  const saveRole = (r: string) => { setRole(r); localStorage.setItem('kaldik-role', r); };

  // Filter events
  let visibleEvents = [...events, ...localEvents];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    visibleEvents = visibleEvents.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  }

  // Calendar grid data
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Build date-to-event map
  const eventDateMap: Record<string, CalendarEvent[]> = {};
  for (const e of visibleEvents) {
    const start = new Date(e.start_date + 'T00:00:00');
    const end = new Date(e.end_date + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!eventDateMap[key]) eventDateMap[key] = [];
      eventDateMap[key].push(e);
    }
  }

  // Month events for agenda
  const monthEvents = visibleEvents.filter(e => {
    const s = new Date(e.start_date + 'T00:00:00');
    const en = new Date(e.end_date + 'T00:00:00');
    const mStart = new Date(year, month, 1);
    const mEnd = new Date(year, month + 1, 0);
    return s <= mEnd && en >= mStart;
  });

  // Stats
  const totalAcademic = visibleEvents.filter(e => e.category === 'academic').length;
  const totalHoliday = visibleEvents.filter(e => e.category === 'holiday').length;
  const totalAssessment = visibleEvents.filter(e => e.category === 'assessment').length;
  const upcoming = visibleEvents.filter(e => e.start_date >= todayStr && !e.completed).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);

  // ── Admin: add/edit event ──
  function EventForm({ event, onClose }: { event?: CalendarEvent | null; onClose: () => void }) {
    const [title, setTitle] = useState(event?.title || '');
    const [category, setCategory] = useState(event?.category || 'academic');
    const [semester, setSemester] = useState(event?.semester || 1);
    const [startDate, setStartDate] = useState(event?.start_date || '');
    const [endDate, setEndDate] = useState(event?.end_date || '');
    const [description, setDescription] = useState(event?.description || '');
    const [educationLevel, setEducationLevel] = useState(event?.education_level || 'ALL');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        const payload = { title, category, semester, start_date: startDate, end_date: endDate, description, education_level: educationLevel, created_by: role };
        if (event) {
          await fetch(`/api/calendar/${event.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } else {
          const res = await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) {
            const created = await res.json();
            setLocalEvents(prev => [...prev, created]);
          }
        }
        setShowAddModal(false);
        setEditingEvent(null);
        // Reload
        const r = await fetch('/api/calendar');
        if (r.ok) setEvents(await r.json());
      } catch {}
      setSaving(false);
      onClose();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[11px] font-mono text-slate-400 mb-1 block">Nama Kegiatan</label>
          <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700" placeholder="Nama kegiatan..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono text-slate-400 mb-1 block">Kategori</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
              <option value="academic">Akademik</option>
              <option value="holiday">Libur</option>
              <option value="assessment">Asesmen</option>
              <option value="student_event">Kegiatan Siswa</option>
              <option value="teacher_event">Kegiatan Guru</option>
              <option value="reports">Rapor</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono text-slate-400 mb-1 block">Semester</label>
            <select value={semester} onChange={e => setSemester(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono text-slate-400 mb-1 block">Tanggal Mulai</label>
            <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700" />
          </div>
          <div>
            <label className="text-[11px] font-mono text-slate-400 mb-1 block">Tanggal Selesai</label>
            <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-mono text-slate-400 mb-1 block">Jenjang</label>
          <select value={educationLevel} onChange={e => setEducationLevel(e.target.value)} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
            <option value="ALL">Semua Jenjang</option>
            <option value="TK">TK</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="SMK">SMK</option>
            <option value="SLB">SLB</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-mono text-slate-400 mb-1 block">Deskripsi</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700" placeholder="Deskripsi..." />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Menyimpan...' : event ? 'Simpan Perubahan' : 'Tambah Event'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">Batal</button>
        </div>
      </form>
    );
  }

  // Modal
  function EventModal({ event, onClose, onEdit, onDelete }: { event: CalendarEvent; onClose: () => void; onEdit?: () => void; onDelete?: () => void }) {
    const Icon = CATEGORY_ICON[event.category] || BookOpen;
    const style = CATEGORY_STYLE[event.category] || CATEGORY_STYLE.academic;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${style.bg} ${style.text}`}><Icon className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-white">{event.title}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${style.bg} ${style.text} ${style.border} border`}>{style.label}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded text-slate-400"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-300"><Calendar className="h-4 w-4 text-slate-500" />{fmtDate(event.start_date, true)}{event.start_date !== event.end_date ? ` — ${fmtDate(event.end_date, true)}` : ''}</div>
            <div className="flex items-center gap-2 text-slate-300"><Clock className="h-4 w-4 text-slate-500" />{daysBetween(event.start_date, event.end_date)} hari</div>
            <div className="flex items-center gap-2 text-slate-300"><MapPin className="h-4 w-4 text-slate-500" />Jenjang: {event.education_level === 'ALL' ? 'Semua Jenjang' : event.education_level}</div>
            <div className="flex items-center gap-2 text-slate-300"><GraduationCap className="h-4 w-4 text-slate-500" />Semester {event.semester}</div>
            {event.description && <p className="text-slate-400 bg-slate-800/40 rounded-lg p-3 text-sm">{event.description}</p>}
            {event.completed ? (
              <div className="flex items-center gap-2 text-emerald-400"><CheckCircle className="h-4 w-4" /> Sudah selesai</div>
            ) : event.start_date <= todayStr && event.end_date >= todayStr ? (
              <div className="flex items-center gap-2 text-amber-400"><Clock className="h-4 w-4" /> Sedang berlangsung</div>
            ) : null}
            {event.created_by && <div className="flex items-center gap-2 text-slate-500 text-[11px]"><User className="h-3 w-3" /> Dibuat oleh: {event.created_by}</div>}
          </div>
          {(role === 'admin') && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
              <button onClick={onEdit} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
              <button onClick={onDelete} className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 text-xs rounded-lg flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
              <button onClick={async () => {
                await fetch(`/api/calendar/${event.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: event.completed ? 0 : 1 }) });
                setEvents(prev => prev.map(e => e.id === event.id ? { ...e, completed: e.completed ? 0 : 1 } : e));
                onClose();
              }} className="px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> {event.completed ? 'Batal Selesai' : 'Tandai Selesai'}
              </button>
            </div>
          )}
          {role === 'staff' && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
              <button className="px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 text-xs rounded-lg flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Kirim Pengingat</button>
            </div>
          )}
          {role === 'operator' && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
              <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Tandai Siap</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kalender Pendidikan 2026/2027</h1>
          <p className="text-sm text-slate-400 mt-1">Kalender Pendidikan Provinsi Jawa Barat</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-900">TA 2026/2027</span>
            <span className="text-[10px] font-mono text-slate-500">Update: 3 Juli 2026</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role selector */}
          <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-0.5">
            {['admin','staff','operator'].map(r => (
              <button key={r} onClick={() => saveRole(r)} className={`px-2.5 py-1.5 text-[10px] font-mono rounded transition-colors ${role === r ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {r === 'admin' ? 'Admin' : r === 'staff' ? 'Staf Kec.' : 'Operator'}
              </button>
            ))}
          </div>
          {role === 'admin' && (
            <button onClick={() => { setEditingEvent(null); setShowAddModal(true); }} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tambah Event
            </button>
          )}
          {role === 'staff' && (
            <button onClick={() => setShowSchoolPrep(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Kirim Notifikasi
            </button>
          )}
          <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Cetak
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Kegiatan Akademik', value: totalAcademic, icon: BookOpen, color: 'border-blue-900 bg-blue-950/20 text-blue-400' },
          { label: 'Total Hari Libur', value: totalHoliday, icon: Sun, color: 'border-red-900 bg-red-950/20 text-red-400' },
          { label: 'Total Asesmen', value: totalAssessment, icon: AlertTriangle, color: 'border-orange-900 bg-orange-950/20 text-orange-400' },
          { label: 'Semester 1', value: '15 Jul – 23 Des 2026', icon: Calendar, color: 'border-purple-900 bg-purple-950/20 text-purple-400', small: true },
          { label: 'Semester 2', value: '11 Jan – 25 Jun 2027', icon: Calendar, color: 'border-teal-900 bg-teal-950/20 text-teal-400', small: true },
        ].map((c, i) => (
          <div key={i} className={`p-4 rounded-xl border ${c.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon className="h-4 w-4 opacity-70" />
              <span className="text-[10px] font-mono opacity-60">{c.label}</span>
            </div>
            <p className={`${c.small ? 'text-sm' : 'text-2xl'} font-bold text-white tracking-tight`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari kegiatan..." className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-700" />
        </div>
        <select value={filterSemester ?? ''} onChange={e => setFilterSemester(e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="">Semua Semester</option>
          <option value={1}>Semester 1</option>
          <option value={2}>Semester 2</option>
        </select>
        <select value={filterCategory ?? ''} onChange={e => setFilterCategory(e.target.value || null)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="">Semua Kategori</option>
          {Object.entries(CATEGORY_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
          <option value="ALL">Semua Jenjang</option>
          <option value="TK">TK</option>
          <option value="SD">SD</option>
          <option value="SMP">SMP</option>
          <option value="SMA">SMA</option>
          <option value="SMK">SMK</option>
          <option value="SLB">SLB</option>
        </select>
        {/* View toggles */}
        <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-0.5">
          {(['calendar','agenda','timeline'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-2.5 py-1.5 text-[10px] font-mono rounded flex items-center gap-1 transition-colors ${view === v ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {v === 'calendar' ? <Calendar className="h-3 w-3" /> : v === 'agenda' ? <List className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
              {v === 'calendar' ? 'Bulan' : v === 'agenda' ? 'Agenda' : 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {view === 'calendar' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-800">
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft className="h-4 w-4" /></button>
            <h2 className="text-base font-semibold text-white">{MONTHS[month]} {year}</h2>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-[10px] font-mono text-slate-500 uppercase">
            {DAYS_SHORT.map((dayName, idx) => <div key={dayName} className={`text-center py-2 border-b border-slate-800 ${idx === 0 ? 'text-red-400' : ''}`}>{dayName}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({length: firstDay}).map((_, i) => <div key={`e${i}`} className="min-h-[110px] border-r border-b border-slate-800 bg-slate-900/20" />)}
            {Array.from({length: daysInMonth}).map((_, i) => {
              const d = i + 1;
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const dayOfWeek = new Date(year, month, d).getDay();
              const dayEvts = eventDateMap[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSunday = dayOfWeek === 0;
              const isHoliday = dayEvts.some(ev => ev.category === 'holiday');
              const unique = dayEvts.filter((ev, idx, self) => self.findIndex(e => e.id === ev.id) === idx);
              const isRed = isSunday || isHoliday;
              return (
                <div key={d} className={`min-h-[110px] border-r border-b border-slate-800 p-2 cursor-pointer hover:bg-slate-800/20 transition-colors ${isToday ? 'ring-2 ring-inset ring-cyan-600' : ''} ${isRed ? 'bg-red-950/30' : ''}`}
                  onClick={() => unique.length > 0 && setSelectedEvent(unique[0])}>
                  <span className={`text-base font-bold font-mono ${isToday ? 'text-cyan-400' : isRed ? 'text-white' : 'text-white'}`}>{d}</span>
                  <div className="space-y-0.5 mt-1">
                    {unique.slice(0, 3).map(ev => {
                      const s = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.academic;
                      return (
                        <div key={ev.id} className={`text-[8px] px-1 py-0.5 rounded ${s.bg} ${s.text} truncate flex items-center gap-0.5 leading-tight`} title={ev.title}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot} shrink-0`} />
                          {ev.title}
                        </div>
                      );
                    })}
                    {unique.length > 3 && <span className="text-[8px] text-slate-500 px-1">+{unique.length - 3} lagi</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'agenda' && (
        <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
          {monthEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Tidak ada kegiatan bulan ini</div>
          ) : monthEvents.sort((a, b) => a.start_date.localeCompare(b.start_date)).map(ev => {
            const Icon = CATEGORY_ICON[ev.category] || BookOpen;
            const s = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.academic;
            return (
              <div key={ev.id} className="px-4 py-3 hover:bg-slate-800/30 cursor-pointer transition-colors flex items-start gap-3" onClick={() => setSelectedEvent(ev)}>
                <div className={`p-2 rounded-lg ${s.bg} ${s.text} shrink-0`}><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{ev.title}</p>
                    {ev.completed ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : null}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {fmtDate(ev.start_date)}{ev.start_date !== ev.end_date ? ` — ${fmtDate(ev.end_date)}` : ''} • {daysBetween(ev.start_date, ev.end_date)} hari
                  </p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${s.bg} ${s.text} border ${s.border} shrink-0`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {view === 'timeline' && (
        <div className="border border-slate-800 rounded-xl p-4 space-y-4">
          {visibleEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Tidak ada kegiatan</div>
          ) : (
            [...visibleEvents].sort((a, b) => a.start_date.localeCompare(b.start_date)).map((ev, i) => {
              const s = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.academic;
              const prevEnd = i > 0 ? visibleEvents.sort((a, b) => a.start_date.localeCompare(b.start_date))[i-1].end_date : null;
              const gapDays = prevEnd ? daysBetween(prevEnd, ev.start_date) : 0;
              return (
                <React.Fragment key={ev.id}>
                  {gapDays > 3 && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono pl-4">
                      <span className="flex-1 h-px bg-slate-800" />
                      Selang {gapDays} hari
                      <span className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <div className="flex items-start gap-4 cursor-pointer hover:bg-slate-800/30 rounded-lg p-2 transition-colors" onClick={() => setSelectedEvent(ev)}>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${s.dot} ring-2 ring-slate-800`} />
                      <div className="w-0.5 flex-1 bg-slate-800 min-h-[24px] mt-1" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${s.bg} ${s.text}`}>{s.label}</span>
                        <span className="text-[10px] font-mono text-slate-500">{fmtDate(ev.start_date)}</span>
                      </div>
                      <p className="text-sm text-white font-medium mt-0.5">{ev.title}</p>
                      <p className="text-xs text-slate-400">{ev.description}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Durasi: {daysBetween(ev.start_date, ev.end_date)} hari • Semester {ev.semester}</p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {/* Upcoming & Legend side-by-side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-400" /> Kegiatan Mendatang</h3>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-500">Tidak ada kegiatan mendatang</p>
            ) : upcoming.map(ev => {
              const s = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.academic;
              const daysLeft = daysBetween(todayStr, ev.start_date);
              return (
                <div key={ev.id} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-slate-800/30 rounded p-1.5 transition-colors" onClick={() => setSelectedEvent(ev)}>
                  <span className={`h-2 w-2 rounded-full ${s.dot} mt-0.5 shrink-0`} />
                  <div className="flex-1">
                    <p className="text-slate-300">{ev.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{fmtDate(ev.start_date)}</p>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono shrink-0">H-{daysLeft}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Filter className="h-4 w-4 text-cyan-400" /> Legenda</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CATEGORY_STYLE).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`} />
                <span className="text-slate-400">{v.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-slate-500 font-mono">
            <p>Sumber: Kalender Pendidikan Provinsi Jawa Barat TA 2026/2027</p>
            <p>Total {visibleEvents.length} kegiatan • {role === 'admin' ? 'Akses Admin' : role === 'staff' ? 'Akses Staf Kecamatan' : 'Akses Operator'}</p>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => { setEditingEvent(selectedEvent); setShowAddModal(true); setSelectedEvent(null); }}
          onDelete={() => handleDeleteEvent(selectedEvent.id)}
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingEvent(null); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{editingEvent ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingEvent(null); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <EventForm event={editingEvent} onClose={() => { setShowAddModal(false); setEditingEvent(null); }} />
          </div>
        </div>
      )}

      {/* School Prep Modal (staff feature) */}
      {showSchoolPrep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSchoolPrep(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bell className="h-5 w-5 text-cyan-400" /> Kirim Notifikasi ke Sekolah</h3>
              <button onClick={() => setShowSchoolPrep(false)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <select className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700">
                <option value="">Pilih kegiatan...</option>
                {visibleEvents.filter(e => !e.completed).map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({fmtDate(ev.start_date)})</option>
                ))}
              </select>
              <textarea rows={3} className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-700" placeholder="Pesan notifikasi..." defaultValue="Mohon persiapan menyambut kegiatan ini. Terima kasih." />
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors">
                Kirim Notifikasi ke Semua Sekolah
              </button>
              <p className="text-[10px] text-slate-500 font-mono">Notifikasi akan dikirim ke 22 SD Negeri di Kecamatan Lemahabang</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
