import { useState } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';
import { useSyncCollection } from '../hooks/useSyncStore';

interface SubjectState {
  confidence?: number;
  mcqsDone?: number;
}

export default function SubjectsScreen() {
  const [partFilter, setPartFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const { items, putItem } = useSyncCollection<SubjectState>('subjects');
  const map = new Map(items.map((r) => [r.id, r.data || {}]));

  const list = DEFAULT_CONTENT_PACK.examPattern.subjectDistribution.filter(
    (s) => partFilter === 'ALL' || s.part === partFilter
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">17 BDS Subjects</h1>
          <p className="text-xs text-slate-400 mt-1">Every subject is ~56 marks (14-15 Qs). No subject is skippable.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['ALL', 'A', 'B'] as const).map((part) => (
            <button
              key={part}
              onClick={() => setPartFilter(part)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                partFilter === part ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              {part === 'ALL' ? 'All' : `Part ${part}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((subj) => {
          const st = map.get(subj.subject) || {};
          const conf = st.confidence ?? (subj.isWeak ? 45 : 75);
          const mcqs = st.mcqsDone ?? 0;

          return (
            <div key={subj.subject} className="glass-card rounded-3xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                      Part {subj.part}
                    </span>
                    <h3 className="text-xs font-bold text-white">{subj.subject}</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {subj.questions} Questions - {subj.marks} Marks
                  </span>
                </div>
                {subj.isWeak && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    Priority Focus
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Confidence</span>
                  <span className="font-bold text-sky-400">{conf}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={conf}
                  onChange={(e) => void putItem(subj.subject, { ...st, confidence: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">
                  MCQs Solved: <strong className="text-white">{mcqs}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void putItem(subj.subject, { ...st, mcqsDone: Math.max(0, mcqs - 50) })}
                    className="px-2 py-0.5 rounded bg-white/10 text-white font-bold"
                  >
                    -50
                  </button>
                  <button
                    onClick={() => void putItem(subj.subject, { ...st, mcqsDone: mcqs + 50 })}
                    className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
