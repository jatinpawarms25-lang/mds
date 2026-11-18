import { useMemo, useState } from 'react';
import {
  computeCalibrationStats,
  computeGuessExpectedValue,
  type CalibrationAttempt,
  type ConfidenceTag
} from '../analytics/calibration';
import { DAILY_QUIZ_POOL } from '../data/questions';
import { generateUuid, syncEngine } from '../sync/syncEngine';

export default function DailyQuizScreen() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [confidence, setConfidence] = useState<ConfidenceTag>('sure');
  const [eliminated, setEliminated] = useState(0);
  const [attempts, setAttempts] = useState<CalibrationAttempt[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = DAILY_QUIZ_POOL[idx];
  const evInfo = useMemo(() => computeGuessExpectedValue(eliminated), [eliminated]);
  const summary = useMemo(() => computeCalibrationStats(attempts), [attempts]);

  const handleSelect = async (optIdx: number) => {
    if (selected !== null || skipped) return;
    setSelected(optIdx);
    const isCorrect = optIdx === q.correct;
    setScore((s) => s + (isCorrect ? 4 : -1));
    setAttempts((prev) => [...prev, { confidence, eliminatedCount: eliminated, skipped: false, isCorrect }]);
    await syncEngine.logImmutableEvent('attempts', {
      question_id: q.id,
      question_version: 1,
      mode: 'daily_quiz',
      selected_option: optIdx,
      is_correct: isCorrect,
      confidence,
      eliminated_count: eliminated,
      time_spent_ms: 0
    });
  };

  const handleSkip = async () => {
    if (selected !== null || skipped) return;
    setSkipped(true);
    setAttempts((prev) => [...prev, { confidence, eliminatedCount: eliminated, skipped: true, isCorrect: false }]);
    await syncEngine.logImmutableEvent('attempts', {
      question_id: q.id,
      question_version: 1,
      mode: 'daily_quiz',
      selected_option: null,
      skipped: true,
      confidence,
      eliminated_count: eliminated,
      time_spent_ms: 0
    });
  };

  const handleNext = async () => {
    if (idx + 1 < DAILY_QUIZ_POOL.length) {
      setIdx((p) => p + 1);
      setSelected(null);
      setSkipped(false);
      setEliminated(0);
    } else {
      setFinished(true);
      const id = generateUuid();
      await syncEngine.putRecordLocal('daily_quizzes', id, {
        id,
        date: new Date().toISOString().slice(0, 10),
        score,
        totalQuestions: DAILY_QUIZ_POOL.length,
        brierScore: summary.brierScore
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Daily Mixed Diagnostic Quiz</h1>
        <p className="text-xs text-slate-400 mt-1">
          Confidence &amp; Calibration Trainer (Part 8): tag Sure / Maybe / Guess before answering to track EV (5p - 1) and tie-break safety.
        </p>
      </div>

      {!finished ? (
        <div className="solid-clinical-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between text-xs">
            <span className="text-sky-400 font-bold">Q{idx + 1} / {DAILY_QUIZ_POOL.length} - {q.subject}</span>
            <span className="font-mono text-white">Score: {score}</span>
          </div>
          <div className="text-sm font-semibold text-white">{q.question}</div>

          {/* Pre-answer Confidence & Elimination Calibration */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">Confidence:</span>
                {(['sure', 'maybe', 'guess'] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setConfidence(tag)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize ${
                      confidence === tag ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold">Eliminated:</span>
                {[0, 1, 2].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEliminated(n)}
                    className={`px-2 py-1 rounded-lg font-mono font-bold ${
                      eliminated === n ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span>EV = <strong>+{evInfo.ev}</strong> ({evInfo.recommendation})</span>
              {selected === null && !skipped && (
                <button
                  type="button"
                  onClick={() => void handleSkip()}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold"
                >
                  Skip Question (0 marks)
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {q.options.map((opt, oIdx) => {
              let cls = 'bg-white/[0.03] border-white/10 text-slate-200';
              if (selected !== null || skipped) {
                if (oIdx === q.correct) cls = 'bg-emerald-500/25 border-emerald-400 text-white font-bold';
                else if (selected === oIdx) cls = 'bg-rose-500/25 border-rose-400 text-white';
              }
              return (
                <button
                  key={oIdx}
                  onClick={() => void handleSelect(oIdx)}
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs ${cls}`}
                >
                  {String.fromCharCode(65 + oIdx)}. {opt}
                </button>
              );
            })}
          </div>
          {(selected !== null || skipped) && (
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 space-y-2">
              <p>{q.explanation}</p>
              <button onClick={() => void handleNext()} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
                {idx + 1 < DAILY_QUIZ_POOL.length ? 'Next Question' : 'Finish Quiz'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="solid-clinical-card rounded-3xl p-8 space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-extrabold text-white">Quiz &amp; Calibration Complete</h3>
            <div className="text-3xl font-extrabold text-sky-400">{score} / {DAILY_QUIZ_POOL.length * 4}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs num-tabular">
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-slate-400">Brier Score</div>
              <div className="text-base font-extrabold text-white">{summary.brierScore}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-slate-400">Overconfidence</div>
              <div className="text-base font-extrabold text-amber-300">{summary.overconfidenceIndex}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-slate-400">Lost to Guesses</div>
              <div className="text-base font-extrabold text-rose-400">-{summary.marksLostToWrongGuesses}m</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="text-slate-400">What-If (Skip Guess)</div>
              <div className="text-base font-extrabold text-emerald-400">{summary.whatIfSkipWrongGuessesScore}</div>
            </div>
          </div>
          <div className="text-center">
            <button
              onClick={() => {
                setIdx(0);
                setSelected(null);
                setSkipped(false);
                setAttempts([]);
                setScore(0);
                setFinished(false);
              }}
              className="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
