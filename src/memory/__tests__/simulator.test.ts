import { describe, expect, it } from 'vitest';
import { DEFAULT_DECK_OPTIONS } from '../fsrs';
import { balanceIntervalLoad, optimizeFsrsParameters, simulateWorkload, type ReviewHistorySample } from '../simulator';
import type { CardRecord } from '../types';

function makeCard(id: string, dueAt: string, state: CardRecord['state'] = 'review'): CardRecord {
  return {
    id,
    noteId: id,
    deck: 'OMFS',
    ord: 0,
    front: 'Q',
    back: 'A',
    tags: [],
    state,
    stepIndex: 0,
    dueAt,
    lastReviewAt: '2026-11-10T08:00:00.000Z',
    intervalDays: 5,
    easeFactor: 2.5,
    stability: 5,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    suspended: false,
    buriedUntil: null,
    isLeech: false,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z'
  };
}

describe('Phase 2B Simulator, Load Balancer & Optimizer', () => {
  it('projects higher workload for higher newCardsPerDay and desiredRetention', () => {
    const now = new Date('2026-11-15T08:00:00.000Z');
    const cards: CardRecord[] = Array.from({ length: 60 }, (_, i) =>
      makeCard(`c${i}`, '2026-11-15T08:00:00.000Z', i < 30 ? 'new' : 'review')
    );

    const low = simulateWorkload(cards, { ...DEFAULT_DECK_OPTIONS, newCardsPerDay: 5, desiredRetention: 0.85 }, 30, now);
    const high = simulateWorkload(cards, { ...DEFAULT_DECK_OPTIONS, newCardsPerDay: 25, desiredRetention: 0.95 }, 30, now);

    expect(low.points).toHaveLength(30);
    expect(high.totalReviewsProjected).toBeGreaterThan(low.totalReviewsProjected);
  });

  it('picks the least-loaded day inside the fuzz window', () => {
    const now = new Date('2026-11-15T08:00:00.000Z');
    // Day +10 (2026-11-25) has 5 cards; Day +8..+12 have 0 cards
    const cards = Array.from({ length: 5 }, (_, i) => makeCard(`d${i}`, '2026-11-25T08:00:00.000Z'));
    const balanced = balanceIntervalLoad(10, cards, now, 36500);
    expect(balanced).not.toBe(10);
    expect(balanced).toBeGreaterThanOrEqual(8);
    expect(balanced).toBeLessThanOrEqual(12);
  });

  it('requires >= 100 samples before optimizing and improves or preserves log loss', () => {
    const small: ReviewHistorySample[] = Array.from({ length: 20 }, () => ({
      elapsedDays: 5,
      stabilityBefore: 5,
      rating: 3
    }));
    expect(optimizeFsrsParameters(small).status).toBe('insufficient_data');

    const full: ReviewHistorySample[] = Array.from({ length: 120 }, (_, i) => ({
      elapsedDays: 10,
      stabilityBefore: 5,
      rating: i % 4 === 0 ? 1 : 3
    }));
    const res = optimizeFsrsParameters(full);
    expect(res.status).toBe('optimized');
    expect(res.logLossAfter).toBeLessThanOrEqual(res.logLossBefore);
  });
});
