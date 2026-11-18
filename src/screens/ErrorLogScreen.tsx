import { useMemo, useState, type FormEvent } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';
import { useSyncCollection } from '../hooks/useSyncStore';
import { buildCardsFromNote } from '../memory/notes';
import type { CardRecord, NoteRecord } from '../memory/types';
import { generateUuid } from '../sync/syncEngine';
import { soundFX } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

interface ErrorEntry {
  id: string;
  subject: string;
  topic: string;
  whatWentWrong: string;
  whyDidIPickThis?: string;
  reason: string;
  correctFact: string;
  reference: string;
  reviewDay: number;
  isVolatile: boolean;
  date: string;
  cardCreated?: boolean;
}

const ERROR_TAXONOMY = [
  { value: 'Knowledge Deficit', label: '1. Knowledge Deficit (Unknown theory / unseen concept)' },
  { value: 'Misread Stem', label: '2. Misread Stem (Missed EXCEPT / NOT / FALSE / units)' },
  { value: 'Trap Option', label: '3. Trap Option (Fell for attractive clinical distractor)' },
  { value: 'Time Crunch', label: '4. Time Crunch (Rushed under timer / impulsive guess)' }
];

export default function ErrorLogScreen() {
  const { items: errors, putItem, deleteItem } = useSyncCollection<ErrorEntry>('errors');
  const { putItem: putNote } = useSyncCollection<NoteRecord>('notes');
  const { putItem: putCard } = useSyncCollection<CardRecord>('cards');

  const [subject, setSubject] = useState('Public Health Dentistry');
  const [topic, setTopic] = useState('');
  const [reason, setReason] = useState('Knowledge Deficit');
  const [whatWentWrong, setWhatWentWrong] = useState('');
  const [whyDidIPickThis, setWhyDidIPickThis] = useState('');
  const [correctFact, setCorrectFact] = useState('');
  const [reference, setReference] = useState('');
  const [retestIdx, setRetestIdx] = useState<number | null>(null);
  const [retestRevealed, setRetestRevealed] = useState(false);

  // Mistake of the day (seeded by date string)
  const mistakeOfTheDay = useMemo(() => {
    if (errors.length === 0) return null;
    const dayHash = new Date().toISOString().slice(0, 10).split('-').reduce((acc, part) => acc + Number(part), 0);
    return errors[dayHash % errors.length].data;
  }, [errors]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !correctFact.trim()) return;
    soundFX.playChime();
    triggerHaptic('success');
    const id = generateUuid();
    await putItem(id, {
      id,
      subject,
      topic: topic.trim(),
      whatWentWrong: whatWentWrong.trim(),
      whyDidIPickThis: whyDidIPickThis.trim(),
      reason,
      correctFact: correctFact.trim(),
      reference: reference.trim(),
      reviewDay: 2,
      isVolatile: false,
      date: new Date().toISOString().slice(0, 10)
    });
    setTopic('');
    setWhatWentWrong('');
    setWhyDidIPickThis('');
    setCorrectFact('');
    setReference('');
  };

  const handleCreateFlashcard = async (entry: ErrorEntry) => {
    soundFX.playChime();
    triggerHaptic('success');
    const nowIso = new Date().toISOString();
    const note: NoteRecord = {
      id: generateUuid(),
      deck: entry.subject || 'Mistakes',
      noteType: 'basic',
      front: `${entry.subject}: ${entry.topic}\n\nTrap/Mistake: ${entry.whatWentWrong}${entry.whyDidIPickThis ? `\nWhy I picked it: ${entry.whyDidIPickThis}` : ''}`,
      back: `Correct Fact:\n${entry.correctFact}${entry.reference ? `\n\nReference: ${entry.reference}` : ''}`,
      tags: [entry.subject, entry.reason, 'mistake-loop'].filter(Boolean),
      sourceRef: entry.reference || undefined,
      mistakeId: entry.id,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const cards = buildCardsFromNote(note, nowIso);
    await putNote(note.id, note);
    for (const c of cards) {
      await putCard(c.id, c);
    }
    await putItem(entry.id, { ...entry, cardCreated: true });
  };

  const handleExportBooklet = () => {
    soundFX.playTap();
    const text = errors.map((e, idx) => {
      const d = e.data;
      return `### ${idx + 1}. [${d.subject}] ${d.topic}\n- **Taxonomy**: ${d.reason}\n- **What went wrong**: ${d.whatWentWrong || 'N/A'}\n- **Why chosen**: ${d.whyDidIPickThis || 'N/A'}\n- **Correct Fact**: ${d.correctFact}\n- **Ref**: ${d.reference || 'N/A'}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApexMDS_Mistake_Revision_Booklet_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Systematic Mistake Journal</h1>
          <p className="text-xs text-slate-400 mt-1">4-tier cognitive error taxonomy with spaced recall (+2, +7, +21 days).</p>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  soundFX.playTap();
                  setRetestIdx(0);
                  setRetestRevealed(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/30 min-h-[44px]"
              >
                Retest Failed ({errors.length})
              </button>
              <button
                type="button"
                onClick={handleExportBooklet}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 min-h-[44px]"
              >
                Export Booklet
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mistake of the Day Spotlight Card */}
      {mistakeOfTheDay && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-5 border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">Spotlight Mistake of the Day</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{mistakeOfTheDay.subject}</span>
          </div>
          <h3 className="text-sm font-bold text-white">{mistakeOfTheDay.topic}</h3>
          <p className="text-xs text-emerald-300 font-semibold">{mistakeOfTheDay.correctFact}</p>
          {mistakeOfTheDay.whatWentWrong && (
            <p className="text-[11px] text-slate-400">Trap noted: {mistakeOfTheDay.whatWentWrong}</p>
          )}
        </div>
      )}

      {/* Retest Active Drill Modal */}
      {retestIdx !== null && errors[retestIdx] && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 border border-sky-400/40 bg-black/60 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
            <span className="font-bold text-sky-400">Failed Question Retest ({retestIdx + 1} of {errors.length})</span>
            <button type="button" onClick={() => setRetestIdx(null)} className="text-slate-400 hover:text-white">Exit Drill</button>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400">{errors[retestIdx].data.subject}</div>
            <h3 className="text-base font-bold text-white">{errors[retestIdx].data.topic}</h3>
            {errors[retestIdx].data.whatWentWrong && (
              <p className="text-xs text-rose-300">Previous error trap: {errors[retestIdx].data.whatWentWrong}</p>
            )}
          </div>
          {retestRevealed ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold leading-relaxed">
              {errors[retestIdx].data.correctFact}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundFX.playCardFlip();
                setRetestRevealed(true);
              }}
              className="w-full py-3 rounded-xl bg-sky-500 text-white text-xs font-bold"
            >
              Show Correct Answer
            </button>
          )}
          {retestRevealed && (
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playTap();
                  if (retestIdx + 1 < errors.length) {
                    setRetestIdx(retestIdx + 1);
                    setRetestRevealed(false);
                  } else {
                    setRetestIdx(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold"
              >
                {retestIdx + 1 < errors.length ? 'Next Mistake' : 'Finish Drill'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Mistake Form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white">Log a New Question Mistake</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            >
              {DEFAULT_CONTENT_PACK.examPattern.subjectDistribution.map((s) => (
                <option key={s.subject} value={s.subject} className="bg-slate-900">{s.subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Topic / Question Stem</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Malamed Mandibular Block Landmarks"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Error Taxonomy</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            >
              {ERROR_TAXONOMY.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">What Went Wrong (Distractor Trap)</label>
            <input
              type="text"
              value={whatWentWrong}
              onChange={(e) => setWhatWentWrong(e.target.value)}
              placeholder="e.g. Confused pterygomandibular raphe with coronoid notch"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Cognitive Debrief (Why did you pick that option?)</label>
            <input
              type="text"
              value={whyDidIPickThis}
              onChange={(e) => setWhyDidIPickThis(e.target.value)}
              placeholder="e.g. Rushed reading stem and missed the word EXCEPT"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Correct Fact / Clinical Rule</label>
            <input
              type="text"
              required
              value={correctFact}
              onChange={(e) => setCorrectFact(e.target.value)}
              placeholder="e.g. Needle height must be 6-10mm above mandibular occlusal plane"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Textbook Citation &amp; Page</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Malamed Handbook of LA 7th Ed, p. 248"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]"
            />
          </div>
        </div>

        <button type="submit" className="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold min-h-[44px] apple-press">
          + Add to Mistake Journal
        </button>
      </form>

      {/* Errors List */}
      <div className="space-y-3">
        {errors.map((err) => (
          <div key={err.id} className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-2 text-xs border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-white text-sm">{err.data.subject} - {err.data.topic}</strong>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                {err.data.reason}
              </span>
            </div>
            <div className="text-emerald-300 font-medium">Correct: {err.data.correctFact}</div>
            {err.data.whatWentWrong && <div className="text-slate-400">Trap: {err.data.whatWentWrong}</div>}
            <div className="text-slate-500 text-[10px]">
              Ref: {err.data.reference || 'N/A'} | Stage: +{err.data.reviewDay || 2}d | Logged: {err.data.date}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCreateFlashcard(err.data)}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold hover:bg-sky-500/30"
              >
                {err.data.cardCreated ? 'Flashcard Active' : '+ Convert to FSRS Flashcard'}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playTap();
                  void putItem(err.id, {
                    ...err.data,
                    reviewDay: err.data.reviewDay === 2 ? 7 : 21,
                    isVolatile: err.data.reviewDay >= 21
                  });
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30"
              >
                Advance (+{err.data.reviewDay === 2 ? '7d' : '21d'})
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playTap();
                  void deleteItem(err.id);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
