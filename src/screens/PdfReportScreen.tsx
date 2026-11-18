import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { computeStudyAnalytics, type ErrorInput, type MockSummaryInput } from '../analytics/engine';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';
import { useSyncCollection } from '../hooks/useSyncStore';
import type { CardRecord } from '../memory/types';
import {
  analyzePdfToStructuredReport,
  buildStudyProgressReportData,
  exportReportToMarkdown,
  extractPdfPages,
  saveReportPdf,
  type PdfPageExtract,
  type StructuredReport
} from '../reports/pdfReportEngine';

type ReportTab = 'pdf_upload' | 'study_progress';
const MAX_PDF_BYTES = 50 * 1024 * 1024;

export default function PdfReportScreen() {
  const [tab, setTab] = useState<ReportTab>('pdf_upload');
  const [customTitle, setCustomTitle] = useState('');
  const [parsedFileName, setParsedFileName] = useState('');
  const [parsedPages, setParsedPages] = useState<PdfPageExtract[] | null>(null);
  const [customSubjects, setCustomSubjects] = useState<string[] | null>(null);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [visibleSections, setVisibleSections] = useState(20);
  const abortRef = useRef<AbortController | null>(null);

  const { items: settings } = useSyncCollection<{ value: unknown }>('settings');
  const { items: errors } = useSyncCollection<ErrorInput>('errors');
  const { items: mocks } = useSyncCollection<MockSummaryInput>('mocks');
  const { items: cards } = useSyncCollection<CardRecord>('cards');

  const settingsMap = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const s of settings) m[s.id] = s.data?.value;
    return m;
  }, [settings]);

  const analytics = useMemo(
    () =>
      computeStudyAnalytics({
        mocks: mocks.map((m) => m.data),
        errors: errors.map((e) => e.data),
        cards: cards.map((c) => c.data)
      }),
    [mocks, errors, cards]
  );

  const uploadedReport = useMemo(() => {
    if (!parsedPages || !parsedFileName) return null;
    const report = analyzePdfToStructuredReport(parsedFileName, parsedPages, customTitle);
    if (report.totalWords === 0) return null;
    return report;
  }, [parsedPages, parsedFileName, customTitle]);

  const studyReport = useMemo<StructuredReport>(() => {
    const rawTarget = Number(settingsMap.targetCollegeMarks ?? settingsMap.targetScore);
    const targetCollegeMarks = Number.isFinite(rawTarget) && rawTarget > 0 ? rawTarget : null;
    const targetCollegeName = String(settingsMap.targetCollegeName || '');
    const targetBranch = String(settingsMap.targetBranch || '');

    const activeCards = cards.map((c) => c.data).filter((c) => !c.suspended);
    const nowMs = Date.now();
    const dueToday = activeCards.filter((c) => new Date(c.dueAt).getTime() <= nowMs).length;
    const newCount = activeCards.filter((c) => c.state === 'new').length;
    const learningCount = activeCards.filter((c) => c.state === 'learning' || c.state === 'relearning').length;
    const reviewCount = activeCards.filter((c) => c.state === 'review').length;
    const leechesCount = activeCards.filter((c) => c.isLeech).length;

    const sortedMocks = [...mocks].map((m) => m.data).sort((a, b) => a.date.localeCompare(b.date));
    const last3 = sortedMocks.slice(-3);
    const lastThreeMocksAvg =
      last3.length > 0 ? Math.round(last3.reduce((s, m) => s + m.totalScore, 0) / last3.length) : null;

    return buildStudyProgressReportData({
      targetCollegeName,
      targetBranch,
      targetCollegeMarks,
      maxMarks: DEFAULT_CONTENT_PACK.examPattern.totalMarks,
      maxMarksSource: `Content Pack ${DEFAULT_CONTENT_PACK.version}`,
      latestMockScore: analytics.latestMockScore,
      lastThreeMocksAvg,
      mockCount: mocks.length,
      errorCount: errors.length,
      dueToday,
      newCount,
      learningCount,
      reviewCount,
      leechesCount,
      trueRetentionPct: null,
      weakestSubjects: analytics.weakestSubjects.map((w) => ({
        subject: w.subject,
        mistakes: w.mistakes,
        leeches: w.leeches
      })),
      suggestedNextStep: analytics.nextAction,
      dailyHours: String(settingsMap.dailyHours || '')
    });
  }, [settingsMap, analytics, mocks, errors.length, cards]);

  const activeReport = tab === 'pdf_upload' ? uploadedReport : studyReport;

  const displayedSubjects = useMemo(() => {
    if (!activeReport) return [];
    if (tab === 'pdf_upload' && customSubjects !== null) return customSubjects;
    return activeReport.detectedSubjects.map((s) => `${s.name} (${s.confidence})`);
  }, [activeReport, tab, customSubjects]);

  const processPdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Please select a valid .pdf file.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setErrorMsg('File exceeds the 50 MB safety limit. Split the PDF and try again.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErrorMsg('');
    setWarningMsg('');
    setProgress({ done: 0, total: 0 });
    setCustomSubjects(null);
    setVisibleSections(20);

    try {
      const buffer = await file.arrayBuffer();
      const pages = await extractPdfPages(buffer, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total })
      });
      const totalWords = pages.reduce((s, p) => s + p.wordCount, 0);
      if (totalWords === 0) {
        setParsedPages(null);
        setParsedFileName('');
        setErrorMsg('No selectable text found in this PDF (it may be a scanned image PDF).');
        return;
      }
      setParsedFileName(file.name);
      setParsedPages(pages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse PDF file.';
      if (/password/i.test(msg)) {
        setErrorMsg('This PDF is password-protected. Unlock it first and re-upload.');
      } else if (/cancelled/i.test(msg)) {
        setErrorMsg('PDF extraction was cancelled.');
      } else {
        setErrorMsg(`Could not read PDF: ${msg}`);
      }
      setParsedPages(null);
      setParsedFileName('');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void processPdfFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void processPdfFile(file);
  };

  const handleDownloadPdf = async () => {
    if (!activeReport) return;
    setWarningMsg('');
    try {
      const res = await saveReportPdf(activeReport);
      if (res.usedFallbackTransliteration) {
        setWarningMsg('Some Greek/math symbols were transliterated (e.g. [mu]g, >=) for PDF core font compatibility; Markdown preserves full Unicode.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to build PDF.');
    }
  };

  const handleCopyMarkdown = async () => {
    if (!activeReport) return;
    try {
      const md = exportReportToMarkdown(activeReport);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('Clipboard access was blocked by the browser. Use Save .md instead.');
    }
  };

  const handleDownloadMarkdown = () => {
    if (!activeReport) return;
    const md = exportReportToMarkdown(activeReport);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'report'}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleAddSubjectTag = () => {
    const val = newSubjectInput.trim();
    if (!val) return;
    const base = customSubjects ?? (activeReport?.detectedSubjects.map((s) => `${s.name} (${s.confidence})`) || []);
    if (!base.includes(val)) setCustomSubjects([...base, val]);
    setNewSubjectInput('');
  };

  const handleRemoveSubjectTag = (tag: string) => {
    const base = customSubjects ?? (activeReport?.detectedSubjects.map((s) => `${s.name} (${s.confidence})`) || []);
    setCustomSubjects(base.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            PDF to Report Studio
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Convert any study PDF into a structured report locally, or export your live ApexMDS goal & progress PDF.
          </p>
        </div>
        <div role="tablist" aria-label="Report mode" className="flex items-center gap-2 p-1 rounded-2xl border border-sky-500/20">
          <button
            role="tab"
            aria-selected={tab === 'pdf_upload'}
            onClick={() => setTab('pdf_upload')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-transform apple-press ${
              tab === 'pdf_upload' ? 'bg-sky-500 text-white' : 'opacity-75 hover:opacity-100'
            }`}
          >
            Any PDF to Report
          </button>
          <button
            role="tab"
            aria-selected={tab === 'study_progress'}
            onClick={() => setTab('study_progress')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-transform apple-press ${
              tab === 'study_progress' ? 'bg-sky-500 text-white' : 'opacity-75 hover:opacity-100'
            }`}
          >
            Study Progress PDF
          </button>
        </div>
      </div>

      {tab === 'pdf_upload' && (
        <div className="solid-clinical-card rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label htmlFor="report-title-input" className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Custom Report Title (Optional)
              </label>
              <input
                id="report-title-input"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Oral Pathology - Odontogenic Tumors Summary"
                className="w-full rounded-2xl px-4 py-2.5 text-sm border border-sky-500/25 bg-transparent"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Runs 100% locally in your browser (max 50 MB). Source PDFs are never synced to the cloud.
            </div>
          </div>

          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="block border-2 border-dashed border-sky-500/40 hover:border-sky-500 focus-within:ring-2 focus-within:ring-sky-400 rounded-3xl p-8 text-center cursor-pointer transition-colors"
          >
            <input type="file" accept=".pdf,application/pdf" onChange={handleFileInput} className="sr-only" />
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {loading
                ? `Extracting pages${progress && progress.total > 0 ? ` (${progress.done}/${progress.total})` : '...'}`
                : 'Drop a PDF here or click to choose a file'}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Supports multi-page notes, reference chapters, and question papers
            </p>
          </label>

          {loading && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 h-2 rounded-full bg-sky-500/20 overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: progress && progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : '25%' }}
                />
              </div>
              <button
                onClick={() => abortRef.current?.abort()}
                className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-400 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-300 font-semibold">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {warningMsg && (
        <div role="status" className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-xs text-amber-200 font-semibold">
          {warningMsg}
        </div>
      )}

      {activeReport && (
        <div className="solid-clinical-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-500/15 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-400">Structured Report</div>
              <h2 className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {activeReport.title}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Source: {activeReport.sourceName} | {activeReport.generatedAt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void handleDownloadPdf()}
                className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold apple-press shadow-sm"
              >
                Download PDF Report
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="px-3.5 py-2.5 rounded-2xl border border-sky-500/25 text-xs font-bold apple-press"
                style={{ color: 'var(--text-primary)' }}
              >
                Save .md
              </button>
              <button
                onClick={() => void handleCopyMarkdown()}
                className="px-3.5 py-2.5 rounded-2xl border border-sky-500/25 text-xs font-bold apple-press"
                style={{ color: 'var(--text-primary)' }}
              >
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 num-tabular">
            <div className="p-3 rounded-2xl border border-sky-500/15">
              <div className="text-[11px] uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>Pages</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{activeReport.totalPages}</div>
            </div>
            <div className="p-3 rounded-2xl border border-sky-500/15">
              <div className="text-[11px] uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>Total Words</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{activeReport.totalWords}</div>
            </div>
            <div className="p-3 rounded-2xl border border-sky-500/15">
              <div className="text-[11px] uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>Est. Read</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{activeReport.estimatedReadMins} min</div>
            </div>
            <div className="p-3 rounded-2xl border border-sky-500/15">
              <div className="text-[11px] uppercase font-bold" style={{ color: 'var(--text-secondary)' }}>Auto-picked</div>
              <div className="text-lg font-extrabold text-sky-400">{activeReport.autoPickedSentences.length}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {displayedSubjects.length === 0 ? (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>No canonical dental subject matched (add a tag below if needed).</span>
              ) : (
                displayedSubjects.map((subj) => (
                  <span
                    key={subj}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-bold text-sky-400"
                  >
                    <span>{subj}</span>
                    {tab === 'pdf_upload' && (
                      <button
                        onClick={() => handleRemoveSubjectTag(subj)}
                        aria-label={`Remove ${subj}`}
                        className="hover:text-rose-400"
                      >
                        x
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
            {tab === 'pdf_upload' && (
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  placeholder="Add subject tag..."
                  className="flex-1 rounded-xl px-3 py-1.5 text-xs border border-sky-500/25 bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleAddSubjectTag}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-400 text-xs font-bold"
                >
                  Add Tag
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Auto-picked sentences (unverified)
            </h3>
            <ul className="space-y-1.5 text-sm list-disc pl-4" style={{ color: 'var(--text-primary)' }}>
              {activeReport.autoPickedSentences.map((pt, idx) => (
                <li key={idx} className="leading-relaxed">{pt}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Structured Sections ({activeReport.sections.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {activeReport.sections.slice(0, visibleSections).map((sec, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-sky-500/15 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sec.heading}</strong>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{sec.wordCount} words</span>
                  </div>
                  <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{sec.body}</p>
                </div>
              ))}
            </div>
            {activeReport.sections.length > visibleSections && (
              <button
                onClick={() => setVisibleSections((v) => v + 20)}
                className="px-4 py-2 rounded-xl border border-sky-500/25 text-xs font-bold text-sky-400"
              >
                Show more ({activeReport.sections.length - visibleSections} remaining)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
