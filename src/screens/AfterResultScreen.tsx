import { useSyncCollection } from '../hooks/useSyncStore';

const ROUNDS = [
  { key: 'r1', name: 'Round 1 (AIQ & Deemed)', rules: 'Free exit available (deposit safe).' },
  { key: 'r2', name: 'Round 2 (Fresh Choices)', rules: 'Seat allotted & not joined = Rs 25,000 deposit forfeited.' },
  { key: 'r3', name: 'Round 3 (Mop-Up)', rules: 'Non-joining forfeits deposit + debarred from further MCC rounds.' },
  { key: 'stray', name: 'Stray Vacancy Round', rules: 'Only for candidates holding no earlier seat; allotted seat MUST be joined.' }
];

export default function AfterResultScreen() {
  const { items, putItem } = useSyncCollection<{ value: boolean }>('counselling');
  const map = new Map(items.map((r) => [r.id, Boolean(r.data?.value)]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">After the Result Hub</h1>
        <p className="text-xs text-slate-400 mt-1">Historical rank bands (2024-2026), 3-year ROI, Freeze/Float, and synced round tracker.</p>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white">3-Year Residency Net Return (Stipend x 36 - Total Course Fee)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-black/30 border border-white/10">
            <strong className="text-white">MAIDS, Delhi</strong>
            <div className="text-emerald-400 font-bold mt-1">+Rs 41,01,108 Net</div>
          </div>
          <div className="p-4 rounded-2xl bg-black/30 border border-white/10">
            <strong className="text-white">KGMU, Lucknow</strong>
            <div className="text-sky-400 font-bold mt-1">+Rs 39,03,796 Net</div>
          </div>
          <div className="p-4 rounded-2xl bg-black/30 border border-white/10">
            <strong className="text-white">Deemed (KIDS Example)</strong>
            <div className="text-rose-400 font-bold mt-1">-Rs 26,64,000 Net</div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white">MCC Round-by-Round Counselling Tracker</h3>
        {ROUNDS.map((r) => {
          const done = map.get(r.key) ?? false;
          return (
            <button
              key={r.key}
              onClick={() => void putItem(r.key, { value: !done })}
              className={`w-full text-left p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
                done ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/10 text-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-white/10'}`}>
                {done ? 'v' : ''}
              </div>
              <div>
                <div className="font-bold text-white">{r.name}</div>
                <div className="text-[11px] text-slate-400">{r.rules}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
