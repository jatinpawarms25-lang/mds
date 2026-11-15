import type { CardRecord } from '../memory/types';

export interface MockSummaryInput {
  totalScore: number;
  accuracy: number;
  partA_C?: number;
  partB_C?: number;
  date: string;
}

export interface ErrorInput {
  subject: string;
  reason: string;
  cardCreated?: boolean;
}

export interface SubjectFocusRecommendation {
  subject: string;
  riskScore: number;
  mistakes: number;
  leeches: number;
  suggestedExtraHours: number;
}

export interface StudyAnalyticsSummary {
  latestMockScore: number | null;
  bestMockScore: number | null;
  avgAccuracy: number | null;
  weakestSubjects: SubjectFocusRecommendation[];
  loopHealth: {
    mocksLogged: number;
    mistakesLogged: number;
    flashcardsTotal: number;
    reviewsCompleted: number;
    leechesActive: number;
  };
  nextAction: string;
}

export function computeStudyAnalytics(params: {
  mocks: MockSummaryInput[];
  errors: ErrorInput[];
  cards: CardRecord[];
}): StudyAnalyticsSummary {
  const { mocks, errors, cards } = params;
  const sortedMocks = [...mocks].sort((a, b) => a.date.localeCompare(b.date));
  const latestMockScore = sortedMocks.length > 0 ? sortedMocks[sortedMocks.length - 1].totalScore : null;
  const bestMockScore = sortedMocks.length > 0 ? Math.max(...sortedMocks.map((m) => m.totalScore)) : null;
  const avgAccuracy =
    sortedMocks.length > 0
      ? Math.round((sortedMocks.reduce((acc, m) => acc + (m.accuracy || 0), 0) / sortedMocks.length) * 10) / 10
      : null;

  const subjectMap = new Map<string, { mistakes: number; leeches: number }>();
  for (const err of errors) {
    const s = err.subject || 'General';
    const cur = subjectMap.get(s) || { mistakes: 0, leeches: 0 };
    cur.mistakes += 1;
    subjectMap.set(s, cur);
  }
  for (const c of cards) {
    if (!c.isLeech) continue;
    const s = c.deck || 'General';
    const cur = subjectMap.get(s) || { mistakes: 0, leeches: 0 };
    cur.leeches += 1;
    subjectMap.set(s, cur);
  }

  const weakestSubjects: SubjectFocusRecommendation[] = Array.from(subjectMap.entries())
    .map(([subject, counts]) => {
      const riskScore = counts.mistakes * 2 + counts.leeches * 3;
      return {
        subject,
        riskScore,
        mistakes: counts.mistakes,
        leeches: counts.leeches,
        suggestedExtraHours: Math.min(6, Math.max(1, Math.ceil(riskScore / 2)))
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5);

  const reviewsCompleted = cards.reduce((acc, c) => acc + (c.reps || 0), 0);
  const leechesActive = cards.filter((c) => c.isLeech && !c.suspended).length;

  let nextAction = 'Log a daily quiz or CBT mock to calibrate your weak-subject plan.';
  if (weakestSubjects.length > 0) {
    const top = weakestSubjects[0];
    nextAction = `Allocate +${top.suggestedExtraHours}h/week to ${top.subject} (${top.mistakes} mistakes, ${top.leeches} leeches).`;
  } else if (cards.length > 0) {
    nextAction = 'Complete your due FSRS memory queue to lock in long-term retention.';
  }

  return {
    latestMockScore,
    bestMockScore,
    avgAccuracy,
    weakestSubjects,
    loopHealth: {
      mocksLogged: mocks.length,
      mistakesLogged: errors.length,
      flashcardsTotal: cards.length,
      reviewsCompleted,
      leechesActive
    },
    nextAction
  };
}
