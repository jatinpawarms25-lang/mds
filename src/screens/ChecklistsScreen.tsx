import { MASTER_CHECKLISTS } from '../data/studyData';
import { useSyncCollection } from '../hooks/useSyncStore';

export default function ChecklistsScreen() {
  const { items, putItem } = useSyncCollection<{ checked: boolean }>('master_checklists');
  const map = new Map(items.map((r) => [r.id, Boolean(r.data?.checked)]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Master Checklists</h1>
        <p className="text-xs text-slate-400 mt-1">Bulletin day, documents, final week, exam day, and post-result checklists.</p>
      </div>
      <div className="space-y-4">
        {MASTER_CHECKLISTS.map((cl) => (
          <div key={cl.id} className="glass-card rounded-3xl p-6 space-y-3">
            <h2 className="text-base font-extrabold text-white border-b border-white/10 pb-2">{cl.title}</h2>
            <div className="space-y-2 text-xs">
              {cl.items.map((item) => {
                const key = `${cl.id}_${item.id}`;
                const done = map.get(key) ?? false;
                return (
                  <button
                    key={key}
                    onClick={() => void putItem(key, { checked: !done })}
                    className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3 ${
                      done ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/10 text-slate-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-white/10'}`}>
                      {done ? 'v' : ''}
                    </span>
                    <span>{item.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
