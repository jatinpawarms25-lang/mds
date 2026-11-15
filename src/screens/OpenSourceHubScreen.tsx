import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  AJAYNXT_HEAD_NECK_3D_NODES,
  MEDMCQA_DENTAL_AND_PART_A_SEED,
  SMRITI_AND_STUDY_MATERIAL_PACKS,
  TUMINHA_CLINICAL_DENTAL_QA,
  parseMockguruQuestions,
  type AnatomyStructureNode,
  type MedMcqaItem
} from '../data/openSourceRepos';
import { useSyncCollection } from '../hooks/useSyncStore';
import { buildCardsFromNote } from '../memory/notes';
import type { CardRecord, NoteRecord } from '../memory/types';
import { generateUuid } from '../sync/syncEngine';

type HubTab = 'studylocus' | 'dentistry_qa' | 'mockguru' | 'anatomy_3d' | 'smriti_notes';

export default function OpenSourceHubScreen() {
  const { items: mocks } = useSyncCollection<{ totalScore: number; date: string; accuracy: number }>('mocks');
  const { items: routines } = useSyncCollection<Record<string, boolean>>('daily_routines');
  const { putItem: putNote } = useSyncCollection<NoteRecord>('notes');
  const { putItem: putCard } = useSyncCollection<CardRecord>('cards');

  const [tab, setTab] = useState<HubTab>('studylocus');
  const [statusMsg, setStatusMsg] = useState('');

  // SvalTech/studylocus Pomodoro Timer (25m focus / 5m break)
  const [pomoMode, setPomoMode] = useState<'focus' | 'break'>('focus');
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);

  useEffect(() => {
    if (!pomoRunning) return;
    const id = setInterval(() => {
      setPomoSeconds((s) => {
        if (s <= 1) {
          setPomoRunning(false);
          const nextMode = pomoMode === 'focus' ? 'break' : 'focus';
          setPomoMode(nextMode);
          return nextMode === 'focus' ? 25 * 60 : 5 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pomoRunning, pomoMode]);

  // Tuminha/llm-evaluation-for-dentistry interactive state
  const [qaIdx, setQaIdx] = useState(0);
  const [qaSelected, setQaSelected] = useState<number | null>(null);

  // rrjanbiah/mockguru + medmcqa/medmcqa runner
  const [mgPool, setMgPool] = useState<MedMcqaItem[]>(MEDMCQA_DENTAL_AND_PART_A_SEED);
  const [mgIdx, setMgIdx] = useState(0);
  const [mgAns, setMgAns] = useState<number | null>(null);
  const [mgRawInput, setMgRawInput] = useState('');

  // ajaynxt/body 3D node selection
  const [activeNode, setActiveNode] = useState<AnatomyStructureNode>(AJAYNXT_HEAD_NECK_3D_NODES[0]);

  const sortedMocks = useMemo(
    () => [...mocks].sort((a, b) => a.data.date.localeCompare(b.data.date)),
    [mocks]
  );

  const studyStreakDays = useMemo(() => {
    return routines.filter((r) => Object.values(r.data || {}).some(Boolean)).length;
  }, [routines]);

  const handleInstallPackToMemory = async (packId: string) => {
    const pack = SMRITI_AND_STUDY_MATERIAL_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const nowIso = new Date().toISOString();
    let count = 0;
    for (const item of pack.cards) {
      const note: NoteRecord = {
        id: generateUuid(),
        deck: pack.deck,
        noteType: 'basic',
        front: item.front,
        back: item.back,
        tags: item.tags,
        sourceRef: pack.repoSource,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      const cards = buildCardsFromNote(note, nowIso);
      await putNote(note.id, note);
      for (const c of cards) {
        await putCard(c.id, c);
        count++;
      }
    }
    setStatusMsg(`Installed ${count} cards from ${pack.repoSource} into FSRS Memory Queue!`);
  };

  const handleMockguruFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseMockguruQuestions(text);
    if (parsed.length > 0) {
      setMgPool((prev) => [...parsed, ...prev]);
      setMgIdx(0);
      setMgAns(null);
      setStatusMsg(`Loaded ${parsed.length} questions via Mockguru / MedMCQA parser!`);
    } else {
      setStatusMsg('Could not parse questions from file. Use MedMCQA JSON or Mockguru Markdown format.');
    }
    e.target.value = '';
  };

  const curQa = TUMINHA_CLINICAL_DENTAL_QA[qaIdx];
  const curMg = mgPool[mgIdx] || mgPool[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Open-Source Repo Hub (7 Integrated Modules)</h1>
        <p className="text-xs text-slate-400 mt-1">
          Integrated directly from your PDF reference: MedMCQA, Tuminha Clinical Dentistry QA, Mockguru, Smriti SRS, StudyLocus, AjayNxt 3D Anatomy & Study-Material.
        </p>
      </div>

      {/* Module Switcher */}
      <div className="flex flex-wrap gap-2">
        {([
          ['studylocus', '1. StudyLocus (Pomodoro & Trends)'],
          ['dentistry_qa', '2. Tuminha Clinical Dentistry QA'],
          ['mockguru', '3. MedMCQA + Mockguru Runner'],
          ['anatomy_3d', '4. AjayNxt 3D Head & Neck Map'],
          ['smriti_notes', '5. Smriti SRS + Study-Material Packs']
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold apple-press ${
              tab === id ? 'bg-sky-500 text-white' : 'bg-white/5 border border-white/10 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="font-bold">Dismiss</button>
        </div>
      )}

      {/* 1. SvalTech/studylocus */}
      {tab === 'studylocus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-3xl p-6 space-y-4 text-center">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="font-bold text-sky-400 uppercase">SvalTech/studylocus Pomodoro</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                Active Days Streak: {studyStreakDays}d
              </span>
            </div>
            <div className="text-5xl font-extrabold text-white font-mono num-tabular py-4">
              {String(Math.floor(pomoSeconds / 60)).padStart(2, '0')}:
              {String(pomoSeconds % 60).padStart(2, '0')}
            </div>
            <div className="flex justify-center gap-2 text-xs">
              <button
                onClick={() => setPomoRunning((v) => !v)}
                className="px-5 py-2.5 rounded-2xl bg-sky-500 text-white font-extrabold apple-press"
              >
                {pomoRunning ? 'Pause' : 'Start Focus Sprint'}
              </button>
              <button
                onClick={() => {
                  setPomoRunning(false);
                  setPomoMode('focus');
                  setPomoSeconds(25 * 60);
                }}
                className="px-4 py-2.5 rounded-2xl bg-white/10 text-white font-bold apple-press"
              >
                Reset 25m
              </button>
              <button
                onClick={() => {
                  setPomoRunning(false);
                  setPomoMode('break');
                  setPomoSeconds(5 * 60);
                }}
                className="px-4 py-2.5 rounded-2xl bg-white/10 text-emerald-300 font-bold apple-press"
              >
                5m Break
              </button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <strong className="text-sm text-white">StudyLocus Mock Score Trend (/ 960)</strong>
              <span className="text-sky-400 font-bold">{sortedMocks.length} Mocks Logged</span>
            </div>
            {sortedMocks.length === 0 ? (
              <p className="text-slate-400 py-8 text-center">Log a mock in CBT & Mocks to render your trend graph.</p>
            ) : (
              <div className="h-36 flex items-end gap-2 pt-4">
                {sortedMocks.slice(-10).map((m) => {
                  const pct = Math.max(10, Math.round((m.data.totalScore / 960) * 100));
                  return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] font-mono text-sky-300 font-bold num-tabular">{m.data.totalScore}</span>
                      <div className="w-full rounded-t-xl bg-gradient-to-t from-sky-600 to-emerald-400" style={{ height: `${pct}%` }} />
                      <span className="text-[9px] text-slate-400">{m.data.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Tuminha/llm-evaluation-for-dentistry */}
      {tab === 'dentistry_qa' && (
        <div className="glass-card rounded-3xl p-6 space-y-4 text-xs">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-sky-400">
                Tuminha/llm-evaluation-for-dentistry ({curQa.domain} - {curQa.difficulty})
              </span>
              <h3 className="text-sm font-extrabold text-white mt-0.5">
                Clinician-Verified Rubric Scenario {qaIdx + 1} / {TUMINHA_CLINICAL_DENTAL_QA.length}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{curQa.guidelineSource}</span>
          </div>

          <p className="text-sm text-white font-semibold leading-relaxed">{curQa.scenario}</p>

          <div className="space-y-2">
            {curQa.options.map((opt, oIdx) => {
              let cls = 'bg-white/[0.03] border-white/10 text-slate-200';
              if (qaSelected !== null) {
                if (oIdx === curQa.correctIdx) cls = 'bg-emerald-500/25 border-emerald-400 text-white font-bold';
                else if (qaSelected === oIdx) cls = 'bg-rose-500/25 border-rose-400 text-white';
              }
              return (
                <button
                  key={oIdx}
                  onClick={() => setQaSelected(oIdx)}
                  className={`w-full p-3.5 rounded-2xl border text-left ${cls} apple-press`}
                >
                  {String.fromCharCode(65 + oIdx)}. {opt}
                </button>
              );
            })}
          </div>

          {qaSelected !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="font-extrabold text-emerald-300">Rubric: Must Include</div>
                {curQa.mustInclude.map((m, i) => (
                  <div key={i} className="text-slate-200">- {m}</div>
                ))}
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                <div className="font-extrabold text-rose-300">Clinical Traps: Must Avoid</div>
                {curQa.mustAvoid.map((m, i) => (
                  <div key={i} className="text-slate-200">- {m}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => {
                setQaIdx((p) => (p + 1) % TUMINHA_CLINICAL_DENTAL_QA.length);
                setQaSelected(null);
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold apple-press"
            >
              Next Clinical Rubric Case
            </button>
          </div>
        </div>
      )}

      {/* 3. medmcqa/medmcqa + rrjanbiah/mockguru */}
      {tab === 'mockguru' && (
        <div className="space-y-4 text-xs">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-sky-400">
                  medmcqa/medmcqa + rrjanbiah/mockguru ({curMg.subject_name} - {curMg.topic_name})
                </span>
                <h3 className="text-sm font-extrabold text-white mt-0.5">
                  Question {mgIdx + 1} / {mgPool.length}
                </h3>
              </div>
              <label className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white font-bold cursor-pointer apple-press">
                + Upload MedMCQA JSON / Mockguru MD
                <input type="file" accept=".json,.md,.txt" onChange={(e) => void handleMockguruFileUpload(e)} className="hidden" />
              </label>
            </div>

            <div className="text-sm font-semibold text-white">{curMg.question}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[curMg.opa, curMg.opb, curMg.opc, curMg.opd].map((opt, idx) => {
                const oneBased = idx + 1;
                let cls = 'bg-white/[0.03] border-white/10 text-slate-200';
                if (mgAns !== null) {
                  if (oneBased === curMg.cop) cls = 'bg-emerald-500/25 border-emerald-400 text-white font-bold';
                  else if (mgAns === oneBased) cls = 'bg-rose-500/25 border-rose-400 text-white';
                }
                return (
                  <button
                    key={idx}
                    onClick={() => setMgAns(oneBased)}
                    className={`p-3 rounded-2xl border text-left ${cls} apple-press`}
                  >
                    {String.fromCharCode(65 + idx)}. {opt}
                  </button>
                );
              })}
            </div>

            {mgAns !== null && (
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-200 space-y-2">
                <div><strong>Explanation:</strong> {curMg.exp}</div>
                <button
                  onClick={() => {
                    setMgIdx((p) => (p + 1) % mgPool.length);
                    setMgAns(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-sky-500 text-white font-bold"
                >
                  Next Question
                </button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl p-5 space-y-2">
            <strong className="text-white">Paste Mockguru Markdown or MedMCQA JSON Directly</strong>
            <textarea
              rows={3}
              value={mgRawInput}
              onChange={(e) => setMgRawInput(e.target.value)}
              placeholder={"Q: Nerve in Foramen Rotundum?\nA) CN V1\nB) CN V2\nC) CN V3\nD) CN VII\nANS: B\nEXP: Maxillary nerve (V2) exits via foramen rotundum."}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white font-mono"
            />
            <button
              onClick={() => {
                const parsed = parseMockguruQuestions(mgRawInput);
                if (parsed.length > 0) {
                  setMgPool((p) => [...parsed, ...p]);
                  setMgIdx(0);
                  setMgAns(null);
                  setMgRawInput('');
                  setStatusMsg(`Added ${parsed.length} questions to Mockguru Runner!`);
                }
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold apple-press"
            >
              Parse & Add to Runner
            </button>
          </div>
        </div>
      )}

      {/* 4. ajaynxt/body 3D Anatomy & Mnemonics */}
      {tab === 'anatomy_3d' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          <div className="glass-card rounded-3xl p-6 space-y-3">
            <div className="text-xs font-bold text-sky-400 uppercase">ajaynxt/body - Interactive Cranial Base & Deep Spaces</div>
            <div className="relative w-full h-72 rounded-2xl bg-slate-950/90 border border-white/15 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-64 h-64 opacity-70">
                <ellipse cx="100" cy="100" rx="75" ry="88" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
                <path d="M 45 75 Q 100 55 155 75" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                <path d="M 40 130 Q 100 110 160 130" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                <circle cx="100" cy="150" r="18" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              </svg>
              {AJAYNXT_HEAD_NECK_3D_NODES.map((node) => {
                const active = activeNode.id === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setActiveNode(node)}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full font-extrabold text-[10px] apple-press ${
                      active ? 'bg-sky-500 text-white ring-4 ring-sky-400/40' : 'bg-white/15 text-slate-200 border border-white/30'
                    }`}
                  >
                    {node.name.split('(')[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-3">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[10px]">
              {activeNode.region}
            </span>
            <h3 className="text-lg font-extrabold text-white">{activeNode.name}</h3>
            <div className="text-slate-400">{activeNode.foramenOrSpace}</div>
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 font-bold">
              Mnemonic: {activeNode.mnemonic}
            </div>
            <div className="space-y-1">
              <strong className="text-white">Transmitted Structures:</strong>
              {activeNode.transmittedStructures.map((s, i) => (
                <div key={i} className="text-slate-300">- {s}</div>
              ))}
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
              <strong>NEET-MDS Clinical Pearl:</strong> {activeNode.clinicalPearl}
            </div>
          </div>
        </div>
      )}

      {/* 5. kingxjayant/smriti + manjunath5496/Study-Material */}
      {tab === 'smriti_notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {SMRITI_AND_STUDY_MATERIAL_PACKS.map((pack) => (
            <div key={pack.id} className="glass-card rounded-3xl p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-sky-400">{pack.repoSource}</span>
                <h3 className="text-base font-extrabold text-white">{pack.title}</h3>
                <p className="text-slate-400">Target Deck: {pack.deck} ({pack.cards.length} high-yield concept cards)</p>
                <div className="space-y-1.5 pt-2">
                  {pack.cards.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="font-bold text-white">{c.front}</div>
                      <div className="text-slate-400 mt-0.5">{c.back}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => void handleInstallPackToMemory(pack.id)}
                className="w-full py-2.5 rounded-2xl bg-sky-500 text-white font-extrabold apple-press mt-3"
              >
                + Install Pack into FSRS Memory Queue
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
