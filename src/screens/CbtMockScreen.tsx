import { useEffect, useMemo, useState } from 'react';
import { CBT_PART_A_MOCK_QUESTIONS, CBT_PART_B_MOCK_QUESTIONS } from '../data/questions';
import { useSyncCollection } from '../hooks/useSyncStore';
import { generateUuid, syncEngine } from '../sync/syncEngine';
import { triggerHaptic } from '../utils/haptics';

interface MockRecord {
  id: string;
  date: string;
  source: string;
  partA_C: number;
  partA_W: number;
  partA_U: number;
  partB_C: number;
  partB_W: number;
  partB_U: number;
  totalScore: number;
  accuracy: number;
}

export default function CbtMockScreen() {
  const { items: mocks, putItem, deleteItem } = useSyncCollection<MockRecord>('mocks');
  const [source, setSource] = useState('Ecdentistry Free Weekly Mock');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [aC, setAC] = useState(82);
  const [aW, setAW] = useState(14);
  const [bC, setBC] = useState(120);
  const [bW, setBW] = useState(8);

  const [cbtActive, setCbtActive] = useState(false);
  const [cbtPart, setCbtPart] = useState<'A' | 'B'>('A');
  const [partALocked, setPartALocked] = useState(false);
  const [timerA, setTimerA] = useState(75 * 60);
  const [timerB, setTimerB] = useState(105 * 60);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [qElapsed, setQElapsed] = useState(0);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    if (!cbtActive) return;
    const t = setInterval(() => {
      setQElapsed((p) => p + 1);
      if (cbtPart === 'A') {
        setTimerA((p) => {
          if (p <= 1) {
            setPartALocked(true);
            setCbtPart('B');
            setIdx(0);
            setQElapsed(0);
            triggerHaptic('warning');
            return 0;
          }
          return p - 1;
        });
      } else {
        setTimerB((p) => (p <= 1 ? 0 : p - 1));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [cbtActive, cbtPart]);

  const calcScore = (aC + bC) * 4 - (aW + bW);
  const totalWrong = aW + bW;
  const partBWrongShare = totalWrong > 0 ? Math.round((bW / totalWrong) * 100) : 0;
  const partBScore = bC * 4 - bW;

  const tieBreakTier = useMemo(() => {
    if (bW <= 8 && totalWrong <= 20) {
      return {
        level: 'Bulletproof Top-10 Safe',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        desc: 'Fewer than 9 Part B wrongs. Under NBE Rule 15.2, your score will defeat 95%+ of tied candidates in counseling.'
      };
    }
    if (bW <= 12 && totalWrong <= 24) {
      return {
        level: 'Competitive Defense',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        desc: 'Good control of clinical errors. Keep Part B guesses under strict 5p - 1 Expected Value threshold.'
      };
    }
    return {
      level: 'Tie-Break Vulnerable',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      desc: `${bW} wrongs in Part B (${partBWrongShare}% of total leakage). Tied scores will rank lower because NBE checks Part B wrongs first.`
    };
  }, [bW, totalWrong, partBWrongShare]);

  const handleLogMock = async () => {
    triggerHaptic('success');
    const aU = Math.max(0, 100 - aC - aW);
    const bU = Math.max(0, 140 - bC - bW);
    const att = aC + bC + aW + bW;
    const accuracy = att > 0 ? Math.round(((aC + bC) / att) * 1000) / 10 : 0;
    const id = generateUuid();
    await putItem(id, {
      id,
      date,
      source,
      partA_C: aC,
      partA_W: aW,
      partA_U: aU,
      partB_C: bC,
      partB_W: bW,
      partB_U: bU,
      totalScore: calcScore,
      accuracy
    });
    await syncEngine.logImmutableEvent('study_sessions', {
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: 180 * 60 * 1000,
      subject: 'Full Mock',
      kind: 'cbt_mock',
      payload: { source, totalScore: calcScore, tieBreakTier: tieBreakTier.level }
    });
  };

  const qList = cbtPart === 'A' ? CBT_PART_A_MOCK_QUESTIONS : CBT_PART_B_MOCK_QUESTIONS;
  const q = qList[idx] || qList[0];

  const handleSelectOption = (qId: string, optIdx: number) => {
    triggerHaptic('light');
    setAnswers((p) => ({ ...p, [qId]: optIdx }));
  };

  const handleToggleMark = (qId: string) => {
    triggerHaptic('medium');
    setMarked((p) => ({ ...p, [qId]: !p[qId] }));
  };

  const handleJumpQuestion = (targetIdx: number) => {
    triggerHaptic('light');
    setIdx(targetIdx);
    setQElapsed(0);
    setShowPalette(false);
  };

  const finishCbt = async () => {
    triggerHaptic('success');
    setCbtActive(false);
    let pAC = 0;
    let pAW = 0;
    CBT_PART_A_MOCK_QUESTIONS.forEach((item) => {
      if (answers[item.id] === item.correct) pAC++;
      else if (answers[item.id] !== undefined) pAW++;
    });
    let pBC = 0;
    let pBW = 0;
    CBT_PART_B_MOCK_QUESTIONS.forEach((item) => {
      if (answers[item.id] === item.correct) pBC++;
      else if (answers[item.id] !== undefined) pBW++;
    });
    const totalScore = (pAC + pBC) * 4 - (pAW + pBW);
    const id = generateUuid();
    await putItem(id, {
      id,
      date: new Date().toISOString().slice(0, 10),
      source: 'CBT Simulator Session',
      partA_C: pAC,
      partA_W: pAW,
      partA_U: CBT_PART_A_MOCK_QUESTIONS.length - pAC - pAW,
      partB_C: pBC,
      partB_W: pBW,
      partB_U: CBT_PART_B_MOCK_QUESTIONS.length - pBC - pBW,
      totalScore,
      accuracy: 0
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">CBT Simulator &amp; Mocks</h1>
          <p className="text-xs text-slate-400 mt-1">Part A: 100 Qs / 75 min strict lock. Part B: 140 Qs / 105 min. Official +4 / -1 / 0 NBE rule.</p>
        </div>
      </div>

      {cbtActive ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 border border-sky-500/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-400">
                Part {cbtPart} ({partALocked ? 'Part A Locked' : 'Part A Active'}) - Q{idx + 1}/{qList.length}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  qElapsed > 60
                    ? 'bg-rose-500/20 text-rose-300'
                    : qElapsed > 45
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                Pacing: {qElapsed}s (Target 45s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-amber-300 bg-black/40 px-2.5 py-1 rounded-xl">
                {Math.floor((cbtPart === 'A' ? timerA : timerB) / 60)}:
                {String((cbtPart === 'A' ? timerA : timerB) % 60).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => setShowPalette((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
              >
                {showPalette ? 'Hide Palette' : 'Palette'}
              </button>
              {cbtPart === 'A' ? (
                <button
                  type="button"
                  onClick={() => {
                    setPartALocked(true);
                    setCbtPart('B');
                    setIdx(0);
                    setQElapsed(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold apple-press"
                >
                  Lock Part A &amp; Go to B
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void finishCbt()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold apple-press"
                >
                  Submit CBT
                </button>
              )}
            </div>
          </div>

          {/* Prometric Question Palette Drawer */}
          {showPalette && (
            <div className="p-3 bg-black/30 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-bold">TCS iON Status Palette:</span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Answered</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> Review</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-600" /> Unanswered</span>
                </div>
              </div>
              <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-1.5 max-h-36 overflow-y-auto p-1">
                {qList.map((item, qI) => {
                  const isAns = answers[item.id] !== undefined;
                  const isRev = Boolean(marked[item.id]);
                  const isCur = qI === idx;
                  const bg = isCur
                    ? 'ring-2 ring-sky-400 bg-sky-500 text-white'
                    : isRev
                    ? 'bg-purple-600 text-white'
                    : isAns
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-slate-300';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleJumpQuestion(qI)}
                      className={`h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-all ${bg}`}
                    >
                      {qI + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-sm font-semibold text-white leading-relaxed">{q.num}. {q.q}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {q.options.map((opt, oIdx) => (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleSelectOption(q.id, oIdx)}
                className={`p-3.5 rounded-xl border text-left min-h-[44px] transition-all apple-press ${
                  answers[q.id] === oIdx
                    ? 'bg-sky-500/25 border-sky-400 text-white font-bold shadow-sm'
                    : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="font-mono font-bold mr-1.5">{String.fromCharCode(65 + oIdx)}.</span> {opt}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setIdx((p) => Math.max(0, p - 1));
                setQElapsed(0);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-bold min-h-[44px]"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => handleToggleMark(q.id)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold min-h-[44px] ${
                marked[q.id]
                  ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              {marked[q.id] ? 'Marked for Review' : 'Mark for Review'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIdx((p) => Math.min(qList.length - 1, p + 1));
                setQElapsed(0);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-bold min-h-[44px]"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 text-center space-y-3">
          <h3 className="text-base font-bold text-white">Timed CBT Simulator (Part A 75m Lock + TCS iON Palette)</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Experience the real pressure: 100 questions in Part A strictly auto-locking after 75 minutes, followed by 140 questions in Part B.
          </p>
          <button
            type="button"
            onClick={() => {
              setCbtActive(true);
              setCbtPart('A');
              setPartALocked(false);
              setTimerA(75 * 60);
              setTimerB(105 * 60);
              setIdx(0);
              setAnswers({});
              setMarked({});
              setQElapsed(0);
            }}
            className="px-5 py-3 rounded-2xl bg-sky-500 text-white font-bold text-xs apple-press shadow-md"
          >
            Start Timed CBT Session
          </button>
        </div>
      )}

      {/* Official NBE Rule 15.2 Tie-Break Index & Calculator */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Mock Score Calculator (+4 / -1 / 0)</h3>
            <p className="text-xs text-slate-400">202 Correct &amp; 22 Wrong = 786 / 960. Targets: 765 (AIR 10) &amp; 790 (Goal).</p>
          </div>
          <strong className="text-xl font-extrabold text-emerald-400 font-mono">{calcScore} / 960</strong>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Source</label>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Part A Correct</label>
            <input type="number" min={0} max={100} value={aC} onChange={(e) => setAC(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Part A Wrong</label>
            <input type="number" min={0} max={100} value={aW} onChange={(e) => setAW(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Part B Correct</label>
            <input type="number" min={0} max={140} value={bC} onChange={(e) => setBC(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm min-h-[44px]" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Part B Wrong</label>
            <input type="number" min={0} max={140} value={bW} onChange={(e) => setBW(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm min-h-[44px]" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogMock()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs apple-press min-h-[44px]"
        >
          + Log Mock to Cloud Sync
        </button>
      </div>

      {/* NBE Rule 15.2 Tie-Break Index Card */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 border border-sky-500/25">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">NBE Official Tie-Break Defense Index (Rule 15.2)</h3>
            <p className="text-xs text-slate-400">
              In NEET-MDS counseling, ties in marks are broken by: 1) Total wrong, 2) Higher Part B score, 3) Fewer Part B wrong.
            </p>
          </div>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${tieBreakTier.badge}`}>
            {tieBreakTier.level}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs num-tabular">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Wrongs</span>
            <div className="font-extrabold text-white text-base">
              {totalWrong} <span className="text-xs font-normal text-slate-400">/ 22 target cap</span>
            </div>
            <p className="text-[11px] text-slate-400">Negative leak: -{totalWrong} marks</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Part B Clinical Score</span>
            <div className="font-extrabold text-sky-400 text-base font-mono">
              {partBScore} <span className="text-xs font-normal text-slate-400">/ 560 max</span>
            </div>
            <p className="text-[11px] text-slate-400">Breaks tie if total score is equal</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Part B Wrongs</span>
            <div className="font-extrabold text-amber-300 text-base font-mono">
              {bW} <span className="text-xs font-normal text-slate-400">({partBWrongShare}% of mistakes)</span>
            </div>
            <p className="text-[11px] text-slate-400">Rule 15.2(c) tie-break decider</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
          {tieBreakTier.desc}
        </p>
      </div>

      {/* Mock History */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
        <h3 className="text-sm font-bold text-white">Synced Mock History ({mocks.length})</h3>
        {mocks.length === 0 ? (
          <p className="text-xs text-slate-400">No mock sessions logged yet. Enter your scores above or start a CBT session.</p>
        ) : (
          mocks.map((m) => (
            <div key={m.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs gap-3">
              <div>
                <div className="font-bold text-white">{m.data.source}</div>
                <div className="text-slate-400 text-[11px]">
                  {m.data.date} - Part A: {m.data.partA_C}C/{m.data.partA_W}W - Part B: {m.data.partB_C}C/{m.data.partB_W}W
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base sm:text-lg font-extrabold text-sky-400 font-mono">{m.data.totalScore} / 960</div>
                <button
                  type="button"
                  onClick={() => void deleteItem(m.id)}
                  className="text-[11px] text-rose-400 hover:underline min-h-[30px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
