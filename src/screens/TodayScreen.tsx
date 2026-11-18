import { useEffect, useMemo, useState } from 'react';
import { computeStudyAnalytics, type ErrorInput, type MockSummaryInput } from '../analytics/engine';
import { GoalProximityMeter } from '../components/GoalProximityMeter';
import { useSyncCollection } from '../hooks/useSyncStore';
import type { CardRecord } from '../memory/types';
import { syncEngine } from '../sync/syncEngine';
import type { SyncSnapshotInfo } from '../sync/types';
import { soundFX } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

export type ScreenId =
  | 'dashboard'
  | 'daily_quiz'
  | 'plan'
  | 'curriculum'
  | 'cbt_mock'
  | 'error_log'
  | 'volatile_vault'
  | 'ibq_spotter'
  | 'omfs_deep_dive'
  | 'colleges'
  | 'after_result'
  | 'hidden_neglected'
  | 'watchlists'
  | 'update_centre'
  | 'settings'
  | 'memory'
  | 'open_source_hub'
  | 'pdf_report';

interface Props {
  onNavigate: (id: ScreenId) => void;
  syncInfo: SyncSnapshotInfo | null;
}

const ROUTINE_BLOCKS = [
  { key: 'theory', hours: '2h', title: 'Morning Deep Theory & Synopsis', desc: 'Dental Pulse synopsis + Standard textbook anchors (Weak subjects first)' },
  { key: 'mcqs', hours: '2h', title: 'Timed MCQ Sprint (100-150 Qs)', desc: '45 seconds/Q pacing; solve without consulting answer keys' },
  { key: 'second_subject', hours: '2h', title: 'Second Subject & Volatile Tables', desc: 'PHD indices, Dental Materials W/P ratios, Physiology enzymes' },
  { key: 'image_drill', hours: '1h', title: 'Image Atlas & Radiograph Spotter', desc: 'OPG patterns, histopathology, Le Fort fracture lines' },
  { key: 'spaced_recall', hours: '1h', title: 'Spaced Repetition & Mistake Autopsy', desc: 'Review mistakes logged at +2, +7, and +21 days' }
];

const DENTAL_TRIVIA = [
  'Pierre Fauchard is recognized as the Father of Modern Dentistry after publishing "Le Chirurgien Dentiste" in 1728.',
  'G.V. Black introduced modern cavity preparation principles and standardized amalgam formulation in 1896.',
  'Horace Wells first demonstrated nitrous oxide anesthesia for tooth extraction in Hartford, Connecticut in 1844.',
  'Wilhelm Conrad Roentgen discovered X-rays on Nov 8, 1895; Otto Walkhoff took the first dental radiograph 14 days later.',
  'Per-Ingvar Branemark discovered osseointegration in titanium in 1952 while studying rabbit fibula blood flow.'
];

export default function TodayScreen({ onNavigate, syncInfo }: Props) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const { items: settings } = useSyncCollection<{ value: unknown }>('settings');
  const { items: routines, putItem: putRoutine } = useSyncCollection<Record<string, boolean>>('daily_routines');
  const { items: errors } = useSyncCollection<ErrorInput>('errors');
  const { items: mocks } = useSyncCollection<MockSummaryInput>('mocks');
  const { items: cards } = useSyncCollection<CardRecord>('cards');

  const settingsMap = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const s of settings) m[s.id] = s.data?.value;
    return m;
  }, [settings]);

  const todayRoutine = useMemo(() => {
    const rec = routines.find((r) => r.id === todayKey);
    return rec?.data || {};
  }, [routines, todayKey]);

  const completionPct = useMemo(() => {
    const done = ROUTINE_BLOCKS.filter((b) => Boolean(todayRoutine[b.key])).length;
    return Math.round((done / ROUTINE_BLOCKS.length) * 100);
  }, [todayRoutine]);

  // Pomodoro Study Timer State
  const [pomoMinutes, setPomoMinutes] = useState(50);
  const [pomoSeconds, setPomoSeconds] = useState(50 * 60);
  const [pomoActive, setPomoActive] = useState(false);

  useEffect(() => {
    if (!pomoActive) return;
    const interval = setInterval(() => {
      setPomoSeconds((prev) => {
        if (prev <= 1) {
          setPomoActive(false);
          soundFX.playTimerBell();
          triggerHaptic('success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pomoActive]);

  const examDate = String(settingsMap.examDate || '');
  const dismissedWarning = Boolean(settingsMap.dismissedWarning);
  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    const t = new Date(`${examDate}T09:00:00`).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
  }, [examDate]);

  const analytics = useMemo(
    () =>
      computeStudyAnalytics({
        mocks: mocks.map((m) => m.data),
        errors: errors.map((e) => e.data),
        cards: cards.map((c) => c.data)
      }),
    [mocks, errors, cards]
  );

  const targetScore = Number(settingsMap.targetScore || 790);
  const targetCollegeName = String(settingsMap.targetCollegeName || 'MAIDS New Delhi (2026 R1 OMFS)');
  const targetCollegeMarks = Number(settingsMap.targetCollegeMarks || targetScore || 810);

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Today</h1>
        <p className="text-xs text-slate-400 mt-1">
          {daysLeft !== null
            ? `${daysLeft} days to exam (${examDate})`
            : 'NEET-MDS 2027 - not announced yet (set planning date in Settings)'}
        </p>
      </div>

      {/* Real-Time Goal & College % Proximity Meter */}
      <GoalProximityMeter
        currentScore={analytics.latestMockScore}
        targetScore={targetScore}
        targetCollegeName={targetCollegeName}
        targetCollegeMarks={targetCollegeMarks}
        weakSubject={analytics.weakestSubjects[0]?.subject}
        onNavigate={onNavigate}
      />

      {!syncInfo?.userEmail && (
        <div className="p-3.5 px-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 text-slate-300">
          <span className="text-xs">Not signed in - progress is saved locally in IndexedDB. Sign in in Settings to sync across Mac and Android.</span>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-bold border border-sky-400/30 shrink-0"
          >
            Sign in to Sync
          </button>
        </div>
      )}

      {!dismissedWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-amber-200">
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-300">Eligibility Warning (Provisional Baseline)</div>
            <p className="leading-relaxed">
              Eligibility is provisional. NEET-MDS requires internship completion by the cut-off date in the official bulletin (31 May in the 2026 cycle). The 2027 bulletin is not out yet - check your internship completion date against it the day it is published.
            </p>
          </div>
          <button
            onClick={() => void syncEngine.putRecordLocal('settings', 'dismissedWarning', { value: true })}
            className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 num-tabular">
        <div className="glass-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Target Benchmark</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{targetCollegeMarks} <span className="text-xs font-normal text-slate-400">/ 960</span></h3>
          <p className="text-[11px] text-emerald-400 mt-1 font-semibold">AIR 10 in 2026: 765</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Part A Lock Speed</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">45s <span className="text-xs font-normal text-slate-400">/ Q</span></h3>
          <p className="text-[11px] text-slate-400 mt-1">100 Qs in 75 Mins Strict</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Mistake Log</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{errors.length}</h3>
          <p className="text-[11px] text-amber-300 mt-1">+2, +7, +21d Spaced Review</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Daily Progress</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{completionPct}%</h3>
          <p className="text-[11px] text-emerald-300 mt-1">{String(settingsMap.dailyHours || 'Set hours in Settings')} hrs/day target</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Daily Study Blocks</h2>
              <p className="text-xs text-slate-400">Each tick writes to IndexedDB & syncs as a per-record delta</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
              {completionPct}% Done
            </span>
          </div>
          <div className="space-y-3">
            {ROUTINE_BLOCKS.map((block) => {
              const checked = Boolean(todayRoutine[block.key]);
              return (
                <button
                  key={block.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic(checked ? 'light' : 'success');
                    void putRoutine(todayKey, { ...todayRoutine, [block.key]: !checked });
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 apple-press ${
                    checked ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/10'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${checked ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                    {checked ? 'v' : ''}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{block.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">{block.hours}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{block.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Pomodoro Study Timer */}
          <div className="glass-card rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Deep Study Pomodoro</h3>
              <span className="text-[10px] text-sky-400 font-mono">Ultradian Rhythm</span>
            </div>
            <div className="text-center py-2">
              <div className="text-3xl font-black text-white font-mono tracking-wider">
                {Math.floor(pomoSeconds / 60)}:{String(pomoSeconds % 60).padStart(2, '0')}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {pomoActive ? 'Focus Block in Progress...' : 'Session Paused'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => { setPomoMinutes(25); setPomoSeconds(25 * 60); setPomoActive(false); soundFX.playTap(); }}
                className={`py-1 rounded-lg border ${pomoMinutes === 25 ? 'bg-sky-500/20 text-sky-300 border-sky-400/40' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                25m Classic
              </button>
              <button
                type="button"
                onClick={() => { setPomoMinutes(50); setPomoSeconds(50 * 60); setPomoActive(false); soundFX.playTap(); }}
                className={`py-1 rounded-lg border ${pomoMinutes === 50 ? 'bg-sky-500/20 text-sky-300 border-sky-400/40' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                50m Deep
              </button>
              <button
                type="button"
                onClick={() => { setPomoMinutes(90); setPomoSeconds(90 * 60); setPomoActive(false); soundFX.playTap(); }}
                className={`py-1 rounded-lg border ${pomoMinutes === 90 ? 'bg-sky-500/20 text-sky-300 border-sky-400/40' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                90m Exam
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPomoActive(!pomoActive); soundFX.playTap(); }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs ${pomoActive ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'}`}
              >
                {pomoActive ? 'Pause Timer' : 'Start Focus Timer'}
              </button>
              <button
                type="button"
                onClick={() => { setPomoSeconds(pomoMinutes * 60); setPomoActive(false); soundFX.playTap(); }}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="glass-card rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Shortcuts</h3>
            <button onClick={() => onNavigate('memory')} className="w-full py-3 px-4 rounded-2xl bg-sky-500 text-white font-bold text-xs apple-press text-left">
              Open Memory Queue (FSRS)
            </button>
            <button onClick={() => onNavigate('daily_quiz')} className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs apple-press text-left">
              Start Daily Mixed Quiz (10 Qs)
            </button>
            <button onClick={() => onNavigate('cbt_mock')} className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs apple-press text-left">
              Open CBT Mock Simulator & Calculator
            </button>
            <button onClick={() => onNavigate('ibq_spotter')} className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs apple-press text-left">
              15-Image Diagnosis Drill
            </button>
            <button onClick={() => onNavigate('pdf_report')} className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs apple-press text-left">
              PDF to Report Studio
            </button>
            <button onClick={() => onNavigate('error_log')} className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs apple-press text-left">
              Open Mistake Log
            </button>
          </div>

          <div className="glass-card rounded-3xl p-5 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white uppercase tracking-wider">Closed-Loop Analytics</h3>
              <span className="text-[10px] text-emerald-400 font-bold num-tabular">
                {analytics.latestMockScore !== null ? `Latest: ${analytics.latestMockScore}/960` : 'No mocks yet'}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{analytics.nextAction}</p>
            {analytics.weakestSubjects.length > 0 && (
              <button
                onClick={() => void syncEngine.putRecordLocal('settings', 'weeklyFocusSubject', { value: analytics.weakestSubjects[0].subject })}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-left apple-press"
              >
                Apply Focus to Plan: {analytics.weakestSubjects[0].subject}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
