import { useMemo, useState } from 'react';
import { STUDY_PLAN_WEEKS } from '../data/studyData';
import { useSyncCollection } from '../hooks/useSyncStore';

interface CustomSlot {
  time: string;
  block: string;
  focus: string;
}

export default function PlanScreen() {
  const { items, putItem } = useSyncCollection<{ completed: boolean }>('plan_weeks');
  const { items: settingsRows, putItem: putSetting } = useSyncCollection<{ value: unknown }>('settings');

  const completedMap = new Map(items.map((r) => [r.id, Boolean(r.data?.completed)]));

  const savedHours = useMemo(() => {
    const r = settingsRows.find((s) => s.id === 'dailyHours');
    return Number(r?.data?.value || 8);
  }, [settingsRows]);

  const savedFocus = useMemo(() => {
    const r = settingsRows.find((s) => s.id === 'weeklyFocusSubject');
    return String(r?.data?.value || 'Dental Materials & Oral Pathology');
  }, [settingsRows]);

  const [hoursInput, setHoursInput] = useState<number>(savedHours);
  const [wakeTime, setWakeTime] = useState('06:30');
  const [weakFocus, setWeakFocus] = useState(savedFocus);
  const [pasteJson, setPasteJson] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const customSlots = useMemo<CustomSlot[]>(() => {
    const r = settingsRows.find((s) => s.id === 'customTimetableSlots');
    if (Array.isArray(r?.data?.value)) return r.data.value as CustomSlot[];
    return [];
  }, [settingsRows]);

  const generateSmartTimetable = async () => {
    const total = Math.max(2, Math.min(16, Number(hoursInput) || 8));
    const [wh, wm] = wakeTime.split(':').map((n) => Number(n) || 6);
    let curMin = wh * 60 + wm;
    const fmt = (m: number) => {
      const hh = Math.floor((m % 1440) / 60);
      const mm = m % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    const addSlot = (durHours: number, block: string, focus: string): CustomSlot => {
      const start = fmt(curMin);
      curMin += Math.round(durHours * 60);
      const end = fmt(curMin);
      curMin += 15; // 15m recovery break
      return { time: `${start} - ${end}`, block, focus };
    };

    const slots: CustomSlot[] = [
      addSlot(total * 0.25, 'Block 1: Weak Subject Deep Theory', `${weakFocus} - Standard textbook + synopsis`),
      addSlot(total * 0.25, 'Block 2: Timed MCQ Sprint (45s/Q)', '120 MCQs with strict Part A pacing'),
      addSlot(total * 0.20, 'Block 3: Volatile Tables & Numbers', 'Gypsum W/P, Malamed LA doses, PHD indices'),
      addSlot(total * 0.15, 'Block 4: Real Image & OPG Spotter', '15-Image Diagnosis Drill + Occlusion cards'),
      addSlot(total * 0.15, 'Block 5: FSRS Spaced Recall & Mistakes', 'Clear due FSRS queue + +2/+7/+21d mistakes')
    ];

    await putSetting('customTimetableSlots', { value: slots });
    await putSetting('dailyHours', { value: total });
    setStatusMsg(`Generated fluid ${total}h/day timetable anchored on ${weakFocus}.`);
  };

  const handleImportExternalTimetable = async () => {
    try {
      const parsed = JSON.parse(pasteJson) as CustomSlot[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Paste a JSON array of [{ "time": "...", "block": "...", "focus": "..." }]');
      }
      await putSetting('customTimetableSlots', { value: parsed });
      setPasteJson('');
      setStatusMsg(`Imported ${parsed.length} custom timetable blocks!`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Invalid JSON timetable');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Smart Timetable & 23-Week Plan</h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate an adaptive daily timetable in 1 click or import an external JSON schedule, synced across Mac and Android.
        </p>
      </div>

      {/* Smart AI Timetable Generator + External Importer */}
      <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-400/30">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white">Adaptive Daily Timetable Maker</h2>
            <p className="text-xs text-slate-400">Auto-allocates theory, 45s/Q sprints, image drills, and FSRS reviews around your hours.</p>
          </div>
          <button
            onClick={() => void generateSmartTimetable()}
            className="px-4 py-2 rounded-2xl bg-sky-500 text-white text-xs font-extrabold apple-press"
          >
            Generate My Timetable
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Daily Study Hours</label>
            <input
              type="number"
              min={2}
              max={16}
              value={hoursInput}
              onChange={(e) => setHoursInput(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white num-tabular"
            />
          </div>
          <div>
            <label className="text-slate-300 font-bold block mb-1">Start Time</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white num-tabular"
            />
          </div>
          <div>
            <label className="text-slate-300 font-bold block mb-1">Primary Weak Subject Focus</label>
            <input
              type="text"
              value={weakFocus}
              onChange={(e) => setWeakFocus(e.target.value)}
              placeholder="e.g. Oral Pathology & Dental Materials"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
            />
          </div>
        </div>

        {statusMsg && <p className="text-xs text-emerald-300 font-bold">{statusMsg}</p>}

        {customSlots.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-2">
            {customSlots.map((slot, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1 text-xs">
                <div className="text-[10px] font-mono font-bold text-sky-300 num-tabular">{slot.time}</div>
                <div className="font-extrabold text-white">{slot.block}</div>
                <div className="text-[11px] text-slate-300">{slot.focus}</div>
              </div>
            ))}
          </div>
        )}

        <details className="text-xs pt-2 border-t border-white/10">
          <summary className="cursor-pointer text-slate-300 font-bold">
            Import Timetable Made Outside (Paste JSON)
          </summary>
          <div className="mt-2 space-y-2">
            <textarea
              rows={3}
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
              placeholder='[{"time":"07:00 - 09:00","block":"OMFS Theory","focus":"Le Fort & Impactions"}]'
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white font-mono"
            />
            <button
              onClick={() => void handleImportExternalTimetable()}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white font-bold"
            >
              Import External JSON Schedule
            </button>
          </div>
        </details>
      </div>

      {/* 23-Week Master Roadmap */}
      <div className="space-y-4">
        {STUDY_PLAN_WEEKS.map((week) => {
          const id = String(week.week);
          const done = completedMap.get(id) ?? false;
          return (
            <div key={week.week} className="glass-card rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30">
                    Week {week.week}
                  </span>
                  <span className="text-xs font-bold text-white">{week.phaseName}</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => void putItem(id, { completed: !done })}
                    className="w-4 h-4 rounded"
                  />
                  <span>Completed</span>
                </label>
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div><strong className="text-white">Subjects:</strong> {week.subjects}</div>
                <div><strong className="text-white">Goal:</strong> {week.goal}</div>
                <div><strong className="text-white">Mocks / Tests:</strong> {week.mocks}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
