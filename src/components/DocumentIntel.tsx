import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  BarChart2,
  PieChart,
  ArrowUpDown,
  User,
  FileCheck,
  RefreshCw,
  AlertTriangle,
  Building2,
  Plus,
  Check,
  Loader2,
  Printer,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';
import {
  Employee,
  DocumentItem,
  getRequiredDocsForStatus,
  calculateEmployeeStats,
  getGlobalStats,
  loadEmployees
} from '../data/employeeDocsData';

function extractDriveFileId(url: string): string | null {
  const m = url.match(/\/file\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
}

function mapCategoryToDBKategori(category: string, docName: string): string {
  const lower = docName.toLowerCase();
  if (lower.includes('foto') || lower.includes('pass')) return 'PASS FOTO';
  if (lower.includes('ijazah')) return 'IJAZAH';
  if (lower.includes('transkrip') || lower.includes('transkip')) return 'TRANSKIP NILAI';
  if (lower.includes('ktp')) return 'IDENTITAS DIRI';
  if (lower.includes('kk') || lower.includes('kartu keluarga')) return 'DATA KELUARGA';
  if (lower.includes('npwp')) return 'IDENTITAS DIRI';
  if (lower.includes('karis') || lower.includes('karsu') || lower.includes('karpeg')) return 'IDENTITAS DIRI';
  if (lower.includes('sk ') || lower.includes('sk p3k') || lower.includes('sk pppk') || lower.includes('spmt')) return 'SK JABATAN';
  if (lower.includes('skbm')) return 'SKBM';
  if (lower.includes('sertifikat') || lower.includes('sertif')) return 'SERTIFIKAT';
  if (lower.includes('bpjs')) return 'IDENTITAS DIRI';
  if (category === 'Identitas') return 'IDENTITAS DIRI';
  if (category === 'Pengangkatan' || category === 'Kepangkatan') return 'SK JABATAN';
  if (category === 'Kinerja') return 'SKP-DP3';
  return 'LAINNYA';
}

export default function DocumentIntel() {
  const { user } = useAuth();
  const isOperator = user?.role === 'operator_sekolah';
  const operatorSchoolName = user?.schoolName || '';
  const operatorNpsn = user?.schoolNpsn || '';

  // Theme Detection State
  const [theme, setTheme] = useState<'light' | 'dark' | 'command' | 'emerald'>('dark');

  useEffect(() => {
    const detectTheme = () => {
      const root = document.getElementById('app-root');
      if (root) {
        if (root.classList.contains('theme-light')) setTheme('light');
        else if (root.classList.contains('theme-command')) setTheme('command');
        else if (root.classList.contains('theme-emerald')) setTheme('emerald');
        else setTheme('dark');
      }
    };
    detectTheme();
    const observer = new MutationObserver(detectTheme);
    const root = document.getElementById('app-root');
    if (root) {
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, []);

  // Main Employees State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize data
  useEffect(() => {
    (async () => {
      try {
        const data = await loadEmployees();
        setEmployees(data);
      } catch {
        // fallback handled inside loadEmployees
      }
      setLoading(false);
    })();
  }, []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSchool, setFilterSchool] = useState(isOperator ? operatorSchoolName : 'ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCompleteness, setFilterCompleteness] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Table Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof Employee | 'completeness' | 'warning'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Detail Drawer & Overlays
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ emp: Employee; doc: DocumentItem } | null>(null);
  
  // New Employee Modal Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({
    name: '',
    nipNik: '',
    status: 'PNS' as 'PNS' | 'PPPK' | 'Honorer',
    school: isOperator ? operatorSchoolName : (ALL_SCHOOLS[0]?.name || ''),
    position: ''
  });

  // Upload Engine Simulation States
  const [uploadState, setUploadState] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    docItem: DocumentItem | null;
    stage: 'select' | 'compress' | 'chunk' | 'ocr' | 'success';
    progress: number;
    speed: string;
    fileName: string;
    fileSize: string;
  }>({
    isOpen: false,
    employee: null,
    docItem: null,
    stage: 'select',
    progress: 0,
    speed: '0 MB/s',
    fileName: '',
    fileSize: ''
  });

  // Derived Analytics stats in real-time
  const globalStats = getGlobalStats(employees);

  // Soft trigger reload of skeleton loader for visual feedback when filters change
  const handleFilterChange = (setter: Function, val: any) => {
    setter(val);
    setLoading(true);
    setTimeout(() => setLoading(false), 200);
  };

  // Sorting helper
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter Logic
  const filteredEmployees = employees.filter(emp => {
    const stats = calculateEmployeeStats(emp);
    
    // Search Name / NIP
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.nipNik.includes(searchQuery);
    
    // Filter School
    const matchesSchool = filterSchool === 'ALL' || emp.school === filterSchool;
    
    // Filter Employee Status
    const matchesStatus = filterStatus === 'ALL' || emp.status === filterStatus;
    
    // Filter Completeness Status
    const matchesCompleteness = filterCompleteness === 'ALL' || 
      (filterCompleteness === 'LENGKAP' && stats.statusText === 'Lengkap') ||
      (filterCompleteness === 'HAMPIR' && stats.statusText === 'Hampir Lengkap') ||
      (filterCompleteness === 'BELUM' && stats.statusText === 'Belum Lengkap');
    
    // Filter Category
    const matchesCategory = filterCategory === 'ALL' || 
      emp.documents.some(d => d.category === filterCategory && (d.status === 'available' || d.status === 'warning'));

    return matchesSearch && matchesSchool && matchesStatus && matchesCompleteness && matchesCategory;
  });

  // Sorting Logic
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aStats = calculateEmployeeStats(a);
    const bStats = calculateEmployeeStats(b);

    let valA: any = a[sortField as keyof Employee] || '';
    let valB: any = b[sortField as keyof Employee] || '';

    if (sortField === 'completeness') {
      valA = aStats.completionPercent;
      valB = bStats.completionPercent;
    } else if (sortField === 'warning') {
      valA = aStats.warningsCount;
      valB = bStats.warningsCount;
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' 
        ? (valA > valB ? 1 : -1) 
        : (valB > valA ? 1 : -1);
    }
  });

  // Pagination bounds
  const totalPages = Math.ceil(sortedEmployees.length / pageSize) || 1;
  const paginatedEmployees = sortedEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Auto Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSchool, filterStatus, filterCompleteness, filterCategory, pageSize]);

  // Operations: Delete Document
  const handleDeleteDocument = async (empId: string, docId: string) => {
    // Find the document to get the real DB ID
    const emp = employees.find(e => e.id === empId);
    const doc = emp?.documents.find(d => d.id === docId);
    if (!doc || !doc.dbId) {
      // For documents without a real DB ID, just do local state update
      setEmployees(prev => prev.map(emp => {
        if (emp.id !== empId) return emp;
        return {
          ...emp,
          documents: emp.documents.map(d => {
            if (d.id !== docId) return d;
            return { id: d.id, name: d.name.split('_')[0], category: d.category, status: 'missing' };
          })
        };
      }));
      if (selectedEmployee?.id === empId) {
        setSelectedEmployee(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: prev.documents.map(d => {
              if (d.id !== docId) return d;
              return { id: d.id, name: d.name.split('_')[0], category: d.category, status: 'missing' };
            })
          };
        });
      }
      return;
    }
    
    if (!confirm(`Hapus dokumen "${doc.name}"?`)) return;
    
    try {
      const res = await api(`/api/documents/${doc.dbId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert('Gagal menghapus: ' + (err.error || res.statusText));
        return;
      }
      
      // Update local state
      setEmployees(prev => prev.map(emp => {
        if (emp.id !== empId) return emp;
        return {
          ...emp,
          documents: emp.documents.map(d => {
            if (d.id !== docId) return d;
            return {
              id: d.id,
              name: d.name.split('_')[0],
              category: d.category,
              status: 'missing'
            };
          })
        };
      }));
      
      if (selectedEmployee?.id === empId) {
        setSelectedEmployee(prev => {
          if (!prev) return null;
          return {
            ...prev,
            documents: prev.documents.map(d => {
              if (d.id !== docId) return d;
              return { id: d.id, name: d.name.split('_')[0], category: d.category, status: 'missing' };
            })
          };
        });
      }
    } catch {
      alert('Gagal menghapus dokumen. Coba lagi.');
    }
  };

  // Form Submit: Add Employee
  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpForm.name || !newEmpForm.nipNik || !newEmpForm.position) return;

    const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
    const initialDocs = getRequiredDocsForStatus(newEmpForm.status).map((rd, i) => ({
      id: `DOC-${newId}-${i + 1}`,
      name: rd.name,
      category: rd.category,
      status: 'missing' as const
    }));

    const newEmp: Employee = {
      id: newId,
      name: newEmpForm.name,
      nipNik: newEmpForm.nipNik,
      status: newEmpForm.status,
      school: newEmpForm.school,
      position: newEmpForm.position,
      documents: initialDocs
    };

    setEmployees(prev => [newEmp, ...prev]);
    setShowAddModal(false);
    setNewEmpForm({
      name: '',
      nipNik: '',
      status: 'PNS',
      school: isOperator ? operatorSchoolName : (ALL_SCHOOLS[0]?.name || ''),
      position: ''
    });

    // Flash loading
    setLoading(true);
    setTimeout(() => setLoading(false), 300);

    // Persist to API
    (async () => {
      try {
        const npsnMap = new Map(ALL_SCHOOLS.map(s => [s.name, s.npsn]));
        await api('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: newEmpForm.name,
            nip: newEmpForm.nipNik,
            status_pegawai: newEmpForm.status,
            jabatan: newEmpForm.position,
            sekolah_id: npsnMap.get(newEmpForm.school) || operatorNpsn || '',
          })
        });
      } catch {}
    })();
  };

  // Upload Engine Actions
  const handleInitiateUpload = (emp: Employee, doc: DocumentItem) => {
    setUploadState({
      isOpen: true,
      employee: emp,
      docItem: doc,
      stage: 'select',
      progress: 0,
      speed: '0 MB/s',
      fileName: '',
      fileSize: ''
    });
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleProcessSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessSelectedFile(file);
  };

  const handleProcessSelectedFile = async (file: File) => {
    // Validate Size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("Error: File size exceeds the maximum limit of 10MB!");
      return;
    }
    // Validate extension
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      alert("Error: Invalid file format! Supported files: PDF, JPG, JPEG, PNG");
      return;
    }

    const targetEmp = uploadState.employee;
    const targetDoc = uploadState.docItem;
    if (!targetEmp || !targetDoc) return;

    // Move to stage 2: Compression
    setUploadState(prev => ({
      ...prev,
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      stage: 'compress'
    }));

    await new Promise(r => setTimeout(r, 1500));

    // Move to stage 3: Chunk Uploading
    setUploadState(prev => ({ ...prev, stage: 'chunk', progress: 10 }));

    // Read file and upload
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Progress animation during upload
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 15, 90),
          speed: (1.5 + Math.random() * 2).toFixed(1) + ' MB/s'
        }));
      }, 300);

      const res = await api('/api/upload-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          employeeId: targetEmp.id,
          schoolName: targetEmp.school,
          jenisDokumen: targetDoc.name,
          kategori: mapCategoryToDBKategori(targetDoc.category, targetDoc.name),
        }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const err = await res.json();
        alert('Gagal upload: ' + (err.error || res.statusText));
        setUploadState(prev => ({ ...prev, stage: 'select', progress: 0 }));
        return;
      }

      const result = await res.json();

      setUploadState(prev => ({ ...prev, progress: 100, speed: '0 MB/s', stage: 'ocr' }));

      await new Promise(r => setTimeout(r, 800));

      // Apply document to state with real data from server
      setEmployees(prev => prev.map(em => {
        if (em.id !== targetEmp.id) return em;
        return {
          ...em,
          documents: em.documents.map(d => {
            if (d.id !== targetDoc.id) return d;
            return {
              ...d,
              name: file.name,
              status: 'available',
              uploadDate: new Date().toISOString().split('T')[0],
              fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
              fileType: ext.toUpperCase() as any,
              driveUrl: result.driveUrl,
            };
          })
        };
      }));

      setSelectedEmployee(prev => {
        if (!prev || prev.id !== targetEmp.id) return prev;
        return {
          ...prev,
          documents: prev.documents.map(d => {
            if (d.id !== targetDoc.id) return d;
            return {
              ...d,
              name: file.name,
              status: 'available',
              uploadDate: new Date().toISOString().split('T')[0],
              fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
              fileType: ext.toUpperCase() as any,
              driveUrl: result.driveUrl,
            };
          })
        };
      });

      setUploadState(prev => ({ ...prev, stage: 'success' }));
    } catch (err: any) {
      alert('Gagal upload: ' + (err.message || 'Unknown error'));
      setUploadState(prev => ({ ...prev, stage: 'select', progress: 0 }));
    }
  };

  // Color mappings
  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return {
          cardBg: 'bg-white border-slate-200/80 shadow-xs',
          headerBg: 'bg-slate-50 border-b border-slate-200',
          inputBg: 'bg-slate-100 border-slate-200 text-slate-800 focus:border-indigo-500',
          tableOdd: 'bg-slate-50/50 hover:bg-slate-100/60',
          tableEven: 'bg-white hover:bg-slate-100/60',
          sidebarBg: 'bg-white border-l border-slate-200 shadow-xl',
          textMuted: 'text-slate-500',
          accentText: 'text-indigo-600',
          accentBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          borderAccent: 'border-indigo-100',
        };
      case 'command':
        return {
          cardBg: 'bg-black border-amber-950/70',
          headerBg: 'bg-amber-950/10 border-b border-amber-950/40',
          inputBg: 'bg-black border-amber-950 text-amber-500 focus:border-amber-500 focus:ring-amber-500/20',
          tableOdd: 'bg-amber-950/5 hover:bg-amber-950/15',
          tableEven: 'bg-black hover:bg-amber-950/15',
          sidebarBg: 'bg-black border-l border-amber-950/60 shadow-amber-950/20',
          textMuted: 'text-amber-600/70',
          accentText: 'text-amber-500',
          accentBtn: 'bg-amber-600/20 hover:bg-amber-500 border border-amber-500 text-amber-500 hover:text-black',
          borderAccent: 'border-amber-950/40',
        };
      case 'emerald':
        return {
          cardBg: 'bg-[#0a0f0d]/90 border-emerald-950/70',
          headerBg: 'bg-emerald-950/10 border-b border-emerald-950/40',
          inputBg: 'bg-[#050807] border-emerald-950 text-emerald-400 focus:border-emerald-500',
          tableOdd: 'bg-emerald-950/5 hover:bg-emerald-950/15',
          tableEven: 'bg-transparent hover:bg-emerald-950/15',
          sidebarBg: 'bg-[#050807] border-l border-emerald-950/60 shadow-emerald-950/20',
          textMuted: 'text-emerald-600/70',
          accentText: 'text-emerald-400',
          accentBtn: 'bg-emerald-600/20 hover:bg-[#14532d] border border-emerald-500 text-emerald-400 hover:text-[#e6f4ea]',
          borderAccent: 'border-emerald-950/40',
        };
      default: // dark
        return {
          cardBg: 'bg-[#11141a]/95 border-[#1f2937]/70',
          headerBg: 'bg-[#151922] border-b border-[#1f2937]/50',
          inputBg: 'bg-[#0c0e12] border-[#1f2937] text-slate-200 focus:border-cyan-500',
          tableOdd: 'bg-[#161c24]/30 hover:bg-[#1f2937]/35',
          tableEven: 'bg-transparent hover:bg-[#1f2937]/35',
          sidebarBg: 'bg-[#11141a] border-l border-[#1f2937]/80 shadow-2xl',
          textMuted: 'text-slate-500',
          accentText: 'text-cyan-400',
          accentBtn: 'bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500 text-cyan-400 hover:text-white',
          borderAccent: 'border-cyan-950/40',
        };
    }
  };

  const style = getThemeClasses();

  return (
    <div className="space-y-6" id="documents-archive-module">
      {/* 1. TOP SUMMARY ANALYTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Archives */}
        <div className={`p-4 rounded-xl border ${style.cardBg} flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-mono tracking-wider ${style.textMuted} uppercase`}>Total File Arsip</span>
            <h3 className="text-2xl font-semibold tracking-tight">{globalStats.totalArchives}</h3>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono">
              <TrendingUp className="h-3 w-3" />
              <span>Digitalized</span>
            </p>
          </div>
          <div className={`p-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25`}>
            <FileCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Complete Employees */}
        <div className={`p-4 rounded-xl border ${style.cardBg} flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-mono tracking-wider ${style.textMuted} uppercase`}>Pegawai Lengkap</span>
            <h3 className="text-2xl font-semibold text-emerald-400 tracking-tight">{globalStats.completedCount}</h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Status 100% (Sempurna)
            </p>
          </div>
          <div className={`p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25`}>
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Almost Complete */}
        <div className={`p-4 rounded-xl border ${style.cardBg} flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-mono tracking-wider ${style.textMuted} uppercase`}>Hampir Lengkap</span>
            <h3 className="text-2xl font-semibold text-amber-400 tracking-tight">{globalStats.almostCompletedCount}</h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Status 75% - 99%
            </p>
          </div>
          <div className={`p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* Incomplete */}
        <div className={`p-4 rounded-xl border ${style.cardBg} flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-mono tracking-wider ${style.textMuted} uppercase`}>Belum Lengkap</span>
            <h3 className="text-2xl font-semibold text-red-400 tracking-tight">{globalStats.incompleteCount}</h3>
            <p className="text-[10px] text-red-400/90 font-mono">
              Status &lt; 75%
            </p>
          </div>
          <div className={`p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25`}>
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Global Completeness */}
        <div className={`p-4 rounded-xl border ${style.cardBg} flex items-center justify-between`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-mono tracking-wider ${style.textMuted} uppercase`}>Kelengkapan Global</span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-semibold text-cyan-400 tracking-tight">{globalStats.globalCompleteness}%</h3>
              <span className={`text-[9px] font-mono ${style.textMuted}`}>rata-rata</span>
            </div>
            <div className="w-24 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
              <div 
                className="bg-cyan-500 h-1 rounded-full transition-all duration-500" 
                style={{ width: `${globalStats.globalCompleteness}%` }} 
              />
            </div>
          </div>
          <div className={`p-3 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25`}>
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Status Distribution Donut-Bar */}
        <div className={`lg:col-span-5 p-5 rounded-xl border ${style.cardBg} flex flex-col justify-between space-y-4`}>
          <div className="flex items-center gap-2 border-b pb-3 border-slate-800/40">
            <PieChart className="h-4.5 w-4.5 text-indigo-400" />
            <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-mono">Distribusi Status Pegawai</span>
          </div>

          <div className="space-y-4 py-2">
            {/* Legend & Count counters */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <span className="text-[10px] font-mono block text-indigo-400 font-semibold">PNS</span>
                <span className="text-lg font-bold text-slate-200">{globalStats.statusDistribution.PNS}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[10px] font-mono block text-emerald-400 font-semibold">PPPK</span>
                <span className="text-lg font-bold text-slate-200">{globalStats.statusDistribution.PPPK}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <span className="text-[10px] font-mono block text-amber-400 font-semibold">HONORER</span>
                <span className="text-lg font-bold text-slate-200">{globalStats.statusDistribution.Honorer}</span>
              </div>
            </div>

            {/* Stacked Percentage Visualizer */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Rasio Komposisi Staffing</span>
                <span>{globalStats.totalEmployees} Pegawai</span>
              </div>
              <div className="h-7 w-full rounded-lg overflow-hidden flex shadow-inner border border-slate-800/40">
                {/* PNS Segment */}
                <div 
                  className="bg-indigo-600 h-full transition-all hover:opacity-90 relative group flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ width: `${(globalStats.statusDistribution.PNS / globalStats.totalEmployees) * 100}%` }}
                  title={`PNS: ${globalStats.statusDistribution.PNS} Pegawai`}
                >
                  {globalStats.statusDistribution.PNS > 1 ? 'PNS' : ''}
                </div>
                {/* PPPK Segment */}
                <div 
                  className="bg-emerald-600 h-full transition-all hover:opacity-90 relative group flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ width: `${(globalStats.statusDistribution.PPPK / globalStats.totalEmployees) * 100}%` }}
                  title={`PPPK: ${globalStats.statusDistribution.PPPK} Pegawai`}
                >
                  {globalStats.statusDistribution.PPPK > 1 ? 'PPPK' : ''}
                </div>
                {/* Honorer Segment */}
                <div 
                  className="bg-amber-600 h-full transition-all hover:opacity-90 relative group flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ width: `${(globalStats.statusDistribution.Honorer / globalStats.totalEmployees) * 100}%` }}
                  title={`Honorer: ${globalStats.statusDistribution.Honorer} Pegawai`}
                >
                  {globalStats.statusDistribution.Honorer > 1 ? 'Honorer' : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c0e12]/60 border border-slate-800/40 text-[10px] font-mono text-slate-400 flex items-start gap-1.5 leading-relaxed">
            <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 animate-pulse mt-0.5" />
            <span>
              Sistem secara otomatis menyesuaikan checklist dokumen wajib berdasarkan rasio status pegawai di atas. PNS memiliki 17 dokumen, PPPK 13 dokumen, dan Honorer 12 dokumen.
            </span>
          </div>
        </div>

        {/* Chart 2: Top Schools by Compliance */}
        <div className={`lg:col-span-7 p-5 rounded-xl border ${style.cardBg} space-y-3`}>
          <div className="flex items-center gap-2 border-b pb-3 border-slate-800/40 justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4.5 w-4.5 text-cyan-400" />
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-mono">Kelengkapan Per Sekolah</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-900">
              Top 3 Terpatuh
            </span>
          </div>

          <div className="space-y-2.5 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
            {globalStats.schoolCompleteness.slice(0, 5).map((sch, i) => (
              <div key={sch.name} className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-300 font-medium truncate max-w-sm">
                    {i + 1}. {sch.name} <span className="text-slate-500 text-[9px]">({sch.total} Pegawai)</span>
                  </span>
                  <span className="text-cyan-400 font-bold">{sch.rate}%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/20">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      sch.rate === 100 ? 'bg-emerald-500' : sch.rate >= 75 ? 'bg-cyan-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${sch.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. TABLE OF EMPLOYEES ARCHIVES WITH INTEGRATED PERSISTENT FILTER BAR */}
      <div className={`rounded-xl border ${style.cardBg} overflow-hidden shadow-lg`}>
        {/* Persistent & Highly Styled Filter Bar Header */}
        <div className={`p-5 ${style.headerBg} border-b ${style.borderAccent} space-y-4`}>
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className={`h-4 w-4 ${style.accentText}`} />
              <span className="font-bold text-xs tracking-wider uppercase font-mono text-slate-300">Filter & Pencarian Arsip</span>
            </div>
            
            {/* Real-time Search */}
            <div className="relative w-full lg:w-96">
              <Search className="h-4 w-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pegawai atau NIP/NIK..."
                className={`w-full ${style.inputBg} pl-9 pr-4 py-2.5 rounded-lg text-xs font-mono placeholder:text-slate-500 focus:outline-none transition-all`}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterSchool('ALL');
                  setFilterStatus('ALL');
                  setFilterCompleteness('ALL');
                  setFilterCategory('ALL');
                  setLoading(true);
                  setTimeout(() => setLoading(false), 200);
                }}
                className="px-3.5 py-2 bg-slate-800/20 hover:bg-slate-800/40 text-slate-400 hover:text-white rounded-lg border border-slate-800/80 text-xs font-mono flex items-center gap-1.5 transition-all"
                title="Reset semua kriteria filter"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Filter</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className={`px-4 py-2 ${style.accentBtn} rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md`}
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Pegawai</span>
              </button>
            </div>
          </div>

          {/* Sub dropdown filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1.5 border-t border-slate-800/10">
            {/* Filter Sekolah */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Unit Sekolah</span>
              <select
                value={filterSchool}
                onChange={(e) => handleFilterChange(setFilterSchool, e.target.value)}
                className={`w-full ${style.inputBg} px-3 py-2.5 rounded-md text-xs font-mono focus:outline-none cursor-pointer transition-colors`}
              >
                <option value="ALL">Semua Sekolah (ALL)</option>
                {ALL_SCHOOLS.map(s => (
                  <option key={s.npsn} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Status Pegawai */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Status Pegawai</span>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
                className={`w-full ${style.inputBg} px-3 py-2.5 rounded-md text-xs font-mono focus:outline-none cursor-pointer transition-colors`}
              >
                <option value="ALL">Semua Status (ALL)</option>
                <option value="PNS">PNS (Aparatur Sipil Negara)</option>
                <option value="PPPK">PPPK (Kontrak ASN)</option>
                <option value="Honorer">Honorer (Non-ASN)</option>
              </select>
            </div>

            {/* Filter Status Kelengkapan Dokumen */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Status Arsip</span>
              <select
                value={filterCompleteness}
                onChange={(e) => handleFilterChange(setFilterCompleteness, e.target.value)}
                className={`w-full ${style.inputBg} px-3 py-2.5 rounded-md text-xs font-mono focus:outline-none cursor-pointer transition-colors`}
              >
                <option value="ALL">Semua Kelengkapan (ALL)</option>
                <option value="LENGKAP">Lengkap (100%)</option>
                <option value="HAMPIR">Hampir Lengkap (75% - 99%)</option>
                <option value="BELUM">Belum Lengkap (&lt; 75%)</option>
              </select>
            </div>

            {/* Filter Kategori Dokumen */}
            <div className="flex flex-col space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">Kategori Dokumen</span>
              <select
                value={filterCategory}
                onChange={(e) => handleFilterChange(setFilterCategory, e.target.value)}
                className={`w-full ${style.inputBg} px-3 py-2.5 rounded-md text-xs font-mono focus:outline-none cursor-pointer transition-colors`}
              >
                <option value="ALL">Semua Kategori (ALL)</option>
                <option value="Identitas">Identitas (KTP, KK, NPWP, Bank, dll)</option>
                <option value="Pengangkatan">Pengangkatan (SK, SPMT, dll)</option>
                <option value="Kepangkatan">Kepangkatan (Pangkat, Jabatan)</option>
                <option value="Kinerja">Kinerja (SKP, Penilaian Kinerja)</option>
                <option value="Keuangan">Keuangan (KGB, Slip Gaji, dll)</option>
                <option value="PAK">PAK (Penetapan Angka Kredit)</option>
              </select>
            </div>

            {/* Results stats */}
            <div className="flex items-end justify-end pb-1.5 text-right">
              <span className="text-[11px] font-mono text-slate-400">
                Ditemukan <span className={`font-bold ${style.accentText}`}>{filteredEmployees.length}</span> dari {employees.length} pegawai
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="employee-archive-table">
            <thead>
              <tr className={`${style.headerBg} border-b border-slate-800/40 text-[10px] font-mono text-slate-400 uppercase select-none`}>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Nama Pegawai</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('nipNik')}>
                  <div className="flex items-center gap-1">
                    <span>NIP / NIK</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    <span>Status Pegawai</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('school')}>
                  <div className="flex items-center gap-1">
                    <span>Sekolah Unit Kerja</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Jumlah File</th>
                <th className="py-3.5 px-4">Progress Kelengkapan</th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('completeness')}>
                  <div className="flex items-center gap-1 justify-end">
                    <span>Persentase</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // SKELETON LOADER STATE
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={idx} className="border-b border-slate-800/10">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-800/20 rounded-xs w-36 animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-800/20 rounded-xs w-28 animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="h-6 bg-slate-800/20 rounded-md w-16 animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-800/20 rounded-xs w-44 animate-pulse" /></td>
                    <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-800/20 rounded-xs w-8 mx-auto animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="h-2 bg-slate-800/20 rounded-full w-full animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-800/20 rounded-xs w-10 ml-auto animate-pulse" /></td>
                    <td className="py-4 px-4 text-center"><div className="h-6 bg-slate-800/20 rounded-md w-20 mx-auto animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="h-6 bg-slate-800/20 rounded-md w-12 ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center font-mono text-slate-500 text-xs">
                    Tidak ada arsip dokumen pegawai yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, index) => {
                  const stats = calculateEmployeeStats(emp);
                  const isStriped = index % 2 !== 0;
                  const rowClass = isStriped ? style.tableOdd : style.tableEven;

                  return (
                    <tr 
                      key={emp.id} 
                      onClick={() => setSelectedEmployee(emp)}
                      className={`border-b border-slate-800/20 text-xs font-sans transition-all cursor-pointer ${rowClass}`}
                    >
                      {/* Name & Position */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col justify-center">
                          <span className="font-semibold text-slate-200 hover:text-cyan-400 transition-colors">
                            {emp.name}
                          </span>
                          <span className={`text-[10px] font-mono ${style.textMuted}`}>
                            {emp.position}
                          </span>
                        </div>
                      </td>

                      {/* NIP / NIK */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {emp.nipNik}
                      </td>

                      {/* Employee Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          emp.status === 'PNS' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/40' :
                          emp.status === 'PPPK' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                          'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                        }`}>
                          {emp.status}
                        </span>
                      </td>

                      {/* School unit */}
                      <td className="py-3 px-4 text-slate-300 font-sans truncate max-w-[200px]" title={emp.school}>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{emp.school}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            emp.schoolStatus === 'Swasta'
                              ? 'bg-purple-950/40 text-purple-400 border border-purple-800/40'
                              : 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/40'
                          }`}>
                            {emp.schoolStatus}
                          </span>
                        </div>
                      </td>

                      {/* Files Count */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {stats.uploaded} / {stats.totalRequired}
                      </td>

                      {/* Visual progress bar */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/10">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                stats.completionPercent === 100 ? 'bg-emerald-500' :
                                stats.completionPercent >= 75 ? 'bg-cyan-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stats.completionPercent}%` }}
                            />
                          </div>
                          
                          {/* Smart Warning: Display red warning badge inside table line if any issues exist */}
                          {stats.warningsCount > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-red-400 font-mono">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>⚠️ {stats.warningsCount} Peringatan Berkas</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                        {stats.completionPercent}%
                      </td>

                      {/* Completeness Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          stats.statusText === 'Lengkap' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' :
                          stats.statusText === 'Hampir Lengkap' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60' :
                          'bg-red-950/60 text-red-400 border border-red-800/60'
                        }`}>
                          {stats.statusText}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-1 px-2.5 rounded bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-all inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="p-4 border-t border-slate-800/30 flex items-center justify-between font-mono text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => handleFilterChange(setPageSize, parseInt(e.target.value))}
              className={`bg-[#0c0e12] border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none`}
            >
              <option value={5}>5 Baris</option>
              <option value={10}>10 Baris</option>
              <option value={15}>15 Baris</option>
              <option value={20}>20 Baris</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span>
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="p-1.5 rounded border border-slate-800/80 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                className="p-1.5 rounded border border-slate-800/80 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DETAIL PANEL: DRAWER ON SIDEBAR (Slide-out animation) */}
      <AnimatePresence>
        {selectedEmployee && (
          <>
            {/* Drawer Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slideout Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35 }}
              className={`fixed top-0 right-0 h-full w-full max-w-xl ${style.sidebarBg} z-50 flex flex-col justify-between`}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="h-4.5 w-4.5 text-cyan-400" />
                  <span className="font-bold text-xs tracking-wider uppercase font-mono">Arsip Kepegawaian Pegawai</span>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Drawer Main Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {/* Employee Card Header */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 space-y-3.5 relative overflow-hidden">
                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="p-3 bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 rounded-xl">
                      <User className="h-8 w-8" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-100">{selectedEmployee.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">{selectedEmployee.position}</p>
                      <p className="text-[10px] text-slate-500 font-mono">NIP/NIK: {selectedEmployee.nipNik}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-1 pt-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-600" />
                        <span>{selectedEmployee.school}</span>
                      </p>
                    </div>
                  </div>

                  {/* Rating Meter & Stats */}
                  {(() => {
                    const stats = calculateEmployeeStats(selectedEmployee);
                    return (
                      <div className="border-t border-slate-800/50 pt-3 flex items-center justify-between text-xs">
                        <div className="space-y-1 w-full max-w-[280px]">
                          <span className="text-[10px] text-slate-500 font-mono block">KELENGKAPAN DIGITAL</span>
                          <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800/30 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                stats.completionPercent === 100 ? 'bg-emerald-500' :
                                stats.completionPercent >= 75 ? 'bg-cyan-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stats.completionPercent}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-mono font-bold text-slate-200">{stats.completionPercent}%</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase block font-bold mt-0.5 ${
                            stats.statusText === 'Lengkap' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                            stats.statusText === 'Hampir Lengkap' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                            'bg-red-950 text-red-400 border border-red-900'
                          }`}>
                            {stats.statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Checklist Document Items */}
                <div className="space-y-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Daftar Dokumen Wajib</span>
                  
                  {/* Grouped lists */}
                  {['Identitas', 'Pengangkatan', 'Kepangkatan', 'Kinerja', 'Keuangan', 'PAK'].map(cat => {
                    // Filter documents in category
                    const docsInCat = selectedEmployee.documents.filter(d => d.category === cat);
                    if (docsInCat.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-2">
                        <h5 className="text-[10px] font-mono text-cyan-400 font-semibold border-b border-cyan-950/40 pb-1 uppercase tracking-wider">
                          Kategori: {cat}
                        </h5>

                        <div className="space-y-2">
                          {docsInCat.map(doc => {
                            let statusColor = 'text-red-400 bg-red-950/20 border border-red-900/30';
                            let iconElement = <AlertCircle className="h-4 w-4 text-red-400" />;
                            let statusLabel = 'Belum Ada';

                            if (doc.status === 'available') {
                              statusColor = 'text-emerald-400 bg-emerald-950/20 border border-emerald-900/30';
                              iconElement = <CheckCircle className="h-4 w-4 text-emerald-400" />;
                              statusLabel = 'Tersedia';
                            } else if (doc.status === 'warning') {
                              statusColor = 'text-amber-400 bg-amber-950/20 border border-amber-900/30';
                              iconElement = <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />;
                              statusLabel = 'Perlu Update';
                            }

                            return (
                              <div 
                                key={doc.id}
                                className={`p-3 rounded-lg border bg-[#0c0e12]/40 border-slate-800/40 flex items-center justify-between gap-3 text-xs`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className={`p-1.5 rounded shrink-0 ${statusColor.split(' ')[0]} ${statusColor.split(' ')[1]}`}>
                                    {iconElement}
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <h6 className="font-bold text-slate-200 truncate">{doc.name}</h6>
                                    {doc.uploadDate ? (
                                      <p className="text-[10px] text-slate-500 font-mono">
                                        Diunggah: {doc.uploadDate} • {doc.fileSize} • {doc.fileType}
                                      </p>
                                    ) : (
                                      <p className="text-[10px] text-red-500/80 font-mono">
                                        Wajib Terupload
                                      </p>
                                    )}

                                    {/* Smart Warning: Display issue description inline */}
                                    {doc.status === 'warning' && doc.issue && (
                                      <p className="text-[9px] text-amber-500/90 font-mono leading-tight bg-amber-950/10 p-1 px-1.5 rounded border border-amber-950/40 mt-1 max-w-sm">
                                        ⚠️ {doc.issue}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Operational Action Buttons */}
                                <div className="flex gap-1.5 shrink-0">
                                  {doc.status === 'missing' ? (
                                    <button
                                      onClick={() => handleInitiateUpload(selectedEmployee, doc)}
                                      className="p-1.5 px-2 bg-slate-800/50 hover:bg-slate-800 text-[10px] font-mono rounded border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                                    >
                                      <Upload className="h-3 w-3" />
                                      <span>Upload</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setPreviewDoc({ emp: selectedEmployee, doc })}
                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                        title="Preview File"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      
                                      <button
                                        onClick={() => handleInitiateUpload(selectedEmployee, doc)}
                                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                        title="Replace File"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                      </button>

                                      <button
                                        onClick={() => handleDeleteDocument(selectedEmployee.id, doc.id)}
                                        className="p-1 rounded bg-red-950/20 hover:bg-red-900 border border-red-900/40 text-red-400 hover:text-white transition-all cursor-pointer"
                                        title="Delete File"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-800/40 bg-slate-900/20 text-center font-mono text-[10px] text-slate-500">
                Pencatatan database otomatis TIMKER BIDIK regional Kecamatan Lemahabang.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. ADD NEW EMPLOYEE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md p-6 rounded-xl border ${style.cardBg} space-y-4`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-slate-800/40">
                <h4 className="text-sm font-bold text-slate-100 font-mono">TAMBAH PEGAWAI BARU</h4>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddEmployeeSubmit} className="space-y-4 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.name}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                    placeholder="Contoh: Drs. Tatang Sutisna, M.Pd."
                    className={`w-full ${style.inputBg} px-3 py-2.5 rounded-lg focus:outline-none`}
                  />
                </div>

                {/* NIP / NIK */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">NIP (PNS/PPPK) atau NIK (Honorer)</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.nipNik}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, nipNik: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="Contoh: 198504122010011002 atau 3209..."
                    className={`w-full ${style.inputBg} px-3 py-2.5 rounded-lg focus:outline-none font-mono`}
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Status Kepegawaian</label>
                  <select
                    value={newEmpForm.status}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, status: e.target.value as any })}
                    className={`w-full ${style.inputBg} px-3 py-2.5 rounded-lg focus:outline-none font-mono`}
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (Pekerja Kontrak ASN)</option>
                    <option value="Honorer">Honorer (Pegawai Non-ASN)</option>
                  </select>
                </div>

                {/* Position */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Jabatan / Peran Kerja</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.position}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, position: e.target.value })}
                    placeholder="Contoh: Guru Kelas IV, Kepala Sekolah, Operator"
                    className={`w-full ${style.inputBg} px-3 py-2.5 rounded-lg focus:outline-none`}
                  />
                </div>

                {/* School */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-mono block">Sekolah Unit Kerja</label>
                  <select
                    value={newEmpForm.school}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, school: e.target.value })}
                    className={`w-full ${style.inputBg} px-3 py-2.5 rounded-lg focus:outline-none font-mono`}
                  >
                    {ALL_SCHOOLS.map(s => (
                      <option key={s.npsn} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-800/30 flex gap-2 justify-end font-mono">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 ${style.accentBtn} rounded-lg font-bold cursor-pointer`}
                  >
                    Simpan Pegawai
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. SIMULATION UPLOAD ENGINE (Multi-stage wizard) */}
      <AnimatePresence>
        {uploadState.isOpen && uploadState.employee && uploadState.docItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setUploadState(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-md p-6 rounded-xl border ${style.cardBg} space-y-5`}
            >
              <div className="flex justify-between items-center border-b pb-3 border-slate-800/40">
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-bold text-cyan-400 font-mono uppercase">UPLOAD ENGINE - TIMKER CLOUD</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Target: {uploadState.docItem.name} ({uploadState.employee.name})
                  </p>
                </div>
                <button
                  onClick={() => setUploadState(prev => ({ ...prev, isOpen: false }))}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  disabled={uploadState.stage === 'compress' || uploadState.stage === 'chunk' || uploadState.stage === 'ocr'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* STAGE 1: Drag & Drop Area */}
              {uploadState.stage === 'select' && (
                <div className="space-y-4 text-center">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    className="p-8 border-2 border-dashed border-slate-800 rounded-xl hover:border-cyan-500/50 bg-[#0c0e12]/30 flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer relative"
                  >
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileInput}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="h-10 w-10 text-slate-600 group-hover:text-cyan-400 group-hover:scale-105 transition-all" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-300">Tarik berkas ke sini atau klik untuk mencari</p>
                      <p className="text-[10px] text-slate-500 font-mono">Format yang didukung: PDF, JPG, JPEG, PNG (Maks 10MB)</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg text-left text-[10px] font-mono text-slate-400 leading-relaxed">
                    ⚙️ <span className="font-bold text-slate-300">Engine Otomatis Aktif:</span> Setiap gambar/pas foto beresolusi tinggi akan dikompresi otomatis tanpa kehilangan kualitas untuk menghemat penyimpanan cloud. File PDF besar akan diunggah dengan metode chunking.
                  </div>
                </div>
              )}

              {/* STAGE 2: Image Compression Simulation */}
              {uploadState.stage === 'compress' && (
                <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-cyan-400 tracking-wide font-mono animate-pulse">OPTIMASI DAN KOMPRESI GAMBAR...</p>
                    <p className="text-[10px] text-slate-500 font-mono">Mengurangi ukuran {uploadState.fileName} ({uploadState.fileSize})</p>
                  </div>
                  <div className="p-3 rounded-md bg-[#0c0e12] border border-slate-800 text-[10px] font-mono text-slate-400 w-full max-w-sm text-left">
                    <p className="text-emerald-400">✔ Membaca stream bit data...</p>
                    <p className="text-emerald-400">✔ Merestrukturisasi koordinat pixel...</p>
                    <p className="text-cyan-400 animate-pulse">⚡ Mengurangi redundansi EXIF metadata...</p>
                  </div>
                </div>
              )}

              {/* STAGE 3: Chunk Upload Simulation */}
              {uploadState.stage === 'chunk' && (
                <div className="space-y-4 py-4">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                    <span className="font-bold">MENGUNGGAH BERKAS (CHUNK ENGINE)</span>
                    <span className="text-cyan-400">{uploadState.progress}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-150"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span>Kecepatan: {uploadState.speed}</span>
                    <span>Format: Chunks (64KB Blocks)</span>
                  </div>
                </div>
              )}

              {/* STAGE 4: OCR Extraction Simulated */}
              {uploadState.stage === 'ocr' && (
                <div className="py-4 text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute -inset-1 rounded-full bg-cyan-500 opacity-20 blur-xs animate-pulse" />
                    <div className="p-3 rounded-full bg-cyan-950/40 text-cyan-400 border border-cyan-800">
                      <Sparkles className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">ANALISIS INTELIJEN OCR AI...</p>
                    <p className="text-[10px] text-slate-500 font-mono">Mengekstrak teks digital dan memverifikasi integritas stempel/tanda tangan</p>
                  </div>
                  <div className="h-24 overflow-y-auto p-3 rounded-lg bg-black border border-slate-800 text-[10px] font-mono text-slate-500 text-left leading-relaxed">
                    <p className="text-cyan-400">[SYSTEM] Memulai pemindaian OCR OCR-V4...</p>
                    <p className="text-cyan-400">[SYSTEM] Mendeteksi batas tepi halaman... PAS</p>
                    <p className="text-emerald-400">[SYSTEM] Ekstraksi Metadata: Nama Pegawai cocok: {uploadState.employee.name.toUpperCase()}</p>
                    <p className="text-emerald-400">[SYSTEM] Status Integritas Tanda Tangan: VALID (Stempel Basah Terbaca)</p>
                  </div>
                </div>
              )}

              {/* STAGE 5: Success State */}
              {uploadState.stage === 'success' && (
                <div className="py-4 text-center space-y-4">
                  <div className="p-3 bg-emerald-950/20 text-emerald-400 border border-emerald-900 rounded-full inline-block">
                    <Check className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">UNGGAH BERKAS BERHASIL!</p>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                      Dokumen <span className="text-emerald-400">{uploadState.docItem.name}</span> berhasil disimpan dan dinilai dalam metadata kepegawaian.
                    </p>
                  </div>
                  <button
                    onClick={() => setUploadState(prev => ({ ...prev, isOpen: false }))}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DETAILED FILE PREVIEW MODAL */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="absolute inset-0 bg-black"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl h-[90vh] bg-[#11141a] border border-[#1f2937] rounded-xl flex flex-col overflow-hidden"
            >
              {/* Preview Header / Reader Toolbar */}
              <div className="p-4 bg-[#151922] border-b border-[#1f2937] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-xs font-bold text-slate-100 font-mono truncate max-w-sm">
                      {previewDoc.doc.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Pemilik: {previewDoc.emp.name} ({previewDoc.emp.nipNik}) • Kategori: {previewDoc.doc.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <button className="p-1.5 rounded bg-[#0c0e12] border border-[#1f2937] text-slate-400 hover:text-white text-[10px] flex items-center gap-1" title="Perbesar">
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button className="p-1.5 rounded bg-[#0c0e12] border border-[#1f2937] text-slate-400 hover:text-white text-[10px] flex items-center gap-1" title="Perkecil">
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-5 w-px bg-slate-800 mx-1" />
                  <button className="p-1.5 rounded bg-[#0c0e12] border border-[#1f2937] text-slate-400 hover:text-white text-[10px] flex items-center gap-1" title="Cetak File">
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={previewDoc.doc.driveUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-[#0c0e12] border border-[#1f2937] text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                    title="Download File"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <div className="h-5 w-px bg-slate-800 mx-1" />
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 rounded bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Preview Body (Split Screen) */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Real Document View from Google Drive */}
                <div className="flex-1 bg-[#1a1f2c] overflow-hidden flex items-center justify-center">
                  {previewDoc.doc.driveUrl ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${extractDriveFileId(previewDoc.doc.driveUrl)}/preview`}
                      className="w-full h-full border-0"
                      title={previewDoc.doc.name}
                      allow="autoplay"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs font-mono text-center p-8">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Tidak ada file untuk di-preview</p>
                    </div>
                  )}
                </div>

                {/* Right Side: OCR Summarization Sidebar */}
                <div className="w-80 bg-[#151922] border-l border-[#1f2937] p-5 space-y-4 overflow-y-auto scrollbar-thin">
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono border-b border-slate-800/60 pb-2">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>AI OCR COGNITIVE DATA</span>
                  </div>

                  <div className="space-y-3.5 text-xs font-mono">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase block">Status Dokumen</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                        previewDoc.doc.status === 'available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                        'bg-amber-950 text-amber-400 border border-amber-900'
                      }`}>
                        {previewDoc.doc.status === 'available' ? 'VALID & SECURE' : 'WARNING / RE-UPLOAD'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase block">Integritas Tanda Tangan</span>
                      <span className="text-emerald-400 font-bold block">✔ 100% TERVERIFIKASI</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase block">ID Berkas Digital</span>
                      <span className="text-slate-300 block text-[10px] break-all">{previewDoc.doc.id}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase block">OCR Teks Ekstraksi</span>
                      <div className="p-3 bg-[#0c0e12] border border-slate-800 text-[10px] text-slate-400 max-h-48 overflow-y-auto leading-relaxed scrollbar-thin whitespace-pre-wrap">
                        SURAT KEPUTUSAN KEPALA DINAS PENDIDIKAN KECAMATAN LEMAHABANG KABUPATEN CIREBON. Mempertimbangkan berkas administrasi pegawai {previewDoc.emp.name} dengan NIP {previewDoc.emp.nipNik} yang ditempatkan di {previewDoc.emp.school} dinyatakan sah untuk mendukung penyaluran dana kepegawaian.
                      </div>
                    </div>

                    {/* Warnings inside preview if warning exists */}
                    {previewDoc.doc.status === 'warning' && previewDoc.doc.issue && (
                      <div className="p-3 rounded border border-amber-900/40 bg-amber-950/10 space-y-1 text-[10px]">
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                          <span>PERINGATAN DETEKSI SISTEM</span>
                        </div>
                        <p className="text-slate-300 leading-normal">{previewDoc.doc.issue}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
