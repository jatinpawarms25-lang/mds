import {
  State,
  dateChrono,
  defineScheduler,
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
  type Rating as TsFsrsRating
} from 'ts-fsrs';
import { FSRS6Model, FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6';
import { FSRS7Model, FSRS7_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-7';
import type { CardRecord, CardState, DeckOptions, Rating, ReviewOutcome, SchedulingPreview } from './types';

export const DEFAULT_FSRS_WEIGHTS: number[] = [...FSRS6_DEFAULT_WEIGHTS];
export const DEFAULT_FSRS7_WEIGHTS: number[] = [...FSRS7_DEFAULT_WEIGHTS];

export const DEFAULT_DECK_OPTIONS: DeckOptions = {
  scheduler: 'fsrs',
  fsrsModel: 'fsrs-6',
  enableFuzz: true,
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
  newCardsPerDay: 15,
  maxReviewsPerDay: 200,
  buryNewSiblings: true,
  buryReviewSiblings: true,
  maxAnswerSeconds: 60,
  loadBalancing: true,
  fsrsWeights: DEFAULT_FSRS_WEIGHTS
};

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function applyAnkiFuzz(intervalDays: number, maxIntervalDays: number, rng: () => number): number {
  if (intervalDays < 2.5) return Math.max(1, Math.round(intervalDays));
  let delta: number;
  if (intervalDays < 7) {
    delta = Math.max(1, Math.round(intervalDays * 0.15));
  } else if (intervalDays < 30) {
    delta = Math.max(2, Math.round(intervalDays * 0.1));
  } else {
    delta = Math.max(3, Math.round(intervalDays * 0.05));
  }
  const minIv = Math.max(2, Math.round(intervalDays - delta));
  const maxIv = Math.min(maxIntervalDays, Math.round(intervalDays + delta));
  const fuzzed = minIv + Math.floor(rng() * (maxIv - minIv + 1));
  return clamp(fuzzed, 1, maxIntervalDays);
}

function toStepStrings(mins: number[]): `${number}m`[] {
  return mins.map((m) => `${Math.max(1, Math.round(m))}m` as `${number}m`);
}

interface ConfiguredScheduler {
  createNewCard: (input: { now: Date }) => Record<string, unknown>;
  review: (input: { card: unknown; grade: 1 | 2 | 3 | 4; now: Date }) => { card: unknown };
  model: {
    forgettingCurve: (s: { stability: number; stabilityFast?: number; difficulty: number }, d: number) => number;
    nextInterval: (s: { stability: number; stabilityFast?: number; difficulty: number }, r: number) => number;
  };
}

function createConfiguredScheduler(options: DeckOptions, enableFuzzOverride?: boolean): ConfiguredScheduler {
  const isFsrs7 = options.fsrsModel === 'fsrs-7';
  const enableFuzz = enableFuzzOverride ?? options.enableFuzz ?? true;
  const learningSteps = toStepStrings(options.learningStepsMin);
  const relearningSteps = toStepStrings(options.relearningStepsMin);

  if (isFsrs7) {
    const weights =
      options.fsrsWeights.length === FSRS7_DEFAULT_WEIGHTS.length
        ? options.fsrsWeights
        : DEFAULT_FSRS7_WEIGHTS;
    return defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(schedulerDesiredRetentionMiddleware)
      .use(schedulerFuzzingMiddleware)
      .use(schedulerStatsMiddleware)
      .use(schedulerScheduledDaysMiddleware)
      .use(schedulerLearningStepsMiddleware)
      .use(schedulerMaximumIntervalMiddleware)
      .use(schedulerMonotonicIntervalMiddleware)
      .create({
        config: {
          weights,
          desiredRetention: clamp(options.desiredRetention, 0.7, 0.97),
          learningSteps,
          relearningSteps,
          enableFuzz,
          maximumInterval: options.maxIntervalDays,
          enableShortTerm: true,
          clearStatsOnForget: false,
          fractionalDays: true
        }
      }) as unknown as ConfiguredScheduler;
  }

  const weights =
    options.fsrsWeights.length === FSRS6_DEFAULT_WEIGHTS.length
      ? options.fsrsWeights
      : DEFAULT_FSRS_WEIGHTS;
  return defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerDesiredRetentionMiddleware)
    .use(schedulerFuzzingMiddleware)
    .use(schedulerStatsMiddleware)
    .use(schedulerScheduledDaysMiddleware)
    .use(schedulerLearningStepsMiddleware)
    .use(schedulerMaximumIntervalMiddleware)
    .use(schedulerMonotonicIntervalMiddleware)
    .create({
      config: {
        weights,
        desiredRetention: clamp(options.desiredRetention, 0.7, 0.97),
        learningSteps,
        relearningSteps,
        enableFuzz,
        maximumInterval: options.maxIntervalDays,
        enableShortTerm: true,
        clearStatsOnForget: false,
        fractionalDays: false,
        numRelearningSteps: Math.max(1, relearningSteps.length)
      }
    }) as unknown as ConfiguredScheduler;
}

function mapStateToTsFsrs(state: CardState): State {
  if (state === 'new') return State.New;
  if (state === 'learning') return State.Learning;
  if (state === 'relearning') return State.Relearning;
  return State.Review;
}

function mapTsFsrsToState(state: State): CardState {
  if (state === State.New) return 'new';
  if (state === State.Learning) return 'learning';
  if (state === State.Relearning) return 'relearning';
  return 'review';
}

export function fsrsRetrievability(
  elapsedDays: number,
  stability: number,
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  stabilityFast?: number,
  difficulty = 5
): number {
  if (stability <= 0) return 0;
  const sched = createConfiguredScheduler(options, false);
  const t = Math.max(0, elapsedDays);
  if (options.fsrsModel === 'fsrs-7') {
    return sched.model.forgettingCurve(
      { stability, stabilityFast: stabilityFast ?? stability, difficulty },
      t
    );
  }
  return sched.model.forgettingCurve({ stability, difficulty }, t);
}

export function fsrsNextIntervalDays(
  stability: number,
  desiredRetention: number,
  maxIntervalDays: number,
  options: DeckOptions = DEFAULT_DECK_OPTIONS
): number {
  const sched = createConfiguredScheduler(
    { ...options, desiredRetention: clamp(desiredRetention, 0.7, 0.97), maxIntervalDays },
    false
  );
  const raw = sched.model.nextInterval(
    options.fsrsModel === 'fsrs-7'
      ? ({ stability, stabilityFast: stability, difficulty: 5 } as never)
      : ({ stability, difficulty: 5 } as never),
    clamp(desiredRetention, 0.7, 0.97)
  );
  return clamp(Math.round(raw), 1, maxIntervalDays);
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

export function scheduleFsrsCard(
  card: CardRecord,
  rating: Rating,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  durationMs = 0,
  _rng: () => number = Math.random
): ReviewOutcome {
  const sched = createConfiguredScheduler(options);
  const isFsrs7 = options.fsrsModel === 'fsrs-7';
  const nowIso = now.toISOString();
  const elapsedDays = card.lastReviewAt
    ? Math.max(0, (now.getTime() - new Date(card.lastReviewAt).getTime()) / 86400000)
    : 0;
  const cappedDuration = Math.min(Math.max(0, Math.round(durationMs)), options.maxAnswerSeconds * 1000);

  const tsCardBase = sched.createNewCard({ now: new Date(card.createdAt || nowIso) });
  const tsInputCard = {
    ...tsCardBase,
    cardId: card.id,
    state: mapStateToTsFsrs(card.state),
    scheduleStatus: card.state === 'relearning' ? 'learning' : card.state,
    stability: card.stability,
    ...(isFsrs7 ? { stabilityFast: card.stabilityFast ?? card.stability } : {}),
    difficulty: card.state === 'new' ? 0 : clamp(card.difficulty || 5, 1, 10),
    dueAt: new Date(card.dueAt || nowIso),
    lastReviewAt: card.lastReviewAt ? new Date(card.lastReviewAt) : null,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.intervalDays,
    learningStep: card.stepIndex
  };

  const res = sched.review({
    card: tsInputCard,
    grade: rating,
    now
  });

  const outCard = res.card as unknown as {
    state: State;
    stability: number;
    stabilityFast?: number;
    difficulty: number;
    dueAt: Date;
    reps: number;
    lapses: number;
    scheduledDays: number;
    learningStep: number;
  };

  const nextState = mapTsFsrsToState(outCard.state);
  const diffMinutes = Math.max(1, (outCard.dueAt.getTime() - now.getTime()) / 60000);
  const intervalLabel = formatIntervalLabel(diffMinutes);

  let isLeech = card.isLeech;
  let leechTriggered = false;
  let nextTags = card.tags;
  if (rating === 1 && outCard.lapses > card.lapses) {
    const threshold = options.leechThreshold;
    const half = Math.max(1, Math.floor(threshold / 2));
    if (outCard.lapses >= threshold && (outCard.lapses === threshold || (outCard.lapses - threshold) % half === 0)) {
      isLeech = true;
      leechTriggered = true;
      if (!nextTags.includes('leech')) {
        nextTags = [...nextTags, 'leech'];
      }
    }
  }

  const nextCard: CardRecord = {
    ...card,
    state: nextState,
    stepIndex: outCard.learningStep,
    dueAt: outCard.dueAt.toISOString(),
    lastReviewAt: nowIso,
    intervalDays: outCard.scheduledDays,
    stability: outCard.stability,
    ...(isFsrs7 ? { stabilityFast: outCard.stabilityFast ?? outCard.stability } : {}),
    difficulty: outCard.difficulty,
    modelId: isFsrs7 ? 'fsrs-7' : 'fsrs-6',
    reps: outCard.reps,
    lapses: outCard.lapses,
    isLeech,
    tags: nextTags,
    updatedAt: nowIso
  };

  return {
    rating,
    card: nextCard,
    intervalLabel,
    scheduledDays: outCard.scheduledDays,
    elapsedDays: Math.round(elapsedDays * 100) / 100,
    leechTriggered,
    logPayload: {
      card_id: card.id,
      rating,
      state_before: card.state,
      state_after: nextState,
      elapsed_days: Math.round(elapsedDays * 100) / 100,
      scheduled_days: outCard.scheduledDays,
      duration_ms: cappedDuration,
      scheduler_params: {
        scheduler: 'fsrs',
        version: isFsrs7 ? 'ts-fsrs-6.0.0-fsrs7' : 'ts-fsrs-6.0.0-fsrs6',
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
  const noFuzzOpts = { ...options, enableFuzz: false };
  return {
    1: scheduleFsrsCard(card, 1, now, noFuzzOpts, 0),
    2: scheduleFsrsCard(card, 2, now, noFuzzOpts, 0),
    3: scheduleFsrsCard(card, 3, now, noFuzzOpts, 0),
    4: scheduleFsrsCard(card, 4, now, noFuzzOpts, 0)
  };
}
