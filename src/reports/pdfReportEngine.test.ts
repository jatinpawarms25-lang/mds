import { describe, expect, it } from 'vitest';
import {
  analyzePdfToStructuredReport,
  buildStudyProgressReportData,
  exportReportToMarkdown,
  sanitizeAscii
} from './pdfReportEngine';

describe('pdfReportEngine', () => {
  it('sanitizes non-ASCII and curly quotes cleanly', () => {
    const out = sanitizeAscii('\u201cLe Fort I\u201d \u2014 fracture \u2022 100%');
    expect(out).toBe('"Le Fort I" - fracture * 100%');
  });

  it('analyzes extracted PDF pages into subjects, high-yield points, and sections', () => {
    const report = analyzePdfToStructuredReport('OMFS_Notes.pdf', [
      {
        pageNumber: 1,
        text: 'Ameloblastoma is the most common odontogenic tumor of the mandible. Treatment of choice is wide surgical excision with 1 cm margin.',
        wordCount: 22
      },
      {
        pageNumber: 2,
        text: '',
        wordCount: 0
      }
    ]);

    expect(report.title).toBe('OMFS_Notes - Structured Report');
    expect(report.totalPages).toBe(2);
    expect(report.sections.length).toBe(1);
    expect(report.detectedSubjects).toContain('Oral & Maxillofacial Surgery');
    expect(report.detectedSubjects).toContain('Oral Pathology');
    expect(report.highYieldPoints.length).toBeGreaterThan(0);

    const md = exportReportToMarkdown(report);
    expect(md).toContain('# OMFS_Notes - Structured Report');
    expect(md).toContain('High-Yield Takeaways');
  });

  it('builds a study progress report from MDS OS metrics', () => {
    const report = buildStudyProgressReportData({
      targetCollegeName: 'MAIDS New Delhi',
      targetCollegeMarks: 800,
      latestMockScore: 720,
      mockCount: 4,
      errorCount: 18,
      cardCount: 64,
      weakestSubjects: [{ subject: 'Oral Pathology', count: 7 }],
      nextAction: 'Review 25 Oral Pathology MCQs today.',
      dailyHours: '8'
    });

    expect(report.highYieldPoints[0]).toContain('Behind target by 80 marks (-10%');
    expect(report.sections.length).toBe(3);
  });
});
