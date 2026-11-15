import type { ScreenId } from '../screens/TodayScreen';

interface Props {
  currentScore: number | null;
  targetScore: number;
  targetCollegeName: string;
  targetCollegeMarks: number;
  weakSubject?: string;
  onNavigate: (id: ScreenId) => void;
}

export function GoalProximityMeter({
  currentScore,
  targetScore,
  targetCollegeName,
  targetCollegeMarks,
  weakSubject,
  onNavigate
}: Props) {
  const effectiveTarget = targetCollegeMarks || targetScore || 790;
  const hasMock = currentScore !== null && currentScore > 0;
  const score = hasMock ? currentScore : 0;

  // Percentage relative to target: e.g. +4.2% above goal, or -11.4% from goal ("11.4% near your goal")
  const diffMarks = score - effectiveTarget;
  const pctDelta = Math.round((diffMarks / effectiveTarget) * 1000) / 10;
  const progressRatio = Math.min(100, Math.max(4, Math.round((score / effectiveTarget) * 100)));

  const extraCorrectNeeded = diffMarks < 0 ? Math.ceil(Math.abs(diffMarks) / 4) : 0;

  const isOnTarget = hasMock && diffMarks >= 0;
  const isClose = hasMock && diffMarks < 0 && Math.abs(pctDelta) <= 15;

  const statusHeadline = !hasMock
    ? 'Baseline Mock Needed (-100% from goal)'
    : isOnTarget
      ? `+${pctDelta}% Above Goal (+${diffMarks} marks buffer!)`
      : `${pctDelta}% from Goal (${Math.abs(pctDelta)}% away - need +${Math.abs(diffMarks)} marks)`;

  const actionAdvice = !hasMock
    ? 'Take 1 timed CBT Mock or log your latest mock score to unlock your live % distance to your dream college.'
    : isOnTarget
      ? `You are clearing ${targetCollegeName} (${effectiveTarget}/960)! Protect Part B accuracy and keep daily FSRS reviews at 0 backlog.`
      : `Convert ${extraCorrectNeeded} more questions (+${extraCorrectNeeded * 4} marks) and cut 5 blind guesses (+5 marks)${
          weakSubject ? ` starting with ${weakSubject}` : ''
        }.`;

  return (
    <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-400/30 fluid-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
            Real-Time Goal & College Proximity Meter
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white mt-2 num-tabular">
            {statusHeadline}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Dream Target: <strong className="text-sky-300">{targetCollegeName}</strong> (Req: <strong className="text-white num-tabular">{effectiveTarget} / 960</strong>) | Your Latest: <strong className="text-emerald-300 num-tabular">{hasMock ? `${score} / 960` : 'No mock logged'}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('colleges')}
            className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white apple-press"
          >
            Change Goal College
          </button>
          <button
            onClick={() => onNavigate('cbt_mock')}
            className="px-3.5 py-2 rounded-2xl bg-sky-500 text-xs font-bold text-white apple-press"
          >
            {hasMock ? '+ Update Mock Score' : '+ Log First Mock'}
          </button>
        </div>
      </div>

      {/* Liquid Glass Progress Gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-bold num-tabular">
          <span className="text-slate-400">0</span>
          <span className="text-amber-300">AIR 50 (~725)</span>
          <span className="text-sky-300">AIR 10 (765)</span>
          <span className="text-emerald-300">Goal ({effectiveTarget})</span>
          <span className="text-slate-400">960</span>
        </div>
        <div className="w-full h-4 rounded-full bg-black/40 border border-white/15 overflow-hidden p-0.5">
          <div
            style={{ width: `${progressRatio}%`, transition: 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
            className={`h-full rounded-full ${
              isOnTarget
                ? 'bg-gradient-to-r from-emerald-500 to-sky-400'
                : isClose
                  ? 'bg-gradient-to-r from-sky-500 to-amber-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
          />
        </div>
      </div>

      {/* Actionable How-To-Improve Prescription */}
      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="font-extrabold text-sky-300 uppercase text-[10px] tracking-wider">
            What To Do Today To Close The Gap
          </div>
          <p className="text-slate-200">{actionAdvice}</p>
        </div>
        {weakSubject && (
          <button
            onClick={() => onNavigate('memory')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold apple-press shrink-0"
          >
            Drill {weakSubject} Cards
          </button>
        )}
      </div>
    </div>
  );
}
