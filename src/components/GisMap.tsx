import React, { useState, useMemo } from 'react';
import { School } from '../types';
import { ALL_SCHOOLS, VILLAGES, getSchoolDMS } from '../data/mockData';
import {
  Layers,
  Map,
  Grid,
  TrendingUp,
  Compass,
  AlertTriangle,
  Flame,
  Radio,
  FileCheck,
  CheckCircle,
  TrendingDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface GisMapProps {
  onSelectSchool: (school?: School) => void;
  selectedSchool?: School;
}

export default function GisMap({ onSelectSchool, selectedSchool }: GisMapProps) {
  // Map control states
  const [mapMode, setMapMode] = useState<'standard' | 'satellite' | 'terrain' | 'heatmap' | '3d'>('standard');
  const [zoom, setZoom] = useState<number>(13);
  
  // Layer toggles
  const [layers, setLayers] = useState({
    schools: true,
    villages: true,
    preciseCoordinates: true,
    teacherDensity: false,
    studentDensity: false,
    infrastructure: false,
    internet: false,
    certification: false,
    retirementRisk: false,
    floodOverlay: false,
    spmbZones: false
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Coordinates min/max for scaling onto the canvas (representing -6.818 to -6.862 Lat, 108.602 to 108.635 Lng)
  const mapBounds = {
    minLat: -6.865,
    maxLat: -6.815,
    minLng: 108.595,
    maxLng: 108.645
  };

  // Convert GPS coordinates to local percentage coordinates for absolute SVG placement
  const getXY = (lat: number, lng: number) => {
    const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
    // Latitude decreases as you go south, so invert Y to make North at the top
    const y = (1 - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat))) * 100;
    return { x, y };
  };

  // Village polygon representation for the map (Lemahabang centers)
  const villagePolygons = useMemo(() => {
    return [
      { name: 'Lemahabang', points: '40,35 60,35 62,55 42,58', color: 'rgba(59, 130, 246, 0.08)' },
      { name: 'Cipeujeuh Wetan', points: '20,25 40,35 42,50 22,48', color: 'rgba(16, 185, 129, 0.08)' },
      { name: 'Cipeujeuh Kulon', points: '5,22 20,25 22,48 8,45', color: 'rgba(245, 158, 11, 0.08)' },
      { name: 'Belawa', points: '22,50 42,58 38,82 18,78', color: 'rgba(139, 92, 246, 0.08)' },
      { name: 'Tuk Karangsuwung', points: '55,10 75,15 78,35 58,32', color: 'rgba(236, 72, 153, 0.08)' },
      { name: 'Picungpugur', points: '62,55 82,50 85,75 65,78', color: 'rgba(20, 184, 166, 0.08)' },
      { name: 'Sindanglaut', points: '18,48 42,50 38,65 15,62', color: 'rgba(14, 165, 233, 0.08)' },
      { name: 'Wangkelang', points: '38,82 65,78 62,95 35,95', color: 'rgba(239, 68, 68, 0.08)' }
    ];
  }, []);

  // Filter school markers
  const filteredSchools = useMemo(() => {
    return ALL_SCHOOLS.map(s => {
      const pos = getXY(s.coordinates.lat, s.coordinates.lng);
      return {
        ...s,
        x: pos.x,
        y: pos.y
      };
    });
  }, []);

  // Details for selected or hovered marker
  const [hoveredSchool, setHoveredSchool] = useState<School | null>(null);

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full p-4 overflow-hidden" id="gis-module">
      {/* Left side Map Frame */}
      <div className="flex-1 flex flex-col rounded-xl border relative overflow-hidden bg-[#11141a]/60 border-[#1f2937]" id="map-frame">
        {/* Map Header Toolbar */}
        <div className="p-4 border-b border-[#1f2937] bg-[#0c0e12]/80 flex flex-wrap justify-between items-center gap-3 z-10">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-cyan-400 animate-spin-slow" />
            <h3 className="font-bold text-sm tracking-wide text-slate-200 uppercase font-sans">
              GIS SPATIAL HUD — KECAMATAN LEMAHABANG
            </h3>
          </div>

          {/* Map Modes */}
          <div className="flex bg-[#0c0e12] p-1 rounded-lg border border-[#1f2937]">
            {(['standard', 'satellite', 'terrain', 'heatmap', '3d'] as const).map(mode => (
              <button
                key={mode}
                id={`map-mode-${mode}`}
                onClick={() => setMapMode(mode)}
                className={`px-3 py-1 text-[10px] uppercase font-mono rounded-md transition-all ${
                  mapMode === mode
                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Map Canvas / SVG Screen */}
        <div 
          className="flex-1 relative overflow-hidden flex items-center justify-center p-2 min-h-[400px]"
          style={{
            backgroundImage: mapMode === 'satellite' 
              ? 'radial-gradient(circle, #020617 20%, #090d1f 100%)' 
              : mapMode === 'terrain'
              ? 'linear-gradient(to bottom, #090d16, #05050c)'
              : 'none'
          }}
        >
          {/* 3D Perspective Wrapper */}
          <div 
            className="w-full h-full max-w-[650px] aspect-square relative transition-all duration-700 ease-out"
            style={mapMode === '3d' ? {
              transform: 'perspective(1000px) rotateX(40deg) rotateZ(-15deg) translateY(-20px)',
              transformStyle: 'preserve-3d'
            } : {}}
            id="vector-map-stage"
          >
            {/* Base grid / Terrain contours */}
            {mapMode === 'terrain' && (
              <div className="absolute inset-0 pointer-events-none opacity-20 border border-emerald-900/30">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <path d="M10,20 Q30,5 50,20 T90,20" fill="none" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2,2" />
                  <path d="M5,40 Q25,25 45,40 T85,40" fill="none" stroke="#10b981" strokeWidth="0.5" strokeDasharray="1,2" />
                  <path d="M15,60 Q35,45 55,60 T95,60" fill="none" stroke="#10b981" strokeWidth="0.5" strokeDasharray="3,1" />
                  <path d="M0,80 Q20,65 40,80 T80,80" fill="none" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2,2" />
                </svg>
              </div>
            )}

            {/* Satellite Mesh Grid */}
            {mapMode === 'satellite' && (
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1e1e38 1px, transparent 1px), linear-gradient(90deg, #1e1e38 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            )}

            {/* Main Interactive Map layer SVG */}
            <svg 
              className="w-full h-full relative" 
              viewBox="0 0 100 100" 
              id="gis-svg-map"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* High-Precision GPS/DMS Coordinate Grid Layer */}
              {layers.preciseCoordinates && (
                <g stroke="rgba(34, 211, 238, 0.15)" strokeWidth="0.1" fill="none">
                  {/* Latitude Grid Lines (Horizontal) */}
                  {[-6.82, -6.83, -6.84, -6.85, -6.86].map((lat, idx) => {
                    const pos = getXY(lat, 108.62);
                    return (
                      <g key={`lat-grid-${idx}`}>
                        <line x1="0" y1={pos.y} x2="100" y2={pos.y} strokeDasharray="1,2" />
                        <text
                          x="2"
                          y={pos.y - 0.5}
                          fill="rgba(34, 211, 238, 0.45)"
                          fontSize="1.3"
                          fontFamily="monospace"
                          stroke="none"
                        >
                          {lat.toFixed(3)}°S
                        </text>
                      </g>
                    );
                  })}
                  {/* Longitude Grid Lines (Vertical) */}
                  {[108.60, 108.61, 108.62, 108.63, 108.64].map((lng, idx) => {
                    const pos = getXY(-6.83, lng);
                    return (
                      <g key={`lng-grid-${idx}`}>
                        <line x1={pos.x} y1="0" x2={pos.x} y2="100" strokeDasharray="1,2" />
                        <text
                          x={pos.x + 0.5}
                          y="98"
                          fill="rgba(34, 211, 238, 0.45)"
                          fontSize="1.3"
                          fontFamily="monospace"
                          stroke="none"
                        >
                          {lng.toFixed(3)}°E
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Layer 2: Village Boundaries */}
              {layers.villages && villagePolygons.map((vp) => (
                <g key={vp.name}>
                   <polygon
                    points={vp.points}
                    fill={mapMode === 'satellite' ? 'rgba(51, 65, 85, 0.15)' : vp.color}
                    stroke={mapMode === 'satellite' ? '#1e293b' : 'rgba(6, 182, 212, 0.3)'}
                    strokeWidth="0.6"
                    className="transition-colors hover:fill-cyan-500/10 cursor-pointer"
                  />
                  {/* Village labels */}
                  {(() => {
                    const coords = vp.points.split(' ')[0].split(',');
                    const lx = parseFloat(coords[0]) + 2;
                    const ly = parseFloat(coords[1]) + 5;
                    return (
                      <text
                        x={lx}
                        y={ly}
                        fill={mapMode === 'command' ? '#f59e0b' : '#94a3b8'}
                        fontSize="2.2"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="pointer-events-none select-none opacity-70 tracking-widest"
                      >
                        {vp.name.toUpperCase()}
                      </text>
                    );
                  })()}
                </g>
              ))}

              {/* Layer 9: Flood/Disaster risk overlay */}
              {layers.floodOverlay && (
                <g opacity="0.4">
                  {/* Lower-altitude swampy zones near Belawa & Picungpugur */}
                  <ellipse cx="32" cy="72" rx="14" ry="7" fill="rgba(29, 78, 216, 0.6)" stroke="#2563eb" strokeWidth="0.4" />
                  <ellipse cx="72" cy="65" rx="10" ry="8" fill="rgba(29, 78, 216, 0.5)" stroke="#2563eb" strokeWidth="0.4" />
                  <text x="32" y="74" fill="#60a5fa" fontSize="2" fontWeight="bold" textAnchor="middle" fontFamily="monospace">ZONA BANJIR</text>
                </g>
              )}

              {/* Layer 10: SPMB student pressure zones */}
              {layers.spmbZones && (
                <g opacity="0.6">
                  {/* High growth centers */}
                  <circle cx="48" cy="42" r="12" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="1,1" className="animate-pulse" />
                  <circle cx="48" cy="42" r="8" fill="none" stroke="#ef4444" strokeWidth="0.3" />
                  <circle cx="48" cy="42" r="4" fill="rgba(239, 68, 68, 0.1)" />
                  <text x="48" y="38" fill="#f87171" fontSize="1.8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">TEKANAN SPMB</text>
                </g>
              )}

              {/* Layer 3: Teacher Density heatmap indicators */}
              {layers.teacherDensity && filteredSchools.map((s) => {
                const ratio = s.students.total / s.teachers.total;
                const isUnderstaffed = ratio > 25;
                return (
                  <circle
                    key={`td-${s.npsn}`}
                    cx={s.x}
                    cy={s.y}
                    r={isUnderstaffed ? "5" : "3"}
                    fill={isUnderstaffed ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)"}
                    stroke={isUnderstaffed ? "#ef4444" : "#10b981"}
                    strokeWidth="0.15"
                    strokeDasharray="1,1"
                  />
                );
              })}

              {/* Layer 4: Student density representation */}
              {layers.studentDensity && filteredSchools.map((s) => {
                const size = Math.min(10, Math.max(2.5, s.students.total / 140));
                return (
                  <circle
                    key={`sd-${s.npsn}`}
                    cx={s.x}
                    cy={s.y}
                    r={size}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="0.25"
                    opacity="0.4"
                  />
                );
              })}

              {/* Heatmap intensity rendering */}
              {mapMode === 'heatmap' && filteredSchools.map((s) => {
                const heatRadius = s.healthScore < 40 ? 12 : (s.healthScore < 60 ? 8 : 4);
                const heatColor = s.healthScore < 40 
                  ? "rgba(239, 68, 68, 0.35)" 
                  : (s.healthScore < 60 ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.1)");
                return (
                  <g key={`heat-${s.npsn}`}>
                    <radialGradient id={`grad-${s.npsn}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={s.healthScore < 40 ? "#ef4444" : "#f59e0b"} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={s.healthScore < 40 ? "#ef4444" : "#f59e0b"} stopOpacity="0" />
                    </radialGradient>
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={heatRadius}
                      fill={`url(#grad-${s.npsn})`}
                      className="pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* Layer 1: School Markers */}
              {layers.schools && filteredSchools.map((s) => {
                const isCritical = s.healthScore < 40;
                const isWarning = s.healthScore >= 40 && s.healthScore < 60;
                const isSelected = selectedSchool?.npsn === s.npsn;
                
                // Color code
                let markerColor = '#10b981'; // Good (Excellent/Green)
                if (isCritical) markerColor = '#ef4444'; // Critical Red
                else if (isWarning) markerColor = '#f59e0b'; // Warning Orange

                // Advanced overlays conditionally applied inside the single loop
                const showCertificationRing = layers.certification && s.teachers.pendingCertification > 2;
                const showRetirementRisk = layers.retirementRisk && s.teachers.retiringSoon > 1;
                const showInfraHighlight = layers.infrastructure && s.facilities.classroomCondition.heavyDamage > 0;
                const showInternetPulse = layers.internet && s.facilities.internetSpeedMbps < 15;

                return (
                  <g 
                    key={s.npsn} 
                    id={`marker-${s.npsn}`}
                    onClick={() => onSelectSchool(s)}
                    onMouseEnter={() => setHoveredSchool(s)}
                    onMouseLeave={() => setHoveredSchool(null)}
                    className="cursor-pointer group"
                  >
                    {/* Precise coordinates reticle when precise layer is active */}
                    {layers.preciseCoordinates && (
                      <g className="pointer-events-none opacity-80">
                        <circle cx={s.x} cy={s.y} r="2.2" stroke="#22d3ee" strokeWidth="0.08" strokeDasharray="0.4,0.4" fill="none" />
                        <line x1={s.x - 3} y1={s.y} x2={s.x + 3} y2={s.y} stroke="#22d3ee" strokeWidth="0.06" strokeDasharray="0.2,0.6" />
                        <line x1={s.x} y1={s.y - 3} x2={s.x} y2={s.y + 3} stroke="#22d3ee" strokeWidth="0.06" strokeDasharray="0.2,0.6" />
                      </g>
                    )}

                    {/* Pulsing glow ring for Critical schools */}
                    {isCritical && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r="3.5"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="0.4"
                        className="animate-ping origin-center"
                        style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                      />
                    )}

                    {/* Pending Certification indicator (cyan outer ring) */}
                    {showCertificationRing && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r="2.2"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="0.3"
                        strokeDasharray="0.8,0.4"
                      />
                    )}

                    {/* Heavy retirement risk indicator (purple star/burst overlay) */}
                    {showRetirementRisk && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r="1.8"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="0.35"
                      />
                    )}

                    {/* Heavy Infrastructure damage indicator (thick amber triangle base) */}
                    {showInfraHighlight && (
                      <polygon
                        points={`${s.x},${s.y - 1.8} ${s.x - 1.5},${s.y + 1.2} ${s.x + 1.5},${s.y + 1.2}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="0.3"
                      />
                    )}

                    {/* Poor Internet speed indicator (cross-slash) */}
                    {showInternetPulse && (
                      <line
                        x1={s.x - 1.2}
                        y1={s.y - 1.2}
                        x2={s.x + 1.2}
                        y2={s.y + 1.2}
                        stroke="#38bdf8"
                        strokeWidth="0.25"
                      />
                    )}

                    {/* Actual School Center Point Marker */}
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={isSelected ? "1.6" : "1.2"}
                      fill={markerColor}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "0.4" : "0.2"}
                      className="transition-all group-hover:scale-125"
                      style={{ transformOrigin: `${s.x}px ${s.y}px` }}
                    />

                    {/* Level label overlay inside marker */}
                    <text
                      x={s.x}
                      y={s.y + 0.3}
                      fill="#ffffff"
                      fontSize="0.9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {s.level}
                    </text>

                    {/* Label nama sekolah saat marker diklik */}
                    {isSelected && (
                      <g className="pointer-events-none select-none z-50">
                        {/* Background tooltip card with higher contrast */}
                        <rect
                          x={s.x - 22}
                          y={s.y - 8.2}
                          width="44"
                          height="5.4"
                          rx="0.8"
                          fill="#090d16"
                          stroke="#22d3ee"
                          strokeWidth="0.25"
                          className="opacity-95 shadow-2xl"
                        />
                        {/* Small decorative dot */}
                        <circle
                          cx={s.x - 19.5}
                          cy={s.y - 5.5}
                          r="0.6"
                          fill={markerColor}
                        />
                        <text
                          x={s.x - 17.5}
                          y={s.y - 4.5}
                          fill="#ffffff"
                          fontSize="1.6"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          textAnchor="start"
                        >
                          {s.name}
                        </text>
                        {/* Little indicator arrow pointing down to the marker */}
                        <polygon
                          points={`${s.x - 0.6},${s.y - 2.8} ${s.x + 0.6},${s.y - 2.8} ${s.x},${s.y - 2.1}`}
                          fill="#22d3ee"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Float-over details on hover */}
            {hoveredSchool && (
              <div 
                className="absolute bg-slate-950 border border-slate-800 text-white text-xs p-3 rounded-lg shadow-xl z-30 pointer-events-none max-w-xs transition-opacity duration-150"
                style={{
                  left: `${hoveredSchool.x + 2}%`,
                  top: `${hoveredSchool.y - 8}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="flex justify-between items-center gap-4 mb-1">
                  <span className="font-bold text-slate-100">{hoveredSchool.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    hoveredSchool.healthScore < 40 ? 'bg-red-950 text-red-400 border border-red-800' :
                    hoveredSchool.healthScore < 60 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {hoveredSchool.healthScore} PTS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <p>Desa: {hoveredSchool.village}</p>
                  <p>Siswa: {hoveredSchool.students.total} | Guru: {hoveredSchool.teachers.total}</p>
                  <p>Rasio Kelas: {hoveredSchool.facilities.classroomCondition.good} Baik / {hoveredSchool.facilities.classroomCondition.heavyDamage} Rusak Berat</p>
                  
                  <div className="mt-1.5 pt-1 border-t border-slate-800/80 font-mono text-[9.5px] space-y-0.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-sans">Decimal:</span>
                      <span className="text-cyan-400 font-bold">{hoveredSchool.coordinates.lat.toFixed(6)}, {hoveredSchool.coordinates.lng.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-sans">DMS:</span>
                      <span className="text-emerald-400 font-semibold">{getSchoolDMS(hoveredSchool).latDms}, {getSchoolDMS(hoveredSchool).lngDms}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Legend HUD */}
        <div className="p-4 border-t border-[#1f2937] bg-[#0c0e12]/80 flex flex-wrap gap-x-6 gap-y-2 items-center justify-between text-xs z-10">
          <div className="flex flex-wrap items-center gap-4 text-slate-400 font-mono">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">KONDISI:</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> &gt;=75 Prima</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> 40-74 Cukup</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> &lt;40 Kritis</span>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            BOUNDS: {mapBounds.minLat}, {mapBounds.minLng} — {mapBounds.maxLat}, {mapBounds.maxLng}
          </div>
        </div>
      </div>

      {/* Right side Control Dashboard Panel */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4" id="gis-control-panel">
        {/* Spatial Layer Manager */}
        <div className="p-4 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-[#1f2937] pb-2">
            <Layers className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="font-bold text-xs tracking-wider text-slate-200 uppercase font-sans">
              LAYERS CONTROLLER
            </h4>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
            {[
              { id: 'schools', label: '1. School Markers', icon: CheckCircle, color: 'text-emerald-400' },
              { id: 'preciseCoordinates', label: `2. Koordinat Presisi (${ALL_SCHOOLS.length} SDN)`, icon: Compass, color: 'text-cyan-400' },
              { id: 'villages', label: '3. Village Boundaries', icon: Compass, color: 'text-cyan-400' },
              { id: 'teacherDensity', label: '4. Teacher Deficit Zones', icon: AlertTriangle, color: 'text-red-400' },
              { id: 'studentDensity', label: '5. Student Hotspots', icon: TrendingUp, color: 'text-violet-400' },
              { id: 'infrastructure', label: '6. Classroom Damages', icon: Flame, color: 'text-amber-500' },
              { id: 'internet', label: '7. Internet Deficiencies', icon: Radio, color: 'text-sky-400' },
              { id: 'certification', label: '8. Certification Pending', icon: FileCheck, color: 'text-cyan-400' },
              { id: 'retirementRisk', label: '9. Retirement Exposures', icon: TrendingDown, color: 'text-purple-400' },
              { id: 'floodOverlay', label: '10. Flood Hazard Overlays', icon: AlertTriangle, color: 'text-blue-400' },
              { id: 'spmbZones', label: '11. SPMB Density Rings', icon: Sparkles, color: 'text-rose-400' }
            ].map(l => {
              const Icon = l.icon;
              const isToggled = layers[l.id as keyof typeof layers];
              return (
                <button
                  key={l.id}
                  id={`toggle-layer-${l.id}`}
                  onClick={() => toggleLayer(l.id as keyof typeof layers)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all ${
                    isToggled 
                      ? 'bg-[#0c0e12] border border-[#1f2937] text-slate-200' 
                      : 'hover:bg-slate-900/50 text-slate-500 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${isToggled ? l.color : 'opacity-40'}`} />
                    <span>{l.label}</span>
                  </div>
                  <div className={`h-2.5 w-6 rounded-full relative transition-colors ${
                    isToggled ? 'bg-cyan-600' : 'bg-slate-800'
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full bg-white absolute top-0.5 transition-all ${
                      isToggled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected School Profile Panel */}
        <div className="flex-1 p-4 rounded-xl border bg-[#11141a]/60 border-[#1f2937] flex flex-col gap-3 justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-2 mb-2">
              <span className="font-bold text-xs tracking-wider text-slate-400 uppercase font-sans">
                SPOTLIGHT NODE
              </span>
              {selectedSchool && (
                <span className="text-[10px] text-slate-500 font-mono">
                  NPSN {selectedSchool.npsn}
                </span>
              )}
            </div>

            {selectedSchool ? (
              <div className="space-y-3" id="gis-spotlight-profile">
                <div>
                  <h5 className="font-bold text-sm text-slate-100">{selectedSchool.name}</h5>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    LEVEL: {selectedSchool.level} • STATUS: {selectedSchool.status} • AKREDITASI: {selectedSchool.accreditation}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded bg-[#0c0e12] border border-[#1f2937]">
                    <span className="text-[9px] text-slate-500 uppercase">HEALTH INDEX</span>
                    <p className={`text-sm font-bold mt-0.5 ${
                      selectedSchool.healthScore < 40 ? 'text-red-400' :
                      selectedSchool.healthScore < 60 ? 'text-amber-400' :
                      'text-emerald-400'
                    }`}>
                      {selectedSchool.healthScore}/100
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[#0c0e12] border border-[#1f2937]">
                    <span className="text-[9px] text-slate-500 uppercase">SISWA / GURU</span>
                    <p className="text-sm font-bold text-cyan-400 mt-0.5">
                      {selectedSchool.students.total} / {selectedSchool.teachers.total}
                    </p>
                  </div>
                </div>

                {/* Risk Indicators checkboard */}
                <div className="space-y-1 bg-[#0c0e12]/60 p-2.5 rounded-lg border border-[#1f2937]">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">DETEKSI ANOMALI RISIKO</span>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${selectedSchool.riskIndicators.teacherShortage ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                      <span>Defisit Guru</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${selectedSchool.riskIndicators.studentOverload ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
                      <span>Kelebihan Siswa</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${selectedSchool.riskIndicators.infrastructureCritical ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'}`} />
                      <span>Rusak Berat</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${selectedSchool.riskIndicators.retirementExposure ? 'bg-purple-500 animate-pulse' : 'bg-slate-700'}`} />
                      <span>Siklus Pensiun</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                Click any school marker on the map to query dynamic profile indicators.
              </div>
            )}
          </div>

          {selectedSchool && (
            <div className="pt-2.5 border-t border-[#1f2937] space-y-2">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">GPS DECIMAL COORDINATES:</div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5 select-all font-bold">
                  {selectedSchool.coordinates.lat.toFixed(6)}, {selectedSchool.coordinates.lng.toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">GPS DMS COORDINATES:</div>
                <div className="text-[11px] font-mono text-emerald-400 mt-0.5 select-all font-bold">
                  {getSchoolDMS(selectedSchool).latDms}, {getSchoolDMS(selectedSchool).lngDms}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
