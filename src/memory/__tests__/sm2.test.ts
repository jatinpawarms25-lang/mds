import { describe, expect, it } from 'vitest';
import { DEFAULT_DECK_OPTIONS } from '../fsrs';
import { scheduleSm2Card } from '../sm2';
import type { CardRecord } from '../types';

function makeSm2Card(overrides: Partial<CardRecord> = {}): CardRecord {
  const now = '2026-11-15T08:00:00.000Z';
  return {
    id: 'sm2::0',
    noteId: 'sm2',
    deck: 'PHD',
    ord: 0,
    front: 'DMFT index age group?',
    back: '12 years (WHO global monitoring)',
    tags: ['PHD'],
    state: 'review',
    stepIndex: 0,
    dueAt: now,
    lastReviewAt: '2026-11-05T08:00:00.000Z',
    intervalDays: 10,
    easeFactor: 2.5,
    stability: 10,
    difficulty: 5,
    reps: 3,
    lapses: 0,
    suspended: false,
    buriedUntil: null,
    isLeech: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('Classic Anki SM-2 fallback scheduler', () => {
  const opts = { ...DEFAULT_DECK_OPTIONS, scheduler: 'sm2' as const };

  it('adjusts ease factor (-0.20 Again, -0.15 Hard, +0.15 Easy, floor 1.30)', () => {
    const t0 = new Date('2026-11-15T08:00:00.000Z');
    const c = makeSm2Card({ easeFactor: 1.40 });

    const hard = scheduleSm2Card(c, 2, t0, opts, 1000, () => 0.5);
    expect(hard.card.easeFactor).toBeCloseTo(1.3, 2);

    // Floor at 1.30 even after Again (-0.20)
    const again = scheduleSm2Card(hard.card, 1, t0, opts, 1000, () => 0.5);
    expect(again.card.easeFactor).toBe(1.3);
    expect(again.card.state).toBe('relearning');

    const easy = scheduleSm2Card(c, 4, t0, opts, 1000, () => 0.5);
    expect(easy.card.easeFactor).toBeCloseTo(1.55, 2);
  });

  it('gives partial credit for late reviews', () => {
    // Scheduled 10d, reviewed 20d later (10d overdue) -> Good uses (10 + 10/2) * 2.5 = 37.5 -> 38d
    const tLate = new Date('2026-11-25T08:00:00.000Z');
    const c = makeSm2Card({ intervalDays: 10, easeFactor: 2.5, lastReviewAt: '2026-11-05T08:00:00.000Z' });
    const res = scheduleSm2Card(c, 3, tLate, opts, 1000, () => 0.5);
    expect(res.scheduledDays).toBeGreaterThanOrEqual(36);
    expect(res.scheduledDays).toBeLessThanOrEqual(40);
  });
});
