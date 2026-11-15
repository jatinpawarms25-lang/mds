import { HIDDEN_RULES_DATA } from '../data/studyData';
import { useSyncCollection } from '../hooks/useSyncStore';

export default function HiddenRulesScreen() {
  const { items, putItem } = useSyncCollection<{ checked: boolean }>('hidden_rules');
  const map = new Map(items.map((r) => [r.id, Boolean(r.data?.checked)]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Hidden & Neglected Rules</h1>
        <p className="text-xs text-slate-400 mt-1">All 19 official eligibility, exam-day, counselling, and study traps.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HIDDEN_RULES_DATA.map((rule) => {
          const checked = map.get(rule.id) ?? false;
          return (
            <button
              key={rule.id}
              onClick={() => void putItem(rule.id, { checked: !checked })}
              className={`text-left glass-card rounded-3xl p-5 space-y-2 ${checked ? 'border-emerald-500/30' : ''}`}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase">{rule.group} ({rule.year})</span>
                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${checked ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                  {checked ? 'v' : ''}
                </span>
              </div>
              <h3 className="text-xs font-bold text-white">{rule.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{rule.detail}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
