import { useState, type FormEvent } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';
import { useSyncCollection } from '../hooks/useSyncStore';
import { generateUuid } from '../sync/syncEngine';

interface ErrorEntry {
  id: string;
  subject: string;
  topic: string;
  whatWentWrong: string;
  reason: string;
  correctFact: string;
  reference: string;
  reviewDay: number;
  isVolatile: boolean;
  date: string;
}

export default function ErrorLogScreen() {
  const { items: errors, putItem, deleteItem } = useSyncCollection<ErrorEntry>('errors');
  const [subject, setSubject] = useState('Public Health Dentistry');
  const [topic, setTopic] = useState('');
  const [reason, setReason] = useState('Concept Gap');
  const [whatWentWrong, setWhatWentWrong] = useState('');
  const [correctFact, setCorrectFact] = useState('');
  const [reference, setReference] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !correctFact.trim()) return;
    const id = generateUuid();
    await putItem(id, {
      id,
      subject,
      topic: topic.trim(),
      whatWentWrong: whatWentWrong.trim(),
      reason,
      correctFact: correctFact.trim(),
      reference: reference.trim(),
      reviewDay: 2,
      isVolatile: false,
      date: new Date().toISOString().slice(0, 10)
    });
    setTopic('');
    setWhatWentWrong('');
    setCorrectFact('');
    setReference('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Mistake Log</h1>
        <p className="text-xs text-slate-400 mt-1">Spaced review at +2, +7, +21 days. Tombstone deletes never resurrect.</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="glass-card rounded-3xl p-6 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
            {DEFAULT_CONTENT_PACK.examPattern.subjectDistribution.map((s) => (
              <option key={s.subject} value={s.subject} className="bg-slate-900">{s.subject}</option>
            ))}
          </select>
          <input type="text" required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
            <option value="Concept Gap" className="bg-slate-900">Concept Gap</option>
            <option value="Silly Mistake" className="bg-slate-900">Silly Mistake</option>
            <option value="Time Pressure" className="bg-slate-900">Time Pressure</option>
            <option value="Guess Failed" className="bg-slate-900">Guess Failed</option>
            <option value="Image Misread" className="bg-slate-900">Image Misread</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" value={whatWentWrong} onChange={(e) => setWhatWentWrong(e.target.value)} placeholder="What went wrong" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          <input type="text" required value={correctFact} onChange={(e) => setCorrectFact(e.target.value)} placeholder="Correct fact" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Textbook & page" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
          + Add Mistake
        </button>
      </form>

      <div className="space-y-3">
        {errors.map((err) => (
          <div key={err.id} className="glass-card rounded-3xl p-5 space-y-2 text-xs">
            <div className="flex justify-between">
              <strong className="text-white">{err.data.subject} - {err.data.topic}</strong>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">{err.data.reason}</span>
            </div>
            <div className="text-emerald-300">Correct: {err.data.correctFact}</div>
            <div className="text-slate-400">Ref: {err.data.reference || 'N/A'} | Stage: +{err.data.reviewDay || 2}d</div>
            <div className="flex gap-2">
              <button
                onClick={() => void putItem(err.id, { ...err.data, reviewDay: err.data.reviewDay === 2 ? 7 : 21, isVolatile: err.data.reviewDay >= 21 })}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold"
              >
                Advance (+2/+7/+21d)
              </button>
              <button onClick={() => void deleteItem(err.id)} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
