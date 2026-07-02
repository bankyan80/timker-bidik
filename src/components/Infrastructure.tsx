import React, { useState, useEffect } from 'react';
import { School } from '../types';
import { loadSchools } from '../data/dataService';
import { ALL_SCHOOLS } from '../data/mockData';
import {
  Building2,
  Wrench,
  Wifi,
  Library,
  Flame,
  Globe
} from 'lucide-react';

export default function Infrastructure() {
  const [schools, setSchools] = useState<School[]>(ALL_SCHOOLS);
  useEffect(() => { loadSchools().then(s => { if (s.length) setSchools(s); }); }, []);

  const totalSchools = schools.length;
  const classroomConditions = schools.reduce((acc, curr) => {
    acc.good += curr.facilities.classroomCondition.good;
    acc.lightDamage += curr.facilities.classroomCondition.lightDamage;
    acc.heavyDamage += curr.facilities.classroomCondition.heavyDamage;
    return acc;
  }, { good: 0, lightDamage: 0, heavyDamage: 0 });

  const totalClassrooms = classroomConditions.good + classroomConditions.lightDamage + classroomConditions.heavyDamage;
  const libraryCount = schools.filter(s => s.facilities.hasLibrary).length;
  const labCount = schools.filter(s => s.facilities.hasLab).length;
  const totalToiletsGood = schools.reduce((sum, s) => sum + s.facilities.toiletsGood, 0);
  const totalToiletsDamaged = schools.reduce((sum, s) => sum + s.facilities.toiletsDamaged, 0);
  const slowInternetSchools = schools.filter(s => s.facilities.internetSpeedMbps < 15);
  const criticalBuildings = schools
    .filter(s => s.facilities.classroomCondition.heavyDamage > 0)
    .sort((a, b) => b.facilities.classroomCondition.heavyDamage - a.facilities.classroomCondition.heavyDamage)
    .slice(0, 4);
  const avgBandwidth = schools.length > 0 ? (schools.reduce((sum, s) => sum + s.facilities.internetSpeedMbps, 0) / schools.length).toFixed(1) : '0';
  const fiberCoverage = schools.length > 0 ? Math.round(schools.filter(s => s.facilities.internetSpeedMbps >= 15).length / schools.length * 100) : 0;

  return (
    <div className="space-y-6" id="infrastructure-module">
      {/* Visual Analytics Panels */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Classrooms', value: totalClassrooms, desc: `Avg ${(totalClassrooms/totalSchools).toFixed(1)} blocks/school`, icon: Building2, color: 'text-indigo-400 border-indigo-950 bg-indigo-950/10' },
          { label: 'Heavy Damage Rooms', value: classroomConditions.heavyDamage, desc: `${Math.round((classroomConditions.heavyDamage/totalClassrooms)*100)}% of total classrooms`, icon: Flame, color: 'text-red-400 border-red-950 bg-red-950/10' },
          { label: 'Active Libraries / Labs', value: `${libraryCount} / ${labCount}`, desc: 'Library and Science Labs', icon: Library, color: 'text-cyan-400 border-cyan-950 bg-cyan-950/10' },
          { label: 'Sub-standard Internet', value: `${slowInternetSchools.length} Sek`, desc: 'Under 15 Mbps speed threshold', icon: Wifi, color: 'text-amber-400 border-amber-950 bg-amber-950/10' }
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
        {/* Left hand: Damaged school priorities & list */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1f2937] pb-3">
              <Wrench className="h-4.5 w-4.5 text-cyan-400" />
              <h4 className="font-bold text-xs tracking-wider text-slate-200 uppercase font-sans">
                CRITICAL BUILDING DAMAGE INSPECTION QUEUE
              </h4>
            </div>

            <div className="space-y-3.5">
              {criticalBuildings.map((school) => (
                <div key={school.npsn} className="p-4 rounded-lg bg-[#0c0e12]/60 border border-[#1f2937] flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-100 text-sm">{school.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Village: {school.village} • NPSN: {school.npsn}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 font-mono">
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 block uppercase">DAMAGED ROOMS</span>
                      <span className="text-sm font-bold text-red-400">
                        {school.facilities.classroomCondition.heavyDamage} Units
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-500 block uppercase">SANITARY DAMAGE</span>
                      <span className="text-sm font-bold text-amber-500">
                        {school.facilities.toiletsDamaged} Units
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase">HEALTH IMPACT</span>
                      <span className="text-xs font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900">
                        -{school.facilities.classroomCondition.heavyDamage * 12} PTS
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right hand: Sanitary & Internet stats (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Toilets & Sanitaries (WASH) */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
            <h4 className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans border-b border-[#1f2937] pb-2.5">
              WASH SANITARY INDEX (LATRINE AUDIT)
            </h4>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Sanitary Toilets: Compliant</span>
                <span className="font-bold text-emerald-400">{totalToiletsGood} Latrines</span>
              </div>
              <div className="w-full bg-[#0c0e12] h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${(totalToiletsGood / (totalToiletsGood + totalToiletsDamaged)) * 100}%` }} />
              </div>

              <div className="flex justify-between text-slate-300 pt-2">
                <span>Sanitary Toilets: Damaged</span>
                <span className="font-bold text-red-400">{totalToiletsDamaged} Latrines</span>
              </div>
              <div className="w-full bg-[#0c0e12] h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full" style={{ width: `${(totalToiletsDamaged / (totalToiletsGood + totalToiletsDamaged)) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Internet coverage statistics */}
          <div className="p-5 rounded-xl border bg-[#11141a]/60 border-[#1f2937] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-2.5">
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">
                BANDWIDTH METRIC HUD
              </span>
              <Globe className="h-4 w-4 text-sky-400" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="p-3 bg-[#0c0e12] rounded border border-[#1f2937]">
                <span className="text-[9px] text-slate-500 block uppercase">AVERAGE BANDWIDTH</span>
                <p className="text-lg font-bold text-sky-400 mt-1">{avgBandwidth} Mbps</p>
              </div>
              <div className="p-3 bg-[#0c0e12] rounded border border-[#1f2937]">
                <span className="text-[9px] text-slate-500 block uppercase">FIBER-TO-THE-SCHOOL</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{fiberCoverage}% Coverage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
