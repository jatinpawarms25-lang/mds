import { useEffect, useState } from 'react';
import { CBT_PART_A_MOCK_QUESTIONS, CBT_PART_B_MOCK_QUESTIONS } from '../data/questions';
import { useSyncCollection } from '../hooks/useSyncStore';
import { generateUuid, syncEngine } from '../sync/syncEngine';

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

  useEffect(() => {
    if (!cbtActive) return;
    const t = setInterval(() => {
      if (cbtPart === 'A') {
        setTimerA((p) => {
          if (p <= 1) {
            setPartALocked(true);
            setCbtPart('B');
            setIdx(0);
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

  const handleLogMock = async () => {
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
      payload: { source, totalScore: calcScore }
    });
  };

  const qList = cbtPart === 'A' ? CBT_PART_A_MOCK_QUESTIONS : CBT_PART_B_MOCK_QUESTIONS;
  const q = qList[idx] || qList[0];

  const finishCbt = async () => {
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">CBT Simulator & Mocks</h1>
        <p className="text-xs text-slate-400 mt-1">Part A: 100 Qs / 75 min strict lock. Part B: 140 Qs / 105 min. +4 / -1 / 0.</p>
      </div>

      {cbtActive ? (
        <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-500/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="text-xs font-bold text-sky-400">
              Part {cbtPart} ({partALocked ? 'Part A Locked' : 'Part A Active'}) - Q{idx + 1}/{qList.length}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-amber-300">
                {Math.floor((cbtPart === 'A' ? timerA : timerB) / 60)}:
                {String((cbtPart === 'A' ? timerA : timerB) % 60).padStart(2, '0')}
              </span>
              {cbtPart === 'A' ? (
                <button
                  onClick={() => {
                    setPartALocked(true);
                    setCbtPart('B');
                    setIdx(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
                >
                  Lock Part A & Start Part B
                </button>
              ) : (
                <button onClick={() => void finishCbt()} className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold">
                  Submit CBT
                </button>
              )}
            </div>
          </div>

          <div className="text-sm font-semibold text-white">{q.num}. {q.q}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {q.options.map((opt, oIdx) => (
              <button
                key={oIdx}
                onClick={() => setAnswers((p) => ({ ...p, [q.id]: oIdx }))}
                className={`p-3 rounded-xl border text-left ${
                  answers[q.id] === oIdx ? 'bg-sky-500/25 border-sky-400 text-white font-bold' : 'bg-white/[0.02] border-white/10 text-slate-300'
                }`}
              >
                {String.fromCharCode(65 + oIdx)}. {opt}
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setIdx((p) => Math.max(0, p - 1))} className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold">
              Prev
            </button>
            <button onClick={() => setIdx((p) => Math.min(qList.length - 1, p + 1))} className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold">
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 text-center space-y-3">
          <h3 className="text-base font-bold text-white">Timed CBT Simulator (Part A 75m Lock)</h3>
          <button
            onClick={() => {
              setCbtActive(true);
              setCbtPart('A');
              setPartALocked(false);
              setTimerA(75 * 60);
              setTimerB(105 * 60);
              setIdx(0);
              setAnswers({});
            }}
            className="px-5 py-2.5 rounded-2xl bg-sky-500 text-white font-bold text-xs apple-press"
          >
            Start Timed CBT Session
          </button>
        </div>
      )}

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Mock Score Calculator (+4 / -1 / 0)</h3>
            <p className="text-xs text-slate-400">202 Correct & 22 Wrong = 786 / 960. Targets: 765 (AIR 10) & 790 (Goal).</p>
          </div>
          <strong className="text-lg font-extrabold text-emerald-400">{calcScore} / 960</strong>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-white col-span-2 sm:col-span-1" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
          <input type="number" min={0} max={100} value={aC} onChange={(e) => setAC(Number(e.target.value))} placeholder="Part A C" className="bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
          <input type="number" min={0} max={100} value={aW} onChange={(e) => setAW(Number(e.target.value))} placeholder="Part A W" className="bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
          <input type="number" min={0} max={140} value={bC} onChange={(e) => setBC(Number(e.target.value))} placeholder="Part B C" className="bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
          <input type="number" min={0} max={140} value={bW} onChange={(e) => setBW(Number(e.target.value))} placeholder="Part B W" className="bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
        </div>
        <button onClick={() => void handleLogMock()} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs apple-press">
          + Log Mock to Cloud Sync
        </button>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Marks-Leak &amp; Wrong-Answer Budget (Part 8)</h3>
            <p className="text-xs text-slate-400">
              Total Wrong: {aW + bW} (Default budget &lt;= 22 per 240-Q mock) | Negative marks leaked: -{aW + bW} | What-if skipped: {calcScore + aW + bW} / 960
            </p>
          </div>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${aW + bW <= 22 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {aW + bW <= 22 ? 'Within 22-Wrong Budget' : `Over Budget by ${aW + bW - 22}`}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs num-tabular">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-slate-400">Part A Pacing Target</div>
            <div className="font-bold text-white mt-0.5">45s / Q (100 Qs / 75 min)</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-slate-400">2026 AIR 10 Marker</div>
            <div className="font-bold text-sky-400 mt-0.5">765 / 960 ({calcScore >= 765 ? `+${calcScore - 765}` : `${calcScore - 765}`})</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="text-slate-400">Working Target Marker</div>
            <div className="font-bold text-emerald-400 mt-0.5">790 / 960 ({calcScore >= 790 ? `+${calcScore - 790}` : `${calcScore - 790}`})</div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white">Synced Mock History ({mocks.length})</h3>
        {mocks.map((m) => (
          <div key={m.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white">{m.data.source}</div>
              <div className="text-slate-400">{m.data.date} - Accuracy {m.data.accuracy}%</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-sky-400">{m.data.totalScore} / 960</div>
              <button onClick={() => void deleteItem(m.id)} className="text-[11px] text-rose-400 hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
