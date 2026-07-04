import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import GisMap from './components/GisMap';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import LiveMonitor from './components/LiveMonitor';
import DataWarehouse from './components/DataWarehouse';
import HumanResources from './components/HumanResources';
import Infrastructure from './components/Infrastructure';
import ScenarioSimulator from './components/ScenarioSimulator';
import DocumentIntel from './components/DocumentIntel';
import CommandConsole from './components/CommandConsole';
import ReportCenter from './components/ReportCenter';
import MonthlyReport from './components/MonthlyReport';
import StudentManagement from './components/StudentManagement';
import SchoolProfile from './components/SchoolProfile';
import SchoolComparison from './components/SchoolComparison';
import RombelManagement from './components/RombelManagement';
import ManajemenPegawai from './components/ManajemenPegawai';
import AdvancedHR from './components/AdvancedHR';
import AcademicCalendar from './components/AcademicCalendar';
import TargetKPI from './components/TargetKPI';
import LoginPage from './components/LoginPage';
import { useAuth } from './components/AuthContext';

import { School, Recommendation } from './types';
import { Menu, PanelLeftClose, PanelLeft, LogOut, KeyRound, Loader2, Check, X, Sun, Moon, MonitorCheck, Leaf } from 'lucide-react';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Restore module from URL hash on mount
  const [currentModule, setCurrentModuleState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.replace('#', '') || 'dashboard';
    }
    return 'dashboard';
  });

  // Sync hash whenever module changes
  const setCurrentModule = (mod: string) => {
    setCurrentModuleState(mod);
    if (typeof window !== 'undefined') {
      window.location.hash = mod;
    }
  };
  const [theme, setTheme] = useState<'light' | 'dark' | 'command' | 'emerald'>('dark');
  const [selectedSchool, setSelectedSchool] = useState<School | undefined>(undefined);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500">Memuat sesi...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Synced select school helper:
  // If a user spotlights or selects a school from any dashboard, automatically route them
  // to the Warehouse Explorer module and load that school's active digital twin profile!
  const handleSelectSchool = (school?: School) => {
    setSelectedSchool(school);
    if (school) {
      setCurrentModule('warehouse');
    }
  };

  // Render the currently selected module
  const renderContent = () => {
    switch (currentModule) {
      case 'dashboard':
        return (
          <ExecutiveDashboard
            onSelectSchool={handleSelectSchool}
            setCurrentModule={setCurrentModule}
          />
        );
      case 'monitor':
        return (
          <LiveMonitor
            onSelectSchool={handleSelectSchool}
            recs={recs}
            setRecs={setRecs}
          />
        );
      case 'console':
        return <CommandConsole />;
      case 'gis':
        return (
          <GisMap
            selectedSchool={selectedSchool}
            onSelectSchool={handleSelectSchool}
          />
        );
      case 'warehouse':
        return (
          <DataWarehouse
            selectedSchool={selectedSchool}
            onSelectSchool={handleSelectSchool}
          />
        );
      case 'hr':
        return <HumanResources />;
      case 'infrastructure':
        return <Infrastructure />;
      case 'simulator':
        return <ScenarioSimulator />;
      case 'documents':
        return <DocumentIntel />;
      case 'pegawai':
        return <ManajemenPegawai />;
      case 'students':
        return <StudentManagement />;
      case 'school-profile':
        return <SchoolProfile selectedNpsn={undefined} onBack={() => setCurrentModule('dashboard')} />;
      case 'school-comparison':
        return <SchoolComparison />;
      case 'rombels':
        return <RombelManagement />;
      case 'advanced-hr':
        return <AdvancedHR />;
      case 'academic-calendar':
        return <AcademicCalendar />;
      case 'kpi':
        return <TargetKPI />;
      case 'reports':
        return <ReportCenter />;
      case 'monthly-report':
        return <MonthlyReport />;
      default:
        return (
          <ExecutiveDashboard
            onSelectSchool={handleSelectSchool}
            setCurrentModule={setCurrentModule}
          />
        );
    }
  };

  // Set visual container theme classes
  let containerClass = 'bg-[#08090b] text-[#d1d5db] font-sans';
  let innerHeaderClass = 'border-b border-[#1f2937] bg-[#0c0e12]/80';
  let badgeClass = 'text-cyan-400 bg-cyan-950/40 border border-cyan-800';

  if (theme === 'light') {
    containerClass = 'bg-slate-100 text-slate-900 font-sans';
    innerHeaderClass = 'border-b border-slate-200 bg-white/80';
    badgeClass = 'text-indigo-600 bg-indigo-50 border border-indigo-200';
  } else if (theme === 'command') {
    containerClass = 'bg-black text-amber-500 font-mono';
    innerHeaderClass = 'border-b border-amber-950/60 bg-black/80';
    badgeClass = 'text-amber-500 bg-amber-950/20 border border-amber-900';
  } else if (theme === 'emerald') {
    containerClass = 'bg-[#050807] text-[#e6f4ea] font-sans';
    innerHeaderClass = 'border-b border-[#14532d] bg-[#080c0a]/80';
    badgeClass = 'text-emerald-400 bg-emerald-950/40 border border-emerald-800';
  }

  return (
    <div className={`flex h-screen overflow-hidden theme-${theme} ${containerClass}`} id="app-root">
      {/* Super Sidebar navigation */}
      <Sidebar
        currentModule={currentModule}
        setCurrentModule={setCurrentModule}
        theme={theme}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Command Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Workspace Top Bar Status HUD */}
        <header className={`px-6 py-4 flex items-center justify-between shrink-0 backdrop-blur z-20 ${innerHeaderClass}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-slate-800/20 dark:hover:bg-slate-100/10 transition-colors text-slate-400 hover:text-white flex items-center justify-center border border-[#1f2937]/50"
              title={sidebarOpen ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
              id="sidebar-toggle-btn"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${badgeClass}`}>
              {currentModule.toUpperCase()} CONTROL PANEL
            </span>
            {selectedSchool && (
              <span className="text-xs font-mono text-slate-500 truncate">
                FOCUSING: {selectedSchool.name} (NPSN: {selectedSchool.npsn})
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
            {theme === 'dark' ? (
              <div className="flex space-x-4 text-[11px] font-mono items-center">
                <span className="text-emerald-400">● GIS: STABLE</span>
                <span className="text-cyan-400">● AI: ACTIVE</span>
                <span className="text-blue-400">● OPS: NORMAL</span>
              </div>
            ) : (
              <>
                <span>REGION: WEST JAVA S4</span>
                <span>STATUS: COGNITIVE DEPLOYED</span>
              </>
            )}
            <div className="h-4 w-px bg-[#1f2937]" />
            <div className="flex items-center gap-1">
              <button onClick={() => setTheme('light')} className={`p-1 rounded cursor-pointer ${theme === 'light' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-200'}`} title="Light"><Sun className="h-3 w-3" /></button>
              <button onClick={() => setTheme('dark')} className={`p-1 rounded cursor-pointer ${theme === 'dark' ? 'bg-[#08090b] text-cyan-400' : 'text-slate-500 hover:text-slate-200'}`} title="Dark HUD"><Moon className="h-3 w-3" /></button>
              <button onClick={() => setTheme('command')} className={`p-1 rounded cursor-pointer ${theme === 'command' ? 'bg-amber-950/60 text-amber-400' : 'text-slate-500 hover:text-amber-400'}`} title="Terminal"><MonitorCheck className="h-3 w-3" /></button>
              <button onClick={() => setTheme('emerald')} className={`p-1 rounded cursor-pointer ${theme === 'emerald' ? 'bg-emerald-950/60 text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`} title="Mint"><Leaf className="h-3 w-3" /></button>
            </div>
            <div className="h-4 w-px bg-[#1f2937]" />
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-cyan-400 font-bold">{user.username}</span>
                <span className="text-[8px] text-slate-500 uppercase tracking-wider">
                  {user.role === 'admin' ? 'Super Admin' : user.role === 'staff_kecamatan' ? 'Staf Kecamatan' : `Operator ${user.schoolName || ''}`}
                </span>
              </div>
              <button
                onClick={() => setPwOpen(true)}
                className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Ubah Password"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-red-950/30 text-slate-400 hover:text-red-400 transition-colors"
                title="Keluar"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Change Password Modal */}
        {pwOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setPwOpen(false); setPwMsg(null); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Ubah Password</h2>
                <button onClick={() => { setPwOpen(false); setPwMsg(null); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Password Saat Ini</label>
                  <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Password Baru</label>
                  <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Konfirmasi Password Baru</label>
                  <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white mt-1 focus:outline-none focus:border-cyan-700" />
                </div>
                {pwMsg && (
                  <div className={`text-xs font-mono p-2 rounded ${pwMsg.ok ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50' : 'bg-red-950/30 text-red-400 border border-red-900/50'}`}>
                    {pwMsg.ok ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
                    {pwMsg.text}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setPwOpen(false); setPwMsg(null); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Batal</button>
                <button onClick={async () => {
                  if (!pwForm.currentPassword || !pwForm.newPassword) { setPwMsg({ ok: false, text: 'Isi semua field' }); return; }
                  if (pwForm.newPassword.length < 6) { setPwMsg({ ok: false, text: 'Password baru minimal 6 karakter' }); return; }
                  if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg({ ok: false, text: 'Konfirmasi password tidak cocok' }); return; }
                  setPwSaving(true); setPwMsg(null);
                  try {
                    const r = await fetch('/api/auth/change-password', {
                      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('timker_bidik_token') },
                      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
                    });
                    const data = await r.json();
                    if (r.ok) {
                      setPwMsg({ ok: true, text: data.message || 'Password berhasil diubah' });
                      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    } else {
                      setPwMsg({ ok: false, text: data.error || 'Gagal mengubah password' });
                    }
                  } catch { setPwMsg({ ok: false, text: 'Gagal terhubung ke server' }); }
                  setPwSaving(false);
                }} disabled={pwSaving}
                  className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-2">
                  {pwSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Inner Panel Viewport */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
