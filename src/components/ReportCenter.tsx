import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen
} from 'lucide-react';

export default function ReportCenter() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reports = [
    {
      id: 'gov-monthly',
      title: 'Monthly Governance Snapshot',
      desc: 'Consolidated report detailing schools health indices, teacher shortage/surplus deltas, and village student growth.',
      category: 'Strategic',
      formats: ['PDF', 'Excel'],
      lastGenerated: '01 June 2026'
    },
    {
      id: 'infra-audit',
      title: 'Infrastructure Deficit Brief',
      desc: 'Complete log of heavily damaged classrooms, WASH toilet counts, and low-speed internet schools requiring urgent repairs.',
      category: 'Operations',
      formats: ['PDF'],
      lastGenerated: '15 June 2026'
    },
    {
      id: 'staff-mutation',
      title: 'Teacher Mutation Plan Proposal',
      desc: 'AI-generated teacher redistribution layouts calculated to balance student-teacher ratios across centers.',
      category: 'Human Resources',
      formats: ['PDF', 'Excel'],
      lastGenerated: '20 June 2026'
    }
  ];

  const handleGenerate = (repId: string, format: string) => {
    setGenerating(`${repId}-${format}`);
    setSuccessMsg(null);

    // Simulate compilation
    setTimeout(() => {
      setGenerating(null);
      setSuccessMsg(`SUCCESS: Report "${repId.toUpperCase()}" compiling finished in format [${format}]. File downloaded securely.`);
    }, 1500);
  };

  return (
    <div className="space-y-6" id="reports-module">
      {/* Alert bar if success */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center gap-2.5 text-xs text-emerald-400 font-mono">
          <CheckCircle className="h-4 w-4 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Reports Listing (8 Columns) */}
        <div className="lg:col-span-8 p-5 border bg-[#11141a]/60 border-[#1f2937] rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1f2937] pb-2.5">
            <BookOpen className="h-4.5 w-4.5 text-cyan-400" />
            <span className="font-bold text-xs tracking-wider text-slate-200 uppercase font-sans">
              OFFICIAL REPORT CONSOLIDATION PANEL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((r) => (
              <div key={r.id} className="p-4 rounded-lg bg-[#0c0e12]/60 border border-[#1f2937] space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-[#0c0e12] border border-[#1f2937] text-slate-400 uppercase font-bold">
                      {r.category}
                    </span>
                    <span className="text-slate-500">LAST: {r.lastGenerated}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100">{r.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">{r.desc}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#1f2937]">
                  {r.formats.map((fmt) => {
                    const isGeneratingThis = generating === `${r.id}-${fmt}`;
                    return (
                      <button
                        key={fmt}
                        id={`generate-${r.id}-${fmt}`}
                        onClick={() => handleGenerate(r.id, fmt)}
                        disabled={generating !== null}
                        className="flex-1 py-1.5 bg-[#0c0e12] hover:bg-[#11141a] border border-[#1f2937] rounded text-[10px] font-mono text-cyan-400 hover:text-cyan-300 font-bold uppercase transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingThis ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>COMPILING...</span>
                          </>
                        ) : (
                          <>
                            {fmt === 'PDF' ? <FileText className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                            <span>GET {fmt}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log / Historical Exports (4 Columns) */}
        <div className="lg:col-span-4 p-5 border bg-[#11141a]/60 border-[#1f2937] rounded-xl flex flex-col justify-between gap-4 h-full">
          <div className="space-y-4">
            <h4 className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans border-b border-[#1f2937] pb-2.5">
              HISTORICAL EXPORTS LOG
            </h4>

            <div className="space-y-3 font-mono text-[10px]">
              {[
                { time: 'Yesterday 14:20', file: 'GOV_MONTHLY_LEMAHABANG.pdf', user: 'Admin Kecamatan' },
                { time: '2 days ago 09:12', file: 'TEACHER_MUTATION_OUT.xlsx', user: 'BKD Cirebon' },
                { time: '5 days ago 11:45', file: 'INFRA_AUDIT_BRIEF.pdf', user: 'Dinas Pendidikan' }
              ].map((log, i) => (
                <div key={i} className="p-2.5 rounded bg-[#0c0e12]/60 border border-[#1f2937] text-slate-300 space-y-1">
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>{log.time}</span>
                    <span>By: {log.user}</span>
                  </div>
                  <div className="font-semibold text-cyan-400 truncate flex items-center gap-1">
                    <Download className="h-3 w-3 shrink-0" />
                    <span>{log.file}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-cyan-950/5 rounded-lg border border-cyan-500/20 space-y-1 text-[10px] font-mono text-slate-400 leading-normal">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>SMART REPORT SIGNATURE</span>
            </div>
            <span>All generated documents are cryptographically signed with the regional administrator license (Lemahabang, West Java).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
