import { useMemo, useState } from 'react';
import { GOVT_COLLEGES_DATA, type CollegeRow } from '../data/questions';
import { useSyncCollection } from '../hooks/useSyncStore';
import { triggerHaptic } from '../utils/haptics';

interface ShortlistEntry {
  id: string;
  name: string;
  priority: number;
  notes: string;
}

export function estimateMarksForRank(closingRank: number): number {
  if (closingRank <= 1) return 810;
  if (closingRank <= 5) return 790;
  if (closingRank <= 10) return 765;
  if (closingRank <= 25) return 745;
  if (closingRank <= 55) return 720;
  if (closingRank <= 85) return 698;
  if (closingRank <= 120) return 678;
  return 658;
}

export default function CollegesScreen() {
  const { items, putItem, deleteItem } = useSyncCollection<ShortlistEntry>('shortlist');
  const { items: settingsRows, putItem: putSetting } = useSyncCollection<{ value: unknown }>('settings');
  const { items: mocks } = useSyncCollection<{ totalScore: number; date: string }>('mocks');

  const sorted = [...items].sort((a, b) => (a.data.priority || 999) - (b.data.priority || 999));

  const latestMockScore = useMemo(() => {
    if (mocks.length === 0) return null;
    const s = [...mocks].sort((a, b) => a.data.date.localeCompare(b.data.date));
    return s[s.length - 1].data.totalScore;
  }, [mocks]);

  const targetCollegeId = useMemo(() => {
    const r = settingsRows.find((s) => s.id === 'targetCollegeId');
    return r?.data?.value ? String(r.data.value) : 'c17';
  }, [settingsRows]);

  const handleSetGoalCollege = async (c: CollegeRow) => {
    triggerHaptic('success');
    const reqMarks = estimateMarksForRank(c.closingRank);
    await putSetting('targetCollegeId', { value: c.id });
    await putSetting('targetCollegeName', { value: c.name });
    await putSetting('targetCollegeMarks', { value: reqMarks });
    await putSetting('targetScore', { value: reqMarks });
  };

  const handleAdd = async (c: CollegeRow) => {
    if (sorted.some((s) => s.id === c.id)) return;
    triggerHaptic('success');
    const reqMarks = estimateMarksForRank(c.closingRank);
    await putItem(c.id, {
      id: c.id,
      name: c.name,
      priority: sorted.length + 1,
      notes: `AIQ R1 Rank: ${c.closingRank} (~${reqMarks}/960 marks) | Stipend: Rs ${c.stipendMonthly.toLocaleString()}/mo`
    });
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    triggerHaptic('light');
    const a = sorted[idx];
    const b = sorted[targetIdx];
    await putItem(a.id, { ...a.data, priority: targetIdx + 1 });
    await putItem(b.id, { ...b.data, priority: idx + 1 });
  };

  const [simRank, setSimRank] = useState<string>('');
  const parsedRank = Number(simRank);
  const hasSimRank = simRank.trim() !== '' && Number.isFinite(parsedRank) && parsedRank >= 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">Colleges, Cutoffs &amp; Required Marks</h1>
          <p className="text-xs text-slate-400 mt-1">
            2026 Baseline Cutoffs &amp; Safe Marks. A rank reaches a seat only if Rank &lt;= Closing Rank.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="sim-rank-input" className="text-sm font-bold text-slate-300 shrink-0">Check AIR:</label>
          <input
            id="sim-rank-input"
            type="number"
            min={1}
            value={simRank}
            onChange={(e) => setSimRank(e.target.value)}
            placeholder="e.g. 10"
            className="flex-1 sm:w-28 sm:flex-none bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white min-h-[44px]"
          />
        </div>
      </div>

      {/* Shortlist section */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3 border border-sky-500/30">
        <h2 className="text-sm sm:text-base font-extrabold text-white">My Priority Shortlist ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="text-xs text-slate-400">No colleges shortlisted yet. Tap + Shortlist below.</p>
        ) : (
          sorted.map((col, idx) => (
            <div key={col.id} className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center font-mono shrink-0 mt-0.5 sm:mt-0">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-white break-words">{col.data.name}</div>
                  <div className="text-[11px] text-slate-400 break-words">{col.data.notes}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <button type="button" onClick={() => void handleMove(idx, -1)} disabled={idx === 0} className="px-2.5 py-1.5 rounded-lg bg-white/10 disabled:opacity-30 text-white font-bold min-h-[36px] min-w-[36px] text-xs">Up</button>
                <button type="button" onClick={() => void handleMove(idx, 1)} disabled={idx === sorted.length - 1} className="px-2.5 py-1.5 rounded-lg bg-white/10 disabled:opacity-30 text-white font-bold min-h-[36px] min-w-[36px] text-xs">Down</button>
                <button type="button" onClick={() => void deleteItem(col.id)} className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold min-h-[36px] min-w-[36px] text-xs">x</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Card Layout (< md / 768px) */}
      <div className="md:hidden space-y-3">
        {GOVT_COLLEGES_DATA.map((c) => {
          const reqMarks = estimateMarksForRank(c.closingRank);
          const isGoal = targetCollegeId === c.id;
          const diffPct =
            latestMockScore !== null ? Math.round(((latestMockScore - reqMarks) / reqMarks) * 1000) / 10 : null;
          return (
            <div
              key={c.id}
              className={`glass-card rounded-2xl p-4 space-y-3 ${
                isGoal ? 'border-sky-500/50 ring-1 ring-sky-500/20' : ''
              }`}
            >
              {/* College Header */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white leading-snug break-words min-w-0">{c.name}</h3>
                  {isGoal && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-extrabold uppercase whitespace-nowrap">
                      GOAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{c.state}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AIR Closing Rank</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-mono font-bold text-sky-400 text-sm">AIR {c.closingRank}</span>
                    {hasSimRank && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        parsedRank <= c.closingRank ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {parsedRank <= c.closingRank ? 'Reachable' : 'Out'}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Est. Marks Req</div>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">
                    {reqMarks} <span className="text-[11px] text-slate-400 font-normal">/ 960</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">% Gap</div>
                  <div className="mt-0.5">
                    {diffPct === null ? (
                      <span className="text-slate-400 text-xs font-mono">Log mock</span>
                    ) : diffPct >= 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                        +{diffPct}%
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        {diffPct}%
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stipend</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                    Rs {c.stipendMonthly.toLocaleString()}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                  </div>
                </div>
              </div>

              {/* Full-Width Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleSetGoalCollege(c)}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm min-h-[44px] transition-all apple-press ${
                    isGoal ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/15'
                  }`}
                >
                  {isGoal ? 'Goal Set' : 'Set as Goal'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdd(c)}
                  className="w-full py-2.5 rounded-xl bg-sky-500/20 text-sky-300 font-bold text-sm min-h-[44px] transition-all apple-press hover:bg-sky-500/30"
                >
                  + Shortlist
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (hidden on mobile, visible >= md / 768px) */}
      <div className="hidden md:block glass-card rounded-3xl p-6 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] uppercase text-slate-400 border-b border-white/10">
            <tr>
              <th className="py-2 px-3">Institute</th>
              <th className="py-2 px-3">State</th>
              <th className="py-2 px-3">R1 Rank</th>
              <th className="py-2 px-3">Est. Marks Req</th>
              <th className="py-2 px-3">Your Gap</th>
              <th className="py-2 px-3">Stipend/Mo</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 num-tabular">
            {GOVT_COLLEGES_DATA.map((c) => {
              const reqMarks = estimateMarksForRank(c.closingRank);
              const isGoal = targetCollegeId === c.id;
              const diffPct =
                latestMockScore !== null ? Math.round(((latestMockScore - reqMarks) / reqMarks) * 1000) / 10 : null;
              return (
                <tr key={c.id} className={isGoal ? 'bg-sky-500/10' : ''}>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {c.name}
                    {isGoal && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-extrabold">
                        ACTIVE GOAL
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">{c.state}</td>
                  <td className="py-2.5 px-3 font-mono text-sky-400">
                    AIR {c.closingRank}
                    {hasSimRank && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          parsedRank <= c.closingRank
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {parsedRank <= c.closingRank ? 'Reachable' : 'Out'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-white">{reqMarks} / 960</td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    {diffPct === null ? (
                      <span className="text-slate-400">Log mock</span>
                    ) : diffPct >= 0 ? (
                      <span className="text-emerald-400">+{diffPct}% (Safe)</span>
                    ) : (
                      <span className="text-amber-300">{diffPct}% ({latestMockScore! - reqMarks}m)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">Rs {c.stipendMonthly.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => void handleSetGoalCollege(c)}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        isGoal ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                      }`}
                    >
                      {isGoal ? 'Goal Set' : 'Set as Goal'}
                    </button>
                    <button onClick={() => void handleAdd(c)} className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold">
                      + Shortlist
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
