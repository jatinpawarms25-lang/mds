import { useState } from 'react';
import { DEFAULT_CONTENT_PACK } from '../data/contentPack';

interface SourceStatus {
  name: string;
  url: string;
  status: string;
  statusText: string;
  details?: string;
}

export default function UpdateCentreScreen() {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [sources, setSources] = useState<Record<string, SourceStatus>>({
    nbems: { name: 'NBEMS NEET-MDS', url: 'https://natboard.edu.in/viewnbeexam?exam=neetmds', status: 'idle', statusText: 'Not checked yet' },
    mcc: { name: 'MCC MDS Counselling', url: 'https://mcc.nic.in/mds-counselling/', status: 'idle', statusText: 'Not checked yet' },
    dci: { name: 'DCI / NDC', url: 'https://dciindia.gov.in/', status: 'idle', statusText: 'Not checked yet' }
  });

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/update-proxy');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { lastChecked?: string; sources?: Record<string, SourceStatus> };
      setLastChecked(json.lastChecked || new Date().toISOString());
      if (json.sources) setSources(json.sources);
    } catch {
      setLastChecked(new Date().toISOString());
      setSources((prev) => {
        const next: Record<string, SourceStatus> = {};
        for (const [k, v] of Object.entries(prev)) {
          next[k] = {
            ...v,
            status: 'blocked',
            statusText: 'Manual check needed',
            details: 'Proxy not deployed or portal blocked by Cloudflare/CORS. Use direct official link.'
          };
        }
        return next;
      });
    }
    setChecking(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Official Update Centre</h1>
          <p className="text-xs text-slate-400 mt-1">
            Content Pack v{DEFAULT_CONTENT_PACK.version} (Last Verified {DEFAULT_CONTENT_PACK.lastVerified})
          </p>
        </div>
        <button onClick={() => void handleCheck()} disabled={checking} className="px-4 py-2.5 rounded-2xl bg-sky-500 text-white font-bold text-xs">
          {checking ? 'Checking...' : 'Check Official Sources'}
        </button>
      </div>

      {lastChecked && (
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300">
          Last Checked: <strong className="text-white">{new Date(lastChecked).toLocaleString()}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(sources).map(([id, src]) => (
          <div key={id} className="glass-card rounded-3xl p-5 space-y-2 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <strong className="text-white">{src.name}</strong>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                {src.statusText}
              </span>
            </div>
            {src.details && <p className="text-slate-400">{src.details}</p>}
            <a href={src.url} target="_blank" rel="noreferrer" className="text-sky-400 underline block pt-1 font-bold">
              Open Official Portal
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
