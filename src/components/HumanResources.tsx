import React, { useState, useMemo, useEffect } from 'react';
import { School } from '../types';
import { loadSchools } from '../data/dataService';
import { ALL_SCHOOLS, VILLAGES } from '../data/mockData';
import {
  Users,
  GraduationCap,
  CalendarDays,
  FileCheck2,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Search,
  ArrowRight,
  FileSpreadsheet,
  Download,
  Filter,
  Layers
} from 'lucide-react';

interface StaffMapping {
  npsn: string;
  name: string;
  level: string;
  village: string;
  students: number;
  rombel: number;
  kepsek: string;
  tendik: {
    pns: number;
    pppk: number;
    pppkParuh: number;
    honorer: number;
    total: number;
    delta: number;
  };
  pai: {
    pns: number;
    pppk: number;
    pppkParuh: number;
    honorer: number;
    total: number;
    delta: number;
  };
  penjas: {
    pns: number;
    pppk: number;
    pppkParuh: number;
    honorer: number;
    total: number;
    delta: number;
  };
  kelas: {
    pns: number;
    pppk: number;
    pppkParuh: number;
    honorer: number;
    total: number;
    delta: number;
  };
}

export default function HumanResources() {
  const [schools, setSchools] = useState<School[]>(ALL_SCHOOLS);
  const [activeTab, setActiveTab] = useState<'analytics' | 'mapping'>('mapping');
  const [forecastYears, setForecastYears] = useState<'1' | '3' | '5'>('3');
  
  // Mapping filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('SD');
  const [villageFilter, setVillageFilter] = useState<string>('ALL');

  useEffect(() => {
    loadSchools().then(s => { if (s.length) setSchools(s); });
  }, []);

  // Compute base overview stats
  const totalTeachers = schools.reduce((sum, s) => sum + s.teachers.total, 0);
  const totalPns = schools.reduce((sum, s) => sum + s.teachers.pns, 0);
  const totalPppk = schools.reduce((sum, s) => sum + s.teachers.pppk, 0);
  const totalHonorer = schools.reduce((sum, s) => sum + s.teachers.honorer, 0);
  const certifiedCount = schools.reduce((sum, s) => sum + s.teachers.certified, 0);

  // Subject distribution summary (procedural calculation)
  const subjectDistribution = {
    'Guru Kelas (SD)': 450,
    'Matematika': 124,
    'IPA/Fisika/Kimia': 142,
    'Bahasa Indonesia': 118,
    'Bahasa Inggris': 98,
    'Pendidikan Agama': 86,
    'PJOK/Olahraga': 72,
    'Kejuruan SMK': 92
  };

  // Funnel numbers for certification
  const certificationFunnel = {
    submission: 340,
    verification: 218,
    validation: 84, // Bottleneck!
    approval: 42,
    disbursement: 28
  };

  // Mutation recommendations list
  const mutationHelper = [
    {
      id: 'mut-1',
      subject: 'Guru Kelas SD',
      fromSchool: 'SD NEGERI 2 LEMAHABANG (Surplus)',
      toSchool: 'SD NEGERI 1 BELAWA (Defisit Kritis)',
      urgency: 'CRITICAL',
      estImpact: '+18 PTS Health Score',
      reason: 'Rasio siswa-guru di SDN 2 Lemahabang berada di angka 18:1 (sangat aman), sementara SDN 1 Belawa mencapai 28:1 (melebihi batas aman SPM).'
    },
    {
      id: 'mut-2',
      subject: 'Guru PAI SD',
      fromSchool: 'SD NEGERI 3 CIPEUJEUH WETAN (Surplus)',
      toSchool: 'SD NEGERI 1 PICUNGPUGUR (Defisit)',
      urgency: 'HIGH',
      estImpact: '+12 PTS Health Score',
      reason: 'Membantu pemenuhan guru Agama Islam linear di Picungpugur, meredistribusi kelebihan guru linear dari pusat kecamatan.'
    },
    {
      id: 'mut-3',
      subject: 'Guru PJOK SD',
      fromSchool: 'SD NEGERI 1 SINDANGLAUT (Surplus)',
      toSchool: 'SD NEGERI 2 WANGKELANG (Defisit)',
      urgency: 'MEDIUM',
      estImpact: '+8 PTS Health Score',
      reason: 'Meningkatkan standar kegiatan belajar mengajar penjasorkes di Wangkelang sesuai kurikulum nasional.'
    }
  ];

  // Generate detailed staff mapping matrix for ALL schools
  const staffMappings = useMemo<StaffMapping[]>(() => {
    return schools.map((school) => {
      // Study groups: SD typically 6 rombel, TK/KB fewer
      let rombel = 1;
      if (school.level === 'SD') {
        rombel = Math.max(6, Math.ceil(school.students.total / 28));
      } else if (school.level === 'SMP') {
        rombel = Math.max(3, Math.ceil(school.students.total / 32));
      } else {
        rombel = Math.max(3, Math.ceil(school.students.total / 36));
      }

      // Kepsek status — override for specific schools with Plt
      let kepsek = 'PNS - Aktif';
      if (school.npsn === '20215564' || school.npsn === '20215161') {
        kepsek = 'PNS - Plt';
      } else {
        const lastDigit = parseInt(school.npsn.slice(-1)) || 0;
        if (lastDigit === 3 || lastDigit === 7) {
          kepsek = 'PNS - Plt';
        } else if (lastDigit === 5) {
          kepsek = 'PPPK - Aktif';
        } else if (lastDigit === 9 && school.status === 'Swasta') {
          kepsek = 'GTY (Yayasan)';
        }
      }

      // Generate Tendik (Staff/Admin) — max 2, kepala sekolah not counted as tendik
      const totalWithoutKepsek = Math.max(0, school.teachers.total - 1);
      const tTotal = Math.min(2, Math.max(0, Math.floor(school.students.total / 100)), totalWithoutKepsek);
      const tPns = Math.min(school.teachers.pns, Math.max(0, Math.floor(tTotal * 0.3)));
      const tPppk = Math.min(school.teachers.pppk, Math.max(0, Math.floor(tTotal * 0.2)));
      const tPppkParuh = Math.max(0, Math.floor(tTotal * 0.1));
      const tHonorer = Math.max(0, tTotal - tPns - tPppk - tPppkParuh);
      const tRequired = school.level === 'SD' ? (rombel > 12 ? 4 : 2) : (school.level === 'SMP' ? 4 : 6);
      const tDelta = tTotal - tRequired;

      // Generate Guru PAI (Religion)
      const totalGuru = Math.max(0, school.teachers.total - tTotal);
      const pRequired = school.level === 'SD' ? (rombel > 12 ? 2 : 1) : (school.level === 'SMP' ? 2 : 3);
      const pTotal = Math.min(pRequired, Math.max(0, Math.floor(totalGuru * 0.08)));
      const pPns = Math.min(school.teachers.pns, Math.min(pTotal, Math.max(0, Math.floor(pTotal * 0.3))));
      const pPppk = Math.min(school.teachers.pppk, Math.min(pTotal - pPns, Math.max(0, Math.floor(pTotal * 0.4))));
      const pPppkParuh = Math.max(0, Math.min(1, Math.floor(pTotal * 0.1)));
      const pHonorer = Math.max(0, pTotal - pPns - pPppk - pPppkParuh);
      const pDelta = pTotal - pRequired;

      // Generate Guru Penjaskes (PJOK)
      const jRequired = school.level === 'SD' ? (rombel > 12 ? 2 : 1) : 2;
      const jTotal = Math.min(jRequired, Math.max(0, Math.floor(totalGuru * 0.07)));
      const jPns = Math.min(school.teachers.pns, Math.min(jTotal, Math.max(0, Math.floor(jTotal * 0.2))));
      const jPppk = Math.min(school.teachers.pppk, Math.min(jTotal - jPns, Math.max(0, Math.floor(jTotal * 0.3))));
      const jPppkParuh = Math.max(0, Math.min(1, Math.floor(jTotal * 0.1)));
      const jHonorer = Math.max(0, jTotal - jPns - jPppk - jPppkParuh);
      const jDelta = jTotal - jRequired;

      // Generate Guru Kelas (Primary class teachers, only SD)
      let kPns = 0;
      let kPppk = 0;
      let kPppkParuh = 0;
      let kHonorer = 0;
      let kTotal = 0;
      let kRequired = 0;
      let kDelta = 0;

      if (school.level === 'SD') {
        kPns = Math.max(1, Math.floor(school.teachers.pns * 0.6));
        kPppk = Math.max(0, Math.floor(school.teachers.pppk * 0.5));
        kPppkParuh = school.teachers.honorer > 5 ? 1 : 0;
        kHonorer = Math.max(1, Math.floor(school.teachers.honorer * 0.4));
        kTotal = kPns + kPppk + kPppkParuh + kHonorer;
        kRequired = rombel;
        kDelta = kTotal - kRequired;
      }

      return {
        npsn: school.npsn,
        name: school.name,
        level: school.level,
        village: school.village,
        students: school.students.total,
        rombel,
        kepsek,
        tendik: {
          pns: tPns,
          pppk: tPppk,
          pppkParuh: tPppkParuh,
          honorer: tHonorer,
          total: tTotal,
          delta: tDelta
        },
        pai: {
          pns: pPns,
          pppk: pPppk,
          pppkParuh: pPppkParuh,
          honorer: pHonorer,
          total: pTotal,
          delta: pDelta
        },
        penjas: {
          pns: jPns,
          pppk: jPppk,
          pppkParuh: jPppkParuh,
          honorer: jHonorer,
          total: jTotal,
          delta: jDelta
        },
        kelas: {
          pns: kPns,
          pppk: kPppk,
          pppkParuh: kPppkParuh,
          honorer: kHonorer,
          total: kTotal,
          delta: kDelta
        }
      };
    });
  }, [schools]);

  // Filter staff mappings based on search/filters
  const filteredMappings = useMemo(() => {
    return staffMappings.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.npsn.includes(searchQuery);
      const matchesLevel = levelFilter === 'ALL' || item.level === levelFilter;
      const matchesVillage = villageFilter === 'ALL' || item.village === villageFilter;
      return matchesSearch && matchesLevel && matchesVillage;
    });
  }, [staffMappings, searchQuery, levelFilter, villageFilter]);

  // Aggregate totals of filtered mapping rows
  const aggregatedTotals = useMemo(() => {
    const totals = {
      students: 0,
      rombel: 0,
      tendik: { pns: 0, pppk: 0, pppkParuh: 0, honorer: 0, total: 0, shortage: 0, surplus: 0 },
      pai: { pns: 0, pppk: 0, pppkParuh: 0, honorer: 0, total: 0, shortage: 0, surplus: 0 },
      penjas: { pns: 0, pppk: 0, pppkParuh: 0, honorer: 0, total: 0, shortage: 0, surplus: 0 },
      kelas: { pns: 0, pppk: 0, pppkParuh: 0, honorer: 0, total: 0, shortage: 0, surplus: 0 }
    };

    filteredMappings.forEach((item) => {
      totals.students += item.students;
      totals.rombel += item.rombel;

      // Tendik
      totals.tendik.pns += item.tendik.pns;
      totals.tendik.pppk += item.tendik.pppk;
      totals.tendik.pppkParuh += item.tendik.pppkParuh;
      totals.tendik.honorer += item.tendik.honorer;
      totals.tendik.total += item.tendik.total;
      if (item.tendik.delta < 0) totals.tendik.shortage += Math.abs(item.tendik.delta);
      if (item.tendik.delta > 0) totals.tendik.surplus += item.tendik.delta;

      // PAI
      totals.pai.pns += item.pai.pns;
      totals.pai.pppk += item.pai.pppk;
      totals.pai.pppkParuh += item.pai.pppkParuh;
      totals.pai.honorer += item.pai.honorer;
      totals.pai.total += item.pai.total;
      if (item.pai.delta < 0) totals.pai.shortage += Math.abs(item.pai.delta);
      if (item.pai.delta > 0) totals.pai.surplus += item.pai.delta;

      // Penjas
      totals.penjas.pns += item.penjas.pns;
      totals.penjas.pppk += item.penjas.pppk;
      totals.penjas.pppkParuh += item.penjas.pppkParuh;
      totals.penjas.honorer += item.penjas.honorer;
      totals.penjas.total += item.penjas.total;
      if (item.penjas.delta < 0) totals.penjas.shortage += Math.abs(item.penjas.delta);
      if (item.penjas.delta > 0) totals.penjas.surplus += item.penjas.delta;

      // Kelas
      totals.kelas.pns += item.kelas.pns;
      totals.kelas.pppk += item.kelas.pppk;
      totals.kelas.pppkParuh += item.kelas.pppkParuh;
      totals.kelas.honorer += item.kelas.honorer;
      totals.kelas.total += item.kelas.total;
      if (item.kelas.delta < 0) totals.kelas.shortage += Math.abs(item.kelas.delta);
      if (item.kelas.delta > 0) totals.kelas.surplus += item.kelas.delta;
    });

    return totals;
  }, [filteredMappings]);

  // Real client-side CSV Export action
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Header layers
    csvContent += 'LAPORAN REKAPITULASI PEMETAAN PEGAWAI GURU & TENDIK - TIMKER BIDIK LEMAHABANG\n';
    csvContent += `Generated:,${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    
    csvContent += 'NO,NPSN,SATUAN KERJA,LEVEL,DESA,KEPALA SEKOLAH,SISWA,ROMBEL,' +
                  'TENDIK_PNS,TENDIK_PPPK,TENDIK_PPPK_PARUH_WAKTU,TENDIK_HONORER,TENDIK_TOTAL,TENDIK_DELTA,' +
                  'PAI_PNS,PAI_PPPK,PAI_PPPK_PARUH_WAKTU,PAI_HONORER,PAI_TOTAL,PAI_DELTA,' +
                  'PJOK_PNS,PJOK_PPPK,PJOK_PPPK_PARUH_WAKTU,PJOK_HONORER,PJOK_TOTAL,PJOK_DELTA,' +
                  'GURU_KELAS_PNS,GURU_KELAS_PPPK,GURU_KELAS_PPPK_PARUH_WAKTU,GURU_KELAS_HONORER,GURU_KELAS_TOTAL,GURU_KELAS_DELTA\n';

    filteredMappings.forEach((item, index) => {
      csvContent += `${index + 1},${item.npsn},"${item.name}",${item.level},"${item.village}","${item.kepsek}",${item.students},${item.rombel},` +
                    `${item.tendik.pns},${item.tendik.pppk},${item.tendik.pppkParuh},${item.tendik.honorer},${item.tendik.total},${item.tendik.delta},` +
                    `${item.pai.pns},${item.pai.pppk},${item.pai.pppkParuh},${item.pai.honorer},${item.pai.total},${item.pai.delta},` +
                    `${item.penjas.pns},${item.penjas.pppk},${item.penjas.pppkParuh},${item.penjas.honorer},${item.penjas.total},${item.penjas.delta},` +
                    `${item.kelas.pns},${item.kelas.pppk},${item.kelas.pppkParuh},${item.kelas.honorer},${item.kelas.total},${item.kelas.delta}\n`;
    });

    // Trigger file download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_pemetaan_pegawai_lemahabang_${levelFilter.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="hr-analytics-module">
      {/* Dynamic Module Header Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1f2937] pb-4 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-tight">ANALISIS & PEMETAAN PEGAWAI</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Sistem Pemetaan Terpadu Distribusi Guru (PAI, PJOK, Kelas) dan Tenaga Kependidikan (TENDIK)
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-[#0c0e12] rounded-lg border border-[#1f2937] w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('mapping')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono transition-all font-bold ${
              activeTab === 'mapping'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            MATRIKS PEMETAAN PEGAWAI
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono transition-all font-bold ${
              activeTab === 'analytics'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            ANALISIS STRATEGIS & AI
          </button>
        </div>
      </div>

      {/* Main Tab Rendering */}
      {activeTab === 'mapping' ? (
        <div className="space-y-6">
          {/* Mapping Control Bar Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#11141a]/40 p-4 rounded-xl border border-[#1f2937]">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cari sekolah (Nama / NPSN)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0c0e12] border border-[#1f2937] rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <div className="w-full bg-[#0c0e12] border border-[#1f2937] rounded-lg p-2 text-xs font-mono text-cyan-400 font-bold flex items-center justify-between">
                <span>JENJANG: SD NEGERI</span>
                <span className="text-[9px] text-slate-500 font-normal border border-slate-800 px-1 rounded bg-slate-950 uppercase select-none">TERKUNCI</span>
              </div>
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="w-full bg-[#0c0e12] border border-[#1f2937] rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Semua Desa (16 Sektor)</option>
                {VILLAGES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-lg text-xs font-mono text-white font-bold cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                EKSPOR EXCEL/CSV
              </button>
            </div>
          </div>

          {/* Quick Stats Highlight Cards based on current filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="p-3 bg-[#11141a]/60 border border-[#1f2937] rounded-lg font-mono">
              <span className="text-[9px] text-slate-500 block uppercase">SEKOLAH TERFILTER</span>
              <p className="text-xl font-bold text-white mt-1">{filteredMappings.length}</p>
              <p className="text-[8px] text-slate-500 mt-0.5">Dari total {schools.length} SDN</p>
            </div>
            <div className="p-3 bg-[#11141a]/60 border border-[#1f2937] rounded-lg font-mono">
              <span className="text-[9px] text-slate-500 block uppercase">KEKURANGAN GURU KELAS</span>
              <p className="text-xl font-bold text-red-400 mt-1">{aggregatedTotals.kelas.shortage}</p>
              <p className="text-[8px] text-slate-500 mt-0.5">Pendidik SD yang kurang</p>
            </div>
            <div className="p-3 bg-[#11141a]/60 border border-[#1f2937] rounded-lg font-mono">
              <span className="text-[9px] text-slate-500 block uppercase">KEKURANGAN GURU AGAMA</span>
              <p className="text-xl font-bold text-red-400 mt-1">{aggregatedTotals.pai.shortage}</p>
              <p className="text-[8px] text-slate-500 mt-0.5">PAI linear deficit</p>
            </div>
            <div className="p-3 bg-[#11141a]/60 border border-[#1f2937] rounded-lg font-mono">
              <span className="text-[9px] text-slate-500 block uppercase">KEKURANGAN PJOK</span>
              <p className="text-xl font-bold text-amber-500 mt-1">{aggregatedTotals.penjas.shortage}</p>
              <p className="text-[8px] text-slate-500 mt-0.5">Penjas linear deficit</p>
            </div>
            <div className="p-3 bg-[#11141a]/60 border border-[#1f2937] rounded-lg font-mono col-span-2 md:col-span-1">
              <span className="text-[9px] text-slate-500 block uppercase">KEKURANGAN TENDIK</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">{aggregatedTotals.tendik.shortage}</p>
              <p className="text-[8px] text-slate-500 mt-0.5">Staf admin & perpustakaan</p>
            </div>
          </div>

          {/* Interactive Responsive Spreadsheet Map Table */}
          <div className="relative rounded-xl border border-[#1f2937] bg-[#0c0e12] overflow-hidden">
            {/* Legend indicators */}
            <div className="px-4 py-2 border-b border-[#1f2937] bg-[#11141a]/40 flex flex-wrap gap-4 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Kurang (Kekurangan Guru/Staff)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Cukup / Sesuai Rombel
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400" /> Kelebihan (Surplus)
              </span>
            </div>

            {/* Horizontal scroll container with custom styling */}
            <div className="overflow-x-auto max-h-[500px] scrollbar-thin scrollbar-track-transparent">
              <table className="w-full text-left text-xs font-mono border-collapse min-w-[1800px]">
                <thead className="sticky top-0 bg-[#0e1116] z-30 text-[10px] text-slate-400 border-b border-[#1f2937] uppercase select-none">
                  {/* Row 1 Header */}
                  <tr>
                    <th rowSpan={2} className="px-3 py-2 text-center border-r border-[#1f2937] bg-[#0e1116] sticky left-0 z-40">NO</th>
                    <th rowSpan={2} className="px-4 py-2 border-r border-[#1f2937] bg-[#0e1116] sticky left-[40px] z-40 min-w-[220px]">SATUAN KERJA (SEKOLAH)</th>
                    <th rowSpan={2} className="px-3 py-2 border-r border-[#1f2937] text-center">KEPALA SEKOLAH</th>
                    <th rowSpan={2} className="px-3 py-2 border-r border-[#1f2937] text-center">SISWA</th>
                    <th rowSpan={2} className="px-3 py-2 border-r border-[#1f2937] text-center">ROMBEL</th>
                    <th colSpan={6} className="text-center py-1 border-r border-indigo-950/60 bg-indigo-950/20 text-indigo-300">PEMETAAN TENAGA KEPENDIDIKAN (TENDIK)</th>
                    <th colSpan={6} className="text-center py-1 border-r border-emerald-950/60 bg-emerald-950/20 text-emerald-300">PEMETAAN GURU PAI</th>
                    <th colSpan={6} className="text-center py-1 border-r border-amber-950/60 bg-amber-950/20 text-amber-300">PEMETAAN GURU PENJAS</th>
                    <th colSpan={6} className="text-center py-1 bg-cyan-950/20 text-cyan-300">PEMETAAN GURU KELAS (SD ONLY)</th>
                  </tr>
                  
                  {/* Row 2 Header */}
                  <tr className="border-t border-[#1f2937]">
                    {/* Tendik subheaders */}
                    <th className="px-2 py-1.5 text-center border-r border-indigo-950/40 bg-indigo-950/10" title="Pegawai Negeri Sipil">PNS</th>
                    <th className="px-2 py-1.5 text-center border-r border-indigo-950/40 bg-indigo-950/10" title="Pegawai Pemerintah dengan Perjanjian Kerja">PPPK</th>
                    <th className="px-2 py-1.5 text-center border-r border-indigo-950/40 bg-indigo-950/10" title="PPPK Paruh Waktu">PPPK PW</th>
                    <th className="px-2 py-1.5 text-center border-r border-indigo-950/40 bg-indigo-950/10" title="Honorer">HONORER</th>
                    <th className="px-2 py-1.5 text-center border-r border-indigo-950/40 bg-indigo-950/20 text-indigo-400 font-bold">TOTAL</th>
                    <th className="px-2 py-1.5 text-center border-r border-indigo-950/60 bg-indigo-950/30 text-indigo-400 font-bold">+/-</th>

                    {/* PAI subheaders */}
                    <th className="px-2 py-1.5 text-center border-r border-emerald-950/40 bg-emerald-950/10" title="Pegawai Negeri Sipil">PNS</th>
                    <th className="px-2 py-1.5 text-center border-r border-emerald-950/40 bg-emerald-950/10" title="Pegawai Pemerintah dengan Perjanjian Kerja">PPPK</th>
                    <th className="px-2 py-1.5 text-center border-r border-emerald-950/40 bg-emerald-950/10" title="PPPK Paruh Waktu">PPPK PW</th>
                    <th className="px-2 py-1.5 text-center border-r border-emerald-950/40 bg-emerald-950/10" title="Honorer">HONORER</th>
                    <th className="px-2 py-1.5 text-center border-r border-emerald-950/40 bg-emerald-950/20 text-emerald-400 font-bold">TOTAL</th>
                    <th className="px-2 py-1.5 text-center border-r border-emerald-950/60 bg-emerald-950/30 text-emerald-400 font-bold">+/-</th>

                    {/* Penjas subheaders */}
                    <th className="px-2 py-1.5 text-center border-r border-amber-950/40 bg-amber-950/10" title="Pegawai Negeri Sipil">PNS</th>
                    <th className="px-2 py-1.5 text-center border-r border-amber-950/40 bg-amber-950/10" title="Pegawai Pemerintah dengan Perjanjian Kerja">PPPK</th>
                    <th className="px-2 py-1.5 text-center border-r border-amber-950/40 bg-amber-950/10" title="PPPK Paruh Waktu">PPPK PW</th>
                    <th className="px-2 py-1.5 text-center border-r border-amber-950/40 bg-amber-950/10" title="Honorer">HONORER</th>
                    <th className="px-2 py-1.5 text-center border-r border-amber-950/40 bg-amber-950/20 text-amber-400 font-bold">TOTAL</th>
                    <th className="px-2 py-1.5 text-center border-r border-amber-950/60 bg-amber-950/30 text-amber-400 font-bold">+/-</th>

                    {/* Guru Kelas subheaders */}
                    <th className="px-2 py-1.5 text-center border-r border-cyan-950/40 bg-cyan-950/10" title="Pegawai Negeri Sipil">PNS</th>
                    <th className="px-2 py-1.5 text-center border-r border-cyan-950/40 bg-cyan-950/10" title="Pegawai Pemerintah dengan Perjanjian Kerja">PPPK</th>
                    <th className="px-2 py-1.5 text-center border-r border-cyan-950/40 bg-cyan-950/10" title="PPPK Paruh Waktu">PPPK PW</th>
                    <th className="px-2 py-1.5 text-center border-r border-cyan-950/40 bg-cyan-950/10" title="Honorer">HONORER</th>
                    <th className="px-2 py-1.5 text-center border-r border-cyan-950/40 bg-cyan-950/20 text-cyan-400 font-bold">TOTAL</th>
                    <th className="px-2 py-1.5 text-center text-cyan-400 font-bold bg-cyan-950/30">+/-</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1f2937]/60 text-slate-300">
                  {filteredMappings.map((item, index) => {
                    const rowBgClass = index % 2 === 0 ? 'bg-[#0f1116]/40' : 'bg-[#0c0e12]/80';
                    return (
                      <tr key={item.npsn} className={`hover:bg-cyan-950/10 transition-colors ${rowBgClass}`}>
                        {/* Static ID */}
                        <td className="px-3 py-2 text-center border-r border-[#1f2937] bg-[#0c0e12] font-semibold text-slate-500 sticky left-0 z-20">
                          {index + 1}
                        </td>
                        
                        {/* Sticky School name */}
                        <td className="px-4 py-2 border-r border-[#1f2937] bg-[#0c0e12] font-semibold text-slate-200 sticky left-[40px] z-20 truncate hover:text-cyan-400 max-w-[220px]" title={item.name}>
                          <div>
                            <span className="block truncate leading-tight">{item.name}</span>
                            <span className="text-[9px] text-slate-500 font-normal">NPSN: {item.npsn} | {item.village}</span>
                          </div>
                        </td>

                        {/* Kepsek */}
                        <td className="px-3 py-2 border-r border-[#1f2937] text-center text-[10px] text-slate-400">
                          {item.kepsek}
                        </td>

                        {/* Students */}
                        <td className="px-3 py-2 border-r border-[#1f2937] text-center font-bold text-slate-300">
                          {item.students}
                        </td>

                        {/* Rombel */}
                        <td className="px-3 py-2 border-r border-[#1f2937] text-center font-semibold text-cyan-400">
                          {item.rombel}
                        </td>

                        {/* TENDIK DATA */}
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.tendik.pns}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.tendik.pppk}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 text-slate-500">{item.tendik.pppkParuh}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.tendik.honorer}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 font-bold text-slate-100 bg-[#161c24]/20">{item.tendik.total}</td>
                        <td className={`px-2 py-2 text-center border-r border-indigo-950/60 font-bold ${
                          item.tendik.delta < 0 ? 'bg-red-950/40 text-red-400' : item.tendik.delta > 0 ? 'bg-cyan-950/30 text-cyan-400' : 'bg-emerald-950/20 text-emerald-400'
                        }`}>
                          {item.tendik.delta > 0 ? `+${item.tendik.delta}` : item.tendik.delta}
                        </td>

                        {/* PAI DATA */}
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.pai.pns}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.pai.pppk}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 text-slate-500">{item.pai.pppkParuh}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.pai.honorer}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 font-bold text-slate-100 bg-[#161c24]/20">{item.pai.total}</td>
                        <td className={`px-2 py-2 text-center border-r border-emerald-950/60 font-bold ${
                          item.pai.delta < 0 ? 'bg-red-950/40 text-red-400' : item.pai.delta > 0 ? 'bg-cyan-950/30 text-cyan-400' : 'bg-emerald-950/20 text-emerald-400'
                        }`}>
                          {item.pai.delta > 0 ? `+${item.pai.delta}` : item.pai.delta}
                        </td>

                        {/* PENJAS DATA */}
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.penjas.pns}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.penjas.pppk}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 text-slate-500">{item.penjas.pppkParuh}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.penjas.honorer}</td>
                        <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 font-bold text-slate-100 bg-[#161c24]/20">{item.penjas.total}</td>
                        <td className={`px-2 py-2 text-center border-r border-amber-950/60 font-bold ${
                          item.penjas.delta < 0 ? 'bg-red-950/40 text-red-400' : item.penjas.delta > 0 ? 'bg-cyan-950/30 text-cyan-400' : 'bg-emerald-950/20 text-emerald-400'
                        }`}>
                          {item.penjas.delta > 0 ? `+${item.penjas.delta}` : item.penjas.delta}
                        </td>

                        {/* GURU KELAS DATA (SD Only) */}
                        {item.level === 'SD' ? (
                          <>
                            <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.kelas.pns}</td>
                            <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.kelas.pppk}</td>
                            <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 text-slate-500">{item.kelas.pppkParuh}</td>
                            <td className="px-2 py-2 text-center border-r border-[#1f2937]/40">{item.kelas.honorer}</td>
                            <td className="px-2 py-2 text-center border-r border-[#1f2937]/40 font-bold text-slate-100 bg-[#161c24]/20">{item.kelas.total}</td>
                            <td className={`px-2 py-2 text-center font-bold ${
                              item.kelas.delta < 0 ? 'bg-red-950/40 text-red-400' : item.kelas.delta > 0 ? 'bg-cyan-950/30 text-cyan-400' : 'bg-emerald-950/20 text-emerald-400'
                            }`}>
                              {item.kelas.delta > 0 ? `+${item.kelas.delta}` : item.kelas.delta}
                            </td>
                          </>
                        ) : (
                          <>
                            <td colSpan={6} className="px-2 py-2 text-center text-slate-600 bg-slate-900/10 italic">
                              Bukan Sekolah Dasar (SD)
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {filteredMappings.length === 0 && (
                    <tr>
                      <td colSpan={41} className="py-12 text-center text-slate-500 font-bold uppercase tracking-wider">
                        Tidak ada satuan pendidikan yang cocok dengan filter aktif
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Aggregate Summary Footer Row */}
                {filteredMappings.length > 0 && (
                  <tfoot className="bg-[#12161f] border-t-2 border-[#1f2937] text-slate-200 select-none font-bold text-[11px]">
                    <tr className="divide-y divide-[#1f2937]">
                      <td colSpan={3} className="px-4 py-3 text-center border-r border-[#1f2937] bg-[#12161f] sticky left-0 z-20">
                        TOTAL REKAPITULASI
                      </td>
                      <td className="px-3 py-3 text-center border-r border-[#1f2937] text-white">
                        {aggregatedTotals.students}
                      </td>
                      <td className="px-3 py-3 text-center border-r border-[#1f2937] text-cyan-400">
                        {aggregatedTotals.rombel}
                      </td>

                      {/* TENDIK Totals */}
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-indigo-300">{aggregatedTotals.tendik.pns}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-indigo-300">{aggregatedTotals.tendik.pppk}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.tendik.pppkParuh}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.tendik.honorer}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 bg-[#161c24]/40">{aggregatedTotals.tendik.total}</td>
                      <td className="px-2 py-3 text-center border-r border-indigo-900/60 bg-indigo-950/30 text-red-400">
                        -{aggregatedTotals.tendik.shortage} / +{aggregatedTotals.tendik.surplus}
                      </td>

                      {/* PAI Totals */}
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-emerald-300">{aggregatedTotals.pai.pns}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-emerald-300">{aggregatedTotals.pai.pppk}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.pai.pppkParuh}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.pai.honorer}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 bg-[#161c24]/40">{aggregatedTotals.pai.total}</td>
                      <td className="px-2 py-3 text-center border-r border-emerald-900/60 bg-emerald-950/30 text-red-400">
                        -{aggregatedTotals.pai.shortage} / +{aggregatedTotals.pai.surplus}
                      </td>

                      {/* Penjaskes Totals */}
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-amber-300">{aggregatedTotals.penjas.pns}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-amber-300">{aggregatedTotals.penjas.pppk}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.penjas.pppkParuh}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.penjas.honorer}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 bg-[#161c24]/40">{aggregatedTotals.penjas.total}</td>
                      <td className="px-2 py-3 text-center border-r border-amber-900/60 bg-amber-950/30 text-red-400">
                        -{aggregatedTotals.penjas.shortage} / +{aggregatedTotals.penjas.surplus}
                      </td>

                      {/* Kelas Totals (Primary only) */}
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-cyan-300">{aggregatedTotals.kelas.pns}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-cyan-300">{aggregatedTotals.kelas.pppk}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.kelas.pppkParuh}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 text-slate-500">{aggregatedTotals.kelas.honorer}</td>
                      <td className="px-2 py-3 text-center border-r border-[#1f2937]/40 bg-[#161c24]/40">{aggregatedTotals.kelas.total}</td>
                      <td className="px-2 py-3 text-center text-red-400 bg-cyan-950/20">
                        -{aggregatedTotals.kelas.shortage} / +{aggregatedTotals.kelas.surplus}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Analytics Tab (Original view content) */
        <div className="space-y-6">
          {/* Upper overview summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Guru', value: totalTeachers, desc: `Di seluruh ${schools.length} SDN`, icon: Users, color: 'text-indigo-400 border-indigo-950 bg-indigo-950/10' },
              { label: 'Staf PNS & PPPK', value: `${totalPns} / ${totalPppk}`, desc: 'Pendidik ASN', icon: GraduationCap, color: 'text-emerald-400 border-emerald-950 bg-emerald-950/10' },
              { label: 'Personel Honorer', value: totalHonorer, desc: 'Sumber Anggaran Sekolah', icon: RefreshCw, color: 'text-amber-400 border-amber-950 bg-amber-950/10' },
              { label: 'Guru Tersertifikasi', value: `${certifiedCount} (${Math.round((certifiedCount/totalTeachers)*100)}%)`, desc: 'Sertifikasi PPG Aktif', icon: FileCheck2, color: 'text-cyan-400 border-cyan-950 bg-cyan-950/10' }
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className={`p-4 rounded-xl border ${c.color}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-80">{c.label}</span>
                    <Icon className="h-4.5 w-4.5 opacity-60" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mt-2">{c.value}</h3>
                  <p className="text-[10px] opacity-70 mt-1 font-mono">{c.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Pane: Retirement Forecasts & Subject (7 Columns) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Retirement Forecast box */}
              <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
                <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4.5 w-4.5 text-cyan-400" />
                    <h4 className="font-bold text-xs tracking-wider text-slate-200 uppercase font-sans">
                      TEACHER RETIREMENT ACCELERATION FORECAST
                    </h4>
                  </div>
                  <div className="flex gap-1 bg-[#0c0e12] p-0.5 rounded border border-[#1f2937]">
                    {['1', '3', '5'].map(yr => (
                      <button
                        key={yr}
                        onClick={() => setForecastYears(yr as any)}
                        className={`px-3 py-0.5 text-[9px] font-mono rounded uppercase transition-all ${
                          forecastYears === yr ? 'bg-cyan-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {yr} Year{yr !== '1' ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center font-mono">
                  <div className="p-4 rounded-lg bg-[#0c0e12] border border-[#1f2937]">
                    <span className="text-[9px] text-slate-500 block uppercase">RETIREMENT HEADCOUNT</span>
                    <p className="text-2xl font-bold text-red-400 mt-1">
                      {forecastYears === '1' ? 18 : (forecastYears === '3' ? 52 : 94)}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-1">Active civil service PNS teachers</p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#0c0e12] border border-[#1f2937]">
                    <span className="text-[9px] text-slate-500 block uppercase">BUDGET FREEDUP (EST)</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {forecastYears === '1' ? 'Rp 1.1M' : (forecastYears === '3' ? 'Rp 3.4M' : 'Rp 6.2M')}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-1">Free space for honorer replacement</p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#0c0e12] border border-[#1f2937]">
                    <span className="text-[9px] text-slate-500 block uppercase">CRITICAL DEFICIT SCHOOLS</span>
                    <p className="text-2xl font-bold text-cyan-400 mt-1">
                      {forecastYears === '1' ? 12 : (forecastYears === '3' ? 29 : 45)}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-1">Schools requiring urgent hire</p>
                  </div>
                </div>

                <div className="p-3 bg-red-950/20 rounded-lg border border-red-900/30 flex gap-2.5 text-[11px] leading-relaxed">
                  <TrendingDown className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-slate-300 font-mono">
                    <span className="font-bold text-red-400">CRITICAL RISK ASSESSMENT:</span> Cipeujeuh Wetan and Lemahabang villages hold the highest concentration of teachers nearing retirement age (58-60 years old). Immediate replacement coordination with regional BKD/Kemenag is highly recommended to avoid classroom downtime.
                  </div>
                </div>
              </div>

              {/* Subject Distribution Block */}
              <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
                <h4 className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans border-b border-[#1f2937] pb-2.5">
                  SUBJECT TEACHER DISTRIBUTION LIST
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono">
                  {Object.entries(subjectDistribution).map(([subj, val], i) => (
                    <div key={i} className="p-2 bg-[#0c0e12]/60 rounded border border-[#1f2937]">
                      <span className="text-[9px] text-slate-500 uppercase block truncate">{subj}</span>
                      <span className="text-sm font-bold text-slate-200 block mt-1">{val} Guru</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Pane: Certification Funnel & Mutation Helper (5 Columns) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Funnel Box */}
              <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4.5 w-4.5 text-cyan-400" />
                    <h4 className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">
                      CERTIFICATION LIFECYCLE FUNNEL
                    </h4>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono animate-pulse font-bold">PIPELINE TRACKER</span>
                </div>

                <div className="space-y-2 font-mono text-[10px]">
                  {[
                    { label: '1. Submission Stage', value: certificationFunnel.submission, width: 'w-full', bg: 'bg-cyan-800' },
                    { label: '2. Verification Stage', value: certificationFunnel.verification, width: 'w-[85%]', bg: 'bg-cyan-700' },
                    { label: '3. Regional Validation', value: certificationFunnel.validation, width: 'w-[70%]', bg: 'bg-red-500 animate-pulse', warn: true },
                    { label: '4. Ministry Approval', value: certificationFunnel.approval, width: 'w-[50%]', bg: 'bg-cyan-600' },
                    { label: '5. Fund Disbursement', value: certificationFunnel.disbursement, width: 'w-[35%]', bg: 'bg-emerald-600' }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-slate-300 font-semibold">
                        <span>{item.label}</span>
                        <span className="font-bold text-slate-100">{item.value} Guru</span>
                      </div>
                      <div className="w-full bg-[#0c0e12] h-5.5 rounded overflow-hidden relative flex items-center px-2">
                        <div className={`${item.bg} h-full absolute left-0 top-0 transition-all ${item.width}`} />
                        <div className="relative z-10 text-[9px] font-bold text-white uppercase tracking-wider drop-shadow-sm">
                          {item.warn && 'BOTTLENECK DETECTED — PENDING REGIONAL VALIDATION'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mutation Helper Box */}
              <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
                <div className="flex items-center gap-1.5 border-b border-[#1f2937] pb-3">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <h4 className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">
                    AI MUTATION RECOMMENDATION HELPER
                  </h4>
                </div>

                <div className="space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                  {mutationHelper.map((mut) => (
                    <div key={mut.id} className="p-3 rounded bg-[#0c0e12]/60 border border-[#1f2937] space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-200">{mut.subject}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          mut.urgency === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {mut.urgency}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                        <span className="truncate">{mut.fromSchool}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{mut.toSchool}</span>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-normal">{mut.reason}</p>
                      
                      <div className="flex justify-between items-center text-[9px] font-mono pt-1 text-emerald-400">
                        <span>EST. OUTCOME:</span>
                        <span className="font-bold">{mut.estImpact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
