import { useEffect, useState } from 'react';

export interface StudyTip {
  tag: string;
  title: string;
  tip: string;
}

export const HIGH_YIELD_TIPS: StudyTip[] = [
  {
    tag: 'Part A Speed Rule',
    title: '45 Seconds Per Question Cap',
    tip: 'Part A (100 Qs) locks strictly at 75 minutes. Finish first pass in 60 mins and never spend >90s on a calculation.'
  },
  {
    tag: 'Tie-Break Secret',
    title: 'Protect Part B Accuracy Twice',
    tip: 'Official tie-breaks (a), (b), and (c) reward fewer total wrongs, higher Part B score, and fewer Part B wrongs. Skip blind guesses.'
  },
  {
    tag: 'OMFS Recall',
    title: 'Pederson Index = 6 (Moderate)',
    tip: 'Mesioangular (1) + Level B (2) + Class III (3) = 6. Remember: in Maxilla, Mesioangular is hardest and Distoangular is easiest!'
  },
  {
    tag: 'Dental Materials',
    title: 'Gypsum W/P Ratios',
    tip: 'Type I Plaster: 0.50-0.75 | Type II Model: 0.45-0.50 | Type III Stone: 0.28-0.30 | Type IV Die Stone: 0.22-0.24.'
  },
  {
    tag: 'Local Anesthesia',
    title: 'Cardiac Adrenaline Limit = 0.04 mg',
    tip: 'ASA III/IV cardiac limit is 0.04 mg adrenaline (~2 cartridges of 1:100,000). Healthy max is 0.2 mg.'
  },
  {
    tag: 'Public Health',
    title: 'Every Part B Subject = 56 Marks',
    tip: 'PHD (14 Qs = 56 marks) carries the exact same weight as OMFS or Prostho. 20 mins of daily index revision protects top-10 rank.'
  },
  {
    tag: 'Radiology Spotter',
    title: 'OKC vs Ameloblastoma',
    tip: 'OKC grows anteroposteriorly along the medullary cavity with minimal cortical expansion; Ameloblastoma expands buccolingually + knife-edge root resorption.'
  },
  {
    tag: 'FSRS Memory Tip',
    title: 'Never Press Hard When You Forgot',
    tip: 'In FSRS, Hard is a passing grade. If you forgot the answer, press 1 (Again) so stability recalibrates accurately.'
  }
];

export function CornerTipsCoach() {
  const [idx, setIdx] = useState(0);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((p) => (p + 1) % HIGH_YIELD_TIPS.length);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const cur = HIGH_YIELD_TIPS[idx];

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 lg:bottom-5 right-4 z-30 liquid-pill px-3.5 py-2 rounded-full text-[11px] font-extrabold text-sky-300 apple-press"
      >
        + Rank-10 Tip
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-4 z-30 max-w-xs w-[300px] liquid-pill rounded-2xl p-3.5 text-xs space-y-1.5 fluid-screen">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/25 text-sky-300">
          {cur.tag}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIdx((p) => (p + 1) % HIGH_YIELD_TIPS.length)}
            className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-200 font-bold hover:bg-white/20"
          >
            Next Tip
          </button>
          <button
            onClick={() => setMinimized(true)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-bold"
            title="Minimize"
          >
            -
          </button>
        </div>
      </div>
      <div className="font-extrabold text-white text-xs">{cur.title}</div>
      <p className="text-[11px] text-slate-300 leading-relaxed">{cur.tip}</p>
    </div>
  );
}
