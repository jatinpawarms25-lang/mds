import { useState } from 'react';
import { useSyncCollection } from '../hooks/useSyncStore';

const VOLATILE_CARDS = [
  { id: 'v_la_lido', category: 'Pharmacology', title: 'Lidocaine Doses (Both Framings)', front: 'Max dose with vs without vasoconstrictor?', back: 'Without: 4.4 mg/kg (max 300 mg). With adrenaline: 7.0 mg/kg (max 500 mg, BNF/FDA) vs traditional dental cap 4.4 mg/kg (300 mg). Indian recalls expect 4.4 without / 7 with.' },
  { id: 'v_la_adren', category: 'Pharmacology', title: 'Adrenaline Ceilings', front: 'Healthy vs Cardiac patient ceiling?', back: 'Healthy: 200 ug (0.2 mg)/session. Cardiac: 40 ug (0.04 mg) ~ 2 cartridges of 1:100,000.' },
  { id: 'v_gypsum', category: 'Dental Materials', title: 'Gypsum W:P Ratios', front: 'Type I to V W:P ratios & gauging water?', back: 'I: 0.50-0.75; II: 0.45-0.50; III: 0.28-0.30; IV: 0.22-0.24; V: 0.18-0.22. Gauging water: 18.6 ml/100g.' },
  { id: 'v_amalgam', category: 'Dental Materials', title: 'Amalgam Phases', front: 'Weakest phase eliminated in high-Cu amalgam?', back: 'Gamma-2 (Sn7-8Hg) eliminated by eta-prime (Cu6Sn5) in high-Cu (>6%) alloys.' },
  { id: 'v_ceph', category: 'Orthodontics', title: 'Steiner Cephalometrics', front: 'Steiner SNA, SNB, ANB, U1-NA, L1-NB?', back: 'SNA 82+/-2 deg, SNB 80+/-2 deg, ANB 2+/-2 deg (Class I 2-4, II >4, III <2), U1-NA 22 deg, L1-NB 25 deg.' },
  { id: 'v_fluoride', category: 'Public Health Dentistry', title: 'Fluoride Toxic Doses', front: 'PTD, STD, CLD values?', back: 'PTD 5 mg/kg (Whitford), STD 8-16 mg/kg, CLD 32-64 mgF/kg. Optimum water 0.7-1.2 ppm.' }
];

export default function VolatileVaultScreen() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const { items, putItem } = useSyncCollection<{ shaky: boolean }>('shaky_cards');
  const shakyMap = new Map(items.map((r) => [r.id, Boolean(r.data?.shaky)]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Volatile Formulas & Flashcards</h1>
        <p className="text-xs text-slate-400 mt-1">Tap cards to reveal answers; flag shaky items for daily recall.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VOLATILE_CARDS.map((card) => {
          const isShaky = shakyMap.get(card.id) ?? false;
          const open = Boolean(revealed[card.id]);
          return (
            <div key={card.id} className="glass-card rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase">{card.category}</span>
                <button
                  onClick={() => void putItem(card.id, { shaky: !isShaky })}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isShaky ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {isShaky ? 'Still Shaky' : 'Mastered'}
                </button>
              </div>
              <h3 className="text-xs font-bold text-white">{card.title}</h3>
              <button
                onClick={() => setRevealed((p) => ({ ...p, [card.id]: !open }))}
                className="w-full text-left p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs"
              >
                {open ? <span className="text-emerald-300 font-semibold">{card.back}</span> : <span className="text-slate-300">{card.front} (Tap to reveal)</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
