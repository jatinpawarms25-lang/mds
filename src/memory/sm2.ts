import { applyAnkiFuzz, clamp, DEFAULT_DECK_OPTIONS, formatIntervalLabel } from './fsrs';
import type { CardRecord, DeckOptions, Rating, ReviewOutcome, SchedulingPreview } from './types';

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

export function scheduleSm2Card(
  card: CardRecord,
  rating: Rating,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  durationMs = 0,
  rng: () => number = Math.random
): ReviewOutcome {
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
    if (rating === 1) {
      const stepMin = steps[0] ?? 1;
      next.state = card.state === 'relearning' ? 'relearning' : 'learning';
      next.stepIndex = 0;
      next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
      intervalLabel = formatIntervalLabel(stepMin);
    } else if (rating === 2 && steps.length > 0) {
      const stepMin = getHardStepMinutes(steps, card.stepIndex);
      next.state = card.state === 'relearning' ? 'relearning' : 'learning';
      next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
      intervalLabel = formatIntervalLabel(stepMin);
    } else if (rating === 3 && card.stepIndex + 1 < steps.length) {
      const nextIdx = card.stepIndex + 1;
      const stepMin = steps[nextIdx];
      next.state = card.state === 'relearning' ? 'relearning' : 'learning';
      next.stepIndex = nextIdx;
      next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
      intervalLabel = formatIntervalLabel(stepMin);
    } else {
      const iv =
        card.state === 'relearning'
          ? Math.max(options.minimumIntervalDays, card.intervalDays)
          : rating === 4
            ? options.easyIntervalDays
            : options.graduatingIntervalDays;
      next.state = 'review';
      next.stepIndex = 0;
      next.intervalDays = iv;
      next.easeFactor = next.easeFactor || options.startingEase;
      next.dueAt = new Date(now.getTime() + iv * 86400000).toISOString();
      scheduledDays = iv;
      intervalLabel = formatIntervalLabel(iv * 1440);
    }
  } else {
    const baseEase = card.easeFactor || options.startingEase;
    const overdue = Math.max(0, elapsedDays - card.intervalDays);

    if (rating === 1) {
      next.lapses = card.lapses + 1;
      next.easeFactor = clamp(baseEase - 0.20, options.minEase, 5.0);
      const lapseIv = clamp(
        Math.round(card.intervalDays * options.newIntervalPct),
        options.minimumIntervalDays,
        options.maxIntervalDays
      );
      next.intervalDays = lapseIv;

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
        next.dueAt = new Date(now.getTime() + stepMin * 60000).toISOString();
        intervalLabel = formatIntervalLabel(stepMin);
      } else {
        next.state = 'review';
        next.dueAt = new Date(now.getTime() + lapseIv * 86400000).toISOString();
        scheduledDays = lapseIv;
        intervalLabel = formatIntervalLabel(lapseIv * 1440);
      }
    } else {
      let rawIv: number;
      if (rating === 2) {
        next.easeFactor = clamp(baseEase - 0.15, options.minEase, 5.0);
        rawIv = (card.intervalDays + overdue / 4) * 1.2;
      } else if (rating === 3) {
        next.easeFactor = baseEase;
        rawIv = (card.intervalDays + overdue / 2) * baseEase;
      } else {
        next.easeFactor = clamp(baseEase + 0.15, options.minEase, 5.0);
        rawIv = (card.intervalDays + overdue) * baseEase * 1.3;
      }
      rawIv = Math.max(card.intervalDays + 1, Math.round(rawIv));
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
        scheduler: 'sm2',
        version: 'anki-sm2-v1',
        desiredRetention: options.desiredRetention
      }
    }
  };
}

export function previewSm2Card(
  card: CardRecord,
  now: Date,
  options: DeckOptions = DEFAULT_DECK_OPTIONS
): SchedulingPreview {
  const fixedRng = () => 0.5;
  return {
    1: scheduleSm2Card(card, 1, now, options, 0, fixedRng),
    2: scheduleSm2Card(card, 2, now, options, 0, fixedRng),
    3: scheduleSm2Card(card, 3, now, options, 0, fixedRng),
    4: scheduleSm2Card(card, 4, now, options, 0, fixedRng)
  };
}
