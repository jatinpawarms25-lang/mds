import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DECK_OPTIONS,
  DEFAULT_FSRS7_WEIGHTS,
  fsrsNextIntervalDays,
  fsrsRetrievability,
  previewFsrsCard,
  scheduleFsrsCard
} from '../fsrs';
import type { CardRecord, DeckOptions, Rating } from '../types';

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  const now = '2026-11-16T10:00:00.000Z';
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

describe('FSRS scheduler (ts-fsrs 6.0.0 defineScheduler)', () => {
  it('satisfies R(S, S) == 0.90 and higher retention gives shorter intervals', () => {
    expect(fsrsRetrievability(10, 10)).toBeCloseTo(0.9, 5);
    const iv90 = fsrsNextIntervalDays(30, 0.9, 36500);
    const iv95 = fsrsNextIntervalDays(30, 0.95, 36500);
    expect(iv90).toBe(30);
    expect(iv95).toBeLessThan(iv90);
  });

  it('progresses new card through 1m -> 10m learning steps and graduates to review', () => {
    const t0 = new Date('2026-11-16T10:00:00.000Z');
    const c0 = makeCard();

    const prev = previewFsrsCard(c0, t0, DEFAULT_DECK_OPTIONS);
    expect(prev[1].intervalLabel).toBe('1m');
    expect(prev[2].intervalLabel).toBe('6m');
    expect(prev[3].intervalLabel).toBe('10m');
    expect(prev[4].intervalLabel).toBe('8d');

    const r1 = scheduleFsrsCard(c0, 3, t0, { ...DEFAULT_DECK_OPTIONS, enableFuzz: false }, 2500);
    expect(r1.card.state).toBe('learning');
    expect(r1.card.stepIndex).toBe(1);
    expect(r1.logPayload.duration_ms).toBe(2500);

    const t1 = new Date(r1.card.dueAt);
    const r2 = scheduleFsrsCard(r1.card, 3, t1, { ...DEFAULT_DECK_OPTIONS, enableFuzz: false }, 120000);
    expect(r2.card.state).toBe('review');
    expect(r2.card.intervalDays).toBe(2);
    expect(r2.logPayload.duration_ms).toBe(60000);
  });

  it('reproduces Appendix A14 FSRS-6 golden sequence exactly', () => {
    const t0 = new Date('2026-11-16T10:00:00.000Z');
    const opts: DeckOptions = {
      ...DEFAULT_DECK_OPTIONS,
      fsrsModel: 'fsrs-6',
      enableFuzz: false
    };
    let card = makeCard();
    const seq: Rating[] = [3, 3, 3, 3, 1, 3, 3, 4];
    const results: { state: string; scheduledDays: number; label: string }[] = [];

    for (const r of seq) {
      const res = scheduleFsrsCard(card, r, new Date(card.dueAt), opts);
      card = res.card;
      results.push({ state: card.state, scheduledDays: res.scheduledDays, label: res.intervalLabel });
    }

    expect(results.map((x) => x.scheduledDays)).toEqual([0, 2, 11, 46, 0, 3, 8, 28]);
    expect(results[0].label).toBe('10m');
    expect(results[0].state).toBe('learning');
    expect(results[4].label).toBe('10m');
    expect(results[4].state).toBe('relearning');
    expect(results[7].state).toBe('review');
  });

  it('reproduces Appendix A14 FSRS-7 golden sequence and retrievability exactly', () => {
    const opts: DeckOptions = {
      ...DEFAULT_DECK_OPTIONS,
      fsrsModel: 'fsrs-7',
      fsrsWeights: DEFAULT_FSRS7_WEIGHTS,
      enableFuzz: false
    };
    let card = makeCard();
    const prev = previewFsrsCard(card, new Date(card.dueAt), opts);
    expect(prev[4].scheduledDays).toBeCloseTo(53.9, 1);

    const seq: Rating[] = [3, 3, 3, 3, 1, 3, 3, 4];
    const scheduledDays: number[] = [];
    for (const r of seq) {
      const res = scheduleFsrsCard(card, r, new Date(card.dueAt), opts);
      card = res.card;
      scheduledDays.push(Math.round(res.scheduledDays * 10) / 10);
    }

    expect(scheduledDays[1]).toBe(10.1);
    expect(scheduledDays[2]).toBe(42.6);
    expect(scheduledDays[3]).toBe(143.1);
    expect(scheduledDays[5]).toBe(2.7);
    expect(scheduledDays[6]).toBe(6.7);
    expect(scheduledDays[7]).toBe(16.4);

    expect(fsrsRetrievability(1, card.stability, opts, card.stabilityFast, card.difficulty)).toBeCloseTo(0.971, 3);
    expect(fsrsRetrievability(7, card.stability, opts, card.stabilityFast, card.difficulty)).toBeCloseTo(0.933, 3);
    expect(fsrsRetrievability(30, card.stability, opts, card.stabilityFast, card.difficulty)).toBeCloseTo(0.870, 3);
    expect(fsrsRetrievability(90, card.stability, opts, card.stabilityFast, card.difficulty)).toBeCloseTo(0.808, 3);
  });

  it('triggers leech at 8 lapses', () => {
    const t0 = new Date('2026-11-16T10:00:00.000Z');
    const reviewCard = makeCard({
      state: 'review',
      stability: 20,
      difficulty: 6,
      intervalDays: 20,
      lapses: 7,
      lastReviewAt: '2026-10-26T10:00:00.000Z'
    });

    const lapseRes = scheduleFsrsCard(reviewCard, 1, t0, DEFAULT_DECK_OPTIONS, 3000);
    expect(lapseRes.card.lapses).toBe(8);
    expect(lapseRes.card.isLeech).toBe(true);
    expect(lapseRes.leechTriggered).toBe(true);
    expect(lapseRes.card.tags).toContain('leech');
    expect(lapseRes.card.state).toBe('relearning');
  });
});
