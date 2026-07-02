import React, { useState, useMemo, useEffect } from 'react';
import { School } from '../types';
import { loadSchools } from '../data/dataService';
import { VILLAGES, getSchoolDMS } from '../data/mockData';
import {
  Search,
  Filter,
  GraduationCap,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Map,
  Compass,
  FileCheck2,
  Zap
} from 'lucide-react';

interface DataWarehouseProps {
  selectedSchool?: School;
  onSelectSchool: (school?: School) => void;
}

export default function DataWarehouse({ selectedSchool, onSelectSchool }: DataWarehouseProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [activeTab, setActiveTab] = useState<'schools' | 'teachers' | 'students' | 'facilities'>('schools');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVillage, setFilterVillage] = useState('All');
  const [filterLevel, setFilterLevel] = useState('SD');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadSchools().then(s => { if (s.length) setSchools(s); });
  }, []);

  // Filter Warehouse listing
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.npsn.includes(searchTerm);
      const matchVillage = filterVillage === 'All' || s.village === filterVillage;
      const matchLevel = filterLevel === 'All' || s.level === filterLevel;
      return matchSearch && matchVillage && matchLevel;
    });
  }, [searchTerm, filterVillage, filterLevel]);

  // Paginated Schools
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchools.slice(start, start + itemsPerPage);
  }, [filteredSchools, currentPage]);

  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);

  // Digital Twin specific render helper
  const renderDigitalTwin = (school: School) => {
    const isCritical = school.healthScore < 40;
    const isWarning = school.healthScore >= 40 && school.healthScore < 60;
    const isGood = school.healthScore >= 60 && school.healthScore < 90;
    
    let healthClass = 'text-red-400 bg-red-950/60 border border-red-800';
    let statusLabel = 'CRITICAL';
    if (isWarning) {
      healthClass = 'text-amber-400 bg-amber-950/60 border border-amber-800';
      statusLabel = 'WARNING';
    } else if (isGood) {
      healthClass = 'text-cyan-400 bg-cyan-950/60 border border-cyan-850';
      statusLabel = 'GOOD';
    } else if (school.healthScore >= 90) {
      healthClass = 'text-emerald-400 bg-emerald-950/60 border border-emerald-800';
      statusLabel = 'EXCELLENT';
    }

    return (
      <div className="space-y-6" id="digital-twin-dashboard">
        {/* Header Back Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectSchool(undefined)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c0e12] border border-[#1f2937] hover:bg-[#11141a] text-slate-300 text-xs font-mono font-bold uppercase transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Explorer</span>
          </button>
          <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase font-bold">DIGITAL TWIN MODE ACTIVE</span>
        </div>

        {/* Master Profile Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* School Card Profile */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
            <div className="h-28 rounded-lg bg-[#0c0e12] border border-[#1f2937] flex items-center justify-center relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(45deg, #090a16 25%, transparent 25%), linear-gradient(-45deg, #090a16 25%, transparent 25%)', backgroundSize: '20px 20px' }}>
              <Building2 className="h-10 w-10 text-cyan-600/30" />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#0c0e12]/80 rounded border border-[#1f2937] text-[10px] font-mono font-bold text-slate-400">
                NPSN {school.npsn}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-100">{school.name}</h3>
              <p className="text-xs text-slate-400 font-mono">{school.village}, Kecamatan Lemahabang</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1f2937]">
                <span className="text-[9px] text-slate-500 block uppercase">ACCREDITATION</span>
                <span className="font-bold text-slate-200">{school.accreditation}</span>
              </div>
              <div className="p-2 rounded bg-[#0c0e12] border border-[#1f2937]">
                <span className="text-[9px] text-slate-500 block uppercase">LEVEL / STATUS</span>
                <span className="font-bold text-slate-200">{school.level} / {school.status}</span>
              </div>
            </div>
          </div>

          {/* Health Gauge & Risk Indicators */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-[#1f2937] pb-2 mb-3">
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">HEALTH GAUGE</span>
              <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${healthClass}`}>
                {statusLabel}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-4 relative">
              {/* Simple Dynamic SVG Ring Gauge */}
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={isCritical ? '#f87171' : (isWarning ? '#f59e0b' : '#22d3ee')}
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * school.healthScore) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="55" textAnchor="middle" fill="#f1f5f9" fontSize="16" fontWeight="bold" fontFamily="monospace">
                  {school.healthScore}%
                </text>
              </svg>
            </div>

            <div className="space-y-1 mt-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">DETEKSI RISIKO AKTIF</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${school.riskIndicators.teacherShortage ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span>Kekurangan Guru</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${school.riskIndicators.studentOverload ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span>Kelebihan Siswa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${school.riskIndicators.infrastructureCritical ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span>Rusak Struktural</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${school.riskIndicators.retirementExposure ? 'bg-purple-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span>Risiko Pensiun</span>
                </div>
              </div>
            </div>
          </div>

          {/* GIS Location Profile */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-[#1f2937] pb-2 mb-3">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">SPATIAL POSITION</span>
            </div>

            <div className="h-28 rounded-lg bg-[#0c0e12] border border-[#1f2937] relative overflow-hidden flex flex-col items-center justify-center p-3">
              {/* Simulated Coordinate Grid */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#1e1e38 1px, transparent 1px), linear-gradient(90deg, #1e1e38 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
              <div className="text-center space-y-1.5 relative z-10">
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block leading-none">GPS DECIMAL</span>
                  <p className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{school.coordinates.lat.toFixed(6)}, {school.coordinates.lng.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block leading-none">GPS DMS</span>
                  <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{getSchoolDMS(school).latDms}, {getSchoolDMS(school).lngDms}</p>
                </div>
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">SEKTOR: {school.village.toUpperCase()}</p>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 space-y-1 pt-2">
              <div className="flex justify-between"><span>Provider Internet:</span> <span className="font-bold text-slate-300">{school.facilities.internetProvider}</span></div>
              <div className="flex justify-between"><span>Kecepatan Net:</span> <span className="font-bold text-cyan-400">{school.facilities.internetSpeedMbps} Mbps</span></div>
            </div>
          </div>
        </div>

        {/* 3D Campus Layout Blueprint (Flagship Module) */}
        <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
          <div className="flex justify-between items-center border-b border-[#1f2937] pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4.5 w-4.5 text-cyan-400" />
              <h4 className="font-bold text-xs tracking-wider text-slate-200 uppercase font-sans">
                CAMPUS LAYOUT 3D-MESH BLUEPRINT
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">INTELLIGENT INFRASTRUCTURE INSPECTOR</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
            {/* Visual Isometric blocks representing school structure */}
            <div className="lg:col-span-2 aspect-[16/9] relative rounded-lg border border-[#1f2937] bg-[#0c0e12]/60 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(ellipse at center, #1e293b 0%, transparent 80%)' }} />
              {/* Isometric blocks vector container */}
              <div 
                className="w-48 h-40 relative transition-transform duration-500"
                style={{ transform: 'perspective(600px) rotateX(45deg) rotateZ(-30deg)' }}
              >
                {/* School main classroom blocks */}
                <div className={`absolute top-4 left-4 w-20 h-10 border border-slate-700/80 translate-z-8 shadow-[10px_10px_15px_rgba(0,0,0,0.6)] ${
                  school.facilities.classroomCondition.heavyDamage > 0 ? 'bg-red-950/60 border-red-800 text-red-400' : 'bg-slate-950/60 text-slate-300'
                }`}>
                  <div className="text-[8px] font-mono absolute inset-0 flex items-center justify-center font-bold rotate-z-30">
                    CLASS BLOCK A
                  </div>
                </div>

                {/* Library building block */}
                {school.facilities.hasLibrary && (
                  <div className="absolute top-18 left-8 w-12 h-10 border border-slate-700/80 bg-slate-950/60 shadow-[5px_5px_10px_rgba(0,0,0,0.6)] text-cyan-400">
                    <div className="text-[7px] font-mono absolute inset-0 flex items-center justify-center font-bold rotate-z-30">
                      LIBRARY
                    </div>
                  </div>
                )}

                {/* Computer lab / tech cabin */}
                {school.facilities.hasLab && (
                  <div className="absolute top-8 left-28 w-14 h-8 border border-slate-700/80 bg-cyan-950/40 text-cyan-300">
                    <div className="text-[7px] font-mono absolute inset-0 flex items-center justify-center font-bold rotate-z-30">
                      COMP LAB
                    </div>
                  </div>
                )}

                {/* Sanitary unit block (Toilets) */}
                <div className={`absolute top-22 left-26 w-8 h-8 border border-slate-700/80 ${
                  school.facilities.toiletsDamaged > 0 ? 'bg-amber-950/60 border-amber-800 text-amber-400' : 'bg-slate-950/60 text-emerald-400'
                }`}>
                  <div className="text-[6px] font-mono absolute inset-0 flex items-center justify-center font-bold">
                    TOILETS
                  </div>
                </div>
              </div>
            </div>

            {/* Layout annotations / conditions */}
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase block border-b border-[#1f2937] pb-1">BLUEPRINT SPECIFICATIONS</span>
              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span>Classrooms:</span>
                  <span className="text-slate-100">{school.facilities.classroomCondition.good} Good / {school.facilities.classroomCondition.heavyDamage} Damaged</span>
                </div>
                <div className="flex justify-between">
                  <span>Library Facility:</span>
                  <span className={school.facilities.hasLibrary ? 'text-emerald-400' : 'text-slate-500'}>{school.facilities.hasLibrary ? 'AVAILABLE' : 'MISSING'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Science/IT Lab:</span>
                  <span className={school.facilities.hasLab ? 'text-emerald-400' : 'text-slate-500'}>{school.facilities.hasLab ? 'AVAILABLE' : 'MISSING'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sanitary Latrines:</span>
                  <span className="text-slate-100">{school.facilities.toiletsGood} Compliant / {school.facilities.toiletsDamaged} Damaged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="warehouse-module">
      {selectedSchool ? (
        renderDigitalTwin(selectedSchool)
      ) : (
        <div className="space-y-5">
          {/* Filters Dashboard */}
          <div className="p-4 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                id="warehouse-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by School Name or NPSN..."
                className="w-full bg-[#0c0e12] border border-[#1f2937] text-slate-200 pl-9 pr-4 py-2.5 rounded-lg text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Selection Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>
              <select
                id="warehouse-filter-village"
                value={filterVillage}
                onChange={(e) => { setFilterVillage(e.target.value); setCurrentPage(1); }}
                className="bg-[#0c0e12] border border-[#1f2937] text-slate-300 px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
              >
                <option value="All">All Villages</option>
                {VILLAGES.map((v, i) => (
                  <option key={i} value={v}>{v}</option>
                ))}
              </select>

              <select
                id="warehouse-filter-level"
                value={filterLevel}
                onChange={(e) => { setFilterLevel(e.target.value); setCurrentPage(1); }}
                className="bg-[#0c0e12] border border-[#1f2937] text-cyan-400 px-3 py-2 rounded-lg text-xs font-mono focus:outline-none font-bold"
                disabled
              >
                <option value="SD">SD Negeri Only</option>
              </select>
            </div>
          </div>

          {/* Sub Tab selection inside Explorer */}
          <div className="flex border-b border-[#1f2937]">
            {[
              { id: 'schools', label: 'Schools', icon: Building2 },
              { id: 'teachers', label: 'Teachers Distribution', icon: GraduationCap },
              { id: 'students', label: 'Students Directory', icon: Users }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`sub-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active directory list table */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937]">
            {activeTab === 'schools' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1f2937] text-slate-500 font-mono">
                        <th className="py-2 px-3">NPSN</th>
                        <th className="py-2 px-3">School Name</th>
                        <th className="py-2 px-3">Village</th>
                        <th className="py-2 px-3">Accreditation</th>
                        <th className="py-2 px-3 text-right">Students</th>
                        <th className="py-2 px-3 text-right">Teachers</th>
                        <th className="py-2 px-3 text-right">Health Score</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                      {paginatedSchools.map(s => (
                        <tr key={s.npsn} className="hover:bg-slate-900/30">
                          <td className="py-3 px-3 font-semibold text-cyan-400 select-all">{s.npsn}</td>
                          <td className="py-3 px-3 text-slate-100 font-bold">{s.name}</td>
                          <td className="py-3 px-3">{s.village}</td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-[#0c0e12] text-slate-400 font-bold text-[10px] border border-[#1f2937]">
                              {s.accreditation}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">{s.students.total}</td>
                          <td className="py-3 px-3 text-right">{s.teachers.total}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">
                            <span className={
                              s.healthScore < 40 ? 'text-red-400' :
                              s.healthScore < 60 ? 'text-amber-400' :
                              'text-emerald-400'
                            }>
                              {s.healthScore}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              id={`view-twin-${s.npsn}`}
                              onClick={() => onSelectSchool(s)}
                              className="px-2.5 py-1.5 rounded bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-400 hover:text-white transition text-[10px] font-mono font-bold"
                            >
                              DIGITAL TWIN
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-900 pt-4 text-xs font-mono">
                    <span className="text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded bg-[#0c0e12] border border-[#1f2937] disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded bg-[#0c0e12] border border-[#1f2937] disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teachers' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1f2937] text-slate-500 font-mono">
                        <th className="py-2 px-3">School Name</th>
                        <th className="py-2 px-3 text-right">PNS Count</th>
                        <th className="py-2 px-3 text-right">PPPK Count</th>
                        <th className="py-2 px-3 text-right">Honorer Count</th>
                        <th className="py-2 px-3 text-right">Certified</th>
                        <th className="py-2 px-3 text-center">Pending Certification</th>
                        <th className="py-2 px-3 text-right">Retirement Target (3yr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                      {paginatedSchools.map(s => (
                        <tr key={s.npsn} className="hover:bg-slate-900/30">
                          <td className="py-3 px-3 font-bold text-slate-100">{s.name}</td>
                          <td className="py-3 px-3 text-right text-emerald-400">{s.teachers.pns}</td>
                          <td className="py-3 px-3 text-right text-cyan-400">{s.teachers.pppk}</td>
                          <td className="py-3 px-3 text-right text-slate-400">{s.teachers.honorer}</td>
                          <td className="py-3 px-3 text-right text-cyan-400 font-semibold">{s.teachers.certified}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded ${s.teachers.pendingCertification > 2 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-[#0c0e12] text-slate-400 border border-[#1f2937]'}`}>
                              {s.teachers.pendingCertification} guru
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-red-400 font-bold">{s.teachers.retiringSoon}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1f2937] text-slate-500 font-mono">
                        <th className="py-2 px-3">School Name</th>
                        <th className="py-2 px-3">Level</th>
                        <th className="py-2 px-3 text-right">Male Students</th>
                        <th className="py-2 px-3 text-right">Female Students</th>
                        <th className="py-2 px-3 text-right">Total Enrollment</th>
                        <th className="py-2 px-3 text-right">SPMB Growth (5yr Trend)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                      {paginatedSchools.map(s => {
                        const trendStr = s.students.growthTrend.join(' &rarr; ');
                        return (
                          <tr key={s.npsn} className="hover:bg-slate-900/30">
                            <td className="py-3 px-3 font-bold text-slate-100">{s.name}</td>
                            <td className="py-3 px-3">{s.level}</td>
                            <td className="py-3 px-3 text-right">{s.students.male}</td>
                            <td className="py-3 px-3 text-right">{s.students.female}</td>
                            <td className="py-3 px-3 text-right font-bold text-cyan-400">{s.students.total}</td>
                            <td className="py-3 px-3 text-right text-cyan-400 font-semibold text-[10px]" dangerouslySetInnerHTML={{ __html: trendStr }} />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
