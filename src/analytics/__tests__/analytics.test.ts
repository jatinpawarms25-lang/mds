import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CardRecord } from '../../memory/types';
import { computeStudyAnalytics } from '../engine';

describe('Phase 5-7 Closed-Loop Analytics & Content Isolation', () => {
  it('ranks weakest subjects by mistakes and leeches and recommends weekly hours', () => {
    const cards: CardRecord[] = [
      {
        id: 'c1',
        noteId: 'n1',
        deck: 'Oral Pathology',
        ord: 0,
        front: 'Q',
        back: 'A',
        tags: ['leech'],
        state: 'review',
        stepIndex: 0,
        dueAt: '2026-11-15T08:00:00.000Z',
        lastReviewAt: '2026-11-10T08:00:00.000Z',
        intervalDays: 5,
        easeFactor: 2.5,
        stability: 5,
        difficulty: 6,
        reps: 10,
        lapses: 8,
        suspended: false,
        buriedUntil: null,
        isLeech: true,
        createdAt: '2026-11-01T08:00:00.000Z',
        updatedAt: '2026-11-10T08:00:00.000Z'
      }
    ];

    const summary = computeStudyAnalytics({
      mocks: [
        { totalScore: 710, accuracy: 82.5, date: '2026-11-01' },
        { totalScore: 786, accuracy: 90.2, date: '2026-11-15' }
      ],
      errors: [
        { subject: 'Oral Pathology', reason: 'Concept Gap', cardCreated: true },
        { subject: 'Oral Pathology', reason: 'Silly Mistake' },
        { subject: 'Anatomy', reason: 'Concept Gap' }
      ],
      cards
    });

    expect(summary.latestMockScore).toBe(786);
    expect(summary.bestMockScore).toBe(786);
    expect(summary.weakestSubjects[0].subject).toBe('Oral Pathology');
    expect(summary.weakestSubjects[0].riskScore).toBe(7); // 2*2 + 1*3
    expect(summary.nextAction).toContain('Oral Pathology');
    expect(summary.loopHealth.reviewsCompleted).toBe(10);
  });

  it('enforces Rule R6 confidence checks and Data Domain B isolation in 003_content_packs.sql', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase', 'migrations', '003_content_packs.sql'),
      'utf8'
    );
    expect(sql).toContain("confidence IN ('official', 'secondary', 'estimate')");
    expect(sql).toContain('verified_at DATE NOT NULL');
    expect(sql).not.toContain('DELETE FROM public.user_records');
    expect(sql).not.toContain('TRUNCATE public.review_logs');
  });
});
