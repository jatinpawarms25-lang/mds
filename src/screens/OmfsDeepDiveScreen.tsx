import { useRef, useState, type PointerEvent } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';

interface Point {
  x: number;
  y: number;
}

function angleDeg(p1: Point, vertex: Point, p2: Point): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return Math.round((Math.acos(cos) * 180) / Math.PI * 10) / 10;
}

export default function OmfsDeepDiveScreen() {
  const [ang, setAng] = useState(1);
  const [depth, setDepth] = useState(2);
  const [ramus, setRamus] = useState(3);
  const total = ang + depth + ramus;

  // Appendix E3: Interactive SVG Cephalometric Tracing (S, N, A, B)
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<'S' | 'N' | 'A' | 'B' | null>(null);
  const [pts, setPts] = useState<{ S: Point; N: Point; A: Point; B: Point }>({
    S: { x: 95, y: 65 },
    N: { x: 220, y: 55 },
    A: { x: 226, y: 145 },
    B: { x: 214, y: 195 }
  });

  const sna = angleDeg(pts.S, pts.N, pts.A);
  const snb = angleDeg(pts.S, pts.N, pts.B);
  const anb = Math.round((sna - snb) * 10) / 10;
  const skelClass = anb > 4 ? 'Class II (> 4 deg)' : anb < 0 ? 'Class III (< 0 deg)' : 'Class I (0-4 deg)';

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.min(290, Math.max(20, ((e.clientX - rect.left) / rect.width) * 320));
    const y = Math.min(220, Math.max(20, ((e.clientY - rect.top) / rect.height) * 240));
    setPts((prev) => ({ ...prev, [dragging]: { x: Math.round(x), y: Math.round(y) } }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">OMFS &amp; Orthognathic Deep Dive</h1>
        <p className="text-xs text-slate-400 mt-1">AIQ Round 1 closing ranks, Pederson Index, interactive Cephalometric ANB tracer, and INI-CET separation.</p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3 border border-sky-500/30">
        <h3 className="text-base font-extrabold text-white">Why Top-10 Matters for OMFS</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{DEFAULT_CONTENT_PACK.omfsDeepDive.whyTop10Matters}</p>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
          {DEFAULT_CONTENT_PACK.omfsDeepDive.iniCetWarning}
        </div>
      </div>

      {/* Appendix E3: Interactive SVG Cephalometric Tracing */}
      <div className="solid-clinical-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Interactive Cephalometric Tracing (Drag S, N, A, B)</h3>
            <p className="text-xs text-slate-400">Drag landmarks to watch SNA, SNB, and ANB classify Skeletal Class I / II / III.</p>
          </div>
          <div className="flex gap-3 text-xs font-mono font-bold num-tabular">
            <span className="text-sky-400">SNA: {sna} deg</span>
            <span className="text-indigo-400">SNB: {snb} deg</span>
            <span className="text-emerald-400">ANB: {anb} deg ({skelClass})</span>
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox="0 0 320 240"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
          className="w-full max-w-md mx-auto h-60 rounded-2xl bg-slate-950 border border-white/10 touch-none select-none"
        >
          <line x1={pts.S.x} y1={pts.S.y} x2={pts.N.x} y2={pts.N.y} stroke="#38bdf8" strokeWidth={2} />
          <line x1={pts.N.x} y1={pts.N.y} x2={pts.A.x} y2={pts.A.y} stroke="#10b981" strokeWidth={2} />
          <line x1={pts.N.x} y1={pts.N.y} x2={pts.B.x} y2={pts.B.y} stroke="#a855f7" strokeWidth={2} />
          {(['S', 'N', 'A', 'B'] as const).map((k) => (
            <g key={k} onPointerDown={() => setDragging(k)} className="cursor-grab active:cursor-grabbing">
              <circle cx={pts[k].x} cy={pts[k].y} r={8} fill="#0ea5e9" stroke="#ffffff" strokeWidth={2} />
              <text x={pts[k].x + 11} y={pts[k].y + 4} fill="#f8fafc" fontSize="11" fontWeight="bold">
                {k}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Pederson Difficulty Index Calculator</h3>
            <p className="text-xs text-slate-400">3-4 Slightly Difficult, 5-6 Moderately Difficult, 7-10 Very Difficult (Pederson 1988; some sources quote 5-7 / 8-10)</p>
          </div>
          <strong className="text-lg font-extrabold text-sky-400">
            {total} / 10 ({total <= 4 ? 'Easy' : total <= 6 ? 'Moderate' : 'Very Difficult'})
          </strong>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <select value={ang} onChange={(e) => setAng(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
            <option value={1} className="bg-slate-900">Mesioangular (1)</option>
            <option value={2} className="bg-slate-900">Horizontal (2)</option>
            <option value={3} className="bg-slate-900">Vertical (3)</option>
            <option value={4} className="bg-slate-900">Distoangular (4)</option>
          </select>
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
            <option value={1} className="bg-slate-900">Level A (1)</option>
            <option value={2} className="bg-slate-900">Level B (2)</option>
            <option value={3} className="bg-slate-900">Level C (3)</option>
          </select>
          <select value={ramus} onChange={(e) => setRamus(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
            <option value={1} className="bg-slate-900">Class I (1)</option>
            <option value={2} className="bg-slate-900">Class II (2)</option>
            <option value={3} className="bg-slate-900">Class III (3)</option>
          </select>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white">AIQ Round 1 (2025, General) OMFS Closing Ranks</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {DEFAULT_CONTENT_PACK.omfsDeepDive.aiqRound1ClosingRanks2025.map((row) => (
            <div key={row.institute} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between">
              <span className="text-slate-200">{row.institute}</span>
              <strong className="text-sky-400 font-mono">AIR {row.closingRank}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
