import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DECK_OPTIONS,
  fsrsNextIntervalDays,
  fsrsRetrievability,
  previewFsrsCard,
  scheduleFsrsCard
} from '../fsrs';
import type { CardRecord } from '../types';

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  const now = '2026-11-15T08:00:00.000Z';
  return {
    id: 'n1::0',
    noteId: 'n1',
    deck: 'OMFS',
    ord: 0,
    front: 'Le Fort I fracture line passes through?',
    back: 'Nasal septum, pyriform aperture, canine fossa, pterygoid plates',
    tags: ['OMFS'],
    state: 'new',
    stepIndex: 0,
    dueAt: now,
    lastReviewAt: null,
    intervalDays: 0,
    easeFactor: 2.5,
    stability: 0,
    difficulty: 5,
    reps: 0,
    lapses: 0,
    suspended: false,
    buriedUntil: null,
    isLeech: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('FSRS scheduler', () => {
  it('satisfies R(S, S) == 0.90 and higher retention gives shorter intervals', () => {
    expect(fsrsRetrievability(10, 10)).toBeCloseTo(0.9, 5);
    const iv90 = fsrsNextIntervalDays(30, 0.9, 36500);
    const iv95 = fsrsNextIntervalDays(30, 0.95, 36500);
    expect(iv90).toBe(30);
    expect(iv95).toBeLessThan(iv90);
  });

  it('progresses new card through 1m -> 10m learning steps and graduates to review', () => {
    const t0 = new Date('2026-11-15T08:00:00.000Z');
    const c0 = makeCard();

    // Preview shows Again=1m, Hard=6m (avg of 1m and 10m), Good=10m
    const prev = previewFsrsCard(c0, t0, DEFAULT_DECK_OPTIONS);
    expect(prev[1].intervalLabel).toBe('1m');
    expect(prev[2].intervalLabel).toBe('6m');
    expect(prev[3].intervalLabel).toBe('10m');

    // Step 0 Good -> step 1 (10m)
    const r1 = scheduleFsrsCard(c0, 3, t0, DEFAULT_DECK_OPTIONS, 2500, () => 0.5);
    expect(r1.card.state).toBe('learning');
    expect(r1.card.stepIndex).toBe(1);
    expect(r1.logPayload.duration_ms).toBe(2500);

    // Step 1 Good -> graduates to review
    const t1 = new Date(r1.card.dueAt);
    const r2 = scheduleFsrsCard(r1.card, 3, t1, DEFAULT_DECK_OPTIONS, 120000, () => 0.5);
    expect(r2.card.state).toBe('review');
    expect(r2.card.intervalDays).toBeGreaterThanOrEqual(1);
    // Duration capped at maxAnswerSeconds (60s = 60000ms)
    expect(r2.logPayload.duration_ms).toBe(60000);
  });

  it('triggers leech at 8 lapses and applies fuzz on intervals >= 2.5d', () => {
    const t0 = new Date('2026-11-15T08:00:00.000Z');
    const reviewCard = makeCard({
      state: 'review',
      stability: 20,
      difficulty: 6,
      intervalDays: 20,
      lapses: 7,
      lastReviewAt: '2026-10-26T08:00:00.000Z'
    });

    const lapseRes = scheduleFsrsCard(reviewCard, 1, t0, DEFAULT_DECK_OPTIONS, 3000, () => 0.5);
    expect(lapseRes.card.lapses).toBe(8);
    expect(lapseRes.card.isLeech).toBe(true);
    expect(lapseRes.leechTriggered).toBe(true);
    expect(lapseRes.card.tags).toContain('leech');
    expect(lapseRes.card.state).toBe('relearning');

    // Fuzz test: low rng vs high rng produces different intervals for S=30
    const rLow = scheduleFsrsCard(reviewCard, 3, t0, DEFAULT_DECK_OPTIONS, 3000, () => 0.01);
    const rHigh = scheduleFsrsCard(reviewCard, 3, t0, DEFAULT_DECK_OPTIONS, 3000, () => 0.99);
    expect(rHigh.scheduledDays).toBeGreaterThan(rLow.scheduledDays);
  });
});
