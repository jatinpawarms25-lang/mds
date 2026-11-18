export type ConfidenceTag = 'sure' | 'maybe' | 'guess';

export interface CalibrationAttempt {
  confidence: ConfidenceTag;
  eliminatedCount: number; // 0, 1, 2, or 3
  skipped: boolean;
  isCorrect: boolean;
}

export interface CalibrationSummary {
  totalAnswered: number;
  totalSkipped: number;
  rawScore: number;
  whatIfSkipWrongGuessesScore: number;
  marksLostToWrongGuesses: number;
  brierScore: number;
  overconfidenceIndex: number;
  byConfidence: Record<ConfidenceTag, { count: number; correct: number; accuracyPct: number }>;
}

const CONFIDENCE_PROB: Record<ConfidenceTag, number> = {
  sure: 0.9,
  maybe: 0.6,
  guess: 0.25
};

export function computeGuessExpectedValue(eliminatedCount: number): { probability: number; ev: number; recommendation: string } {
  const clamped = Math.min(3, Math.max(0, Math.round(eliminatedCount)));
  const probability = 1 / (4 - clamped);
  const ev = Math.round((5 * probability - 1) * 100) / 100;
  const recommendation =
    clamped >= 2
      ? 'Attempt (+1.50 EV, strong tie-break safety)'
      : clamped === 1
      ? 'Borderline (+0.67 EV; hurts tie-break (a) if wrong)'
      : 'Skip on blind guess (0.25 prob hurts tie-break (a))';
  return { probability: Math.round(probability * 1000) / 1000, ev, recommendation };
}

export function computeCalibrationStats(attempts: CalibrationAttempt[]): CalibrationSummary {
  const byConfidence: CalibrationSummary['byConfidence'] = {
    sure: { count: 0, correct: 0, accuracyPct: 0 },
    maybe: { count: 0, correct: 0, accuracyPct: 0 },
    guess: { count: 0, correct: 0, accuracyPct: 0 }
  };

  let totalAnswered = 0;
  let totalSkipped = 0;
  let rawScore = 0;
  let marksLostToWrongGuesses = 0;
  let brierSum = 0;
  let confSum = 0;
  let correctSum = 0;

  for (const a of attempts) {
    if (a.skipped) {
      totalSkipped += 1;
      continue;
    }
    totalAnswered += 1;
    const outcome = a.isCorrect ? 1 : 0;
    rawScore += a.isCorrect ? 4 : -1;
    if (!a.isCorrect && a.confidence === 'guess') {
      marksLostToWrongGuesses += 1;
    }

    const bucket = byConfidence[a.confidence];
    bucket.count += 1;
    if (a.isCorrect) bucket.correct += 1;

    const p = CONFIDENCE_PROB[a.confidence];
    brierSum += Math.pow(p - outcome, 2);
    confSum += p;
    correctSum += outcome;
  }

  for (const key of ['sure', 'maybe', 'guess'] as const) {
    const b = byConfidence[key];
    b.accuracyPct = b.count > 0 ? Math.round((b.correct / b.count) * 1000) / 10 : 0;
  }

  const brierScore = totalAnswered > 0 ? Math.round((brierSum / totalAnswered) * 1000) / 1000 : 0;
  const overconfidenceIndex =
    totalAnswered > 0 ? Math.round(((confSum - correctSum) / totalAnswered) * 1000) / 1000 : 0;

  return {
    totalAnswered,
    totalSkipped,
    rawScore,
    whatIfSkipWrongGuessesScore: rawScore + marksLostToWrongGuesses,
    marksLostToWrongGuesses,
    brierScore,
    overconfidenceIndex,
    byConfidence
  };
}
