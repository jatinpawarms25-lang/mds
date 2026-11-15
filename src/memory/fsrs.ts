import type { CardRecord, DeckOptions, Rating, ReviewOutcome, SchedulingPreview } from './types';

// FSRS-5 default 19-parameter weights (open-spaced-repetition/ts-fsrs)
export const DEFAULT_FSRS_WEIGHTS: number[] = [
  0.40255, 1.18385, 3.173, 15.69105,
  7.1949, 0.5345, 1.4604, 0.0046,
  1.54575, 0.1192, 1.01925, 1.9395,
  0.11, 0.29605, 2.2698, 0.2315,
  2.9898, 0.51655, 0.6621
];

export const DEFAULT_DECK_OPTIONS: DeckOptions = {
  scheduler: 'fsrs',
  desiredRetention: 0.9,
  maxIntervalDays: 36500,
  learningStepsMin: [1, 10],
  relearningStepsMin: [10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEase: 2.5,
  minEase: 1.3,
  newIntervalPct: 0,
  minimumIntervalDays: 1,
  leechThreshold: 8,
  newCardsPerDay: 30,
  maxReviewsPerDay: 200,
  buryNewSiblings: true,
  buryReviewSiblings: true,
  maxAnswerSeconds: 60,
  fsrsWeights: DEFAULT_FSRS_WEIGHTS
};

const FSRS5_DECAY = 0.5;
const FSRS5_FACTOR = 19 / 81; // (0.9^(-1/0.5) - 1)

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function fsrsRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  const t = Math.max(0, elapsedDays);
  return Math.pow(1 + FSRS5_FACTOR * (t / stability), -FSRS5_DECAY);
}

export function fsrsNextIntervalDays(
  stability: number,
  desiredRetention: number,
  maxIntervalDays: number
): number {
  const r = clamp(desiredRetention, 0.7, 0.99);
  const raw = (stability / FSRS5_FACTOR) * (Math.pow(r, -1 / FSRS5_DECAY) - 1);
  return clamp(Math.round(raw), 1, maxIntervalDays);
}

export function applyAnkiFuzz(intervalDays: number, maxIntervalDays: number, rng: () => number): number {
  if (intervalDays < 2.5) return Math.max(1, Math.round(intervalDays));
  let delta: number;
  if (intervalDays < 7) {
    delta = Math.max(1, Math.round(intervalDays * 0.15));
  } else if (intervalDays < 30) {
    delta = Math.max(2, Math.round(intervalDays * 0.10));
  } else {
    delta = Math.max(3, Math.round(intervalDays * 0.05));
  }
  const minIv = Math.max(2, Math.round(intervalDays - delta));
  const maxIv = Math.min(maxIntervalDays, Math.round(intervalDays + delta));
  const fuzzed = minIv + Math.floor(rng() * (maxIv - minIv + 1));
  return clamp(fuzzed, 1, maxIntervalDays);
}

export function formatIntervalLabel(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = minutes / 1440;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function initStability(rating: Rating, w: number[]): number {
  return Math.max(0.1, w[rating - 1] ?? DEFAULT_FSRS_WEIGHTS[rating - 1]);
}

function initDifficulty(rating: Rating, w: number[]): number {
  const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  return clamp(d, 1, 10);
}

function nextDifficulty(d: number, rating: Rating, w: number[]): number {
  const deltaD = -w[6] * (rating - 3);
  const dPrime = d + deltaD * ((10 - d) / 9);
  const d0Easy = initDifficulty(4, w);
  const reverted = w[7] * d0Easy + (1 - w[7]) * dPrime;
  return clamp(reverted, 1, 10);
}

function nextRecallStability(d: number, s: number, r: number, rating: Rating, w: number[]): number {
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;
  const sInc =
    1 +
    Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) *
      hardPenalty *
      easyBonus;
  return Math.max(0.1, s * sInc);
}

function nextForgetStability(d: number, s: number, r: number, w: number[]): number {
  const sNew =
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14]);
  return clamp(sNew, 0.1, s);
}

function nextShortTermStability(s: number, rating: Rating, w: number[]): number {
  const sinc = Math.exp(w[17] * (rating - 3 + w[18]));
  return Math.max(0.1, s * sinc);
}

function getHardStepMinutes(steps: number[], stepIndex: number): number {
  if (steps.length === 0) return 10;
  if (stepIndex === 0 && steps.length >= 2) {
    return Math.round((steps[0] + steps[1]) / 2);
  }
  if (stepIndex === 0 && steps.length === 1) {
    return Math.min(1440, Math.round(steps[0] * 1.5));
  }
  return steps[Math.min(stepIndex, steps.length - 1)];
}

export function scheduleFsrsCard(
  card: CardRecord,
  rating: Rating,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  durationMs = 0,
  rng: () => number = Math.random
): ReviewOutcome {
  const w = options.fsrsWeights.length >= 19 ? options.fsrsWeights : DEFAULT_FSRS_WEIGHTS;
  const nowIso = now.toISOString();
  const elapsedDays = card.lastReviewAt
    ? Math.max(0, (now.getTime() - new Date(card.lastReviewAt).getTime()) / 86400000)
    : 0;
  const cappedDuration = Math.min(Math.max(0, Math.round(durationMs)), options.maxAnswerSeconds * 1000);

  let next: CardRecord = {
    ...card,
    reps: card.reps + 1,
    lastReviewAt: nowIso,
    updatedAt: nowIso
  };

  let scheduledDays = 0;
  let intervalLabel = '1d';
  let leechTriggered = false;

  const isLearning = card.state === 'new' || card.state === 'learning' || card.state === 'relearning';
  const steps = card.state === 'relearning' ? options.relearningStepsMin : options.learningStepsMin;

  if (isLearning) {
    // Initialize D and S on first ever review
    if (card.state === 'new' || card.stability <= 0) {
      next.stability = initStability(rating, w);
      next.difficulty = initDifficulty(rating, w);
    } else {
      next.stability = nextShortTermStability(card.stability, rating, w);
      next.difficulty = nextDifficulty(card.difficulty, rating, w);
    }

    if (rating === 1) {
      // Again -> reset to step 0
      const stepMin = steps[0] ?? 1;
      next.state = card.state === 'relearning' ? 'relearning' : 'learning';
      next.stepIndex = 0;
      next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
      intervalLabel = formatIntervalLabel(stepMin);
    } else if (rating === 2 && steps.length > 0) {
      // Hard -> stay in learning/relearning per Anki step rules
      const stepMin = getHardStepMinutes(steps, card.stepIndex);
      next.state = card.state === 'relearning' ? 'relearning' : 'learning';
      next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
      intervalLabel = formatIntervalLabel(stepMin);
    } else if (rating === 3 && card.stepIndex + 1 < steps.length) {
      // Good -> advance learning step
      const nextIdx = card.stepIndex + 1;
      const stepMin = steps[nextIdx];
      next.state = card.state === 'relearning' ? 'relearning' : 'learning';
      next.stepIndex = nextIdx;
      next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
      intervalLabel = formatIntervalLabel(stepMin);
    } else {
      // Graduate to review state (Good on last step, or Easy)
      const rawIv = fsrsNextIntervalDays(next.stability, options.desiredRetention, options.maxIntervalDays);
      const iv = applyAnkiFuzz(rawIv, options.maxIntervalDays, rng);
      next.state = 'review';
      next.stepIndex = 0;
      next.intervalDays = iv;
      next.dueAt = new Date(now.getTime() + iv * 86400000).toISOString();
      scheduledDays = iv;
      intervalLabel = formatIntervalLabel(iv * 1440);
    }
  } else {
    // Review state
    const r = fsrsRetrievability(elapsedDays, card.stability);
    next.difficulty = nextDifficulty(card.difficulty, rating, w);

    if (rating === 1) {
      // Lapse!
      next.lapses = card.lapses + 1;
      next.stability = nextForgetStability(next.difficulty, card.stability, r, w);
      const threshold = options.leechThreshold;
      const half = Math.max(1, Math.floor(threshold / 2));
      if (next.lapses >= threshold && (next.lapses === threshold || (next.lapses - threshold) % half === 0)) {
        next.isLeech = true;
        leechTriggered = true;
        if (!next.tags.includes('leech')) {
          next.tags = [...next.tags, 'leech'];
        }
      }

      if (options.relearningStepsMin.length > 0) {
        const stepMin = options.relearningStepsMin[0];
        next.state = 'relearning';
        next.stepIndex = 0;
        next.intervalDays = Math.max(options.minimumIntervalDays, fsrsNextIntervalDays(next.stability, options.desiredRetention, options.maxIntervalDays));
        next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
        intervalLabel = formatIntervalLabel(stepMin);
      } else {
        const iv = fsrsNextIntervalDays(next.stability, options.desiredRetention, options.maxIntervalDays);
        next.state = 'review';
        next.intervalDays = iv;
        next.dueAt = new Date(now.getTime() + iv * 86400000).toISOString();
        scheduledDays = iv;
        intervalLabel = formatIntervalLabel(iv * 1440);
      }
    } else {
      next.stability = nextRecallStability(next.difficulty, card.stability, r, rating, w);
      const rawIv = fsrsNextIntervalDays(next.stability, options.desiredRetention, options.maxIntervalDays);
      const iv = applyAnkiFuzz(rawIv, options.maxIntervalDays, rng);
      next.state = 'review';
      next.stepIndex = 0;
      next.intervalDays = iv;
      next.dueAt = new Date(now.getTime() + iv * 86400000).toISOString();
      scheduledDays = iv;
      intervalLabel = formatIntervalLabel(iv * 1440);
    }
  }

  return {
    rating,
    card: next,
    intervalLabel,
    scheduledDays,
    elapsedDays: Math.round(elapsedDays * 100) / 100,
    leechTriggered,
    logPayload: {
      card_id: card.id,
      rating,
      state_before: card.state,
      state_after: next.state,
      elapsed_days: Math.round(elapsedDays * 100) / 100,
      scheduled_days: scheduledDays,
      duration_ms: cappedDuration,
      scheduler_params: {
        scheduler: 'fsrs',
        version: 'fsrs-5-v1',
        desiredRetention: options.desiredRetention
      }
    }
  };
}

export function previewFsrsCard(
  card: CardRecord,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS
): SchedulingPreview {
  const fixedRng = () => 0.5;
  return {
    1: scheduleFsrsCard(card, 1, now, options, 0, fixedRng),
    2: scheduleFsrsCard(card, 2, now, options, 0, fixedRng),
    3: scheduleFsrsCard(card, 3, now, options, 0, fixedRng),
    4: scheduleFsrsCard(card, 4, now, options, 0, fixedRng)
  };
}
