import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';
import { useSyncCollection } from '../hooks/useSyncStore';
import { exportNotesToCsv, importNotesFromCsv } from '../memory/csv';
import { DEFAULT_DECK_OPTIONS, fsrsRetrievability } from '../memory/fsrs';
import { buildCardsFromNote } from '../memory/notes';
import { buildDailyQueue, burySiblingsAfterReview, previewCard, scheduleCard } from '../memory/queue';
import { balanceIntervalLoad, optimizeFsrsParameters, simulateWorkload, type OptimizerResult } from '../memory/simulator';
import type { CardRecord, DeckOptions, NoteRecord, NoteType, Rating, SchedulerKind } from '../memory/types';
import { getAllEvents } from '../sync/db';
import { generateUuid, syncEngine } from '../sync/syncEngine';

type MemoryTab = 'review' | 'add' | 'browse' | 'stats' | 'options';

export default function MemoryScreen() {
  const { items: noteRows, putItem: putNote, deleteItem: deleteNote } = useSyncCollection<NoteRecord>('notes');
  const { items: cardRows, putItem: putCard, deleteItem: deleteCard } = useSyncCollection<CardRecord>('cards');
  const { items: deckOptRows, putItem: putDeckOpt } = useSyncCollection<DeckOptions>('decks');

  const [tab, setTab] = useState<MemoryTab>('review');
  const [deckFilter, setDeckFilter] = useState<string>('All');
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionAgain, setSessionAgain] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [optResult, setOptResult] = useState<OptimizerResult | null>(null);
  const cardShownAtRef = useRef<number>(Date.now());

  // Add Note form
  const [noteType, setNoteType] = useState<NoteType>('basic');
  const [deck, setDeck] = useState('OMFS');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const options = useMemo<DeckOptions>(() => {
    const saved = deckOptRows.find((d) => d.id === 'default')?.data;
    return saved ? { ...DEFAULT_DECK_OPTIONS, ...saved } : DEFAULT_DECK_OPTIONS;
  }, [deckOptRows]);

  const notes = useMemo(() => noteRows.map((r) => r.data), [noteRows]);
  const cards = useMemo(() => cardRows.map((r) => r.data), [cardRows]);

  const deckNames = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const c of cards) set.add(c.deck || 'Default');
    return Array.from(set);
  }, [cards]);

  const now = useMemo(() => new Date(), [cards, sessionReviewed, tab]);
  const queue = useMemo(() => buildDailyQueue(cards, now, options, deckFilter), [cards, now, options, deckFilter]);
  const activeCard = queue.ordered[0] || null;
  const preview = useMemo(() => (activeCard ? previewCard(activeCard, new Date(), options) : null), [activeCard, options]);

  useEffect(() => {
    cardShownAtRef.current = Date.now();
    setShowAnswer(false);
  }, [activeCard?.id]);

  const handleRate = async (rating: Rating) => {
    if (!activeCard) return;
    const reviewNow = new Date();
    const durationMs = Date.now() - cardShownAtRef.current;
    const outcome = scheduleCard(activeCard, rating, reviewNow, options, durationMs);
    if (options.loadBalancing !== false && outcome.card.state === 'review' && outcome.scheduledDays >= 4) {
      const balanced = balanceIntervalLoad(outcome.scheduledDays, cards, reviewNow, options.maxIntervalDays);
      outcome.card.intervalDays = balanced;
      outcome.card.dueAt = new Date(reviewNow.getTime() + balanced * 86400000).toISOString();
      outcome.logPayload.scheduled_days = balanced;
    }

    await putCard(outcome.card.id, outcome.card);
    await syncEngine.logImmutableEvent('review_logs', {
      ...outcome.logPayload,
      reviewed_at: reviewNow.toISOString()
    });

    const buriedSiblings = burySiblingsAfterReview(outcome.card, cards, reviewNow, options);
    for (const sib of buriedSiblings) {
      await putCard(sib.id, sib);
    }

    setSessionReviewed((p) => p + 1);
    if (rating === 1) setSessionAgain((p) => p + 1);
    setShowAnswer(false);
    if (outcome.leechTriggered) {
      setStatusMsg(`Leech alert: card reached ${outcome.card.lapses} lapses and was tagged "leech".`);
    }
  };

  // Keyboard shortcuts: Space/Enter to flip or Good; 1-4 to rate
  useEffect(() => {
    if (tab !== 'review' || !activeCard) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!showAnswer) setShowAnswer(true);
        else void handleRate(3);
      } else if (showAnswer && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
        e.preventDefault();
        void handleRate(Number(e.key) as Rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, activeCard, showAnswer]);

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!front.trim()) return;
    const nowIso = new Date().toISOString();
    const note: NoteRecord = {
      id: generateUuid(),
      deck: deck.trim() || 'Default',
      noteType,
      front: front.trim(),
      back: back.trim(),
      tags: tagsInput.split(/[;,]/).map((t) => t.trim()).filter(Boolean),
      sourceRef: sourceRef.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const generated = buildCardsFromNote(note, nowIso);
    await putNote(note.id, note);
    for (const c of generated) {
      await putCard(c.id, c);
    }
    setFront('');
    setBack('');
    setTagsInput('');
    setSourceRef('');
    setStatusMsg(`Added ${noteType} note (${generated.length} card${generated.length > 1 ? 's' : ''}).`);
  };

  const handleExportCsv = () => {
    const csv = exportNotesToCsv(notes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mds_memory_notes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = importNotesFromCsv(text);
    const nowIso = new Date().toISOString();
    let cardCount = 0;
    for (const item of parsed) {
      const note: NoteRecord = {
        id: generateUuid(),
        deck: item.deck,
        noteType: item.noteType,
        front: item.front,
        back: item.back,
        tags: item.tags,
        sourceRef: item.sourceRef,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      const generated = buildCardsFromNote(note, nowIso);
      await putNote(note.id, note);
      for (const c of generated) {
        await putCard(c.id, c);
        cardCount++;
      }
    }
    setStatusMsg(`Imported ${parsed.length} notes (${cardCount} cards) from CSV.`);
    e.target.value = '';
  };

  const handleUnburyAll = async () => {
    const nowIso = new Date().toISOString();
    for (const c of cards) {
      if (c.buriedUntil) {
        await putCard(c.id, { ...c, buriedUntil: null, updatedAt: nowIso });
      }
    }
    setStatusMsg('All buried sibling cards unburied.');
  };

  const saveOptions = (patch: Partial<DeckOptions>) => {
    void putDeckOpt('default', { ...options, ...patch });
  };

  const stats = useMemo(() => {
    const leeches = cards.filter((c) => c.isLeech).length;
    const mature = cards.filter((c) => c.state === 'review' && c.intervalDays >= 21).length;
    const reviewCards = cards.filter((c) => c.state === 'review');
    const avgR =
      reviewCards.length > 0
        ? Math.round(
            (reviewCards.reduce((acc, c) => {
              const elapsed = c.lastReviewAt
                ? Math.max(0, (Date.now() - new Date(c.lastReviewAt).getTime()) / 86400000)
                : 0;
              return acc + fsrsRetrievability(elapsed, Math.max(0.1, c.stability || c.intervalDays || 1));
            }, 0) /
              reviewCards.length) *
              100
          )
        : 100;
    const forecast7d = Array.from({ length: 7 }, (_, dayOffset) => {
      const day = new Date(Date.now() + dayOffset * 86400000).toISOString().slice(0, 10);
      const count = cards.filter((c) => !c.suspended && c.state !== 'new' && c.dueAt.slice(0, 10) === day).length;
      return { day: day.slice(5), count };
    });
    const sim30 = simulateWorkload(cards, options, 30, new Date());
    return { leeches, mature, avgR, forecast7d, sim30 };
  }, [cards, options]);

  const handleOptimizeFsrs = async () => {
    const events = await getAllEvents();
    const samples = events
      .filter((ev) => ev.table === 'review_logs')
      .map((ev) => ({
        elapsedDays: Number(ev.payload.elapsed_days || 1),
        stabilityBefore: Math.max(0.5, Number(ev.payload.scheduled_days || 1)),
        rating: (Number(ev.payload.rating || 3) as Rating)
      }));
    const res = optimizeFsrsParameters(samples, options.fsrsWeights);
    setOptResult(res);
    if (res.status === 'optimized') {
      saveOptions({ fsrsWeights: res.weights });
      setStatusMsg(`FSRS weights optimized across ${res.sampleCount} reviews (log-loss ${res.logLossBefore} -> ${res.logLossAfter}).`);
    }
  };

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.deck.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [cards, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">MDS Memory Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            {options.scheduler === 'fsrs' ? `FSRS-5 (${Math.round(options.desiredRetention * 100)}% retention)` : 'Classic Anki SM-2 Fallback'} | Append-only review logs
          </p>
        </div>
        <select
          value={deckFilter}
          onChange={(e) => setDeckFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        >
          {deckNames.map((d) => (
            <option key={d} value={d} className="bg-slate-900">Deck: {d}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          ['review', `Review (${queue.ordered.length})`],
          ['add', '+ Add Note'],
          ['browse', `Browse (${cards.length})`],
          ['stats', 'Stats & CSV'],
          ['options', 'Scheduler Options']
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold apple-press ${
              tab === id ? 'bg-sky-500 text-white' : 'bg-white/5 border border-white/10 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-xs text-sky-200 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="text-sky-300 font-bold">Dismiss</button>
        </div>
      )}

      {/* Queue Pill Strip */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="glass-card rounded-2xl p-3">
          <div className="text-[11px] text-sky-400 font-bold uppercase">New</div>
          <div className="text-2xl font-extrabold text-white">{queue.newDue.length}</div>
        </div>
        <div className="glass-card rounded-2xl p-3">
          <div className="text-[11px] text-amber-400 font-bold uppercase">Learning</div>
          <div className="text-2xl font-extrabold text-white">{queue.learningDue.length}</div>
        </div>
        <div className="glass-card rounded-2xl p-3">
          <div className="text-[11px] text-emerald-400 font-bold uppercase">Review Due</div>
          <div className="text-2xl font-extrabold text-white">{queue.reviewDue.length}</div>
        </div>
      </div>

      {/* TAB 1: REVIEW */}
      {tab === 'review' && (
        <div className="space-y-4">
          {activeCard && preview ? (
            <div className="glass-card p-6 md:p-8 space-y-6" style={{ borderRadius: 'var(--mem-card-radius)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">{activeCard.deck}</span>
                  <span className="uppercase font-mono text-[10px]">{activeCard.state}</span>
                  {activeCard.isLeech && <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">Leech ({activeCard.lapses} lapses)</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void putCard(activeCard.id, { ...activeCard, suspended: true, updatedAt: new Date().toISOString() })}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    Suspend
                  </button>
                </div>
              </div>

              <div className="min-h-[140px] flex flex-col justify-center space-y-4">
                {activeCard.imageUrl && (
                  <div className="relative inline-block mx-auto max-h-64 overflow-hidden rounded-2xl bg-black">
                    <img src={activeCard.imageUrl} alt={activeCard.front} className="max-h-64 object-contain block" />
                    {(activeCard.occlusionMasks || []).map((m) => {
                      const isActive = m.id === activeCard.activeMaskId;
                      if (showAnswer && isActive) return null;
                      return (
                        <div
                          key={m.id}
                          style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%` }}
                          className={`absolute border-2 rounded flex items-center justify-center text-[10px] font-bold text-white ${
                            isActive ? 'bg-sky-500 border-white' : 'bg-slate-900/70 border-slate-400'
                          }`}
                        >
                          {isActive ? '?' : ''}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="text-base md:text-lg font-bold text-white whitespace-pre-wrap leading-relaxed">
                  {activeCard.front}
                </div>
                {showAnswer && (
                  <div className="pt-4 border-t border-white/10 text-sm md:text-base text-emerald-300 whitespace-pre-wrap leading-relaxed">
                    {activeCard.back}
                  </div>
                )}
              </div>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full py-3.5 rounded-2xl bg-sky-500 text-white font-bold text-sm apple-press"
                >
                  Show Answer (Space)
                </button>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {([
                    [1, '1 Again', 'var(--mem-again)', preview[1].intervalLabel],
                    [2, '2 Hard', 'var(--mem-hard)', preview[2].intervalLabel],
                    [3, '3 Good', 'var(--mem-good)', preview[3].intervalLabel],
                    [4, '4 Easy', 'var(--mem-easy)', preview[4].intervalLabel]
                  ] as const).map(([r, label, color, iv]) => (
                    <button
                      key={r}
                      onClick={() => void handleRate(r)}
                      style={{ borderColor: color }}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border text-center apple-press"
                    >
                      <div className="text-xs font-extrabold text-white">{label}</div>
                      <div className="text-[11px] font-mono text-slate-300 mt-0.5">{iv}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 text-center space-y-3">
              <h3 className="text-lg font-extrabold text-white">Queue Clear for Now</h3>
              <p className="text-xs text-slate-400">
                Session reviewed: {sessionReviewed} cards ({sessionAgain} Again). Buried siblings: {queue.buriedCount}.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {queue.buriedCount > 0 && (
                  <button onClick={() => void handleUnburyAll()} className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold">
                    Unbury Siblings
                  </button>
                )}
                <button onClick={() => setTab('add')} className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold">
                  + Add Flashcards
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADD NOTE */}
      {tab === 'add' && (
        <form onSubmit={(e) => void handleAddNote(e)} className="glass-card rounded-3xl p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Note Type</label>
              <select value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
                <option value="basic" className="bg-slate-900">Basic (Front -&gt; Back)</option>
                <option value="basic_reversed" className="bg-slate-900">Basic (and reversed card)</option>
                <option value="cloze" className="bg-slate-900">Cloze ({"{{c1::answer}}"})</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">Deck / Subject</label>
              <select value={deck} onChange={(e) => setDeck(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
                {DEFAULT_CONTENT_PACK.examPattern.subjectDistribution.map((s) => (
                  <option key={s.subject} value={s.subject} className="bg-slate-900">{s.subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">Tags (comma-separated)</label>
              <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="volatile, high-yield" className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">
              {noteType === 'cloze' ? 'Cloze Text (use {{c1::term}} or {{c1::term::hint}})' : 'Front'}
            </label>
            <textarea
              required
              rows={3}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder={noteType === 'cloze' ? 'e.g. Gypsum Type IV W/P ratio is {{c1::0.22-0.24::ratio}}.' : 'Question or prompt...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">{noteType === 'cloze' ? 'Extra Notes (optional)' : 'Back'}</label>
              <textarea rows={2} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer or clinical pearl..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">Textbook / Source Citation</label>
              <input type="text" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="e.g. Shafer 9th ed., p. 268" className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            </div>
          </div>

          <button type="submit" className="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold apple-press">
            Save Note & Generate Cards
          </button>
        </form>
      )}

      {/* TAB 3: BROWSE */}
      {tab === 'browse' && (
        <div className="space-y-3 text-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards by front, back, deck, or tag..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white"
          />
          {filteredCards.slice(0, 60).map((c) => (
            <div key={c.id} className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 max-w-2xl">
                <div className="font-bold text-white">{c.front}</div>
                <div className="text-slate-400">
                  {c.deck} | {c.state} | iv: {c.intervalDays}d | lapses: {c.lapses} {c.suspended ? '| SUSPENDED' : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void putCard(c.id, { ...c, suspended: !c.suspended, updatedAt: new Date().toISOString() })}
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 font-bold"
                >
                  {c.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
                <button
                  onClick={async () => {
                    await deleteCard(c.id);
                    const siblings = cards.filter((s) => s.noteId === c.noteId && s.id !== c.id);
                    if (siblings.length === 0) await deleteNote(c.noteId);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: STATS & CSV */}
      {tab === 'stats' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card rounded-2xl p-4">
              <div className="text-slate-400">Total Cards</div>
              <div className="text-2xl font-extrabold text-white">{cards.length}</div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-slate-400">Mature (&gt;=21d)</div>
              <div className="text-2xl font-extrabold text-emerald-400">{stats.mature}</div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-slate-400">Avg Retrievability</div>
              <div className="text-2xl font-extrabold text-sky-400">{stats.avgR}%</div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-slate-400">Leeches (&gt;=8 lapses)</div>
              <div className="text-2xl font-extrabold text-rose-400">{stats.leeches}</div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">7-Day Due Forecast</h3>
            <div className="grid grid-cols-7 gap-2 text-center num-tabular">
              {stats.forecast7d.map((d) => (
                <div key={d.day} className="p-2 rounded-xl bg-white/5">
                  <div className="text-[10px] text-slate-400">{d.day}</div>
                  <div className="text-sm font-extrabold text-white mt-1">{d.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-sm font-bold text-white">30-Day Workload Simulator</h3>
              <span className="text-[11px] text-sky-400 font-bold num-tabular">
                Peak: {stats.sim30.peakDailyCards}/day | Avg: {stats.sim30.averageDailyCards}/day
              </span>
            </div>
            <div className="gap-1 items-end h-16 pt-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
              {stats.sim30.points.filter((_, idx) => idx % 2 === 0).map((pt) => {
                const hPct = Math.max(8, Math.round((pt.totalCards / Math.max(1, stats.sim30.peakDailyCards)) * 100));
                return (
                  <div key={pt.date} title={`${pt.date}: ${pt.totalCards} cards (~${pt.estimatedMinutes} min)`} className="h-full flex items-end">
                    <div className="w-full rounded-t bg-sky-500/70" style={{ height: `${hPct}%` }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">CSV Import / Export</h3>
            <p className="text-slate-400">Supports Basic, Basic-reversed, and Cloze notes with deck, tags, and source citations.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleExportCsv} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
                Export Notes CSV
              </button>
              <label className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold cursor-pointer">
                Import Notes CSV
                <input type="file" accept=".csv,text/csv" onChange={(e) => void handleImportCsv(e)} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OPTIONS */}
      {tab === 'options' && (
        <div className="glass-card rounded-3xl p-6 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white">Scheduler Preset (Synced)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Algorithm</label>
              <select
                value={options.scheduler}
                onChange={(e) => saveOptions({ scheduler: e.target.value as SchedulerKind })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
              >
                <option value="fsrs" className="bg-slate-900">FSRS-5 (Recommended)</option>
                <option value="sm2" className="bg-slate-900">Classic Anki (SM-2 Fallback)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">Desired Retention (0.80 - 0.97)</label>
              <input
                type="number"
                step={0.01}
                min={0.8}
                max={0.97}
                value={options.desiredRetention}
                onChange={(e) => saveOptions({ desiredRetention: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">New Cards / Day</label>
              <input
                type="number"
                min={0}
                max={500}
                value={options.newCardsPerDay}
                onChange={(e) => saveOptions({ newCardsPerDay: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 font-bold block mb-1">Max Reviews / Day</label>
              <input
                type="number"
                min={1}
                max={2000}
                value={options.maxReviewsPerDay}
                onChange={(e) => saveOptions({ maxReviewsPerDay: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={options.buryNewSiblings}
                onChange={(e) => saveOptions({ buryNewSiblings: e.target.checked, buryReviewSiblings: e.target.checked })}
              />
              <span>Bury sibling cards until next day</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={options.loadBalancing !== false}
                onChange={(e) => saveOptions({ loadBalancing: e.target.checked })}
              />
              <span>Load balancing (smooth review spikes across fuzz window)</span>
            </label>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">FSRS Parameter Optimizer</div>
              <div className="text-slate-400">
                {optResult
                  ? optResult.status === 'optimized'
                    ? `Optimized on ${optResult.sampleCount} reviews (loss ${optResult.logLossBefore} -> ${optResult.logLossAfter})`
                    : `Need at least ${optResult.minRequired} reviews (currently ${optResult.sampleCount}).`
                  : 'Fits FSRS weights to your personal review history (>= 100 reviews).'}
              </div>
            </div>
            <button onClick={() => void handleOptimizeFsrs()} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold apple-press">
              Optimize Parameters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
