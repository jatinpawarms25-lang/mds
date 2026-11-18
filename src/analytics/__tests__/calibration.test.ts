import { describe, expect, it } from 'vitest';
import { computeCalibrationStats, computeGuessExpectedValue } from '../calibration';

describe('Part 8 Confidence & Calibration Trainer', () => {
  it('computes +4/-1 expected value (5p - 1) by eliminated options', () => {
    expect(computeGuessExpectedValue(0).ev).toBe(0.25);
    expect(computeGuessExpectedValue(1).ev).toBe(0.67);
    expect(computeGuessExpectedValue(2).ev).toBe(1.5);
  });

  it('computes Brier score, overconfidence index, and Marks-Leak what-if score', () => {
    const summary = computeCalibrationStats([
      { confidence: 'sure', eliminatedCount: 2, skipped: false, isCorrect: true },
      { confidence: 'sure', eliminatedCount: 1, skipped: false, isCorrect: false },
      { confidence: 'guess', eliminatedCount: 0, skipped: false, isCorrect: false },
      { confidence: 'guess', eliminatedCount: 0, skipped: true, isCorrect: false }
    ]);

    expect(summary.totalAnswered).toBe(3);
    expect(summary.totalSkipped).toBe(1);
    expect(summary.rawScore).toBe(2); // 4 - 1 - 1
    expect(summary.marksLostToWrongGuesses).toBe(1);
    expect(summary.whatIfSkipWrongGuessesScore).toBe(3);
    expect(summary.brierScore).toBeGreaterThan(0);
    expect(summary.overconfidenceIndex).toBeGreaterThan(0);
  });
});
