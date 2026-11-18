import { describe, expect, it } from 'vitest';
import { detectCanonicalSubjects } from '../data/subjectTaxonomy';
import {
  NUM_FACT,
  analyzePdfToStructuredReport,
  buildReportPdf,
  buildStudyProgressReportData,
  exportReportToMarkdown,
  extractAutoPickedSentences,
  extractPdfPages,
  normalizeExtracted
} from './pdfReportEngine';

describe('pdfReportEngine (Part 11A-D)', () => {
  it('normalizeExtracted preserves scientific Unicode and fixes ligatures/soft-hyphens', () => {
    const sample = '5 \u03bcg/mL, pH \u2265 7.4, ANB \u22122\u00b0, \u03b1-amylase, Ca\u00b2\u207a, 10\u2076, \ufb01bro\u00ADsis \u201cquote\u201d';
    const out = normalizeExtracted(sample);
    expect(out).toContain('5 \u03bcg/mL');
    expect(out).toContain('pH \u2265 7.4');
    expect(out).toContain('ANB -2\u00b0');
    expect(out).toContain('\u03b1-amylase');
    expect(out).toContain('Ca\u00b2\u207a');
    expect(out).toContain('10\u2076');
    expect(out).toContain('fibrosis');
    expect(out).toContain('"quote"');
  });

  it('NUM_FACT matches clinical quantities and rejects section/figure numbers', () => {
    expect(NUM_FACT.test('2% lidocaine')).toBe(true);
    expect(NUM_FACT.test('45%')).toBe(true);
    expect(NUM_FACT.test('1 cm')).toBe(true);
    expect(NUM_FACT.test('4.4 mg/kg')).toBe(true);
    expect(NUM_FACT.test('5 mg.')).toBe(true);
    expect(NUM_FACT.test('SNA 82 degrees')).toBe(true);

    expect(NUM_FACT.test('Section 5 gingival margin')).toBe(false);
    expect(NUM_FACT.test('Table 5 shows')).toBe(false);
    expect(NUM_FACT.test('Fig. 3')).toBe(false);
  });

  it('detectCanonicalSubjects rejects non-dental text and ignores single stray hits', () => {
    expect(detectCanonicalSubjects('The quick brown fox jumps over the lazy dog for research who cares.')).toEqual([]);

    const perioText =
      'Periodontal pocket probing depth reached 6 mm with clinical attachment loss and bleeding on probing. ' +
      'Gracey curette instrumentation was performed after one stray extraction note.';
    const tags = detectCanonicalSubjects(perioText);
    expect(tags.length).toBe(1);
    expect(tags[0].id).toBe('perio');
  });

  it('extractAutoPickedSentences spans 40-page fixture and respects abbreviations', () => {
    const pages = Array.from({ length: 40 }, (_, idx) => ({
      pageNumber: idx + 1,
      pageLabel: String(idx + 1),
      heading: `Page ${idx + 1}`,
      text: `Fig. ${idx + 1} shows e.g. lesion details. The gold standard diagnosis on page ${idx + 1} is 2% lidocaine at 4.4 mg/kg.`,
      wordCount: 22
    }));

    const picks = extractAutoPickedSentences(pages, 12);
    expect(picks.length).toBe(12);
    const uniquePages = new Set(picks.map((p) => p.match(/\[P\.(\d+)\]/)?.[1]));
    expect(uniquePages.size).toBeGreaterThanOrEqual(6);
  });

  it('buildStudyProgressReportData handles NaN/missing settings without NaN output', () => {
    const report = buildStudyProgressReportData({
      targetCollegeName: '',
      targetBranch: '',
      targetCollegeMarks: Number.NaN,
      maxMarks: 960,
      maxMarksSource: 'Content Pack 2026',
      latestMockScore: Number.NaN,
      lastThreeMocksAvg: null,
      mockCount: 0,
      errorCount: 0,
      dueToday: 0,
      newCount: 0,
      learningCount: 0,
      reviewCount: 0,
      leechesCount: 0,
      trueRetentionPct: null,
      weakestSubjects: [],
      suggestedNextStep: '',
      dailyHours: ''
    });

    const md = exportReportToMarkdown(report);
    expect(md).not.toContain('NaN');
    expect(report.totalWords).toBeGreaterThan(20);
  });

  it('empty PDF produces zero sections', () => {
    const empty = analyzePdfToStructuredReport('scan.pdf', [
      { pageNumber: 1, pageLabel: '1', heading: 'Page 1', text: '', wordCount: 0 }
    ]);
    expect(empty.totalWords).toBe(0);
    expect(empty.sections.length).toBe(0);
  });

  it('round-trips buildReportPdf -> extractPdfPages', async () => {
    const report = analyzePdfToStructuredReport('RoundTrip.pdf', [
      {
        pageNumber: 1,
        pageLabel: '1',
        heading: 'Page 1',
        text: 'Ameloblastoma is the most common odontogenic tumor with 45% recurrence after curettage.',
        wordCount: 13
      }
    ]);
    const { buffer } = await buildReportPdf(report);
    expect(buffer.byteLength).toBeGreaterThan(500);

    const extracted = await extractPdfPages(buffer);
    expect(extracted.length).toBeGreaterThanOrEqual(1);
    const combined = extracted.map((p) => p.text).join(' ');
    expect(combined).toContain('Ameloblastoma');
    expect(combined).toContain('45%');
  });
});
