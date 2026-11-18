import { useState } from 'react';
import { useSyncCollection } from '../hooks/useSyncStore';
import { buildCardsFromNote } from '../memory/notes';
import type { CardRecord, NoteRecord } from '../memory/types';
import { generateUuid } from '../sync/syncEngine';
import { triggerHaptic } from '../utils/haptics';

interface VolatileItem {
  id: string;
  category: string;
  title: string;
  front: string;
  back: string;
}

const VOLATILE_CARDS: VolatileItem[] = [
  {
    id: 'v_la_lido',
    category: 'Pharmacology',
    title: 'Lidocaine Doses (Both Framings)',
    front: 'Max dose with vs without vasoconstrictor?',
    back: 'Without: 4.4 mg/kg (max 300 mg). With adrenaline: 7.0 mg/kg (max 500 mg, BNF/FDA) vs traditional dental cap 4.4 mg/kg (300 mg). Indian recalls expect 4.4 without / 7 with.'
  },
  {
    id: 'v_la_adren',
    category: 'Pharmacology',
    title: 'Adrenaline Ceilings',
    front: 'Healthy vs Cardiac patient ceiling?',
    back: 'Healthy: 200 ug (0.2 mg)/session. Cardiac: 40 ug (0.04 mg) ~ 2 cartridges of 1:100,000.'
  },
  {
    id: 'v_la_malamed',
    category: 'Pharmacology',
    title: 'Articaine, Mepivacaine, Bupivacaine Ceilings',
    front: 'Max doses of 4% Articaine, 3% Mepivacaine, 0.5% Bupivacaine?',
    back: 'Articaine: 7.0 mg/kg (max 500 mg). Mepivacaine plain: 4.4 mg/kg (max 300 mg). Bupivacaine: 2.0 mg/kg (max 90 mg).'
  },
  {
    id: 'v_gypsum',
    category: 'Dental Materials',
    title: 'Gypsum W:P Ratios',
    front: 'Type I to V W:P ratios & gauging water?',
    back: 'I: 0.50-0.75; II: 0.45-0.50; III: 0.28-0.30; IV: 0.22-0.24; V: 0.18-0.22. Gauging water: 18.6 ml/100g.'
  },
  {
    id: 'v_amalgam',
    category: 'Dental Materials',
    title: 'Amalgam Phases',
    front: 'Weakest phase eliminated in high-Cu amalgam?',
    back: 'Gamma-2 (Sn7-8Hg) eliminated by eta-prime (Cu6Sn5) in high-Cu (>6%) alloys. Gamma-1 (Ag2Hg3) forms matrix.'
  },
  {
    id: 'v_ceph',
    category: 'Orthodontics',
    title: 'Steiner Cephalometrics',
    front: 'Steiner SNA, SNB, ANB, U1-NA, L1-NB?',
    back: 'SNA 82+/-2 deg, SNB 80+/-2 deg, ANB 2+/-2 deg (Class I 2-4, II >4, III <2), U1-NA 22 deg / 4mm, L1-NB 25 deg / 4mm.'
  },
  {
    id: 'v_pederson',
    category: 'Oral Surgery',
    title: 'Pederson Difficulty Index (Lower 3rd Molar)',
    front: 'Scores for Angulation, Depth, and Ramus Relation?',
    back: 'Spatial: Mesioangular 1, Horizontal 2, Vertical 2, Distoangular 3. Depth: Level A 1, Level B 2, Level C 3. Ramus: Class I 1, Class II 2, Class III 3. Sum: 3-4 (Easy), 5-6 (Moderate), 7-10 (Difficult).'
  },
  {
    id: 'v_lefort',
    category: 'Oral Surgery',
    title: 'Le Fort Fracture Hallmark Clinical Signs',
    front: 'Guerin sign vs CSF rhinorrhea vs Dish-face deformity?',
    back: 'Le Fort I: Guerin sign (ecchymosis greater palatine foramen) + floating palate. Le Fort II: Step deformity infraorbital rim + CSF rhinorrhea. Le Fort III: Craniofacial disjunction + dish-face deformity + enophthalmos.'
  },
  {
    id: 'v_fluoride',
    category: 'Public Health Dentistry',
    title: 'Fluoride Toxic Doses (Whitford)',
    front: 'PTD, STD, CLD values & Optimum drinking water ppm?',
    back: 'PTD: 5 mg F/kg. STD: 8-16 mg F/kg. CLD: 32-64 mg F/kg. Optimum water: 0.7-1.2 ppm (temperate climates).'
  },
  {
    id: 'v_perio_probe',
    category: 'Periodontics',
    title: 'WHO CPITN / PSR Probing Codes',
    front: 'Code 0 to 4 definitions on ball-ended WHO probe?',
    back: 'Code 0: Colored band completely visible, healthy. Code 1: Band visible, bleeding on probing. Code 2: Band visible, supra/subgingival calculus. Code 3: Band partially submerged (depth 3.5-5.5mm). Code 4: Band completely submerged (depth >5.5mm).'
  }
];

export default function VolatileVaultScreen() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const { items, putItem } = useSyncCollection<{ shaky: boolean }>('shaky_cards');
  const { putItem: putNote } = useSyncCollection<NoteRecord>('notes');
  const { putItem: putCard } = useSyncCollection<CardRecord>('cards');
  const shakyMap = new Map(items.map((r) => [r.id, Boolean(r.data?.shaky)]));

  const handleToggleReveal = (id: string) => {
    triggerHaptic('light');
    setRevealed((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleToggleShaky = async (id: string, isShaky: boolean) => {
    triggerHaptic('medium');
    await putItem(id, { shaky: !isShaky });
  };

  const handleSaveToFSRS = async (card: VolatileItem) => {
    triggerHaptic('success');
    const nowIso = new Date().toISOString();
    const noteId = generateUuid();
    const note: NoteRecord = {
      id: noteId,
      deck: card.category || 'Volatile Vault',
      noteType: 'basic',
      front: `${card.category}: ${card.title}\n\n${card.front}`,
      back: card.back,
      tags: [card.category, 'volatile-vault', 'high-yield'],
      sourceRef: 'Volatile Vault Rapid Recall',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const generatedCards = buildCardsFromNote(note, nowIso);
    await putNote(note.id, note);
    for (const c of generatedCards) {
      await putCard(c.id, c);
    }
    setSavedStatus((p) => ({ ...p, [card.id]: true }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Volatile Formulas &amp; Flashcards</h1>
          <p className="text-xs text-slate-400 mt-1">Tap cards to reveal numbers; flag shaky items or convert to FSRS flashcards in 1 tap.</p>
        </div>
        <div className="text-xs font-mono text-sky-400 bg-sky-500/10 border border-sky-400/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {VOLATILE_CARDS.length} High-Yield Vault Items
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VOLATILE_CARDS.map((card) => {
          const isShaky = shakyMap.get(card.id) ?? false;
          const open = Boolean(revealed[card.id]);
          const isSaved = Boolean(savedStatus[card.id]);

          return (
            <div key={card.id} className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{card.category}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleSaveToFSRS(card)}
                    disabled={isSaved}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isSaved
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-sky-300 border-white/15'
                    }`}
                  >
                    {isSaved ? 'In FSRS Deck' : '+ Flashcard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleShaky(card.id, isShaky)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isShaky
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {isShaky ? 'Still Shaky' : 'Mastered'}
                  </button>
                </div>
              </div>

              <h3 className="text-xs sm:text-sm font-bold text-white">{card.title}</h3>

              <button
                type="button"
                onClick={() => handleToggleReveal(card.id)}
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs transition-colors hover:bg-white/[0.05]"
              >
                {open ? (
                  <span className="text-emerald-300 font-semibold leading-relaxed block">{card.back}</span>
                ) : (
                  <span className="text-slate-300 leading-relaxed block">{card.front} <span className="text-sky-400 text-[11px] block mt-1">(Tap to reveal)</span></span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
