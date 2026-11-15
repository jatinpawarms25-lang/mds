import { useState } from 'react';
import { DAILY_QUIZ_POOL } from '../data/questions';
import { generateUuid, syncEngine } from '../sync/syncEngine';

export default function DailyQuizScreen() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = DAILY_QUIZ_POOL[idx];

  const handleSelect = async (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const isCorrect = optIdx === q.correct;
    setScore((s) => s + (isCorrect ? 4 : -1));
    await syncEngine.logImmutableEvent('attempts', {
      question_id: q.id,
      question_version: 1,
      mode: 'daily_quiz',
      selected_option: optIdx,
      is_correct: isCorrect,
      time_spent_ms: 0
    });
  };

  const handleNext = async () => {
    if (idx + 1 < DAILY_QUIZ_POOL.length) {
      setIdx((p) => p + 1);
      setSelected(null);
    } else {
      setFinished(true);
      const id = generateUuid();
      await syncEngine.putRecordLocal('daily_quizzes', id, {
        id,
        date: new Date().toISOString().slice(0, 10),
        score,
        totalQuestions: DAILY_QUIZ_POOL.length
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Daily Mixed Diagnostic Quiz</h1>
        <p className="text-xs text-slate-400 mt-1">Every attempt logs an immutable insert-only event to Supabase.</p>
      </div>

      {!finished ? (
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between text-xs">
            <span className="text-sky-400 font-bold">Q{idx + 1} / {DAILY_QUIZ_POOL.length} - {q.subject}</span>
            <span className="font-mono text-white">Score: {score}</span>
          </div>
          <div className="text-sm font-semibold text-white">{q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, oIdx) => {
              let cls = 'bg-white/[0.03] border-white/10 text-slate-200';
              if (selected !== null) {
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
          {selected !== null && (
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 space-y-2">
              <p>{q.explanation}</p>
              <button onClick={() => void handleNext()} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
                {idx + 1 < DAILY_QUIZ_POOL.length ? 'Next Question' : 'Finish Quiz'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-8 text-center space-y-3">
          <h3 className="text-lg font-extrabold text-white">Quiz Complete</h3>
          <div className="text-3xl font-extrabold text-sky-400">{score} / {DAILY_QUIZ_POOL.length * 4}</div>
          <button
            onClick={() => {
              setIdx(0);
              setSelected(null);
              setScore(0);
              setFinished(false);
            }}
            className="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs"
          >
            Retake Quiz
          </button>
        </div>
      )}
    </div>
  );
}
