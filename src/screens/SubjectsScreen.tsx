import { useMemo, useState } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';
import { useSyncCollection } from '../hooks/useSyncStore';
import type { CardRecord } from '../memory/types';
import { triggerHaptic } from '../utils/haptics';

interface SubjectState {
  confidence?: number;
  mcqsDone?: number;
}

interface ErrorEntry {
  id: string;
  subject: string;
}

export default function SubjectsScreen() {
  const [partFilter, setPartFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [focusMsg, setFocusMsg] = useState('');
  const { items, putItem } = useSyncCollection<SubjectState>('subjects');
  const { items: errorRows } = useSyncCollection<ErrorEntry>('errors');
  const { items: cardRows } = useSyncCollection<CardRecord>('cards');
  const { items: settingsRows, putItem: putSetting } = useSyncCollection<{ value: unknown }>('settings');

  const map = new Map(items.map((r) => [r.id, r.data || {}]));

  const currentFocus = useMemo(() => {
    const r = settingsRows.find((s) => s.id === 'weeklyFocusSubject');
    return r?.data?.value ? String(r.data.value) : '';
  }, [settingsRows]);

  const mistakeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of errorRows) {
      const s = e.data?.subject;
      if (s) c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [errorRows]);

  const memoryCardCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const card of cardRows) {
      const deck = card.data?.deck;
      if (deck) c[deck] = (c[deck] || 0) + 1;
    }
    return c;
  }, [cardRows]);

  const list = DEFAULT_CONTENT_PACK.examPattern.subjectDistribution.filter(
    (s) => partFilter === 'ALL' || s.part === partFilter
  );

  const handleSetFocus = async (subject: string) => {
    triggerHaptic('success');
    await putSetting('weeklyFocusSubject', { value: subject });
    setFocusMsg(`Set "${subject}" as your active Smart Plan focus!`);
    setTimeout(() => setFocusMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">17 BDS Subjects</h1>
          <p className="text-xs text-slate-400 mt-1">Every subject is ~56 marks (14 Qs in Part A or B). No subject is skippable.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['ALL', 'A', 'B'] as const).map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPartFilter(part);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border min-h-[36px] transition-all ${
                partFilter === part ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              {part === 'ALL' ? 'All' : `Part ${part}`}
            </button>
          ))}
        </div>
      </div>

      {focusMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
          <span>{focusMsg}</span>
          <button type="button" onClick={() => setFocusMsg('')} className="text-emerald-300 font-bold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((subj) => {
          const st = map.get(subj.subject) || {};
          const conf = st.confidence ?? (subj.isWeak ? 45 : 75);
          const mcqs = st.mcqsDone ?? 0;
          const mistakeCount = mistakeCounts[subj.subject] || 0;
          const flashcardCount = memoryCardCounts[subj.subject] || 0;
          const isCurrentFocus = currentFocus === subj.subject;

          return (
            <div
              key={subj.subject}
              className={`glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 border transition-all ${
                isCurrentFocus ? 'border-sky-500/60 bg-sky-500/5 ring-1 ring-sky-500/20' : 'border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                      Part {subj.part}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white">{subj.subject}</h3>
                    {isCurrentFocus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white uppercase">
                        Active Focus
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {subj.questions} Questions - {subj.marks} Marks
                  </span>
                </div>
                {subj.isWeak && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    High Yield
                  </span>
                )}
              </div>

              {/* Metrics Row: Mistakes & FSRS Deck count */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Logged Mistakes</span>
                  <span className={`font-mono font-bold text-sm ${mistakeCount > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                    {mistakeCount} errors
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Memory Cards</span>
                  <span className="font-mono font-bold text-sm text-sky-400">
                    {flashcardCount} cards
                  </span>
                </div>
              </div>

              {/* Confidence Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Subject Confidence</span>
                  <span className="font-bold text-sky-400">{conf}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={conf}
                  onChange={(e) => void putItem(subj.subject, { ...st, confidence: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer h-2"
                />
              </div>

              {/* MCQs and Focus Action */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">MCQs: <strong className="text-white">{mcqs}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      void putItem(subj.subject, { ...st, mcqsDone: Math.max(0, mcqs - 50) });
                    }}
                    className="px-2 py-1 rounded bg-white/10 text-white font-bold text-[11px] min-h-[32px]"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      void putItem(subj.subject, { ...st, mcqsDone: mcqs + 50 });
                    }}
                    className="px-2 py-1 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30 text-[11px] min-h-[32px]"
                  >
                    +50
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSetFocus(subj.subject)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all min-h-[36px] ${
                    isCurrentFocus
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  {isCurrentFocus ? 'Focused in Plan' : 'Focus in Plan'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
