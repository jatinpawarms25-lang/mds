import { DEFAULT_DECK_OPTIONS, DEFAULT_FSRS_WEIGHTS, clamp, fsrsNextIntervalDays, fsrsRetrievability } from './fsrs';
import type { CardRecord, DeckOptions, Rating } from './types';

export interface DailySimulationPoint {
  dayOffset: number;
  date: string;
  dueReviews: number;
  newIntroduced: number;
  totalCards: number;
  estimatedMinutes: number;
}

export interface WorkloadSimulationResult {
  horizonDays: number;
  peakDailyCards: number;
  averageDailyCards: number;
  totalReviewsProjected: number;
  points: DailySimulationPoint[];
}

export function balanceIntervalLoad(
  baseIntervalDays: number,
  cards: CardRecord[],
  now: Date,
  maxIntervalDays: number
): number {
  if (baseIntervalDays < 4) return Math.max(1, Math.round(baseIntervalDays));
  const window = baseIntervalDays < 7 ? 1 : baseIntervalDays < 30 ? 2 : 3;
  const minIv = Math.max(2, Math.round(baseIntervalDays - window));
  const maxIv = Math.min(maxIntervalDays, Math.round(baseIntervalDays + window));

  const countsByDay = new Map<string, number>();
  for (const c of cards) {
    if (c.suspended || c.state === 'new') continue;
    const day = c.dueAt.slice(0, 10);
    countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
  }

  let bestIv = Math.round(baseIntervalDays);
  let bestCount = Number.POSITIVE_INFINITY;
  for (let iv = minIv; iv <= maxIv; iv++) {
    const targetDay = new Date(now.getTime() + iv * 86400000).toISOString().slice(0, 10);
    const load = countsByDay.get(targetDay) || 0;
    if (load < bestCount) {
      bestCount = load;
      bestIv = iv;
    }
  }
  return bestIv;
}

export function simulateWorkload(
  cards: CardRecord[],
  options: DeckOptions = DEFAULT_DECK_OPTIONS,
  horizonDays = 30,
  now = new Date(),
  avgSecondsPerCard = 12
): WorkloadSimulationResult {
  const days = clamp(Math.round(horizonDays), 7, 180);
  const dueMap = new Map<number, number>();
  let remainingNew = 0;

  for (const c of cards) {
    if (c.suspended) continue;
    if (c.state === 'new') {
      remainingNew++;
    } else {
      const diff = Math.max(0, Math.round((new Date(c.dueAt).getTime() - now.getTime()) / 86400000));
      dueMap.set(diff, (dueMap.get(diff) || 0) + 1);
    }
  }

  const points: DailySimulationPoint[] = [];
  let peakDailyCards = 0;
  let totalReviewsProjected = 0;
  const rTarget = clamp(options.desiredRetention, 0.75, 0.97);
  // Higher retention shortens intervals -> more frequent reviews
  const retentionMultiplier = clamp(Math.log(rTarget) / Math.log(0.9), 0.4, 2.2);

  for (let d = 0; d < days; d++) {
    const rawDue = dueMap.get(d) || 0;
    const dueReviews = Math.min(options.maxReviewsPerDay, rawDue);
    const overflow = Math.max(0, rawDue - dueReviews);
    if (overflow > 0) {
      dueMap.set(d + 1, (dueMap.get(d + 1) || 0) + overflow);
    }

    const newIntroduced = Math.min(options.newCardsPerDay, remainingNew);
    remainingNew -= newIntroduced;

    // Schedule next appearance of today's studied cards
    const totalCards = dueReviews + newIntroduced;
    if (newIntroduced > 0) {
      const firstIv = Math.max(1, Math.round(fsrsNextIntervalDays(3.17, rTarget, options.maxIntervalDays)));
      dueMap.set(d + firstIv, (dueMap.get(d + firstIv) || 0) + Math.round(newIntroduced * rTarget));
      dueMap.set(d + 1, (dueMap.get(d + 1) || 0) + Math.round(newIntroduced * (1 - rTarget)));
    }
    if (dueReviews > 0) {
      const nextIv = Math.max(2, Math.round(6 * retentionMultiplier));
      dueMap.set(d + nextIv, (dueMap.get(d + nextIv) || 0) + Math.round(dueReviews * rTarget));
      dueMap.set(d + 1, (dueMap.get(d + 1) || 0) + Math.round(dueReviews * (1 - rTarget)));
    }

    peakDailyCards = Math.max(peakDailyCards, totalCards);
    totalReviewsProjected += totalCards;
    points.push({
      dayOffset: d,
      date: new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10),
      dueReviews,
      newIntroduced,
      totalCards,
      estimatedMinutes: Math.round(((totalCards * avgSecondsPerCard) / 60) * 10) / 10
    });
  }

  return {
    horizonDays: days,
    peakDailyCards,
    averageDailyCards: Math.round((totalReviewsProjected / days) * 10) / 10,
    totalReviewsProjected,
    points
  };
}

export interface ReviewHistorySample {
  elapsedDays: number;
  stabilityBefore: number;
  rating: Rating;
}

export interface OptimizerResult {
  status: 'optimized' | 'insufficient_data';
  sampleCount: number;
  minRequired: number;
  logLossBefore: number;
  logLossAfter: number;
  weights: number[];
}

export function optimizeFsrsParameters(
  samples: ReviewHistorySample[],
  currentWeights: number[] = DEFAULT_FSRS_WEIGHTS,
  minRequired = 100
): OptimizerResult {
  const base = currentWeights.length >= 19 ? [...currentWeights] : [...DEFAULT_FSRS_WEIGHTS];
  if (samples.length < minRequired) {
    return {
      status: 'insufficient_data',
      sampleCount: samples.length,
      minRequired,
      logLossBefore: 0,
      logLossAfter: 0,
      weights: base
    };
  }

  const evalLogLoss = (scale: number): number => {
    let loss = 0;
    for (const s of samples) {
      const y = s.rating === 1 ? 0 : 1;
      const p = clamp(fsrsRetrievability(s.elapsedDays, Math.max(0.1, s.stabilityBefore * scale)), 0.01, 0.99);
      loss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    }
    return loss / samples.length;
  };

  const lossBefore = evalLogLoss(1.0);
  let bestScale = 1.0;
  let bestLoss = lossBefore;

  for (let scale = 0.6; scale <= 1.5; scale += 0.05) {
    const l = evalLogLoss(scale);
    if (l < bestLoss) {
      bestLoss = l;
      bestScale = scale;
    }
  }

  const updated = [...base];
  // Adjust initial stability weights w[0..3] and recall growth w[8] smoothly
  for (let i = 0; i < 4; i++) {
    updated[i] = clamp(Math.round(base[i] * bestScale * 100000) / 100000, 0.05, 30);
  }
  updated[8] = clamp(Math.round((base[8] + Math.log(bestScale) * 0.25) * 100000) / 100000, 0.1, 4.0);

  return {
    status: 'optimized',
    sampleCount: samples.length,
    minRequired,
    logLossBefore: Math.round(lossBefore * 10000) / 10000,
    logLossAfter: Math.round(bestLoss * 10000) / 10000,
    weights: updated
  };
}
