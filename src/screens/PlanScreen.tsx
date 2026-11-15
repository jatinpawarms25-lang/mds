import { STUDY_PLAN_WEEKS } from '../data/studyData';
import { useSyncCollection } from '../hooks/useSyncStore';

export default function PlanScreen() {
  const { items, putItem } = useSyncCollection<{ completed: boolean }>('plan_weeks');
  const completedMap = new Map(items.map((r) => [r.id, Boolean(r.data?.completed)]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">23-Week Study Plan</h1>
        <p className="text-xs text-slate-400 mt-1">160 Days - Compress Phase 3 if the bulletin moves the date, never Phase 1.</p>
      </div>
      <div className="space-y-4">
        {STUDY_PLAN_WEEKS.map((week) => {
          const id = String(week.week);
          const done = completedMap.get(id) ?? false;
          return (
            <div key={week.week} className="glass-card rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30">
                    Week {week.week}
                  </span>
                  <span className="text-xs font-bold text-white">{week.phaseName}</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => void putItem(id, { completed: !done })}
                    className="w-4 h-4 rounded"
                  />
                  <span>Completed</span>
                </label>
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div><strong className="text-white">Subjects:</strong> {week.subjects}</div>
                <div><strong className="text-white">Goal:</strong> {week.goal}</div>
                <div><strong className="text-white">Mocks / Tests:</strong> {week.mocks}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
