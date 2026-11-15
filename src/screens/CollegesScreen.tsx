import { GOVT_COLLEGES_DATA, type CollegeRow } from '../data/questions';
import { useSyncCollection } from '../hooks/useSyncStore';

interface ShortlistEntry {
  id: string;
  name: string;
  priority: number;
  notes: string;
}

export default function CollegesScreen() {
  const { items, putItem, deleteItem } = useSyncCollection<ShortlistEntry>('shortlist');
  const sorted = [...items].sort((a, b) => (a.data.priority || 999) - (b.data.priority || 999));

  const handleAdd = async (c: CollegeRow) => {
    if (sorted.some((s) => s.id === c.id)) return;
    await putItem(c.id, {
      id: c.id,
      name: c.name,
      priority: sorted.length + 1,
      notes: `AIQ R1 Rank: ${c.closingRank} | Stipend: Rs ${c.stipendMonthly.toLocaleString()}/mo`
    });
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[targetIdx];
    await putItem(a.id, { ...a.data, priority: targetIdx + 1 });
    await putItem(b.id, { ...b.data, priority: idx + 1 });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Colleges & Priority Shortlist</h1>
        <p className="text-xs text-slate-400 mt-1">16 AIQ Govt Colleges + MAIDS. Shortlist persists in IndexedDB and syncs via HLC + tombstones.</p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3 border border-sky-500/30">
        <h2 className="text-base font-extrabold text-white">My Priority Shortlist ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="text-xs text-slate-400">No colleges shortlisted yet. Tap + Shortlist below.</p>
        ) : (
          sorted.map((col, idx) => (
            <div key={col.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center font-mono">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-bold text-white">{col.data.name}</div>
                  <div className="text-[11px] text-slate-400">{col.data.notes}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => void handleMove(idx, -1)} disabled={idx === 0} className="px-2 py-1 rounded bg-white/10 disabled:opacity-30 text-white font-bold">Up</button>
                <button onClick={() => void handleMove(idx, 1)} disabled={idx === sorted.length - 1} className="px-2 py-1 rounded bg-white/10 disabled:opacity-30 text-white font-bold">Down</button>
                <button onClick={() => void deleteItem(col.id)} className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-bold">x</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="glass-card rounded-3xl p-6 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] uppercase text-slate-400 border-b border-white/10">
            <tr>
              <th className="py-2 px-3">Institute</th>
              <th className="py-2 px-3">State</th>
              <th className="py-2 px-3">Closing Rank</th>
              <th className="py-2 px-3">Stipend/Mo</th>
              <th className="py-2 px-3">Bond</th>
              <th className="py-2 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {GOVT_COLLEGES_DATA.map((c) => (
              <tr key={c.id}>
                <td className="py-2.5 px-3 font-semibold text-white">{c.name}</td>
                <td className="py-2.5 px-3">{c.state}</td>
                <td className="py-2.5 px-3 font-mono text-sky-400">{c.closingRank}</td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">Rs {c.stipendMonthly.toLocaleString()}</td>
                <td className="py-2.5 px-3">{c.bondYears > 0 ? `${c.bondYears}y` : 'None'}</td>
                <td className="py-2.5 px-3 text-right">
                  <button onClick={() => void handleAdd(c)} className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold">
                    + Shortlist
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
