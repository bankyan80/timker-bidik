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
  Sun,
  Moon,
  MonitorCheck,
  Leaf,
  GraduationCap,
  School,
  GitCompare,
  List,
  Briefcase,
  Calendar,
  Target,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface SidebarProps {
  currentModule: string;
  setCurrentModule: (mod: string) => void;
  theme: 'light' | 'dark' | 'command' | 'emerald';
  setTheme: (theme: 'light' | 'dark' | 'command' | 'emerald') => void;
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
    'dashboard', 'monitor', 'console', 'gis',
    'warehouse', 'pegawai', 'students', 'rombels',
    'hr', 'advanced-hr', 'infrastructure', 'school-profile', 'school-comparison',
    'academic-calendar', 'kpi',
    'simulator',
    'documents', 'reports',
  ],
  staff_kecamatan: [
    'dashboard', 'monitor', 'console', 'gis',
    'warehouse', 'pegawai', 'students', 'rombels',
    'hr', 'advanced-hr', 'infrastructure', 'school-profile', 'school-comparison',
    'academic-calendar', 'kpi',
    'simulator',
    'documents', 'reports',
  ],
  operator_sekolah: [
    'dashboard', 'monitor',
    'pegawai', 'students', 'rombels',
    'school-profile',
    'academic-calendar',
    'documents', 'reports',
  ],
};

export default function Sidebar({ currentModule, setCurrentModule, theme, setTheme, isOpen, setIsOpen }: SidebarProps) {
  const { user, isRole } = useAuth();
  const allowedModules = user ? ROLE_MENU_ACCESS[user.role] || [] : [];

  const menuGroups = [
    {
      title: 'PUSAT KOMANDO',
      roles: ['admin', 'staff_kecamatan', 'operator_sekolah'],
      items: [
        { id: 'dashboard', label: 'Dasbor Eksekutif', icon: LayoutDashboard },
        { id: 'monitor', label: 'Pemantauan Langsung', icon: Activity },
        { id: 'console', label: 'Konsol Perintah', icon: Terminal }
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
        { id: 'reports', label: 'Pusat Laporan Pintar', icon: FileSpreadsheet }
      ]
    }
  ];

  // Resolve theme-specific background and border styles
  let sidebarClass = "bg-[#0c0e12] border-[#1f2937] text-[#d1d5db]";
  let headerBorderClass = "border-[#1f2937]";
  let footerBorderClass = "border-[#1f2937]";
  let accentTextClass = "text-cyan-400";

  if (theme === 'light') {
    sidebarClass = "bg-white border-slate-200 text-slate-800 shadow-sm";
    headerBorderClass = "border-slate-100";
    footerBorderClass = "border-slate-100";
    accentTextClass = "text-indigo-600";
  } else if (theme === 'command') {
    sidebarClass = "bg-black border-amber-950 text-amber-500 font-mono";
    headerBorderClass = "border-amber-950";
    footerBorderClass = "border-amber-950";
    accentTextClass = "text-amber-500";
  } else if (theme === 'emerald') {
    sidebarClass = "bg-[#040605] border-[#14532d] text-[#e6f4ea]";
    headerBorderClass = "border-[#14532d]";
    footerBorderClass = "border-[#14532d]";
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

      {/* User Info Footer */}
      <div className={`p-3 border-t flex flex-col gap-2 ${footerBorderClass}`}>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0c10] border border-[#1f2937]/50">
          <div className="p-1.5 rounded-md bg-cyan-950/30 text-cyan-400 border border-cyan-900/40">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono font-bold text-slate-200 truncate">{user?.username}</p>
            <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider truncate">
              {user?.role === 'admin' ? 'Super Admin' : user?.role === 'staff_kecamatan' ? 'Staf Kecamatan' : 'Operator Sekolah'}
            </p>
            {user?.schoolName && (
              <p className="text-[7px] font-mono text-slate-600 truncate">{user.schoolName}</p>
            )}
          </div>
        </div>

        <div className="text-[10px] font-mono opacity-55 uppercase pl-1">Pilih Tema Visual Hub</div>
        <div className="grid grid-cols-4 gap-1 bg-slate-100/50 dark:bg-[#11141a] command:bg-zinc-950/50 p-1 rounded-lg border dark:border-[#1f2937]">
          <button
            id="theme-light"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center justify-center py-1.5 rounded transition-all ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Nordic Clean Light"
          >
            <Sun className="h-3 w-3" />
            <span className="text-[8px] font-mono mt-1">LIGHT</span>
          </button>
          <button
            id="theme-dark"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center justify-center py-1.5 rounded transition-all ${
              theme === 'dark'
                ? 'bg-[#08090b] text-cyan-400 border border-cyan-800 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Cosmic Cyan HUD"
          >
            <Moon className="h-3 w-3" />
            <span className="text-[8px] font-mono mt-1">HUD</span>
          </button>
          <button
            id="theme-command"
            onClick={() => setTheme('command')}
            className={`flex flex-col items-center justify-center py-1.5 rounded transition-all ${
              theme === 'command'
                ? 'bg-amber-950/60 text-amber-400 border border-amber-900 shadow-xs'
                : 'text-slate-500 hover:text-amber-500'
            }`}
            title="Amber Terminal Mode"
          >
            <MonitorCheck className="h-3 w-3" />
            <span className="text-[8px] font-mono mt-1">TERM</span>
          </button>
          <button
            id="theme-emerald"
            onClick={() => setTheme('emerald')}
            className={`flex flex-col items-center justify-center py-1.5 rounded transition-all ${
              theme === 'emerald'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900 shadow-xs'
                : 'text-slate-500 hover:text-emerald-400'
            }`}
            title="Deep Mint Forest"
          >
            <Leaf className="h-3 w-3" />
            <span className="text-[8px] font-mono mt-1">MINT</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
  );
}
