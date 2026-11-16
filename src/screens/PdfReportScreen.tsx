import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { computeStudyAnalytics, type ErrorInput, type MockSummaryInput } from '../analytics/engine';
import { useSyncCollection } from '../hooks/useSyncStore';
import type { CardRecord } from '../memory/types';
import {
  analyzePdfToStructuredReport,
  buildStudyProgressReportData,
  exportReportToMarkdown,
  exportReportToPdf,
  extractPdfPages,
  type StructuredReport
} from '../reports/pdfReportEngine';

type ReportTab = 'pdf_upload' | 'study_progress';

export default function PdfReportScreen() {
  const [tab, setTab] = useState<ReportTab>('pdf_upload');
  const [customTitle, setCustomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploadedReport, setUploadedReport] = useState<StructuredReport | null>(null);

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

  const studyReport = useMemo<StructuredReport>(() => {
    const targetScore = Number(settingsMap.targetScore || 790);
    const targetCollegeName = String(settingsMap.targetCollegeName || 'MAIDS New Delhi (2026 R1 OMFS)');
    const targetCollegeMarks = Number(settingsMap.targetCollegeMarks || targetScore || 810);
    return buildStudyProgressReportData({
      targetCollegeName,
      targetCollegeMarks,
      latestMockScore: analytics.latestMockScore,
      mockCount: mocks.length,
      errorCount: errors.length,
      cardCount: cards.length,
      weakestSubjects: analytics.weakestSubjects.map((w) => ({
        subject: w.subject,
        count: w.mistakes + w.leeches
      })),
      nextAction: analytics.nextAction,
      dailyHours: String(settingsMap.dailyHours || 'Not set')
    });
  }, [settingsMap, analytics, mocks.length, errors.length, cards.length]);

  const activeReport = tab === 'pdf_upload' ? uploadedReport : studyReport;

  const processPdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Please select a valid .pdf file.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const buffer = await file.arrayBuffer();
      const pages = await extractPdfPages(buffer);
      const report = analyzePdfToStructuredReport(file.name, pages, customTitle);
      if (report.totalWords === 0) {
        setErrorMsg('No selectable text was found in this PDF (it may be a scanned image PDF).');
      }
      setUploadedReport(report);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse PDF file.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processPdfFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void processPdfFile(file);
  };

  const handleCopyMarkdown = async () => {
    if (!activeReport) return;
    const md = exportReportToMarkdown(activeReport);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto fluid-screen">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">PDF to Report Studio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Convert any study PDF into a high-yield structured report, or export your live MDS OS goal & progress as a PDF.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setTab('pdf_upload')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all apple-press ${
              tab === 'pdf_upload' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Any PDF to Report
          </button>
          <button
            onClick={() => setTab('study_progress')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all apple-press ${
              tab === 'study_progress' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Study Progress PDF
          </button>
        </div>
      </div>

      {tab === 'pdf_upload' && (
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Custom Report Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Oral Pathology - Odontogenic Tumors Summary"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white"
              />
            </div>
            <div className="text-[11px] text-slate-400">
              Runs 100% locally in your browser. Nothing is uploaded to external servers.
            </div>
          </div>

          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="block border-2 border-dashed border-sky-400/35 hover:border-sky-400/70 rounded-3xl p-8 text-center cursor-pointer bg-sky-500/5 transition-all"
          >
            <input type="file" accept=".pdf,application/pdf" onChange={handleFileInput} className="hidden" />
            <div className="text-sm font-bold text-white">
              {loading ? 'Extracting pages and analyzing high-yield points...' : 'Drop a PDF here or click to choose a file'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supports multi-page notes, Dental Pulse chapters, question papers, and reference PDFs
            </p>
          </label>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 font-semibold">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {activeReport && (
        <div className="glass-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Structured Report Ready</div>
              <h2 className="text-xl font-extrabold text-white mt-0.5">{activeReport.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Source: {activeReport.sourceName} | {activeReport.generatedAt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportReportToPdf(activeReport)}
                className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold apple-press shadow-sm"
              >
                Download PDF Report
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold apple-press"
              >
                Save .md
              </button>
              <button
                onClick={() => void handleCopyMarkdown()}
                className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold apple-press"
              >
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 num-tabular">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Pages</div>
              <div className="text-lg font-extrabold text-white">{activeReport.totalPages}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Words</div>
              <div className="text-lg font-extrabold text-white">{activeReport.totalWords}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Est. Read</div>
              <div className="text-lg font-extrabold text-white">{activeReport.estimatedReadMins} min</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase font-bold">High-Yield Points</div>
              <div className="text-lg font-extrabold text-sky-400">{activeReport.highYieldPoints.length}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeReport.detectedSubjects.map((subj) => (
              <span
                key={subj}
                className="px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-[11px] font-bold text-sky-300"
              >
                {subj}
              </span>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
              High-Yield Takeaways
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-200 list-disc pl-4">
              {activeReport.highYieldPoints.map((pt, idx) => (
                <li key={idx} className="leading-relaxed">{pt}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Structured Sections ({activeReport.sections.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {activeReport.sections.map((sec, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-white">{sec.heading}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">{sec.wordCount} words</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{sec.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
