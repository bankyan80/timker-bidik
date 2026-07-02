import React, { useState } from 'react';
import { School, AlertMessage, Recommendation } from '../types';
import { ALL_SCHOOLS } from '../data/mockData';
import {
  Activity,
  AlertTriangle,
  Play,
  CheckCircle,
  Wrench,
  BadgeAlert,
  Sliders,
  Sparkles
} from 'lucide-react';

interface LiveMonitorProps {
  onSelectSchool: (school?: School) => void;
  recs: Recommendation[];
  setRecs: React.Dispatch<React.SetStateAction<Recommendation[]>>;
}

export default function LiveMonitor({ onSelectSchool, recs, setRecs }: LiveMonitorProps) {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [tickerAlerts, setTickerAlerts] = useState<AlertMessage[]>([]);

  // Sorting critical schools queue based on the requested severity formula:
  // teacher shortage + student overload + infrastructure damage + retirement risk
  const criticalQueue = ALL_SCHOOLS
    .filter(s => s.healthScore < 50)
    .sort((a, b) => a.healthScore - b.healthScore);

  // Apply action flow
  const handleApplyAction = (recId: string) => {
    setRecs(prev => prev.map(r => {
      if (r.id === recId) {
        return { ...r, applied: true };
      }
      return r;
    }));

    // Generate a successful simulation alert
    const targetRec = recs.find(r => r.id === recId);
    if (targetRec) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newAlert: AlertMessage = {
        id: `alt-${Date.now()}`,
        timestamp: timeStr,
        schoolName: targetRec.targetSchoolNpsn ? 'Target School' : 'Kecamatan Wide',
        severity: 'INFO',
        message: `SUCCESS: Policy applied: "${targetRec.title}". System recalculating regional educational health metrics...`,
        category: 'Certification'
      };
      setTickerAlerts(prev => [newAlert, ...prev]);
    }
  };

  return (
    <div className="space-y-6" id="monitor-module">
      {/* 1. Live Alerts Ticker Bar */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3 overflow-hidden flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 bg-red-950 border border-red-800 text-red-400 text-[10px] font-mono font-bold uppercase rounded animate-pulse">
          <Activity className="h-3.5 w-3.5" />
          <span>LIVE TICKS</span>
        </div>
        <div className="flex-1 overflow-hidden relative h-5">
          <div className="absolute flex gap-12 whitespace-nowrap animate-marquee font-mono text-xs text-red-300">
            {tickerAlerts.map((a, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-red-500 font-bold">[{a.timestamp}]</span>
                <span className="font-semibold">{a.schoolName}:</span>
                <span>{a.message}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Mission Control Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Hand: Urgency Rankings & Critical Queue (8 Columns) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Real-time Alerts Stream Filter block */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
              <div className="flex items-center gap-2">
                <BadgeAlert className="h-5 w-5 text-cyan-400 animate-pulse" />
                <h4 className="font-bold text-xs tracking-wider text-slate-300 uppercase font-sans">
                  CRITICAL SCHOOL QUEUE & URGENCY RANKINGS
                </h4>
              </div>
              <div className="flex gap-1 bg-[#0c0e12] p-0.5 rounded border border-[#1f2937]">
                {['ALL', 'CRITICAL', 'WARNING'].map(sev => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev as any)}
                    className={`px-2.5 py-0.5 text-[9px] font-mono rounded transition-all ${
                      filterSeverity === sev ? 'bg-cyan-600/20 text-cyan-400 font-bold border border-cyan-600/50' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-thin">
              {criticalQueue
                .filter(s => {
                  if (filterSeverity === 'CRITICAL') return s.healthScore < 40;
                  if (filterSeverity === 'WARNING') return s.healthScore >= 40 && s.healthScore < 60;
                  return true;
                })
                .map((school, idx) => {
                  const isCritical = school.healthScore < 40;
                  const shortageRatio = Math.round(school.students.total / school.teachers.total);
                  return (
                    <div
                      key={school.npsn}
                      onClick={() => onSelectSchool(school)}
                      className="p-3.5 rounded-lg border bg-[#0d0f14] border-[#1f2937] hover:border-cyan-500/50 hover:bg-[#11141a]/50 transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-slate-500 text-sm font-bold w-6 text-center">
                          #{idx + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 text-xs sm:text-sm">{school.name}</span>
                            <span className="text-[9px] font-mono text-slate-400">({school.village})</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
                            <span className="flex items-center gap-1">
                              <Sliders className="h-3 w-3 text-slate-500" /> Rasio: {shortageRatio}:1
                            </span>
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3 text-slate-500" /> Rusak: {school.facilities.classroomCondition.heavyDamage} Kelas
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Health Gauge Indicator */}
                      <div className="flex flex-col items-end gap-1 shrink-0 font-mono">
                        <span className={`text-xs font-bold ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                          {school.healthScore} PTS
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isCritical ? 'bg-red-950/60 text-red-400 border border-red-900' : 'bg-amber-950/60 text-amber-400 border border-amber-900'
                        }`}>
                          {isCritical ? 'CRITICAL' : 'WARNING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Hand: AI Recommendations Feed (4 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center border-b border-[#1f2937] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                <h4 className="font-bold text-xs tracking-wider text-slate-300 uppercase font-sans">
                  AI RECOMMENDATIONS DECK
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">REACTIVE ACTION</span>
            </div>

            <div className="space-y-3.5 overflow-y-auto max-h-[420px] scrollbar-thin pr-1">
              {recs.map((r) => {
                let categoryColor = 'text-cyan-400 bg-cyan-950 border-cyan-850';
                if (r.category === 'Staffing') categoryColor = 'text-red-400 bg-red-950/50 border-red-900/60';
                else if (r.category === 'Infrastructure') categoryColor = 'text-amber-400 bg-amber-950/50 border-amber-900/60';
                else if (r.category === 'Certification') categoryColor = 'text-cyan-400 bg-cyan-950/50 border-cyan-900/60';

                return (
                  <div
                    key={r.id}
                    id={`rec-card-${r.id}`}
                    className={`p-3.5 rounded-lg border bg-[#0d0f14] border-[#1f2937] space-y-3 transition-all ${
                      r.applied ? 'opacity-50 border-emerald-950/50' : 'hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold uppercase ${categoryColor}`}>
                        {r.category}
                      </span>
                      <span className={`text-[9px] font-mono font-bold ${
                        r.urgency === 'Critical' ? 'text-red-400' : (r.urgency === 'High' ? 'text-orange-400' : 'text-yellow-400')
                      }`}>
                        {r.urgency.toUpperCase()} PRIORITY
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-200 text-xs sm:text-sm">{r.title}</h5>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{r.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-[#0c0e12] p-2 rounded border border-[#1f2937]">
                      <div>IMPACT: <span className="font-bold text-cyan-400">+{r.impactScore} PTS</span></div>
                      <div>COST: <span className="font-bold text-cyan-400">Rp {r.estimatedCostMiliar}M</span></div>
                    </div>

                    <div className="flex justify-between items-center gap-4 pt-1">
                      <span className="text-[10px] font-mono text-slate-500">TIMELINE: {r.timelineMonths} BLN</span>
                      {r.applied ? (
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          <span>APPLIED</span>
                        </div>
                      ) : (
                        <button
                          id={`apply-action-${r.id}`}
                          onClick={() => handleApplyAction(r.id)}
                          className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-600 text-cyan-400 hover:text-white hover:bg-cyan-600 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>EXECUTE</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
