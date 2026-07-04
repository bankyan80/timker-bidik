import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';
import { FileText, Download, Loader2, Printer, AlertTriangle, Building2, Users, GraduationCap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ReportSchool {
  npsn: string; name: string; level: string; status: string; village: string;
  students: {
    total: number; male: number; female: number;
    byClass: { kelas: string; total: number; male: number; female: number; rombel: string | null }[];
  };
  employees: {
    total: number; pns: number; pppk: number; honorer: number;
    guru: number; tendik: number; certified: number;
  };
  infrastructure: {
    healthScore: number;
    classrooms: { good: number; lightDamage: number; heavyDamage: number };
    toilets: { good: number; damaged: number };
    hasLibrary: boolean; hasLab: boolean; internetSpeedMbps: number;
    alerts: { severity: string; message: string; category: string }[];
  };
  mutations: { masuk: number; keluar: number };
}

interface ReportData {
  generatedAt: string;
  period: string;
  totalSchools: number;
  totalStudents: number;
  totalEmployees: number;
  schools: ReportSchool[];
}

export default function MonthlyReport() {
  const { user, isRole } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/reports/monthly');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message || 'Gagal memuat laporan');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="ml-3 text-lg">Memuat laporan...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-400">Error: {error}</div>;
  }

  if (!data) return null;

  const summaryCards = [
    { label: 'Sekolah', value: data.totalSchools, icon: Building2 },
    { label: 'Total Siswa', value: data.totalStudents, icon: GraduationCap },
    { label: 'Total Pegawai', value: data.totalEmployees, icon: Users },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Laporan Bulanan
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Periode: {data.period} — Generated: {new Date(data.generatedAt).toLocaleString('id-ID')}
          </p>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white transition-colors">
          <Printer className="w-4 h-4" />
          Cetak / PDF
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-[#0c0e12] border border-[#1f2937] rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
              <c.icon className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{c.value.toLocaleString('id-ID')}</div>
              <div className="text-sm text-gray-400">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-school report */}
      {data.schools.map(school => {
        const totalClassrooms = school.infrastructure.classrooms.good + school.infrastructure.classrooms.lightDamage + school.infrastructure.classrooms.heavyDamage;
        const totalToilets = school.infrastructure.toilets.good + school.infrastructure.toilets.damaged;

        return (
          <div key={school.npsn} className="mb-8 bg-[#0c0e12] border border-[#1f2937] rounded-xl overflow-hidden break-inside-avoid print:border-gray-300">
            {/* School header */}
            <div className="p-5 border-b border-[#1f2937] print:border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{school.name}</h2>
                  <p className="text-sm text-gray-400">
                    {school.level} — {school.status} — Desa {school.village}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">{school.infrastructure.healthScore}</div>
                  <div className="text-xs text-gray-400">Health Score</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Section: Students */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Siswa
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{school.students.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-400">{school.students.male}</div>
                    <div className="text-xs text-gray-400">Laki-laki</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-pink-400">{school.students.female}</div>
                    <div className="text-xs text-gray-400">Perempuan</div>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f2937] text-gray-400">
                      <th className="text-left py-2">Kelas</th>
                      <th className="text-left py-2">Rombel</th>
                      <th className="text-right py-2">Total</th>
                      <th className="text-right py-2">L</th>
                      <th className="text-right py-2">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.students.byClass.map((c, i) => (
                      <tr key={i} className="border-b border-[#1f2937]/50">
                        <td className="py-2">{c.kelas}</td>
                        <td className="py-2 text-gray-400">{c.rombel || '-'}</td>
                        <td className="py-2 text-right">{c.total}</td>
                        <td className="py-2 text-right text-blue-400">{c.male}</td>
                        <td className="py-2 text-right text-pink-400">{c.female}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section: Employees */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Pegawai
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{school.employees.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-400">{school.employees.pns}</div>
                    <div className="text-xs text-gray-400">PNS</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-400">{school.employees.pppk}</div>
                    <div className="text-xs text-gray-400">PPPK</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-gray-300">{school.employees.honorer}</div>
                    <div className="text-xs text-gray-400">Honorer</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{school.employees.guru}</div>
                    <div className="text-xs text-gray-400">Guru</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{school.employees.tendik}</div>
                    <div className="text-xs text-gray-400">Tendik</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-purple-400">{school.employees.certified}</div>
                    <div className="text-xs text-gray-400">Tersertifikasi</div>
                  </div>
                </div>
              </div>

              {/* Section: Infrastructure */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Infrastruktur
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-[#08090b] rounded-lg p-3">
                    <div className="text-xs text-gray-400">Ruang Kelas</div>
                    <div className="text-lg font-bold">{totalClassrooms}</div>
                    <div className="text-xs">
                      <span className="text-green-400">{school.infrastructure.classrooms.good} baik</span>
                      {' / '}
                      <span className="text-yellow-400">{school.infrastructure.classrooms.lightDamage} ringan</span>
                      {' / '}
                      <span className="text-red-400">{school.infrastructure.classrooms.heavyDamage} berat</span>
                    </div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3">
                    <div className="text-xs text-gray-400">Toilet</div>
                    <div className="text-lg font-bold">{totalToilets}</div>
                    <div className="text-xs">
                      <span className="text-green-400">{school.infrastructure.toilets.good} baik</span>
                      {' / '}
                      <span className="text-red-400">{school.infrastructure.toilets.damaged} rusak</span>
                    </div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3">
                    <div className="text-xs text-gray-400">Perpustakaan</div>
                    <div className="text-lg font-bold">{school.infrastructure.hasLibrary ? '✓' : '✗'}</div>
                    <div className="text-xs text-gray-400">{school.infrastructure.hasLibrary ? 'Ada' : 'Tidak Ada'}</div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3">
                    <div className="text-xs text-gray-400">Laboratorium</div>
                    <div className="text-lg font-bold">{school.infrastructure.hasLab ? '✓' : '✗'}</div>
                    <div className="text-xs text-gray-400">{school.infrastructure.hasLab ? 'Ada' : 'Tidak Ada'}</div>
                  </div>
                </div>
                <div className="bg-[#08090b] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm">Internet: <strong>{school.infrastructure.internetSpeedMbps} Mbps</strong></span>
                  {school.infrastructure.alerts.length > 0 && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs">{school.infrastructure.alerts.length} peringatan</span>
                    </div>
                  )}
                </div>
                {school.infrastructure.alerts.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {school.infrastructure.alerts.map((a, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${
                        a.severity === 'CRITICAL' ? 'bg-red-950/30 text-red-400' : 'bg-yellow-950/30 text-yellow-400'
                      }`}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{a.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: Mutations */}
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  Mutasi Siswa Bulan Ini
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#08090b] rounded-lg p-3 flex items-center gap-3">
                    <ArrowUpRight className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-xl font-bold text-green-400">{school.mutations.masuk}</div>
                      <div className="text-xs text-gray-400">Siswa Masuk</div>
                    </div>
                  </div>
                  <div className="bg-[#08090b] rounded-lg p-3 flex items-center gap-3">
                    <ArrowDownRight className="w-5 h-5 text-red-400" />
                    <div>
                      <div className="text-xl font-bold text-red-400">{school.mutations.keluar}</div>
                      <div className="text-xs text-gray-400">Siswa Keluar</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-8 border-t border-[#1f2937] print:border-gray-300 print:mt-8">
        <p>Laporan Bulanan — TimKer Bidik 360 Kecamatan Lemahabang</p>
        <p>Periode {data.period} — Dihasilkan {new Date(data.generatedAt).toLocaleString('id-ID')}</p>
        <p className="mt-1">© 2026 Tim Kerja Bidik Lemahabang</p>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          @page { size: A4 portrait; margin: 15mm; }
          .print\\:hidden { display: none !important; }
          .bg-\\[\\#0c0e12\\] { background: white !important; border-color: #ddd !important; }
          .bg-\\[\\#08090b\\] { background: #f9fafb !important; }
          .text-gray-400 { color: #666 !important; }
          .text-cyan-400 { color: #0891b2 !important; }
          .border-\\[\\#1f2937\\] { border-color: #ddd !important; }
          .text-2xl { font-size: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}
