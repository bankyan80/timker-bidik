import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';
import {
  X, Printer, Download, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCw, Maximize, Minimize,
  FileText, GraduationCap, Users, Building2,
  ArrowUpRight, ArrowDownRight, AlertTriangle,
  CheckCircle, BookOpen, BarChart3, PieChart,
  TrendingUp, FileSpreadsheet
} from 'lucide-react';
import { ALL_SCHOOLS } from '../data/mockData';

interface MutationRow {
  id: string; siswa_nisn: string; siswa_nama: string;
  school_npsn: string; jenis: string; tanggal: string;
  alasan: string | null; kelas_kelompok: string | null; rombel: string | null;
}

interface EmployeeRow {
  id: string; nama: string; jabatan: string | null;
  status_pegawai: string | null; nip: string | null;
  nik: string; sertifikasi: string | null;
}

interface ReportSchool {
  npsn: string; name: string; level: string; status: string; village: string;
  students: { total: number; male: number; female: number;
    byClass: { kelas: string; total: number; male: number; female: number; rombel: string | null }[]; };
  employees: { total: number; pns: number; pppk: number; honorer: number; guru: number; tendik: number; certified: number; };
  infrastructure: { healthScore: number;
    classrooms: { good: number; lightDamage: number; heavyDamage: number; };
    toilets: { good: number; damaged: number; };
    hasLibrary: boolean; hasLab: boolean; internetSpeedMbps: number;
    alerts: { severity: string; message: string; category: string }[]; };
  mutations: { masuk: number; keluar: number };
}

const TOTAL_PAGES = 10;
const PAGE_WIDTH_MM = 215;
const PAGE_HEIGHT_MM = 330;
const BASE_PX = 96 / 25.4;

function mmToPx(mm: number): number { return mm * BASE_PX; }

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── SVG Charts ──

function BarChart({ data, max, color, height = 120 }: {
  data: { label: string; value: number }[]; max: number; color: string; height?: number;
}) {
  const w = 400; const pad = 30; const bw = (w - pad * 2) / data.length - 4;
  return (
    <svg viewBox={`0 0 ${w} ${height + 30}`} className="w-full h-auto">
      {data.map((d, i) => {
        const barH = (d.value / max) * height;
        const x = pad + i * ((w - pad * 2) / data.length) + 2;
        return (
          <g key={i}>
            <rect x={x} y={height - barH} width={bw} height={barH} fill={color} rx={2} />
            <text x={x + bw / 2} y={height + 12} textAnchor="middle" fontSize="11" fill="#444">{d.label}</text>
            <text x={x + bw / 2} y={height - barH - 4} textAnchor="middle" fontSize="10" fill="#666">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-center text-gray-400">Tidak ada data</div>;
  let offset = 0;
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[180px] mx-auto">
      {data.map((d, i) => {
        const pct = d.value / total;
        const len = pct * circ;
        const dash = `${len} ${circ - len}`;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={d.color} strokeWidth="18" strokeDasharray={dash}
            strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
        offset += len;
        return el;
      })}
      <text x={size / 2} y={size / 2 + 3} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#333">{total}</text>
    </svg>
  );
}

function DonutChart({ data, size = 180 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-center text-gray-400">Tidak ada data</div>;
  let offset = 0;
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[150px] mx-auto">
      {data.map((d, i) => {
        const pct = d.value / total;
        const len = pct * circ;
        const dash = `${len} ${circ - len}`;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={d.color} strokeWidth="14" strokeDasharray={dash}
            strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2}`} />
        );
        offset += len;
        return el;
      })}
      <text x={size / 2} y={size / 2 + 2} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#333">{total}</text>
    </svg>
  );
}

function TrendChart({ data, height = 100 }: { data: { label: string; value: number }[]; height?: number }) {
  if (data.length < 2) return null;
  const w = 320; const pad = 25;
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const xStep = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = pad + i * xStep;
    const y = pad + (1 - (d.value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height + 20}`} className="w-full h-auto">
      <polyline points={pts} fill="none" stroke="#0891b2" strokeWidth="2" />
      {data.map((d, i) => {
        const x = pad + i * xStep;
        return (
          <g key={i}>
            <circle cx={x} cy={pad + (1 - (d.value - min) / range) * (height - pad * 2)} r="3" fill="#0891b2" />
            {i % 2 === 0 && <text x={x} y={height + 10} textAnchor="middle" fontSize="10" fill="#666">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Page Components ──

function FunctionBar({ label }: { label: string }) {
  return <div className="text-xs font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded mb-3">{label}</div>;
}

function PageCover({ school, period, employeeList }: { school: ReportSchool; period: string; employeeList: EmployeeRow[] }) {
  const month = period;
  const totalClass = school.infrastructure.classrooms.good + school.infrastructure.classrooms.lightDamage + school.infrastructure.classrooms.heavyDamage;
  const summary = [
    { label: 'Total Siswa', value: school.students.total, color: '#0891b2' },
    { label: 'Total Pegawai', value: employeeList.length, color: '#059669' },
    { label: 'Total Aset', value: totalClass, color: '#7c3aed' },
    { label: 'Siswa Masuk', value: school.mutations.masuk, color: '#16a34a' },
    { label: 'Siswa Keluar', value: school.mutations.keluar, color: '#dc2626' },
  ];
  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      {/* Kop Surat */}
      <div className="flex items-start gap-5 border-b-2 border-black pb-4 mb-7">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-3xl shrink-0 border-2 border-gray-200">
          <span className="text-gray-300">L</span>
        </div>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-800">Pemerintah Kabupaten Cirebon</p>
          <p className="text-xs text-gray-600">Dinas Pendidikan</p>
          <p className="text-base font-bold mt-1.5 text-gray-900">{school.name}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Desa {school.village}, Kec. Lemahabang, Kab. Cirebon — Jawa Barat
          </p>
          <p className="text-[11px] text-gray-400">NPSN: {school.npsn}</p>
        </div>
      </div>

      {/* Judul */}
      <div className="text-center mb-9">
        <div className="inline-block border-b-2 border-gray-800 pb-2 px-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-gray-900">Laporan Bulanan Sekolah</h1>
        </div>
        <p className="text-xs mt-3 text-gray-600">Bulan: <strong>{month}</strong> — Tahun Pelajaran: <strong>2025/2026</strong></p>
      </div>

      {/* Identitas Sekolah */}
      <div className="grid grid-cols-2 gap-6 mb-7">
        <div className="border border-gray-300 p-4 rounded">
          <FunctionBar label="IDENTITAS SEKOLAH" />
          <table className="w-full text-[11px]">
            <tbody>
              {[
                ['Nama Sekolah', school.name],
                ['NPSN', school.npsn],
                ['Jenjang', school.level],
                ['Status', school.status],
                ['Desa', school.village],
                ['Kecamatan', 'Lemahabang'],
                ['Kabupaten', 'Cirebon'],
                ['Provinsi', 'Jawa Barat'],
              ].map(([label, value], i) => (
                <tr key={i} className={i < 7 ? 'border-b border-gray-100' : ''}>
                  <td className="py-1.5 text-gray-500 w-28">{label}</td>
                  <td className="py-1.5 font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-gray-300 p-4 rounded flex items-center justify-center bg-gray-50">
          <div className="text-center">
              <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center mb-2 border border-dashed border-gray-300">
              <span className="text-gray-300 text-5xl">📷</span>
            </div>
            <p className="text-[11px] text-gray-400">Foto Gedung Sekolah</p>
          </div>
        </div>
      </div>

      {/* Ringkasan Eksekutif */}
      <div>
        <FunctionBar label="RINGKASAN EKSEKUTIF" />
        <div className="grid grid-cols-5 gap-3">
          {summary.map((s, i) => (
            <div key={i} className="border border-gray-200 rounded p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{typeof s.value === 'number' ? s.value.toLocaleString('id-ID') : s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="text-[10px] text-gray-400 text-center mt-8 pt-3">
        <span className="border-t border-gray-200 pt-2 inline-block px-8">Dokumen Resmi — Dicetak: {formatDate(new Date().toISOString())}</span>
      </div>
    </div>
  );
}

function BABTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-6 w-1 bg-gray-800 rounded" />
      <h2 className="text-base font-bold uppercase text-gray-900">{label}</h2>
      <div className="flex-1 border-b border-gray-300" />
    </div>
  );
}

function ReportTable({ headers, children, footer }: { headers: string[]; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <table className="w-full text-[11px] border-collapse mb-4">
      <thead>
        <tr className="bg-gray-800 text-white">
          {headers.map((h, i) => (
            <th key={i} className="border border-gray-600 p-2.5 text-left font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white">{children}</tbody>
      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );
}

function InfoCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-gray-200 rounded p-4 bg-gray-50 ${className}`}>{children}</div>;
}

function PageStudents({ school }: { school: ReportSchool }) {
  const max = Math.max(...school.students.byClass.map(c => c.total), 1);
  const barData = school.students.byClass.map(c => ({ label: c.kelas, value: c.total }));
  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab I — Data Siswa per Kelas" />

      <ReportTable headers={['No', 'Kelas', 'L', 'P', 'Total', 'Mutasi Masuk', 'Mutasi Keluar']}
        footer={
          <tr className="bg-gray-100 font-bold text-xs">
            <td colSpan={2} className="border border-gray-300 p-2.5 text-gray-900 text-right">Total</td>
            <td className="border border-gray-300 p-2.5 text-gray-900 text-right">{school.students.male}</td>
            <td className="border border-gray-300 p-2.5 text-gray-900 text-right">{school.students.female}</td>
            <td className="border border-gray-300 p-2.5 text-gray-900 text-right">{school.students.total}</td>
            <td className="border border-gray-300 p-2.5 text-gray-900 text-right text-green-700">{school.mutations.masuk}</td>
            <td className="border border-gray-300 p-2.5 text-gray-900 text-right text-red-700">{school.mutations.keluar}</td>
          </tr>
        }>
        {school.students.byClass.map((c, i) => (
          <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-center w-8">{i + 1}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{c.kelas}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right">{c.male}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right">{c.female}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right font-semibold">{c.total}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right text-green-600">-</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right text-red-600">-</td>
          </tr>
        ))}
      </ReportTable>

      <div className="mt-5">
        <FunctionBar label="GRAFIK JUMLAH SISWA PER KELAS" />
        <BarChart data={barData} max={max} color="#0891b2" />
      </div>
    </div>
  );
}

function PageEmployees({ employeeList }: { employeeList: EmployeeRow[] }) {
  const pns = employeeList.filter(e => e.status_pegawai?.toLowerCase() === 'pns').length;
  const pppk = employeeList.filter(e => e.status_pegawai?.toLowerCase().includes('pppk')).length;
  const honorer = employeeList.filter(e => {
    const s = (e.status_pegawai || '').toLowerCase();
    return s !== 'pns' && !s.includes('pppk') && s !== '';
  }).length;
  const guru = employeeList.filter(e => (e.jabatan || '').toLowerCase().includes('guru')).length;
  const tendik = employeeList.length - guru;
  const certified = employeeList.filter(e => e.sertifikasi && e.sertifikasi !== '').length;

  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab II — Data Pegawai" />

      <ReportTable headers={['No', 'Nama', 'Jabatan', 'Status', 'Kehadiran']}>
        {employeeList.slice(0, 30).map((e, i) => (
          <tr key={e.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-center w-8">{i + 1}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{e.nama}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{e.jabatan || '-'}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{e.status_pegawai || '-'}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right">-</td>
          </tr>
        ))}
        {employeeList.length > 30 && (
          <tr>
            <td colSpan={5} className="border border-gray-200 p-2.5 text-center text-gray-400">... dan {employeeList.length - 30} pegawai lainnya</td>
          </tr>
        )}
      </ReportTable>

      <FunctionBar label="RINGKASAN PEGAWAI" />
      <div className="grid grid-cols-7 gap-2 mb-2">
        {[
          { label: 'Total Aktif', value: employeeList.length, color: 'bg-gray-800 text-white' },
          { label: 'PNS', value: pns, color: 'bg-blue-50 text-blue-800 border-blue-200' },
          { label: 'PPPK', value: pppk, color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
          { label: 'Honorer', value: honorer, color: 'bg-gray-50 text-gray-800 border-gray-200' },
          { label: 'Guru', value: guru, color: 'bg-white text-gray-800' },
          { label: 'Tendik', value: tendik, color: 'bg-white text-gray-800' },
          { label: 'Sertifikasi', value: certified, color: 'bg-purple-50 text-purple-800 border-purple-200' },
        ].map((item, i) => (
          <div key={i} className={`border rounded p-2 text-center ${item.color}`}>
              <div className="text-base font-bold">{item.value}</div>
              <div className="text-xs mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageInfrastructure({ school }: { school: ReportSchool }) {
  const total = school.infrastructure.classrooms.good + school.infrastructure.classrooms.lightDamage + school.infrastructure.classrooms.heavyDamage;
  const infraItems = [
    { name: 'Ruang Kelas', total, baik: school.infrastructure.classrooms.good, ringan: school.infrastructure.classrooms.lightDamage, berat: school.infrastructure.classrooms.heavyDamage },
    { name: 'Toilet', total: school.infrastructure.toilets.good + school.infrastructure.toilets.damaged, baik: school.infrastructure.toilets.good, ringan: 0, berat: school.infrastructure.toilets.damaged },
    { name: 'Perpustakaan', total: school.infrastructure.hasLibrary ? 1 : 0, baik: school.infrastructure.hasLibrary ? 1 : 0, ringan: 0, berat: 0 },
    { name: 'Laboratorium', total: school.infrastructure.hasLab ? 1 : 0, baik: school.infrastructure.hasLab ? 1 : 0, ringan: 0, berat: 0 },
  ];
  const donutData = [
    { label: 'Baik', value: school.infrastructure.classrooms.good, color: '#16a34a' },
    { label: 'Rusak Ringan', value: school.infrastructure.classrooms.lightDamage, color: '#ca8a04' },
    { label: 'Rusak Berat', value: school.infrastructure.classrooms.heavyDamage, color: '#dc2626' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab III — Infrastruktur / Sarana Prasarana" />

      <ReportTable headers={['No', 'Jenis Sarana', 'Jumlah', 'Baik', 'Rusak Ringan', 'Rusak Berat']}>
        {infraItems.map((item, i) => (
          <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-center w-8">{i + 1}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{item.name}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right">{item.total}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right text-green-700">{item.baik}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right text-yellow-700">{item.ringan}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-right text-red-700">{item.berat}</td>
          </tr>
        ))}
      </ReportTable>

      <div className="grid grid-cols-2 gap-5 mt-4">
        <div className="border border-gray-200 rounded p-4">
          <FunctionBar label="KONDISI RUANG KELAS" />
          <DonutChart data={donutData} />
        </div>
        <div className="border border-gray-200 rounded p-4">
          <FunctionBar label="DETAIL INFRASTRUKTUR" />
          <table className="w-full text-[11px]">
            <tbody>
              {[
                ['Health Score', `${school.infrastructure.healthScore}/100`],
                ['Internet', `${school.infrastructure.internetSpeedMbps} Mbps`],
                ['Toilet Baik', String(school.infrastructure.toilets.good)],
                ['Toilet Rusak', String(school.infrastructure.toilets.damaged)],
                ['Perpustakaan', school.infrastructure.hasLibrary ? 'Ada' : 'Tidak Ada'],
                ['Laboratorium', school.infrastructure.hasLab ? 'Ada' : 'Tidak Ada'],
              ].map(([l, v], i) => (
                <tr key={i} className={i < 5 ? 'border-b border-gray-100' : ''}>
                  <td className="py-1.5 text-gray-500 w-28">{l}</td>
                  <td className="py-1.5 font-medium">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {school.infrastructure.alerts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-[10px] font-bold text-red-600 mb-1">⚠ PERINGATAN:</p>
              {school.infrastructure.alerts.map((a, i) => (
                <p key={i} className="text-[10px] text-red-500">- {a.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageMutationsMasuk({ mutations, period }: { mutations: MutationRow[]; period: string }) {
  const masuk = mutations.filter(m => m.jenis === 'MASUK');
  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab IV — Siswa Masuk" />
      <p className="text-[11px] text-gray-500 mb-4">Periode: {period}</p>

      <ReportTable headers={['No', 'Nama', 'NISN', 'Kelas Tujuan', 'Asal Sekolah', 'Tanggal']}>
        {masuk.length === 0 ? (
          <tr><td colSpan={6} className="border border-gray-200 p-4 text-center text-gray-400">-</td></tr>
        ) : masuk.map((m, i) => (
          <tr key={m.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-center w-8">{i + 1}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.siswa_nama}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.siswa_nisn}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.kelas_kelompok || '-'}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.alasan || '-'}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.tanggal ? formatDate(m.tanggal) : '-'}</td>
          </tr>
        ))}
      </ReportTable>

      <InfoCard className="bg-green-50 border-green-200">
        <p className="text-xs text-green-800"><strong>Ringkasan:</strong> Total <strong>{masuk.length}</strong> siswa masuk pada periode {period}.</p>
      </InfoCard>
    </div>
  );
}

function PageMutationsKeluar({ mutations, period }: { mutations: MutationRow[]; period: string }) {
  const keluar = mutations.filter(m => m.jenis === 'KELUAR');
  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab V — Siswa Keluar" />
      <p className="text-[11px] text-gray-500 mb-4">Periode: {period}</p>

      <ReportTable headers={['No', 'Nama', 'NISN', 'Kelas', 'Sekolah Tujuan', 'Tanggal']}>
        {keluar.length === 0 ? (
          <tr><td colSpan={6} className="border border-gray-200 p-4 text-center text-gray-400">-</td></tr>
        ) : keluar.map((m, i) => (
          <tr key={m.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
            <td className="border border-gray-200 p-2.5 text-gray-900 text-center w-8">{i + 1}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.siswa_nama}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.siswa_nisn}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.kelas_kelompok || '-'}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.alasan || '-'}</td>
            <td className="border border-gray-200 p-2.5 text-gray-900">{m.tanggal ? formatDate(m.tanggal) : '-'}</td>
          </tr>
        ))}
      </ReportTable>

      <InfoCard className="bg-red-50 border-red-200">
        <p className="text-xs text-red-800"><strong>Ringkasan:</strong> Total <strong>{keluar.length}</strong> siswa keluar pada periode {period}.</p>
      </InfoCard>
    </div>
  );
}

function PageAnalisis({ school, employeeList }: { school: ReportSchool; employeeList: EmployeeRow[] }) {
  const maxClass = [...school.students.byClass].sort((a, b) => b.total - a.total)[0];
  const rasio = employeeList.length > 0 ? (school.students.total / employeeList.length).toFixed(1) : '0';

  const insights: { type: string; text: string }[] = [];
  if (maxClass) insights.push({ type: 'success', text: `Kelas dengan siswa terbanyak: ${maxClass.kelas} (${maxClass.total} siswa)` });
  if (school.mutations.masuk > school.mutations.keluar) insights.push({ type: 'success', text: `Mutasi positif: ${school.mutations.masuk} masuk vs ${school.mutations.keluar} keluar` });
  else if (school.mutations.keluar > 0) insights.push({ type: 'warning', text: `Perlu perhatian: ${school.mutations.keluar} siswa keluar bulan ini` });
  if (school.infrastructure.classrooms.heavyDamage > 0) insights.push({ type: 'danger', text: `${school.infrastructure.classrooms.heavyDamage} ruang kelas rusak berat perlu rehabilitasi segera` });
  if (school.infrastructure.healthScore < 50) insights.push({ type: 'danger', text: `Health Score ${school.infrastructure.healthScore}/100 — kondisi sekolah memprihatinkan` });
  if (school.infrastructure.healthScore >= 80) insights.push({ type: 'success', text: `Health Score ${school.infrastructure.healthScore}/100 — kondisi sekolah sangat baik` });
  if (employeeList.length === 0) insights.push({ type: 'warning', text: 'Tidak ada data pegawai untuk sekolah ini' });

  const trendData = school.students.byClass.map(c => ({ label: c.kelas, value: c.total }));

  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab VI — Analisis Bulanan" />

      <FunctionBar label="INISIGHT & REKOMENDASI" />
      <div className="space-y-2 mb-5">
        {insights.map((ins, i) => (
          <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded text-[11px] border ${
            ins.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
            ins.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-green-50 border-green-200 text-green-800'
          }`}>
            <span className="text-xs mt-0.5 shrink-0">
              {ins.type === 'danger' ? '🔴' : ins.type === 'warning' ? '🟡' : '🟢'}
            </span>
            <span className="leading-snug">{ins.text}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <InfoCard>
          <FunctionBar label="RASIO PEGAWAI : SISWA" />
          <p className="text-lg font-bold text-gray-800">{rasio} : 1</p>
          <p className="text-xs text-gray-500 mt-0.5">1 pegawai melayani {rasio} siswa</p>
        </InfoCard>
        <InfoCard>
          <FunctionBar label="DISTRIBUSI SISWA" />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Total', value: school.students.total, color: 'text-gray-800' },
              { label: 'Laki-laki', value: school.students.male, color: 'text-blue-700' },
              { label: 'Perempuan', value: school.students.female, color: 'text-pink-700' },
            ].map((d, i) => (
              <div key={i}>
                <div className={`text-sm font-bold ${d.color}`}>{d.value}</div>
                <div className="text-xs text-gray-500">{d.label}</div>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      <div className="border border-gray-200 rounded p-4">
        <FunctionBar label="TREN SISWA PER KELAS" />
        <TrendChart data={trendData} />
      </div>
    </div>
  );
}

function PageGrafik({ school, employeeList }: { school: ReportSchool; employeeList: EmployeeRow[] }) {
  const pns = employeeList.filter(e => e.status_pegawai?.toLowerCase() === 'pns').length;
  const pppk = employeeList.filter(e => e.status_pegawai?.toLowerCase().includes('pppk')).length;
  const honorer = employeeList.filter(e => {
    const s = (e.status_pegawai || '').toLowerCase();
    return s !== 'pns' && !s.includes('pppk') && s !== '';
  }).length;
  const lainnya = employeeList.length - pns - pppk - honorer;

  const pieEmployee = [
    { label: 'PNS', value: pns || 1, color: '#2563eb' },
    { label: 'PPPK', value: pppk || 1, color: '#ca8a04' },
    { label: 'Honorer', value: honorer || 1, color: '#6b7280' },
    { label: 'Lainnya', value: lainnya || 0, color: '#d1d5db' },
  ].filter(d => d.value > 0);

  const infraDonut = [
    { label: 'Baik', value: school.infrastructure.classrooms.good || 1, color: '#16a34a' },
    { label: 'Rusak Ringan', value: school.infrastructure.classrooms.lightDamage || 0, color: '#ca8a04' },
    { label: 'Rusak Berat', value: school.infrastructure.classrooms.heavyDamage || 0, color: '#dc2626' },
  ].filter(d => d.value > 0);

  const barData = school.students.byClass.map(c => ({ label: c.kelas, value: c.total }));
  const max = Math.max(...barData.map(d => d.value), 1);

  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab VII — Grafik dan Visualisasi" />

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="border border-gray-200 rounded p-4">
          <FunctionBar label="KOMPOSISI PEGAWAI" />
          <PieChart data={pieEmployee} />
          <div className="flex justify-center gap-3 mt-2 text-[9px] text-gray-500">
            {pieEmployee.map((d, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                {d.label}
              </span>
            ))}
          </div>
        </div>
        <div className="border border-gray-200 rounded p-4">
          <FunctionBar label="KONDISI INFRASTRUKTUR" />
          <DonutChart data={infraDonut} />
          <div className="flex justify-center gap-3 mt-2 text-[9px] text-gray-500">
            {infraDonut.map((d, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded p-4">
        <FunctionBar label="DISTRIBUSI SISWA PER KELAS" />
        <BarChart data={barData} max={max} color="#0891b2" />
      </div>
    </div>
  );
}

function PageKesimpulan({ school }: { school: ReportSchool }) {
  const kesimpulan = [
    `Pada bulan laporan, ${school.name} memiliki total ${school.students.total} siswa dengan ${school.students.male} laki-laki dan ${school.students.female} perempuan yang tersebar di ${school.students.byClass.length} kelas.`,
    school.mutations.masuk > 0 || school.mutations.keluar > 0
      ? `Terjadi mutasi siswa sebanyak ${school.mutations.masuk} masuk dan ${school.mutations.keluar} keluar selama periode ini.`
      : 'Tidak terdapat mutasi siswa pada periode ini.',
    `Kondisi infrastruktur sekolah menunjukkan health score ${school.infrastructure.healthScore}/100 dengan ${school.infrastructure.classrooms.good} ruang kelas dalam kondisi baik, ${school.infrastructure.classrooms.lightDamage} rusak ringan, dan ${school.infrastructure.classrooms.heavyDamage} rusak berat.`,
    school.infrastructure.heavyDamage > 0
      ? `Rekomendasi: Perlu dilakukan rehabilitasi pada ${school.infrastructure.heavyDamage} ruang kelas yang mengalami rusak berat.`
      : 'Kondisi infrastruktur ruang kelas dalam keadaan baik dan layak pakai.',
  ];

  const rekomendasi = [
    'Meningkatkan kualitas pembelajaran melalui pelatihan guru secara berkala.',
    school.infrastructure.heavyDamage > 0 ? 'Melakukan perbaikan sarana prasarana yang rusak.' : 'Mempertahankan kondisi sarana prasarana yang ada.',
    'Mengoptimalkan partisipasi orang tua dalam kegiatan sekolah.',
    'Melanjutkan program pembiasaan positif dan penguatan karakter siswa.',
  ];

  return (
    <div className="p-10 font-serif text-xs leading-relaxed">
      <BABTitle label="Bab VIII — Kesimpulan" />

      <div className="mb-6">
        <FunctionBar label="A. KESIMPULAN" />
        <div className="space-y-2.5">
          {kesimpulan.map((par, i) => (
            <p key={i} className="text-xs leading-relaxed text-justify text-gray-800">{par}</p>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <FunctionBar label="B. REKOMENDASI" />
        <ol className="list-decimal ml-5 space-y-1.5">
          {rekomendasi.map((r, i) => (
            <li key={i} className="text-xs leading-relaxed text-gray-800">{r}</li>
          ))}
        </ol>
      </div>

      <InfoCard>
        <FunctionBar label="C. CATATAN EVALUASI" />
        <div className="space-y-3 pt-1">
          <div className="border-b border-dashed border-gray-300 pb-1" />
          <div className="border-b border-dashed border-gray-300 pb-1" />
          <div className="border-b border-dashed border-gray-300 pb-1" />
        </div>
      </InfoCard>
    </div>
  );
}

function PagePenutup({ school, period, kepalaSekolah, operator }: {
  school: ReportSchool; period: string;
  kepalaSekolah?: EmployeeRow; operator?: EmployeeRow;
}) {
  return (
    <div className="p-10 font-serif text-xs leading-relaxed flex flex-col min-h-[calc(100%-2.5rem)]">
      <BABTitle label="Penutup" />

      <div className="border-l-2 border-gray-300 pl-4 mb-8">
        <p className="text-xs leading-relaxed text-justify text-gray-800">
          Demikian laporan bulanan ini kami buat sebagai bahan evaluasi dan tindak lanjut
          dalam rangka meningkatkan mutu pendidikan di {school.name}. Semoga laporan ini
          bermanfaat bagi semua pihak yang berkepentingan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-10 mt-auto pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-700 mb-8">Mengetahui,<br />Kepala Sekolah</p>
          <div className="w-48 mx-auto">
            <p className="text-xs font-bold text-gray-800">{kepalaSekolah ? kepalaSekolah.nama : '( ___________________ )'}</p>
            <div className="border-t-2 border-gray-600 mt-1 mb-1" />
            <p className="text-[10px] text-gray-500">{kepalaSekolah?.nip ? `NIP. ${kepalaSekolah.nip}` : 'NIP. ________________'}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-700 mb-8">Penyusun Laporan,<br />Operator Sekolah</p>
          <div className="w-48 mx-auto">
            <p className="text-xs font-bold text-gray-800">{operator ? operator.nama : '( ___________________ )'}</p>
            <div className="border-t-2 border-gray-600 mt-1 mb-1" />
            <p className="text-[10px] text-gray-500">{operator?.nik ? `NIK. ${operator.nik}` : 'NIP/NIK. ___________'}</p>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-gray-400 mt-6 pt-4 border-t border-gray-200">
        <p>Laporan Bulanan — {school.name} — Periode {period}</p>
        <p>Dicetak: {formatDate(new Date().toISOString())} — Dokumen Resmi</p>
      </div>
    </div>
  );
}

// ── Main Viewer ──

interface LaporanPreviewProps {
  onClose?: () => void;
}

export default function LaporanPreview({ onClose }: LaporanPreviewProps) {
  const { user, isRole } = useAuth();
  const [schools, setSchools] = useState<ReportSchool[]>([]);
  const [selectedNpsn, setSelectedNpsn] = useState('');
  const [employeeList, setEmployeeList] = useState<EmployeeRow[]>([]);
  const [mutations, setMutations] = useState<MutationRow[]>([]);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
  const [rotate, setRotate] = useState(0);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/reports/monthly');
        const json = await res.json();
        setSchools(json.schools || []);
        setPeriod(json.period || '');

        let targetNpsn = '';
        if (user?.schoolNpsn) {
          targetNpsn = user.schoolNpsn;
        } else if (json.schools?.length > 0) {
          targetNpsn = json.schools[0].npsn;
        }
        setSelectedNpsn(targetNpsn);

        if (targetNpsn) {
          const [empRes, mutRes] = await Promise.all([
            api(`/api/reports/employees/${targetNpsn}`),
            api(`/api/reports/mutations/${targetNpsn}`),
          ]);
          if (empRes.ok) setEmployeeList(await empRes.json());
          if (mutRes.ok) setMutations(await mutRes.json());
        }
      } catch (e: any) {
        setError(e.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.schoolNpsn]);

  const handleSelectSchool = async (npsn: string) => {
    setSelectedNpsn(npsn);
    setLoading(true);
    setCurrentPage(1);
    try {
      const [empRes, mutRes] = await Promise.all([
        api(`/api/reports/employees/${npsn}`),
        api(`/api/reports/mutations/${npsn}`),
      ]);
      if (empRes.ok) setEmployeeList(await empRes.json());
      if (mutRes.ok) setMutations(await mutRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const school = schools.find(s => s.npsn === selectedNpsn);

  const kepalaSekolah = employeeList.find(e =>
    (e.jabatan || '').toLowerCase().includes('kepala sekolah')
  );
  const operator = employeeList.find(e =>
    (e.jabatan || '').toLowerCase().includes('operator')
  );

  const handlePrint = () => window.print();

  const changeZoom = (delta: number) => setZoom(z => Math.max(25, Math.min(200, z + delta)));

  const scrollToPage = (page: number) => {
    setCurrentPage(page);
    if (docRef.current) {
      const pageEl = docRef.current.querySelector(`[data-page="${page}"]`);
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = useCallback(() => {
    if (!docRef.current) return;
    const pages = docRef.current.querySelectorAll('[data-page]');
    const container = docRef.current;
    let active = 1;
    pages.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < container.getBoundingClientRect().top + 200) {
        active = i + 1;
      }
    });
    setCurrentPage(active);
  }, []);

  const pageNumbers: number[] = [];
  for (let i = 1; i <= TOTAL_PAGES; i++) pageNumbers.push(i);

  const pageContents = school ? [
    <PageCover key="cover" school={school} period={period} employeeList={employeeList} />,
    <PageStudents key="students" school={school} />,
    <PageEmployees key="employees" employeeList={employeeList} />,
    <PageInfrastructure key="infra" school={school} />,
    <PageMutationsMasuk key="mut-masuk" mutations={mutations} period={period} />,
    <PageMutationsKeluar key="mut-keluar" mutations={mutations} period={period} />,
    <PageAnalisis key="analisis" school={school} employeeList={employeeList} />,
    <PageGrafik key="grafik" school={school} employeeList={employeeList} />,
    <PageKesimpulan key="kesimpulan" school={school} />,
    <PagePenutup key="penutup" school={school} period={period}
      kepalaSekolah={kepalaSekolah} operator={operator} />,
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 p-12">
        <div className="animate-spin w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-gray-600">Memuat laporan...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 bg-red-50 text-red-600 text-center">{error}</div>;
  }

  if (!school) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Silakan pilih sekolah untuk melihat preview laporan.</p>
          {!user?.schoolNpsn && schools.length > 0 && (
            <select value={selectedNpsn} onChange={e => handleSelectSchool(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2 text-sm w-full max-w-xs">
              <option value="">-- Pilih Sekolah --</option>
              {schools.map(s => (
                <option key={s.npsn} value={s.npsn}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden print:bg-white print:overflow-visible">
      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-2 flex items-center justify-between shrink-0 print:hidden z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-700">Preview Laporan Bulanan</span>
          <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">{currentPage} / {TOTAL_PAGES}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollToPage(Math.max(1, currentPage - 1))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Previous Page"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => scrollToPage(Math.min(TOTAL_PAGES, currentPage + 1))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Next Page"><ChevronRight className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onClick={() => changeZoom(-10)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs font-mono w-10 text-center text-gray-600">{zoom}%</span>
          <button onClick={() => changeZoom(10)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onClick={() => { setFitMode('width'); setZoom(100); }} className={`p-1.5 rounded text-xs ${fitMode === 'width' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Fit Width"><Maximize className="w-4 h-4" /></button>
          <button onClick={() => { setFitMode('page'); }} className={`p-1.5 rounded text-xs ${fitMode === 'page' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Fit Page"><Minimize className="w-4 h-4" /></button>
          <button onClick={() => setRotate(r => (r + 90) % 360)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Rotate"><RotateCw className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Cetak
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body: Sidebar + Document ── */}
      <div className="flex flex-1 overflow-hidden print:block">
        {/* ── Sidebar Thumbnails ── */}
        {!user?.schoolNpsn && (
          <div className="w-40 bg-gray-800 overflow-y-auto shrink-0 p-2 space-y-2 print:hidden">
            <select value={selectedNpsn} onChange={e => handleSelectSchool(e.target.value)}
              className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 mb-3">
              {schools.map(s => <option key={s.npsn} value={s.npsn}>{s.name}</option>)}
            </select>
            {pageNumbers.map(p => (
              <div key={p}
                onClick={() => scrollToPage(p)}
                className={`cursor-pointer rounded overflow-hidden border-2 transition-colors ${
                  currentPage === p ? 'border-blue-500' : 'border-transparent'
                }`}>
                <div className="bg-white aspect-[210/297] relative flex items-center justify-center text-gray-300 text-[10px] p-1"
                  style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: 132, height: 187 }}>
                  <span className="absolute bottom-1 right-1 text-gray-400 text-[6px]">{p}</span>
                </div>
                <div className="text-center text-[11px] text-gray-400 py-0.5">Halaman {p}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Document Area ── */}
        <div className="flex-1 overflow-y-auto bg-gray-200 p-6 print:p-0 print:overflow-visible" ref={docRef} onScroll={handleScroll}>
          <div className="mx-auto space-y-6 print:space-y-0" style={{
            width: mmToPx(PAGE_WIDTH_MM) * (zoom / 100),
            transform: `rotate(${rotate}deg)`,
          }}>
            {pageContents.map((content, i) => (
              <div key={i} data-page={i + 1}
                className="bg-white shadow-xl print:shadow-none mx-auto print:mx-0 print:break-after-page"
                style={{
                  width: mmToPx(PAGE_WIDTH_MM),
                  minHeight: mmToPx(PAGE_HEIGHT_MM),
                  pageBreakAfter: i < TOTAL_PAGES - 1 ? 'always' as any : undefined,
                }}>
                {content}
                {/* Page footer */}
                <div className="text-[9px] text-gray-400 px-8 pb-2 flex justify-between border-t border-gray-100 pt-1.5 print:fixed print:bottom-0 print:left-0 print:right-0">
                  <span>{school.name} | {period}</span>
                  <span>Halaman {i + 1} dari {TOTAL_PAGES}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          @page { size: 215mm 330mm portrait; margin: 0; }
          body { background: white !important; font-family: 'Times New Roman', Times, serif !important; font-size: 10pt !important; }
          .print\\:hidden { display: none !important; }
          #super-sidebar, #sidebar-toggle-btn, header { display: none !important; }
          #app-root > div.flex-1 { margin-left: 0 !important; width: 100% !important; }
          main { padding: 0 !important; overflow: visible !important; }
          [data-page] { box-shadow: none !important; page-break-after: always; break-after: page; }
          .shadow-xl { box-shadow: none !important; }
          .bg-gray-200 { background: white !important; }
        }
      `}</style>
    </div>
  );
}
