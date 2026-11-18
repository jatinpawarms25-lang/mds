import { detectCanonicalSubjects, type DetectedSubjectTag } from '../data/subjectTaxonomy';

export interface PdfPageExtract {
  pageNumber: number;
  pageLabel: string;
  heading: string;
  text: string;
  wordCount: number;
}

export interface ReportSection {
  heading: string;
  pageLabel: string;
  body: string;
  wordCount: number;
}

export interface PdfSummaryReport {
  kind: 'pdf_summary';
  title: string;
  sourceName: string;
  generatedAt: string;
  totalPages: number;
  totalWords: number;
  estimatedReadMins: number;
  detectedSubjects: DetectedSubjectTag[];
  autoPickedSentences: string[];
  sections: ReportSection[];
}

export interface StudyProgressReport {
  kind: 'progress';
  title: string;
  sourceName: string;
  generatedAt: string;
  totalPages: number;
  totalWords: number;
  estimatedReadMins: number;
  detectedSubjects: DetectedSubjectTag[];
  autoPickedSentences: string[];
  sections: ReportSection[];
}

export type StructuredReport = PdfSummaryReport | StudyProgressReport;

export const NUM_FACT =
  /\b\d+(?:\.\d+)?\s*(?:%|mm|cm|mg|mcg|\u03bcg|\u00b5g|kg|g|ml|l|iu|days?|weeks?|months?|years?|hours?|min(?:utes?)?|s|\u00b0|degrees?)(?![A-Za-z])/i;

const LIGATURES: Record<string, string> = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'st',
  '\uFB06': 'st'
};

export function normalizeExtracted(input: string): string {
  return input
    .replace(/[\uFB00-\uFB06]/g, (c) => LIGATURES[c] ?? c)
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u2212/g, '-')
    .replace(/[\u2018\u2019]/g, '\u0027')
    .replace(/[\u201C\u201D]/g, '\u0022')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const PDF_TRANSLITERATIONS: Record<string, string> = {
  '\u03BC': '[mu]',
  '\u00B5': '[mu]',
  '\u03B1': '[alpha]',
  '\u03B2': '[beta]',
  '\u03B3': '[gamma]',
  '\u03B4': '[delta]',
  '\u2265': '>=',
  '\u2264': '<=',
  '\u00B0': ' deg',
  '\u00B1': '+/-',
  '\u00B2': '^2',
  '\u00B3': '^3',
  '\u207A': '+',
  '\u207B': '-',
  '\u2076': '^6'
};

export function transliterateForCorePdfFont(input: string): { text: string; changed: boolean } {
  let changed = false;
  let out = '';
  for (const ch of input) {
    if (PDF_TRANSLITERATIONS[ch]) {
      out += PDF_TRANSLITERATIONS[ch];
      changed = true;
    } else if (ch.charCodeAt(0) > 127 && ch.charCodeAt(0) !== 10 && ch.charCodeAt(0) !== 13) {
      out += '?';
      changed = true;
    } else {
      out += ch;
    }
  }
  return { text: out, changed };
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
}

export function reconstructPageLines(items: TextItemLike[]): string {
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  let lastEndX: number | null = null;

  for (const item of items) {
    const str = item.str ?? '';
    const tx = Array.isArray(item.transform) ? item.transform[4] : null;
    const ty = Array.isArray(item.transform) ? item.transform[5] : null;
    const width = typeof item.width === 'number' ? item.width : str.length * 4;

    if (lastY !== null && ty !== null && Math.abs(ty - lastY) > 4) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = '';
      lastEndX = null;
    }

    if (str) {
      if (currentLine && lastEndX !== null && tx !== null) {
        const gap = tx - lastEndX;
        if (gap > 2.2 && !currentLine.endsWith(' ') && !str.startsWith(' ')) {
          currentLine += ' ';
        }
      }
      currentLine += str;
    }

    if (tx !== null) lastEndX = tx + width;
    if (ty !== null) lastY = ty;

    if (item.hasEOL) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = '';
      lastEndX = null;
    }
  }

  if (currentLine.trim()) lines.push(currentLine.trim());

  // De-hyphenate line ends and join lines cleanly
  let joined = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (joined.endsWith('-') && /^[a-z]/.test(line)) {
      joined = joined.slice(0, -1) + line;
    } else if (joined) {
      joined += ' ' + line;
    } else {
      joined = line;
    }
  }

  return normalizeExtracted(joined);
}

export async function extractPdfPages(
  data: ArrayBuffer,
  options?: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void }
): Promise<PdfPageExtract[]> {
  const isNode = typeof window === 'undefined';
  const pdfjsLib = isNode
    ? await import('pdfjs-dist/legacy/build/pdf.mjs')
    : await import('pdfjs-dist');
  if (!isNode) {
    const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false
  } as Parameters<typeof pdfjsLib.getDocument>[0]);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      void loadingTask.destroy();
    });
  }

  const pdf = await loadingTask.promise;
  const pages: PdfPageExtract[] = [];

  try {
    const pageLabels = await pdf.getPageLabels().catch(() => null);
    const outline = await pdf.getOutline().catch(() => null);
    const outlineByPage = new Map<number, string>();

    if (Array.isArray(outline)) {
      for (const item of outline) {
        if (item?.title && Array.isArray(item.dest)) {
          try {
            const pageIdx = await pdf.getPageIndex(item.dest[0]);
            if (!outlineByPage.has(pageIdx + 1)) {
              outlineByPage.set(pageIdx + 1, normalizeExtracted(item.title));
            }
          } catch {
            // ignore unresolvable outline destinations
          }
        }
      }
    }

    for (let i = 1; i <= pdf.numPages; i += 1) {
      if (options?.signal?.aborted) {
        throw new Error('PDF extraction cancelled.');
      }
      const page = await pdf.getPage(i);
      try {
        const content = await page.getTextContent();
        const text = reconstructPageLines(content.items as TextItemLike[]);
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const label = pageLabels?.[i - 1] ? String(pageLabels[i - 1]) : String(i);
        const heading = outlineByPage.get(i) || `Page ${label}`;
        pages.push({
          pageNumber: i,
          pageLabel: label,
          heading,
          text,
          wordCount: words
        });
        options?.onProgress?.(i, pdf.numPages);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    const maybeDestroy = (pdf as unknown as { destroy?: () => Promise<void> }).destroy;
    if (typeof maybeDestroy === 'function') {
      await maybeDestroy.call(pdf);
    } else {
      await loadingTask.destroy();
    }
  }

  return pages;
}

const HIGH_YIELD_MARKERS: { marker: string; weight: number }[] = [
  { marker: 'gold standard', weight: 4 },
  { marker: 'treatment of choice', weight: 4 },
  { marker: 'drug of choice', weight: 4 },
  { marker: 'pathognomonic', weight: 4 },
  { marker: 'most common', weight: 3 },
  { marker: 'contraindicated', weight: 3 },
  { marker: 'classification', weight: 2 },
  { marker: 'diagnosis', weight: 2 },
  { marker: 'syndrome', weight: 2 },
  { marker: 'characteristic', weight: 2 },
  { marker: 'criterion', weight: 2 },
  { marker: 'criteria', weight: 2 }
];

const ABBREV_PROTECT = /\b(Fig|e\.g|i\.e|Dr|vs|approx|No|et al)\./gi;

export function splitSentencesAware(text: string): string[] {
  const placeholder = '__DOT__';
  const protectedText = text.replace(ABBREV_PROTECT, (m) => m.slice(0, -1) + placeholder);
  return protectedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(new RegExp(placeholder, 'g'), '.').trim())
    .filter((s) => s.length >= 24 && s.length <= 260);
}

export function extractAutoPickedSentences(pages: PdfPageExtract[], maxTotal = 12): string[] {
  interface Scored {
    pageNumber: number;
    pageLabel: string;
    sentence: string;
    score: number;
  }

  const allCandidates: Scored[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    if (!p.text) continue;
    const sentences = splitSentencesAware(p.text);
    const pageCandidates: Scored[] = [];

    for (const s of sentences) {
      const lower = s.toLowerCase();
      let score = 0;
      for (const m of HIGH_YIELD_MARKERS) {
        if (lower.includes(m.marker)) score += m.weight;
      }
      if (NUM_FACT.test(s)) score += 3;
      if (/\bis\s+(?:a|an|the|defined as)\b/i.test(s)) score += 1;

      if (score > 0) {
        const dedup = lower.slice(0, 64);
        if (!seen.has(dedup)) {
          seen.add(dedup);
          pageCandidates.push({
            pageNumber: p.pageNumber,
            pageLabel: p.pageLabel || String(p.pageNumber),
            sentence: s,
            score
          });
        }
      }
    }

    pageCandidates.sort((a, b) => b.score - a.score);
    allCandidates.push(...pageCandidates.slice(0, 2));
  }

  const picked = allCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTotal)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  return picked.map((item) => `[P.${item.pageLabel}] ${item.sentence}`);
}

export function analyzePdfToStructuredReport(
  fileName: string,
  pages: PdfPageExtract[],
  customTitle?: string
): PdfSummaryReport {
  const cleanName = normalizeExtracted(fileName || 'uploaded.pdf');
  const title = normalizeExtracted(customTitle || '') || cleanName.replace(/\.pdf$/i, '') + ' - Structured Report';
  const nonEmptyPages = pages.filter((p) => p.text.length > 0);
  const fullText = nonEmptyPages.map((p) => p.text).join('\n');
  const totalWords = nonEmptyPages.reduce((sum, p) => sum + p.wordCount, 0);

  return {
    kind: 'pdf_summary',
    title,
    sourceName: cleanName,
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    totalPages: pages.length,
    totalWords,
    estimatedReadMins: Math.max(1, Math.ceil(totalWords / 200)),
    detectedSubjects: detectCanonicalSubjects(fullText),
    autoPickedSentences: extractAutoPickedSentences(nonEmptyPages, 12),
    sections: nonEmptyPages.map((p) => ({
      heading: p.heading || `Page ${p.pageLabel}`,
      pageLabel: p.pageLabel || String(p.pageNumber),
      body: p.text,
      wordCount: p.wordCount
    }))
  };
}

export interface StudyProgressReportInput {
  targetCollegeName: string;
  targetBranch: string;
  targetCollegeMarks: number | null;
  maxMarks: number;
  maxMarksSource: string;
  latestMockScore: number | null;
  lastThreeMocksAvg: number | null;
  mockCount: number;
  errorCount: number;
  dueToday: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  leechesCount: number;
  trueRetentionPct: number | null;
  weakestSubjects: { subject: string; mistakes: number; leeches: number }[];
  suggestedNextStep: string;
  dailyHours: string;
}

export function buildStudyProgressReportData(input: StudyProgressReportInput): StudyProgressReport {
  const validMax = Number.isFinite(input.maxMarks) && input.maxMarks > 0 ? input.maxMarks : 960;
  const hasTarget = Number.isFinite(input.targetCollegeMarks) && (input.targetCollegeMarks ?? 0) > 0;
  const target = hasTarget ? Number(input.targetCollegeMarks) : null;
  const hasLatest = Number.isFinite(input.latestMockScore);
  const current = hasLatest ? Number(input.latestMockScore) : null;

  let statusLine = 'Log a CBT mock and set a target college in Colleges to compute your live % proximity.';
  if (current !== null && target !== null) {
    const gap = current - target;
    const pctDiff = Math.round((gap / target) * 100);
    statusLine =
      gap >= 0
        ? `Ahead of target by +${gap} marks (+${pctDiff}% above ${target}/${validMax}).`
        : `Behind target by ${Math.abs(gap)} marks (${pctDiff}% from ${target}/${validMax}).`;
  }

  const weakSummary =
    input.weakestSubjects.length > 0
      ? input.weakestSubjects.map((w) => `${w.subject} (${w.mistakes} mistakes, ${w.leeches} leeches)`).join(', ')
      : 'No subject mistakes logged yet.';

  const avgLine =
    Number.isFinite(input.lastThreeMocksAvg) && input.lastThreeMocksAvg !== null
      ? `${input.lastThreeMocksAvg} / ${validMax}`
      : 'Not enough mocks';

  const retentionLine =
    Number.isFinite(input.trueRetentionPct) && input.trueRetentionPct !== null
      ? `${input.trueRetentionPct}%`
      : 'Insufficient mature reviews';

  const sec1Body = [
    `Target Branch: ${normalizeExtracted(input.targetBranch || 'Not set')}`,
    `Target College: ${normalizeExtracted(input.targetCollegeName || 'Not set')}`,
    `Required Benchmark: ${target !== null ? `${target} / ${validMax}` : 'Not set'} (${input.maxMarksSource})`,
    `Latest Mock Score: ${current !== null ? `${current} / ${validMax}` : 'Not recorded'} | Last 3 Avg: ${avgLine}`,
    `Status: ${statusLine}`
  ].join('\n');

  const sec2Body = [
    `Mocks Completed: ${input.mockCount}`,
    `Mistakes Logged: ${input.errorCount}`,
    `Memory Queue (excl. suspended): Due today ${input.dueToday} | New ${input.newCount} | Learning ${input.learningCount} | Review ${input.reviewCount} | Leeches ${input.leechesCount}`,
    `True Retention (>=21d): ${retentionLine}`,
    `Daily Study Target: ${normalizeExtracted(input.dailyHours || 'Not set')}`,
    `Weakest Subjects: ${normalizeExtracted(weakSummary)}`
  ].join('\n');

  const sec3Body = normalizeExtracted(input.suggestedNextStep || 'Continue scheduled FSRS reviews and timed MCQ practice.');

  const sections: ReportSection[] = [
    {
      heading: '1. Goal & College Proximity',
      pageLabel: '1',
      body: sec1Body,
      wordCount: sec1Body.split(/\s+/).filter(Boolean).length
    },
    {
      heading: '2. Study & Memory Telemetry',
      pageLabel: '1',
      body: sec2Body,
      wordCount: sec2Body.split(/\s+/).filter(Boolean).length
    },
    {
      heading: '3. Suggested next step',
      pageLabel: '1',
      body: sec3Body,
      wordCount: sec3Body.split(/\s+/).filter(Boolean).length
    }
  ];

  const totalWords = sections.reduce((sum, sec) => sum + sec.wordCount, 0);

  return {
    kind: 'progress',
    title: 'ApexMDS - Study & Goal Proximity Report',
    sourceName: 'ApexMDS Live Workspace Telemetry',
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    totalPages: 1,
    totalWords,
    estimatedReadMins: Math.max(1, Math.ceil(totalWords / 200)),
    detectedSubjects: input.weakestSubjects.slice(0, 3).map((w, i) => ({
      id: `weak_${i}`,
      name: w.subject,
      distinctHits: w.mistakes + w.leeches,
      totalHits: w.mistakes + w.leeches,
      confidence: 'high'
    })),
    autoPickedSentences: [
      statusLine,
      `Weakest Focus Areas: ${normalizeExtracted(weakSummary)}`,
      `Suggested next step: ${sec3Body}`
    ],
    sections
  };
}

export function exportReportToMarkdown(report: StructuredReport): string {
  const topics =
    report.detectedSubjects.length > 0
      ? report.detectedSubjects.map((s) => `${s.name} (${s.confidence})`).join(', ')
      : 'None detected';

  const lines: string[] = [
    `# ${report.title}`,
    '',
    `- **Source**: ${report.sourceName}`,
    `- **Generated**: ${report.generatedAt}`,
    `- **Pages**: ${report.totalPages} | **Words**: ${report.totalWords} | **Est. Read**: ${report.estimatedReadMins} min`,
    `- **Detected Subjects**: ${topics}`,
    '',
    '## Auto-picked sentences (unverified)',
    ...report.autoPickedSentences.map((pt) => `- ${pt}`),
    '',
    '## Structured Sections'
  ];

  for (const sec of report.sections) {
    lines.push('', `### ${sec.heading}`, '', sec.body);
  }

  return lines.join('\n');
}

const yieldFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function buildReportPdf(
  report: StructuredReport
): Promise<{ buffer: ArrayBuffer; usedFallbackTransliteration: boolean }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;
  let usedFallbackTransliteration = false;
  let lineCounter = 0;

  const prep = (raw: string) => {
    const res = transliterateForCorePdfFont(raw);
    if (res.changed) usedFallbackTransliteration = true;
    return res.text;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('APEXMDS - STRUCTURED PDF REPORT', margin, 9);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(prep(report.title), maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const metaLine = `Source: ${prep(report.sourceName)}  |  Pages: ${report.totalPages}  |  Words: ${report.totalWords}  |  Read: ~${report.estimatedReadMins} min`;
  const metaWrapped = doc.splitTextToSize(metaLine, maxWidth);
  doc.text(metaWrapped, margin, y);
  y += metaWrapped.length * 4.5 + 2;

  if (report.detectedSubjects.length > 0) {
    const subjectLine = `Subjects: ${report.detectedSubjects.map((s) => prep(s.name)).join(', ')}`;
    const subjectWrapped = doc.splitTextToSize(subjectLine, maxWidth);
    doc.text(subjectWrapped, margin, y);
    y += subjectWrapped.length * 4.5 + 4;
  }

  if (report.autoPickedSentences.length > 0) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(3, 105, 161);
    doc.text('Auto-picked sentences (unverified)', margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    for (const point of report.autoPickedSentences) {
      const wrapped = doc.splitTextToSize(`* ${prep(point)}`, maxWidth);
      ensureSpace(wrapped.length * 4.5 + 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5 + 1.5;
    }
    y += 4;
  }

  for (const sec of report.sections) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    const headLines = doc.splitTextToSize(prep(sec.heading), maxWidth);
    doc.text(headLines, margin, y);
    y += headLines.length * 5 + 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const bodyLines = doc.splitTextToSize(prep(sec.body), maxWidth);
    for (const line of bodyLines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
      lineCounter += 1;
      if (lineCounter % 200 === 0) {
        await yieldFrame();
      }
    }
    y += 4;
  }

  const totalOutPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalOutPages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${totalOutPages} - Generated by ApexMDS`, pageWidth / 2, pageHeight - 8, {
      align: 'center'
    });
  }

  return {
    buffer: doc.output('arraybuffer'),
    usedFallbackTransliteration
  };
}

export async function saveReportPdf(report: StructuredReport): Promise<{ usedFallbackTransliteration: boolean }> {
  const { buffer, usedFallbackTransliteration } = await buildReportPdf(report);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const slug = report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug || 'apexmds-report'}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { usedFallbackTransliteration };
}
