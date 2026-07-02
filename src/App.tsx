import React, { useState } from 'react';
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

import { School, Recommendation } from './types';
import { MOCK_RECOMMENDATIONS } from './data/mockData';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';

export default function App() {
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark' | 'command' | 'emerald'>('dark');
  const [selectedSchool, setSelectedSchool] = useState<School | undefined>(undefined);
  const [recs, setRecs] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

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
      case 'reports':
        return <ReportCenter />;
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
        setTheme={setTheme}
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
              <div className="flex space-x-4 text-[11px] font-mono">
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
          </div>
        </header>

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
