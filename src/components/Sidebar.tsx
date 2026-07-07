import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Terminal,
  MapPin,
  Database,
  Users,
  Building2,
  Cpu,
  FileSearch,
  FileSpreadsheet,
  GraduationCap,
  School,
  GitCompare,
  List,
  Briefcase,
  Calendar,
  Target,
  Shield,
  History,
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface SidebarProps {
  currentModule: string;
  setCurrentModule: (mod: string) => void;
  theme: 'light' | 'dark' | 'command' | 'emerald';
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const ROLE_MENU_ACCESS: Record<string, string[]> = {
  admin: [
    'dashboard', 'monitor', 'console', 'activity-log', 'gis',
    'warehouse', 'pegawai', 'students', 'rombels',
    'hr', 'advanced-hr', 'infrastructure', 'school-profile', 'school-comparison',
    'academic-calendar', 'kpi',
    'simulator',
    'documents', 'monthly-report', 'reports',
    'user-management',
  ],
  staff_kecamatan: [
    'dashboard', 'monitor', 'console', 'activity-log', 'gis',
    'warehouse', 'pegawai', 'students', 'rombels',
    'hr', 'advanced-hr', 'infrastructure', 'school-profile', 'school-comparison',
    'academic-calendar', 'kpi',
    'simulator',
    'documents', 'monthly-report', 'reports',
  ],
  operator_sekolah: [
    'dashboard', 'monitor',
    'pegawai', 'students', 'rombels',
    'school-profile',
    'academic-calendar',
    'documents', 'monthly-report', 'reports',
  ],
};

export default function Sidebar({ currentModule, setCurrentModule, theme, isOpen, setIsOpen }: SidebarProps) {
  const { user, isRole } = useAuth();
  const allowedModules = user ? ROLE_MENU_ACCESS[user.role] || [] : [];

  const menuGroups = [
    {
      title: 'PUSAT KOMANDO',
      roles: ['admin', 'staff_kecamatan', 'operator_sekolah'],
      items: [
        { id: 'dashboard', label: 'Dasbor Eksekutif', icon: LayoutDashboard },
        { id: 'monitor', label: 'Pemantauan Langsung', icon: Activity },
        { id: 'console', label: 'Konsol Perintah', icon: Terminal },
        { id: 'activity-log', label: 'Riwayat Aktivitas', icon: History, roles: ['admin', 'staff_kecamatan'] }
      ]
    },
    {
      title: 'INTELIJEN GIS',
      roles: ['admin', 'staff_kecamatan'],
      items: [
        { id: 'gis', label: 'Peta Distribusi', icon: MapPin }
      ]
    },
    {
      title: 'GUDANG DATA',
      roles: ['admin', 'staff_kecamatan', 'operator_sekolah'],
      items: [
        { id: 'warehouse', label: 'Eksplorasi Data', icon: Database, roles: ['admin', 'staff_kecamatan'] },
        { id: 'pegawai', label: 'Manajemen Pegawai', icon: Users },
        { id: 'students', label: 'Manajemen Siswa', icon: GraduationCap },
        { id: 'alumni', label: 'Data Kelulusan', icon: GraduationCap },
        { id: 'rombels', label: 'Manajemen Rombel', icon: List }
      ]
    },
    {
      title: 'ANALISIS DATA',
      roles: ['admin', 'staff_kecamatan'],
      items: [
        { id: 'hr', label: 'Sumber Daya Manusia', icon: Users },
        { id: 'advanced-hr', label: 'Kepegawaian Lanjutan', icon: Briefcase },
        { id: 'infrastructure', label: 'Audit Infrastruktur', icon: Building2 },
        { id: 'school-profile', label: 'Profil Sekolah', icon: School },
        { id: 'school-comparison', label: 'Perbandingan Sekolah', icon: GitCompare }
      ]
    },
    {
      title: 'PERENCANAAN',
      roles: ['admin', 'staff_kecamatan'],
      items: [
        { id: 'academic-calendar', label: 'Kalender Akademik', icon: Calendar },
        { id: 'kpi', label: 'Target & KPI', icon: Target }
      ]
    },
    {
      title: 'INTELIJEN AI',
      roles: ['admin', 'staff_kecamatan'],
      items: [
        { id: 'simulator', label: 'Simulator Skenario', icon: Cpu }
      ]
    },
    {
      title: 'DOKUMEN & LAPORAN',
      roles: ['admin', 'staff_kecamatan', 'operator_sekolah'],
      items: [
        { id: 'documents', label: 'Intelijen Dokumen', icon: FileSearch },
        { id: 'monthly-report', label: 'Laporan Bulanan', icon: FileSpreadsheet },
        { id: 'reports', label: 'Pusat Laporan Pintar', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'SISTEM',
      roles: ['admin'],
      items: [
        { id: 'user-management', label: 'Manajemen Pengguna', icon: Shield }
      ]
    }
  ];

  // Resolve theme-specific background and border styles
  let sidebarClass = "bg-[#0c0e12] border-[#1f2937] text-[#d1d5db]";
  let headerBorderClass = "border-[#1f2937]";
  let accentTextClass = "text-cyan-400";

  if (theme === 'light') {
    sidebarClass = "bg-white border-slate-200 text-slate-800 shadow-sm";
    headerBorderClass = "border-slate-100";
    accentTextClass = "text-indigo-600";
  } else if (theme === 'command') {
    sidebarClass = "bg-black border-amber-950 text-amber-500 font-mono";
    headerBorderClass = "border-amber-950";
    accentTextClass = "text-amber-500";
  } else if (theme === 'emerald') {
    sidebarClass = "bg-[#040605] border-[#14532d] text-[#e6f4ea]";
    headerBorderClass = "border-[#14532d]";
    accentTextClass = "text-[#10b981]";
  }

  return (
    <aside className={`${isOpen ? 'w-64 border-r' : 'w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none'} flex flex-col h-screen shrink-0 transition-all duration-300 ease-in-out select-none ${sidebarClass}`} id="super-sidebar">
      <div className="w-64 flex flex-col h-full shrink-0">
        {/* Branding Header */}
        <div className={`p-5 border-b flex flex-col justify-center gap-2.5 ${headerBorderClass}`}>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className={`absolute -inset-1 rounded-lg bg-gradient-to-tr opacity-25 blur-sm ${
                theme === 'light' ? 'from-indigo-500 to-cyan-500' : 
                theme === 'command' ? 'from-amber-500 to-yellow-600' : 
                theme === 'emerald' ? 'from-emerald-500 to-teal-500' : 
                'from-cyan-500 to-blue-500'
              }`} />
              <div className={`relative p-1 rounded-lg border ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 
                theme === 'command' ? 'bg-black border-amber-950' : 
                theme === 'emerald' ? 'bg-[#0a0f0d] border-emerald-950' : 
                'bg-[#11141a] border-slate-800'
              }`}>
                <img 
                  src="/tutwuri.png" 
                  alt="Tut Wuri Handayani" 
                  className={`h-9 w-9 object-contain transition-all duration-300 ${
                    theme === 'command' ? 'grayscale brightness-150 sepia hue-rotate-15 saturate-200' : ''
                  }`}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                  theme === 'light' ? 'bg-indigo-600' : 
                  theme === 'command' ? 'bg-amber-500' : 
                  theme === 'emerald' ? 'bg-emerald-500' : 
                  'bg-cyan-400'
                }`} />
                <span className="font-mono text-[8px] tracking-widest uppercase opacity-75">POLA SPASIAL 360</span>
              </div>
              <h1 className="text-sm font-light tracking-widest leading-tight">
                TIMKER <span className={`font-bold ${accentTextClass}`}>BIDIK</span>
              </h1>
            </div>
          </div>
          <div className="space-y-0.5 pl-0.5">
            <p className={`text-[10px] font-mono font-semibold tracking-wider ${
              theme === 'light' ? 'text-indigo-600' : 
              theme === 'command' ? 'text-amber-500' : 
              theme === 'emerald' ? 'text-emerald-400' : 
              'text-cyan-400'
            }`}>
              SD • TK • KB NEGERI & SWASTA
            </p>
            <p className="text-[9px] font-mono opacity-60">
              KECAMATAN LEMAHABANG
            </p>
          </div>
        </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {menuGroups.map((group, groupIdx) => {
          const filteredItems = group.items.filter(item => {
            if (!allowedModules.includes(item.id)) return false;
            if (item.roles) return item.roles.some(r => user?.role === r);
            return true;
          });
          if (filteredItems.length === 0) return null;
          return (
            <div key={groupIdx} className="space-y-1.5" id={`group-${groupIdx}`}>
              <h2 className="text-[10px] font-mono font-bold tracking-widest pl-3 uppercase opacity-50">
                {group.title}
              </h2>
              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentModule === item.id;

                  let itemClass = "hover:bg-cyan-950/10 hover:text-cyan-300 opacity-80 hover:opacity-100";
                  if (isActive) {
                    if (theme === 'light') {
                      itemClass = "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 rounded-r-md rounded-l-none font-semibold shadow-xs";
                    } else if (theme === 'command') {
                      itemClass = "bg-amber-950/20 text-amber-400 border-l-2 border-amber-500 rounded-r-md rounded-l-none font-bold";
                    } else if (theme === 'emerald') {
                      itemClass = "bg-emerald-950/40 text-emerald-400 border-l-2 border-emerald-500 rounded-r-md rounded-l-none font-semibold shadow-xs";
                    } else {
                      itemClass = "bg-cyan-950/40 text-cyan-400 border-l-2 border-cyan-500 rounded-r-md rounded-l-none font-semibold shadow-sm";
                    }
                  } else {
                    if (theme === 'light') {
                      itemClass = "hover:bg-slate-50 hover:text-slate-900 text-slate-600";
                    } else if (theme === 'command') {
                      itemClass = "hover:bg-amber-950/10 hover:text-amber-300 text-amber-600/80";
                    } else if (theme === 'emerald') {
                      itemClass = "hover:bg-emerald-950/20 hover:text-emerald-300 text-emerald-400/80";
                    }
                  }

                  return (
                    <button
                      key={item.id}
                      id={`btn-${item.id}`}
                      onClick={() => setCurrentModule(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${itemClass}`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'scale-110' : ''}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  </aside>
  );
}
