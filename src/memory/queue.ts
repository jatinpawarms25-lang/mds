import { DEFAULT_DECK_OPTIONS, previewFsrsCard, scheduleFsrsCard } from './fsrs';
import { previewSm2Card, scheduleSm2Card } from './sm2';
import type { CardRecord, DeckOptions, Rating, ReviewOutcome, SchedulingPreview } from './types';

export interface DailyQueue {
  learningDue: CardRecord[];
  reviewDue: CardRecord[];
  newDue: CardRecord[];
  ordered: CardRecord[];
  buriedCount: number;
  suspendedCount: number;
}

export function getDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function buildDailyQueue(
  cards: CardRecord[],
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  deckFilter?: string
): DailyQueue {
  const today = getDayKey(now);
  const nowMs = now.getTime();
  const learningDue: CardRecord[] = [];
  const reviewDue: CardRecord[] = [];
  const newDue: CardRecord[] = [];
  let buriedCount = 0;
  let suspendedCount = 0;

  for (const c of cards) {
    if (deckFilter && deckFilter !== 'All' && c.deck !== deckFilter) continue;
    if (c.suspended) {
      suspendedCount++;
      continue;
    }
    const isLearning = c.state === 'learning' || c.state === 'relearning';
    if (!isLearning && c.buriedUntil && c.buriedUntil >= today) {
      buriedCount++;
      continue;
    }

    if (isLearning) {
      if (new Date(c.dueAt).getTime() <= nowMs) {
        learningDue.push(c);
      }
    } else if (c.state === 'review') {
      if (new Date(c.dueAt).getTime() <= nowMs) {
        reviewDue.push(c);
      }
    } else if (c.state === 'new') {
      newDue.push(c);
    }
  }

  learningDue.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  reviewDue.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  newDue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const limitedReview = reviewDue.slice(0, options.maxReviewsPerDay);
  const limitedNew = newDue.slice(0, options.newCardsPerDay);

  return {
    learningDue,
    reviewDue: limitedReview,
    newDue: limitedNew,
    ordered: [...learningDue, ...limitedReview, ...limitedNew],
    buriedCount,
    suspendedCount
  };
}

export function burySiblingsAfterReview(
  reviewedCard: CardRecord,
  allCards: CardRecord[],
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS
): CardRecord[] {
  const today = getDayKey(now);
  const changed: CardRecord[] = [];
  for (const c of allCards) {
    if (c.id === reviewedCard.id || c.noteId !== reviewedCard.noteId) continue;
    if (c.suspended) continue;
    if (c.state === 'new' && options.buryNewSiblings && c.buriedUntil !== today) {
      changed.push({ ...c, buriedUntil: today, updatedAt: now.toISOString() });
    } else if (c.state === 'review' && options.buryReviewSiblings && c.buriedUntil !== today) {
      changed.push({ ...c, buriedUntil: today, updatedAt: now.toISOString() });
    }
  }
  return changed;
}

export function scheduleCard(
  card: CardRecord,
  rating: Rating,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  durationMs = 0,
  rng: () => number = Math.random
): ReviewOutcome {
  if (options.scheduler === 'sm2') {
    return scheduleSm2Card(card, rating, now, options, durationMs, rng);
  }
  return scheduleFsrsCard(card, rating, now, options, durationMs, rng);
}

export function previewCard(
  card: CardRecord,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS
): SchedulingPreview {
  if (options.scheduler === 'sm2') {
    return previewSm2Card(card, now, options);
  }
  return previewFsrsCard(card, now, options);
}
