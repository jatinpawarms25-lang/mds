export type NoteType = 'basic' | 'basic_reversed' | 'cloze';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy
export type SchedulerKind = 'fsrs' | 'sm2';

export interface NoteRecord {
  id: string;
  deck: string;
  noteType: NoteType;
  front: string;
  back: string;
  tags: string[];
  sourceRef?: string;
  mistakeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardRecord {
  id: string;
  noteId: string;
  deck: string;
  ord: number; // 0 for basic, 0/1 for reversed, 0..N-1 for cloze c1..cN
  front: string;
  back: string;
  tags: string[];
  state: CardState;
  stepIndex: number;
  dueAt: string; // ISO timestamp
  lastReviewAt: string | null;
  intervalDays: number;
  easeFactor: number; // SM-2 ease (default 2.5)
  stability: number; // FSRS S (days)
  difficulty: number; // FSRS D (1..10)
  reps: number;
  lapses: number;
  suspended: boolean;
  buriedUntil: string | null; // YYYY-MM-DD local/UTC day
  isLeech: boolean;
  imageUrl?: string;
  imageCredit?: string;
  occlusionMasks?: Array<{ id: string; label: string; x: number; y: number; w: number; h: number }>;
  activeMaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeckOptions {
  scheduler: SchedulerKind;
  desiredRetention: number; // default 0.90
  maxIntervalDays: number; // default 36500
  learningStepsMin: number[]; // default [1, 10]
  relearningStepsMin: number[]; // default [10]
  graduatingIntervalDays: number; // SM-2 default 1
  easyIntervalDays: number; // SM-2 default 4
  startingEase: number; // SM-2 default 2.5
  minEase: number; // SM-2 default 1.3
  newIntervalPct: number; // SM-2 lapse multiplier default 0.0 (floor 1d)
  minimumIntervalDays: number; // default 1
  leechThreshold: number; // default 8
  newCardsPerDay: number; // default 30
  maxReviewsPerDay: number; // default 200
  buryNewSiblings: boolean; // default true
  buryReviewSiblings: boolean; // default true
  maxAnswerSeconds: number; // default 60
  loadBalancing?: boolean; // default true in Phase 2B
  fsrsWeights: number[];
}

export interface ReviewOutcome {
  rating: Rating;
  card: CardRecord;
  intervalLabel: string;
  scheduledDays: number;
  elapsedDays: number;
  leechTriggered: boolean;
  logPayload: {
    card_id: string;
    rating: Rating;
    state_before: CardState;
    state_after: CardState;
    elapsed_days: number;
    scheduled_days: number;
    duration_ms: number;
    scheduler_params: {
      scheduler: SchedulerKind;
      version: string;
      desiredRetention: number;
    };
  };
}

export type SchedulingPreview = Record<Rating, ReviewOutcome>;
