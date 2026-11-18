import { useState } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';

export default function OmfsDeepDiveScreen() {
  const [ang, setAng] = useState(1);
  const [depth, setDepth] = useState(2);
  const [ramus, setRamus] = useState(3);
  const total = ang + depth + ramus;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">OMFS Deep Dive</h1>
        <p className="text-xs text-slate-400 mt-1">AIQ Round 1 closing ranks, Pederson Index, Fractures, Spaces, and INI-CET separation.</p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3 border border-sky-500/30">
        <h3 className="text-base font-extrabold text-white">Why Top-10 Matters for OMFS</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{DEFAULT_CONTENT_PACK.omfsDeepDive.whyTop10Matters}</p>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
          {DEFAULT_CONTENT_PACK.omfsDeepDive.iniCetWarning}
        </div>
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
