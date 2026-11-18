import { useState } from 'react';
import { useSyncCollection } from '../hooks/useSyncStore';
import { buildCardsFromNote } from '../memory/notes';
import type { CardRecord, NoteRecord } from '../memory/types';
import { generateUuid } from '../sync/syncEngine';
import { soundFX } from '../utils/audio';
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

type VaultTab = 'cards' | 'la_calc' | 'pederson' | 'ceph';

export default function VolatileVaultScreen() {
  const [activeTab, setActiveTab] = useState<VaultTab>('cards');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const { items, putItem } = useSyncCollection<{ shaky: boolean }>('shaky_cards');
  const { putItem: putNote } = useSyncCollection<NoteRecord>('notes');
  const { putItem: putCard } = useSyncCollection<CardRecord>('cards');
  const shakyMap = new Map(items.map((r) => [r.id, Boolean(r.data?.shaky)]));

  // LA Calculator State
  const [patientWeight, setPatientWeight] = useState(60);
  const [laType, setLaType] = useState<'lido_epi' | 'lido_plain' | 'articaine' | 'bupivacaine'>('lido_epi');

  // Pederson Calculator State
  const [pedSpatial, setPedSpatial] = useState(1); // 1: Mesio, 2: Horiz, 2: Vert, 3: Disto
  const [pedDepth, setPedDepth] = useState(1); // 1: Level A, 2: Level B, 3: Level C
  const [pedRamus, setPedRamus] = useState(1); // 1: Class I, 2: Class II, 3: Class III

  // Cephalometric State
  const [sna, setSna] = useState(82);
  const [snb, setSnb] = useState(80);

  const handleToggleReveal = (id: string) => {
    soundFX.playCardFlip();
    triggerHaptic('light');
    setRevealed((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleToggleShaky = async (id: string, isShaky: boolean) => {
    soundFX.playTap();
    triggerHaptic('medium');
    await putItem(id, { shaky: !isShaky });
  };

  const handleSaveToFSRS = async (card: VolatileItem) => {
    soundFX.playChime();
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

  // LA Calculations
  const laSpecs = {
    lido_epi: { name: '2% Lidocaine with 1:80,000 / 1:200,000 Adrenaline', mgPerKg: 7.0, maxMg: 500, mgPerCart: 36, conc: '2%' },
    lido_plain: { name: '2% Lidocaine Plain (Without Vasoconstrictor)', mgPerKg: 4.4, maxMg: 300, mgPerCart: 36, conc: '2%' },
    articaine: { name: '4% Articaine with 1:100,000 Adrenaline', mgPerKg: 7.0, maxMg: 500, mgPerCart: 72, conc: '4%' },
    bupivacaine: { name: '0.5% Bupivacaine (Sensorcaine / Marcaine)', mgPerKg: 2.0, maxMg: 90, mgPerCart: 9, conc: '0.5%' },
  };

  const currLa = laSpecs[laType];
  const weightBasedMg = patientWeight * currLa.mgPerKg;
  const safeMaxMg = Math.min(weightBasedMg, currLa.maxMg);
  const maxCartridges = Math.floor((safeMaxMg / currLa.mgPerCart) * 10) / 10;

  // Pederson Score
  const pedScore = pedSpatial + pedDepth + pedRamus;
  const pedDifficulty = pedScore <= 4
    ? { text: 'Easy Extraction (Routine Exodontia)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    : pedScore <= 6
    ? { text: 'Moderate Difficulty (Surgical Flap + Ostectomy Expected)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
    : { text: 'Very Difficult (High Risk to IAN & Lingual Plate)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };

  // Cephalometric Output
  const anb = sna - snb;
  const cephClass = anb < 0
    ? { type: 'Skeletal Class III', desc: 'Mandibular prognathism or maxillary retrognathism (Concave profile)', color: 'text-rose-400' }
    : anb <= 4
    ? { type: 'Skeletal Class I', desc: 'Harmonious orthognathic skeletal jaw relationship (Straight profile)', color: 'text-emerald-400' }
    : { type: 'Skeletal Class II', desc: 'Mandibular retrognathism or maxillary prognathism (Convex profile)', color: 'text-sky-400' };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Volatile Vault &amp; Clinical Calculators</h1>
          <p className="text-xs text-slate-400 mt-1">Instant calculators for Local Anaesthesia, Pederson difficulty, and Cephalometrics.</p>
        </div>
        <div className="text-xs font-mono text-sky-400 bg-sky-500/10 border border-sky-400/20 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {VOLATILE_CARDS.length} High-Yield Cards
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {([
          ['cards', 'Flashcard Vault'],
          ['la_calc', 'LA Dose Calculator'],
          ['pederson', 'Pederson 3rd Molar Index'],
          ['ceph', 'Steiner Ceph Analyzer']
        ] as const).map(([tId, label]) => (
          <button
            key={tId}
            type="button"
            onClick={() => {
              soundFX.playTap();
              setActiveTab(tId);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              activeTab === tId
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Cards */}
      {activeTab === 'cards' && (
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
      )}

      {/* Tab 2: LA Calculator */}
      {activeTab === 'la_calc' && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 space-y-6 max-w-2xl mx-auto border border-white/10">
          <div className="border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white">Local Anaesthesia Maximum Safe Dose Calculator</h2>
            <p className="text-xs text-slate-400 mt-0.5">Based on Malamed &amp; NBE 2024-2027 recall thresholds.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Patient Body Weight (kg): {patientWeight} kg</label>
              <input
                type="range"
                min="20"
                max="120"
                value={patientWeight}
                onChange={(e) => setPatientWeight(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>20 kg (Child)</span>
                <span>60 kg (Average Adult)</span>
                <span>120 kg</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Local Anaesthetic Agent</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(laSpecs) as (keyof typeof laSpecs)[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      soundFX.playTap();
                      setLaType(key);
                    }}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      laType === key
                        ? 'bg-sky-500/20 border-sky-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold">{laSpecs[key].name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {laSpecs[key].mgPerKg} mg/kg (Max {laSpecs[key].maxMg} mg)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-sky-400/30 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Max Safe Absolute Dose</div>
                  <div className="text-xl font-black text-sky-400 font-mono mt-1">{safeMaxMg} mg</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">({patientWeight} kg * {currLa.mgPerKg} mg/kg)</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Max 1.8ml Cartridges</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">{maxCartridges} carts</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">({currLa.mgPerCart} mg per cartridge)</div>
                </div>
              </div>
              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed">
                <strong className="font-bold">Cardiac Patient Cap:</strong> Epinephrine limit is strictly 0.04 mg (40 ug) per appointment ~ max <strong>2 cartridges</strong> of 1:100,000 solution.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pederson Calculator */}
      {activeTab === 'pederson' && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 space-y-6 max-w-2xl mx-auto border border-white/10">
          <div className="border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white">Pederson Third Molar Difficulty Index</h2>
            <p className="text-xs text-slate-400 mt-0.5">Mandibular 3rd molar surgical difficulty rating.</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Spatial */}
            <div>
              <label className="font-bold text-slate-300 block mb-1">1. Spatial Relationship (Winter's Classification)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Mesioangular', 1],
                  ['Horizontal', 2],
                  ['Vertical', 2],
                  ['Distoangular', 3]
                ].map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { soundFX.playTap(); setPedSpatial(Number(val)); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      pedSpatial === val
                        ? 'bg-sky-500/20 border-sky-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-[10px] font-mono text-slate-400">Score: {val}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Depth */}
            <div>
              <label className="font-bold text-slate-300 block mb-1">2. Depth (Pell &amp; Gregory Classification)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Level A (Occlusal line)', 1],
                  ['Level B (Between)', 2],
                  ['Level C (Below cervical)', 3]
                ].map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { soundFX.playTap(); setPedDepth(Number(val)); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      pedDepth === val
                        ? 'bg-sky-500/20 border-sky-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-[10px] font-mono text-slate-400">Score: {val}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ramus */}
            <div>
              <label className="font-bold text-slate-300 block mb-1">3. Ramus Space (Pell &amp; Gregory Class)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Class I (Sufficient space)', 1],
                  ['Class II (Reduced space)', 2],
                  ['Class III (Completely in ramus)', 3]
                ].map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { soundFX.playTap(); setPedRamus(Number(val)); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      pedRamus === val
                        ? 'bg-sky-500/20 border-sky-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-[10px] font-mono text-slate-400">Score: {val}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Output */}
            <div className={`p-4 rounded-2xl border text-center space-y-2 ${pedDifficulty.color}`}>
              <div className="text-xs uppercase font-bold tracking-wider">Total Pederson Index Score</div>
              <div className="text-3xl font-black font-mono">{pedScore} / 10</div>
              <div className="text-sm font-bold">{pedDifficulty.text}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Ceph Analyzer */}
      {activeTab === 'ceph' && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 space-y-6 max-w-2xl mx-auto border border-white/10">
          <div className="border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white">Steiner Cephalometric Norm Analyzer</h2>
            <p className="text-xs text-slate-400 mt-0.5">Instant skeletal class calculation from SNA and SNB angles.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">SNA Angle (Maxilla to Cranial Base)</label>
                <input
                  type="number"
                  value={sna}
                  onChange={(e) => setSna(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono min-h-[44px]"
                />
                <div className="text-[10px] text-slate-500 mt-1">Norm: 82 +/- 2 deg</div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">SNB Angle (Mandible to Cranial Base)</label>
                <input
                  type="number"
                  value={snb}
                  onChange={(e) => setSnb(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono min-h-[44px]"
                />
                <div className="text-[10px] text-slate-500 mt-1">Norm: 80 +/- 2 deg</div>
              </div>
            </div>

            {/* Result */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-center">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400">Calculated ANB Difference</div>
              <div className="text-3xl font-black text-sky-400 font-mono">{anb} deg</div>
              <div className={`text-base font-extrabold ${cephClass.color}`}>{cephClass.type}</div>
              <div className="text-xs text-slate-300 max-w-md mx-auto">{cephClass.desc}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
