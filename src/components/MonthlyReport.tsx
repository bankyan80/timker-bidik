import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';
import { FileText, Loader2, CheckCircle2, XCircle, Send, Clock } from 'lucide-react';

interface SchoolProgress {
  npsn: string;
  name: string;
  level: string;
  status: string;
  village: string;
  submitted: boolean;
  submittedAt: number | null;
  statusLabel: string;
}

interface SubmissionsData {
  period: string;
  total: number;
  submitted: number;
  pending: number;
  schools: SchoolProgress[];
}

export default function MonthlyReport() {
  const { user, isRole } = useAuth();
  const isOperator = isRole('operator_sekolah');
  const [data, setData] = useState<SubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/reports/submissions');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!confirm('Kirim laporan bulanan sekolah Anda?')) return;
    setSubmitting(true);
    try {
      const res = await api('/api/reports/submit', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setData(prev => prev ? {
          ...prev,
          submitted: prev.submitted + 1,
          pending: prev.pending - 1,
          schools: prev.schools.map(s => s.npsn === user?.schoolNpsn ? { ...s, submitted: true, statusLabel: 'Sudah Lapor', submittedAt: Math.floor(Date.now() / 1000) } : s),
        } : prev);
      } else {
        alert(json.error || 'Gagal mengirim');
      }
    } catch (e: any) {
      alert(e.message || 'Gagal mengirim');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="ml-3 text-lg">Memuat data laporan...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-400">Error: {error}</div>;
  }

  if (!data) return null;

  if (isOperator) {
    const mySchool = data.schools[0];
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              Laporan Bulanan
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Periode: {data.period}
            </p>
          </div>
        </div>

        {mySchool && (
          <div className="bg-[#0c0e12] border border-[#1f2937] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{mySchool.name}</h2>
                <p className="text-sm text-gray-400">
                  {mySchool.level} — {mySchool.status} — Desa {mySchool.village}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                mySchool.submitted ? 'bg-green-950/30 text-green-400 border border-green-800/30' : 'bg-yellow-950/30 text-yellow-400 border border-yellow-800/30'
              }`}>
                {mySchool.submitted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {mySchool.statusLabel}
              </div>
            </div>

            {!mySchool.submitted && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors w-full justify-center"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {submitting ? 'Mengirim...' : 'Kirim Laporan Bulanan'}
              </button>
            )}

            {mySchool.submitted && (
              <div className="bg-green-950/20 border border-green-800/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-medium">Laporan sudah dikirim</p>
                {mySchool.submittedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(mySchool.submittedAt * 1000).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const progressPercent = data.total > 0 ? Math.round((data.submitted / data.total) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            Laporan Bulanan
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Periode: {data.period} — Progres Pelaporan Sekolah
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0c0e12] border border-[#1f2937] rounded-xl p-5">
          <div className="text-2xl font-bold">{data.total}</div>
          <div className="text-sm text-gray-400">Total Sekolah</div>
        </div>
        <div className="bg-[#0c0e12] border border-[#1f2937] rounded-xl p-5">
          <div className="text-2xl font-bold text-green-400">{data.submitted}</div>
          <div className="text-sm text-gray-400">Sudah Lapor</div>
        </div>
        <div className="bg-[#0c0e12] border border-[#1f2937] rounded-xl p-5">
          <div className="text-2xl font-bold text-yellow-400">{data.pending}</div>
          <div className="text-sm text-gray-400">Belum Lapor</div>
        </div>
      </div>

      <div className="bg-[#0c0e12] border border-[#1f2937] rounded-xl mb-6 overflow-hidden">
        <div className="h-2 bg-[#1f2937]">
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="px-5 py-2 text-xs text-gray-400 text-right">
          {progressPercent}% progres
        </div>
      </div>

      <div className="bg-[#0c0e12] border border-[#1f2937] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1f2937] text-gray-400">
              <th className="text-left py-3 px-5">Sekolah</th>
              <th className="text-left py-3 px-5">Jenjang</th>
              <th className="text-left py-3 px-5">Desa</th>
              <th className="text-center py-3 px-5">Status</th>
              <th className="text-right py-3 px-5">Waktu Lapor</th>
            </tr>
          </thead>
          <tbody>
            {data.schools.map((s, i) => (
              <tr key={s.npsn} className={`border-b border-[#1f2937]/50 ${i % 2 === 0 ? 'bg-[#08090b]' : ''}`}>
                <td className="py-3 px-5 font-medium">{s.name}</td>
                <td className="py-3 px-5 text-gray-400">{s.level}</td>
                <td className="py-3 px-5 text-gray-400">{s.village}</td>
                <td className="py-3 px-5 text-center">
                  {s.submitted ? (
                    <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-medium bg-green-950/20 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sudah Lapor
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-yellow-400 text-xs font-medium bg-yellow-950/20 px-3 py-1 rounded-full">
                      <XCircle className="w-3.5 h-3.5" />
                      Belum Lapor
                    </span>
                  )}
                </td>
                <td className="py-3 px-5 text-right text-gray-400 text-xs">
                  {s.submittedAt ? new Date(s.submittedAt * 1000).toLocaleString('id-ID') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
