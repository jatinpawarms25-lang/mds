import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfPageExtract {
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface ReportSection {
  heading: string;
  body: string;
  wordCount: number;
}

export interface StructuredReport {
  title: string;
  sourceName: string;
  generatedAt: string;
  totalPages: number;
  totalWords: number;
  estimatedReadMins: number;
  detectedSubjects: string[];
  highYieldPoints: string[];
  sections: ReportSection[];
}

const SUBJECT_KEYWORDS: { subject: string; keywords: string[] }[] = [
  { subject: 'Oral & Maxillofacial Surgery', keywords: ['le fort', 'mandible', 'condyle', 'impaction', 'extraction', 'osteomyelitis', 'tmj', 'maxilla', 'zygoma', 'alveolar'] },
  { subject: 'Oral Pathology', keywords: ['ameloblastoma', 'carcinoma', 'cyst', 'keratocyst', 'dysplasia', 'histopathology', 'granuloma', 'lichen planus', 'leukoplakia'] },
  { subject: 'Prosthodontics', keywords: ['denture', 'occlusion', 'impression', 'articulator', 'vertical dimension', 'kennedy', 'clasps', 'pontic', 'abutment'] },
  { subject: 'Orthodontics', keywords: ['malocclusion', 'cephalometric', 'angle', 'anchorage', 'overjet', 'overbite', 'bracket', 'orthognathic', 'arch'] },
  { subject: 'Endodontics & Conservative', keywords: ['pulp', 'root canal', 'apex', 'gutta percha', 'amalgam', 'composite', 'caries', 'sodium hypochlorite', 'mta'] },
  { subject: 'Periodontics', keywords: ['gingivitis', 'periodontitis', 'pocket', 'calculus', 'furcation', 'flap', 'bone graft', 'plaque', 'attachment'] },
  { subject: 'Pharmacology', keywords: ['dosage', 'mg', 'antibiotic', 'analgesic', 'lidocaine', 'epinephrine', 'contraindication', 'half-life', 'receptor'] },
  { subject: 'Dental Materials', keywords: ['gypsum', 'alginate', 'elastomer', 'setting time', 'water powder', 'zirconia', 'glass ionomer', 'viscosity'] },
  { subject: 'Public Health Dentistry', keywords: ['index', 'dmft', 'fluoride', 'epidemiology', 'prevalence', 'incidence', 'who', 'survey'] }
];

const HIGH_YIELD_MARKERS = [
  'most common',
  'gold standard',
  'drug of choice',
  'treatment of choice',
  'classification',
  'syndrome',
  'characteristic',
  'pathognomonic',
  'contraindicated',
  'diagnosis',
  'prognosis',
  'recommended',
  'criterion',
  'criteria'
];

export function sanitizeAscii(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function extractPdfPages(data: ArrayBuffer): Promise<PdfPageExtract[]> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  const pages: PdfPageExtract[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const raw = sanitizeAscii(strings.join(' '));
    const words = raw ? raw.split(/\s+/).filter(Boolean).length : 0;
    pages.push({
      pageNumber: i,
      text: raw,
      wordCount: words
    });
  }

  return pages;
}

export function detectSubjects(fullText: string): string[] {
  const lower = fullText.toLowerCase();
  const matches: string[] = [];
  for (const entry of SUBJECT_KEYWORDS) {
    const hits = entry.keywords.filter((kw) => lower.includes(kw)).length;
    if (hits >= 1) {
      matches.push(entry.subject);
    }
  }
  return matches.length > 0 ? matches.slice(0, 5) : ['General Study Document'];
}

export function extractHighYieldPoints(pages: PdfPageExtract[], maxPoints = 10): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    if (!p.text) continue;
    const sentences = p.text
      .split(/(?<=[.!?])\s+|\s*\*\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 28 && s.length <= 240);

    for (const s of sentences) {
      const lower = s.toLowerCase();
      const isHighYield =
        HIGH_YIELD_MARKERS.some((m) => lower.includes(m)) ||
        /\b\d+(\.\d+)?\s*(%|mm|mg|ml|days|weeks|months|years)\b/i.test(s);
      if (isHighYield) {
        const key = lower.slice(0, 60);
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push(`[P.${p.pageNumber}] ${s}`);
        }
      }
      if (candidates.length >= maxPoints) return candidates;
    }
  }

  if (candidates.length === 0) {
    for (const p of pages) {
      if (!p.text) continue;
      const snippet = p.text.slice(0, 180).trim();
      if (snippet) {
        candidates.push(`[P.${p.pageNumber}] ${snippet}${p.text.length > 180 ? '...' : ''}`);
      }
      if (candidates.length >= Math.min(4, maxPoints)) break;
    }
  }

  return candidates;
}

export function analyzePdfToStructuredReport(
  fileName: string,
  pages: PdfPageExtract[],
  customTitle?: string
): StructuredReport {
  const cleanName = sanitizeAscii(fileName || 'uploaded.pdf');
  const title = sanitizeAscii(customTitle || '') || cleanName.replace(/\.pdf$/i, '') + ' - Structured Report';
  const nonEmptyPages = pages.filter((p) => p.text.length > 0);
  const fullText = nonEmptyPages.map((p) => p.text).join('\n');
  const totalWords = nonEmptyPages.reduce((sum, p) => sum + p.wordCount, 0);

  return {
    title,
    sourceName: cleanName,
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    totalPages: pages.length,
    totalWords,
    estimatedReadMins: Math.max(1, Math.ceil(totalWords / 200)),
    detectedSubjects: detectSubjects(fullText),
    highYieldPoints: extractHighYieldPoints(nonEmptyPages),
    sections: nonEmptyPages.map((p) => ({
      heading: `Section ${p.pageNumber} (Source Page ${p.pageNumber})`,
      body: p.text,
      wordCount: p.wordCount
    }))
  };
}

export interface StudyProgressReportInput {
  targetCollegeName: string;
  targetCollegeMarks: number;
  latestMockScore: number | null;
  mockCount: number;
  errorCount: number;
  cardCount: number;
  weakestSubjects: { subject: string; count: number }[];
  nextAction: string;
  dailyHours: string;
}

export function buildStudyProgressReportData(input: StudyProgressReportInput): StructuredReport {
  const current = input.latestMockScore ?? 0;
  const target = Math.max(1, input.targetCollegeMarks);
  const gap = current - target;
  const pctDiff = Math.round((gap / target) * 100);
  const statusLine =
    input.latestMockScore === null
      ? 'No mock tests logged yet. Log your first mock in CBT & Mocks to unlock live % proximity.'
      : gap >= 0
      ? `Ahead of target by +${gap} marks (+${pctDiff}% above ${target}/960).`
      : `Behind target by ${Math.abs(gap)} marks (${pctDiff}% from ${target}/960).`;

  const weakSummary =
    input.weakestSubjects.length > 0
      ? input.weakestSubjects.map((w) => `${w.subject} (${w.count} logged mistakes)`).join(', ')
      : 'No subject mistakes logged yet.';

  const sections: ReportSection[] = [
    {
      heading: '1. Goal & College Proximity',
      body: `Target College: ${sanitizeAscii(input.targetCollegeName)}\nRequired Benchmark: ${target} / 960\nLatest Mock Score: ${input.latestMockScore !== null ? `${current} / 960` : 'Not recorded'}\nStatus: ${statusLine}`,
      wordCount: 34
    },
    {
      heading: '2. Study & Revision Telemetry',
      body: `Mocks Completed: ${input.mockCount}\nMistakes Logged: ${input.errorCount}\nActive FSRS Flashcards: ${input.cardCount}\nDaily Study Target: ${sanitizeAscii(input.dailyHours || 'Not set')}\nWeakest Subjects: ${sanitizeAscii(weakSummary)}`,
      wordCount: 32
    },
    {
      heading: '3. Recommended Next Action',
      body: sanitizeAscii(input.nextAction),
      wordCount: input.nextAction.split(/\s+/).filter(Boolean).length
    }
  ];

  return {
    title: 'MDS OS - Study & Goal Proximity Report',
    sourceName: 'MDS OS Live Workspace Telemetry',
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    totalPages: 1,
    totalWords: sections.reduce((s, sec) => s + sec.wordCount, 0),
    estimatedReadMins: 1,
    detectedSubjects:
      input.weakestSubjects.length > 0
        ? input.weakestSubjects.map((w) => sanitizeAscii(w.subject))
        : ['NEET-MDS Readiness'],
    highYieldPoints: [
      statusLine,
      `Weakest Focus Areas: ${sanitizeAscii(weakSummary)}`,
      `Action Prescription: ${sanitizeAscii(input.nextAction)}`
    ],
    sections
  };
}

export function exportReportToMarkdown(report: StructuredReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    '',
    `- **Source**: ${report.sourceName}`,
    `- **Generated**: ${report.generatedAt}`,
    `- **Pages**: ${report.totalPages} | **Words**: ${report.totalWords} | **Est. Read**: ${report.estimatedReadMins} min`,
    `- **Detected Topics**: ${report.detectedSubjects.join(', ')}`,
    '',
    '## High-Yield Takeaways',
    ...report.highYieldPoints.map((pt) => `- ${pt}`),
    '',
    '## Structured Sections'
  ];

  for (const sec of report.sections) {
    lines.push('', `### ${sec.heading}`, '', sec.body);
  }

  return lines.join('\n');
}

export function exportReportToPdf(report: StructuredReport): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
  };

  // Top Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(56, 189, 248);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MDS OS - STRUCTURED PDF REPORT', margin, 9);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(sanitizeAscii(report.title), maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const metaLine = `Source: ${sanitizeAscii(report.sourceName)}  |  Pages: ${report.totalPages}  |  Words: ${report.totalWords}  |  Read: ~${report.estimatedReadMins} min`;
  const metaWrapped = doc.splitTextToSize(metaLine, maxWidth);
  doc.text(metaWrapped, margin, y);
  y += metaWrapped.length * 4.5 + 2;

  const subjectLine = `Topics: ${report.detectedSubjects.map(sanitizeAscii).join(', ')}`;
  const subjectWrapped = doc.splitTextToSize(subjectLine, maxWidth);
  doc.text(subjectWrapped, margin, y);
  y += subjectWrapped.length * 4.5 + 4;

  // High-Yield Takeaways Section
  if (report.highYieldPoints.length > 0) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(3, 105, 161);
    doc.text('High-Yield Takeaways', margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    for (const point of report.highYieldPoints) {
      const wrapped = doc.splitTextToSize(`* ${sanitizeAscii(point)}`, maxWidth);
      ensureSpace(wrapped.length * 4.5 + 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 4.5 + 1.5;
    }
    y += 4;
  }

  // Sections
  for (const sec of report.sections) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    const headLines = doc.splitTextToSize(sanitizeAscii(sec.heading), maxWidth);
    doc.text(headLines, margin, y);
    y += headLines.length * 5 + 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const bodyLines = doc.splitTextToSize(sanitizeAscii(sec.body), maxWidth);
    for (const line of bodyLines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 4;
  }

  // Page footers
  const totalOutPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalOutPages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${p} of ${totalOutPages} - Generated by MDS OS`, pageWidth / 2, pageHeight - 8, {
      align: 'center'
    });
  }

  const slug = sanitizeAscii(report.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  doc.save(`${slug || 'mds-report'}.pdf`);
}
