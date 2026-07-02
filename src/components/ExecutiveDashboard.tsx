import React from 'react';
import {
  School as SchoolIcon,
  Users,
  GraduationCap,
  AlertOctagon,
  ShieldAlert,
  FileCheck2,
  CalendarDays,
  Building,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search
} from 'lucide-react';
import { School } from '../types';
import { ALL_SCHOOLS, GET_VILLAGE_STATS } from '../data/mockData';

interface DashboardProps {
  onSelectSchool: (school: School) => void;
  setCurrentModule: (mod: string) => void;
}

export default function ExecutiveDashboard({ onSelectSchool, setCurrentModule }: DashboardProps) {
  // Dynamically calculated values from ALL_SCHOOLS
  const totalSchools = ALL_SCHOOLS.length;
  const totalStudents = ALL_SCHOOLS.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.total, 0);
  const shortageSchools = ALL_SCHOOLS.filter(s => s.riskIndicators.teacherShortage).length;
  const surplusSchools = ALL_SCHOOLS.filter(s => s.teachers.total > 10).length; // schools with sufficient staffing
  const certPending = ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.pendingCertification, 0);
  const retiringSoon = ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.retiringSoon, 0);
  const criticalInfra = ALL_SCHOOLS.filter(s => s.riskIndicators.infrastructureCritical).length;

  const kpiData = [
    {
      id: 'schools',
      label: 'Total SD Negeri',
      value: totalSchools,
      delta: 'Aktif',
      positive: true,
      icon: SchoolIcon,
      sparkline: 'M0,10 Q10,2 20,8 T40,12 T60,5 T80,3',
      alert: 'Sinkron',
      color: 'indigo'
    },
    {
      id: 'students',
      label: 'Total Siswa',
      value: totalStudents.toLocaleString('id-ID'),
      delta: '+4.2%',
      positive: true,
      icon: Users,
      sparkline: 'M0,12 Q10,8 20,10 T40,4 T60,3 T80,1',
      alert: 'Normal',
      color: 'violet'
    },
    {
      id: 'teachers',
      label: 'Total Guru & Staf',
      value: totalTeachers.toLocaleString('id-ID'),
      delta: 'Stabil',
      positive: true,
      icon: GraduationCap,
      sparkline: 'M0,2 Q10,5 20,4 T40,8 T60,10 T80,14',
      alert: 'Aktif',
      color: 'emerald'
    },
    {
      id: 'shortage',
      label: 'SDN Defisit Guru',
      value: shortageSchools,
      delta: 'Perlu Guru',
      positive: false,
      icon: AlertOctagon,
      sparkline: 'M0,14 Q10,12 20,8 T40,6 T60,3 T80,1',
      alert: shortageSchools > 0 ? 'Peringatan' : 'Aman',
      color: 'red'
    },
    {
      id: 'surplus',
      label: 'SDN Cukup Staf',
      value: surplusSchools,
      delta: 'Stabil',
      positive: true,
      icon: ShieldAlert,
      sparkline: 'M0,5 Q10,3 20,6 T40,8 T60,11 T80,13',
      alert: 'Tercukupi',
      color: 'amber'
    },
    {
      id: 'certification',
      label: 'Sertifikasi Tertunda',
      value: certPending,
      delta: 'Proses PPG',
      positive: false,
      icon: FileCheck2,
      sparkline: 'M0,10 Q10,12 20,10 T40,5 T60,3 T80,2',
      alert: certPending > 0 ? 'Tertunda' : 'Selesai',
      color: 'cyan'
    },
    {
      id: 'retirement',
      label: 'Risiko Pensiun',
      value: retiringSoon,
      delta: '3 Tahun',
      positive: false,
      icon: CalendarDays,
      sparkline: 'M0,8 Q10,6 20,11 T40,9 T60,3 T80,1',
      alert: retiringSoon > 10 ? 'Risiko Tinggi' : 'Sedang',
      color: 'purple'
    },
    {
      id: 'infrastructure',
      label: 'Infrastruktur Kritis',
      value: criticalInfra,
      delta: 'Perlu Rehab',
      positive: false,
      icon: Building,
      sparkline: 'M0,12 Q10,11 20,8 T40,5 T60,4 T80,2',
      alert: criticalInfra > 0 ? 'Butuh Rehab' : 'Kondisi Baik',
      color: 'rose'
    }
  ];

  // Critical list
  const criticalList = ALL_SCHOOLS.filter(s => s.healthScore < 40).slice(0, 4);
  const villageData = GET_VILLAGE_STATS();

  return (
    <div className="space-y-6" id="dashboard-module">
      {/* Upper Jumbotron Info */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#0c0e12] via-[#0d141e] to-[#0c0e12] border border-cyan-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative shrink-0 hidden sm:block">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 opacity-20 blur-xs" />
            <div className="relative p-1.5 rounded-lg border border-cyan-500/30 bg-[#111827]">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png" 
                alt="Tut Wuri Handayani" 
                className="h-12 w-12 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>KINERJA EKSEKUTIF PENDIDIKAN</span>
            </div>
            <h2 className="text-2xl font-light tracking-widest text-white">TIMKER <span className="font-bold text-cyan-400">BIDIK</span></h2>
            <p className="text-sm text-slate-400 max-w-xl font-sans">
              Sinkronisasi data real-time dengan {totalSchools} SD Negeri di Kecamatan Lemahabang. Pemodelan prediktif aktif.
            </p>
          </div>
        </div>
        <button
          onClick={() => setCurrentModule('console')}
          className="relative z-10 px-4 py-2 text-xs font-bold font-mono uppercase bg-cyan-600/20 border border-cyan-600 text-cyan-400 rounded hover:bg-cyan-600 hover:text-white transition-colors flex items-center gap-2 shrink-0"
        >
          <Search className="h-4 w-4" />
          <span>Launch AI Command Console</span>
        </button>

        {/* Glow backdrop decorative */}
        <div className="absolute right-0 top-0 h-48 w-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          
          let colorTheme = {
            bg: 'bg-[#11141a]',
            border: 'border-l-2 border-[#1f2937]',
            text: 'text-cyan-400',
            sparkStroke: '#22d3ee',
            extraClasses: ''
          };

          if (kpi.id === 'schools') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-cyan-500',
              text: 'text-cyan-400',
              sparkStroke: '#22d3ee',
              extraClasses: ''
            };
          } else if (kpi.id === 'students') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-blue-500',
              text: 'text-blue-400',
              sparkStroke: '#3b82f6',
              extraClasses: ''
            };
          } else if (kpi.id === 'teachers') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-indigo-500',
              text: 'text-indigo-400',
              sparkStroke: '#6366f1',
              extraClasses: ''
            };
          } else if (kpi.id === 'shortage') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-red-500',
              text: 'text-red-400',
              sparkStroke: '#ef4444',
              extraClasses: 'ring-1 ring-red-900/30'
            };
          } else if (kpi.id === 'surplus') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-green-500',
              text: 'text-green-400',
              sparkStroke: '#22c55e',
              extraClasses: ''
            };
          } else if (kpi.id === 'certification') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-orange-500',
              text: 'text-orange-400',
              sparkStroke: '#f97316',
              extraClasses: 'ring-1 ring-orange-900/20'
            };
          } else if (kpi.id === 'retirement') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-purple-500',
              text: 'text-purple-400',
              sparkStroke: '#a855f7',
              extraClasses: ''
            };
          } else if (kpi.id === 'infrastructure') {
            colorTheme = {
              bg: 'bg-[#11141a]',
              border: 'border-l-2 border-yellow-500',
              text: 'text-yellow-400',
              sparkStroke: '#eab308',
              extraClasses: ''
            };
          }

          return (
            <div
              key={kpi.id}
              className={`p-4 border ${colorTheme.bg} ${colorTheme.border} ${colorTheme.extraClasses} relative overflow-hidden transition-all hover:scale-[1.01] hover:bg-opacity-90`}
              id={`kpi-${kpi.id}`}
            >
              {/* Header inside Card */}
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase text-[#6b7280] font-bold font-sans tracking-wide">{kpi.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  kpi.id === 'shortage' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-black/60 text-slate-400 border border-[#1f2937]'
                }`}>
                  {kpi.alert}
                </span>
              </div>

              {/* Main value & Trend details */}
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-100">{kpi.value}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    {kpi.positive ? (
                      <span className="text-[10px] text-green-400 font-mono text-xs font-bold">{kpi.delta}</span>
                    ) : (
                      <span className="text-[10px] text-red-400 font-mono text-xs font-bold">{kpi.delta}</span>
                    )}
                    <span className="text-[9px] text-[#6b7280] font-mono">L.M.</span>
                  </div>
                </div>

                {/* SVG Sparkline */}
                <div className="w-16 h-8 opacity-60">
                  <svg className="w-full h-full" viewBox="0 0 80 15">
                    <path
                      d={kpi.sparkline}
                      fill="none"
                      stroke={colorTheme.sparkStroke}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Icon Watermark/Graphic */}
              <div className="absolute -bottom-2 -right-2 opacity-5 pointer-events-none">
                <Icon className="h-16 w-16 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* MID-SECTION DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Village performance index */}
        <div className="lg:col-span-2 p-5 bg-[#11141a]/60 rounded border border-[#1f2937] flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
            <h4 className="font-bold text-xs tracking-wider text-slate-300 uppercase font-sans">
              DEMOGRAFI & STATUS KESEHATAN PER DESA
            </h4>
            <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">INDEKS SPASIAL</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1f2937] text-[#6b7280] font-mono">
                  <th className="py-2.5 px-3 uppercase tracking-wider text-[10px]">Nama Desa</th>
                  <th className="py-2.5 px-3 text-center uppercase tracking-wider text-[10px]">Jumlah SDN</th>
                  <th className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px]">Total Siswa</th>
                  <th className="py-2.5 px-3 text-center uppercase tracking-wider text-[10px]">Kekurangan Guru</th>
                  <th className="py-2.5 px-3 text-center uppercase tracking-wider text-[10px]">Laju Pertumbuhan</th>
                  <th className="py-2.5 px-3 text-right uppercase tracking-wider text-[10px]">Rata-Rata Indeks Kesehatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]/50 font-mono">
                {villageData.map((village, idx) => (
                  <tr key={idx} className="hover:bg-cyan-950/10 text-[#d1d5db] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">{village.name}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{village.totalSchools} SDN</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{village.totalStudents.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                        village.teacherShortage > 0 ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-[#0c0e12] text-slate-400 border-[#1f2937]'
                      }`}>
                        {village.teacherShortage} SDN
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-400">+{village.studentGrowthRate}%</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={
                        village.avgHealthScore < 40 ? 'text-red-400' :
                        village.avgHealthScore < 65 ? 'text-amber-400' :
                        'text-emerald-400'
                      }>
                        {village.avgHealthScore}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical queue monitor */}
        <div className="p-5 bg-[#11141a]/60 rounded border border-[#1f2937] flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
            <h4 className="font-bold text-xs tracking-wider text-slate-300 uppercase font-sans">
              CRITICAL INTERVENTION QUEUE
            </h4>
            <span className="text-[10px] text-red-500 font-mono animate-pulse uppercase tracking-wider">LIVE STATUS</span>
          </div>

          <div className="space-y-3 flex-1">
            {criticalList.map((school) => {
              // Calculate specific severe delta
              const ratio = Math.round(school.students.total / school.teachers.total);
              return (
                <div
                  key={school.npsn}
                  onClick={() => onSelectSchool(school)}
                  className="p-3 bg-[#0d0f14] border border-[#1f2937] hover:border-red-500/50 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs text-red-400 truncate">{school.name}</span>
                    <span className="text-[10px] font-mono text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900/60">
                      HEALTH: {school.healthScore}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280] flex flex-wrap justify-between">
                    <span>Desa: {school.village}</span>
                    <span className="text-red-400 font-bold">Rasio Siswa: {ratio}:1</span>
                  </div>
                  <div className="w-full bg-[#1c1f26] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full" style={{ width: `${school.healthScore}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#1f2937] text-center">
            <button
              onClick={() => setCurrentModule('monitor')}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 uppercase tracking-widest"
            >
              View Full Live Stream &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
