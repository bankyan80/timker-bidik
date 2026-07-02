import React, { useState, useEffect } from 'react';
import { SimulationScenario, SimulationResult } from '../types';
import {
  Cpu,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Coins,
  Scale,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function ScenarioSimulator() {
  const [loading, setLoading] = useState(false);
  const [retiring, setRetiring] = useState(25);
  const [studentGrowth, setStudentGrowth] = useState(15);
  const [newPppk, setNewPppk] = useState(10);
  const [schoolMerges, setSchoolMerges] = useState(2);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachersRetiring: retiring,
          studentGrowthPercent: studentGrowth,
          newPppkAssigned: newPppk,
          schoolMergeNpsns: Array.from({ length: schoolMerges }, (_, i) => `2021400${i + 1}`)
        })
      });
      const data = await response.json();
      setSimResult(data);
    } catch (err) {
      console.error('Error running simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run initial simulation on load
  useEffect(() => {
    runSimulation();
  }, []);

  // Quick Presets
  const applyPreset = (preset: 'retirement' | 'spmb' | 'pppk' | 'merge') => {
    switch (preset) {
      case 'retirement':
        setRetiring(25);
        setStudentGrowth(0);
        setNewPppk(0);
        setSchoolMerges(0);
        break;
      case 'spmb':
        setRetiring(0);
        setStudentGrowth(15);
        setNewPppk(0);
        setSchoolMerges(0);
        break;
      case 'pppk':
        setRetiring(0);
        setStudentGrowth(0);
        setNewPppk(15);
        setSchoolMerges(0);
        break;
      case 'merge':
        setRetiring(0);
        setStudentGrowth(0);
        setNewPppk(0);
        setSchoolMerges(2);
        break;
    }
  };

  return (
    <div className="space-y-6" id="simulator-module">
      {/* Jumbotron Intro with Presets */}
      <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-sans">
              POLICY SIMULATION SANDBOX & SCENARIO PLOTTER
            </h3>
            <p className="text-xs text-slate-400">
              Simulate and review regional policy choices before implementation. Toggle presets to load historical stress points.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'retirement', label: 'Scenario 1: 25 Retirements' },
              { id: 'spmb', label: 'Scenario 2: +15% Student Growth' },
              { id: 'pppk', label: 'Scenario 3: +15 PPPK Staff' },
              { id: 'merge', label: 'Scenario 4: Merge 2 Schools' }
            ].map(p => (
              <button
                key={p.id}
                id={`preset-${p.id}`}
                onClick={() => applyPreset(p.id as any)}
                className="px-2.5 py-1.5 bg-[#0c0e12] hover:bg-[#11141a] text-[10px] font-mono text-cyan-400 font-bold border border-[#1f2937] rounded transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Sandbox Layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sliders Input Controls (5 Columns) */}
        <div className="lg:col-span-5 p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1f2937] pb-2.5">
              <Cpu className="h-4.5 w-4.5 text-cyan-400" />
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">POLICY VARIABLE SLIDERS</span>
            </div>

            {/* Teacher Retirement Slider */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>1. Teachers Retiring Next Year</span>
                <span className="font-bold text-red-400">{retiring} Pendidik</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                id="sim-retiring"
                value={retiring}
                onChange={(e) => setRetiring(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Student growth percentage */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>2. Student Population Growth Rate</span>
                <span className="font-bold text-violet-400">+{studentGrowth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                id="sim-growth"
                value={studentGrowth}
                onChange={(e) => setStudentGrowth(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* New PPPK personnel added */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>3. New PPPK Teacher Allocation</span>
                <span className="font-bold text-emerald-400">+{newPppk} Personnel</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                id="sim-pppk"
                value={newPppk}
                onChange={(e) => setNewPppk(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* School mergers Count */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>4. Schools Consolidated / Merged</span>
                <span className="font-bold text-amber-500">{schoolMerges} Mergers</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                id="sim-merges"
                value={schoolMerges}
                onChange={(e) => setSchoolMerges(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            id="run-sim-button"
            className="w-full py-3 bg-cyan-600/20 hover:bg-cyan-600 disabled:opacity-50 text-cyan-400 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-600/10 border border-cyan-500 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Recalculating HUD...</span>
              </>
            ) : (
              <>
                <Scale className="h-4 w-4" />
                <span>Run Policy Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* Results Output (7 Columns) */}
        <div className="lg:col-span-7 p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-5">
          <div className="flex items-center justify-between border-b border-[#1f2937] pb-2.5">
            <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">
              SIMULATION OUTPUT MATRIX
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold">BEFORE VS AFTER COMPARISON</span>
          </div>

          {simResult ? (
            <div className="space-y-5">
              {/* Output parameters side by side */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-center text-xs">
                {/* Shortage Schools counts */}
                <div className="p-3 bg-[#0c0e12] rounded border border-[#1f2937]">
                  <span className="text-[8px] text-slate-500 block">UNDERSTAFFED SCHOOLS</span>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className="text-slate-400 line-through">{simResult.before.shortageCount}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-bold text-red-400 text-sm">{simResult.after.shortageCount}</span>
                  </div>
                </div>

                {/* Classroom Deficit */}
                <div className="p-3 bg-[#0c0e12] rounded border border-[#1f2937]">
                  <span className="text-[8px] text-slate-500 block">CLASSROOM DEFICIT</span>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className="text-slate-400 line-through">{simResult.before.classroomDeficit}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-bold text-amber-500 text-sm">{simResult.after.classroomDeficit}</span>
                  </div>
                </div>

                {/* Budget impact */}
                <div className="p-3 bg-[#0c0e12] rounded border border-[#1f2937]">
                  <span className="text-[8px] text-slate-500 block">ANNUAL REGIONAL BUDGET</span>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className="text-slate-400 line-through">Rp {simResult.before.budgetMiliar || 24.5}M</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-bold text-emerald-400 text-sm">Rp {simResult.after.budgetMiliar}M</span>
                  </div>
                  <div className="text-[9px] text-cyan-400 font-bold mt-1 text-center">
                    ({simResult.after.budgetDeltaMiliar >= 0 ? '+' : ''}{simResult.after.budgetDeltaMiliar}M Variance)
                  </div>
                </div>
              </div>

              {/* Staffing and infrastructure summaries */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded bg-[#0c0e12]/60 border border-[#1f2937] space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Staffing Impact Profile:</span>
                  <p className="text-slate-300 leading-relaxed">{simResult.after.staffingImpactDesc}</p>
                </div>

                <div className="p-3.5 rounded bg-[#0c0e12]/60 border border-[#1f2937] space-y-1">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Infrastructure Pressure Rating:</span>
                  <p className="text-slate-300 leading-relaxed">{simResult.after.infraPressureDesc}</p>
                </div>
              </div>

              {/* AI Strategic insights (Powered by Gemini) */}
              <div className="p-4 rounded-lg bg-cyan-950/5 border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-1.5 border-b border-cyan-500/10 pb-1.5">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                    AI POLICY COMPILATION INSIGHTS
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-2 text-[11px] text-slate-300 pl-1 font-mono leading-relaxed">
                  {simResult.insights.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs font-mono">
              Loading simulation matrices...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
