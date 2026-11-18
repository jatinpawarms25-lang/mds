import { useEffect, useState, type ChangeEvent } from 'react';
import { useSyncCollection, useSyncConflicts, useSyncStatus } from '../hooks/useSyncStore';
import { syncEngine } from '../sync/syncEngine';
import { soundFX } from '../utils/audio';
import { setHapticsEnabled, triggerHaptic } from '../utils/haptics';

export default function SettingsScreen() {
  const syncInfo = useSyncStatus();
  const { items: settingsRows, putItem } = useSyncCollection<{ value: unknown }>('settings');
  const { conflicts, restore, dismiss } = useSyncConflicts();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authTab, setAuthTab] = useState<'magic' | 'otp' | 'password'>('magic');
  const [authMsg, setAuthMsg] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advUrl, setAdvUrl] = useState(() => syncEngine.getConfig().url);
  const [advKey, setAdvKey] = useState(() => syncEngine.getConfig().anonKey);
  const [deviceName, setDeviceName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (syncInfo?.deviceName && !deviceName) {
      setDeviceName(syncInfo.deviceName);
    }
  }, [syncInfo?.deviceName, deviceName]);

  const getSetting = (key: string): string => {
    const found = settingsRows.find((r) => r.id === key);
    return found && found.data?.value !== undefined ? String(found.data.value) : '';
  };

  const setSetting = (key: string, val: unknown) => {
    void putItem(key, { value: val });
  };

  const handleExport = async () => {
    const json = await syncEngine.exportFullBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mds_os_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await syncEngine.importJsonBackup(text);
      setAuthMsg('Backup imported into IndexedDB.');
    } catch (err) {
      setAuthMsg(err instanceof Error ? err.message : 'Import failed');
    }
    e.target.value = '';
  };

  const usageMb = syncInfo ? (syncInfo.storageUsageBytes / (1024 * 1024)).toFixed(2) : '0.00';
  const quotaMb = syncInfo && syncInfo.storageQuotaBytes ? (syncInfo.storageQuotaBytes / (1024 * 1024)).toFixed(0) : 'N/A';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings & Cloud Sync</h1>
        <p className="text-xs text-slate-400 mt-1">
          Local-first IndexedDB + Supabase HLC Per-Record Sync (90-day tombstones, RLS enforced).
        </p>
      </div>

      {/* Sync Account Section */}
      <div className="glass-card rounded-3xl p-6 space-y-5 border border-sky-500/30">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-white">Sync Account</h2>
            <p className="text-xs text-slate-400">
              {syncInfo?.isConfigured
                ? 'Supabase URL and public key baked into build.'
                : 'No Supabase URL baked into build yet. Use Advanced override below or set VITE_SUPABASE_URL.'}
            </p>
          </div>
          <span className="text-xs font-bold text-sky-400">{syncInfo?.statusMessage || 'Saved locally'}</span>
        </div>

        {!syncInfo?.userEmail ? (
          <div className="space-y-3 text-xs">
            <div className="flex gap-2">
              {(['magic', 'otp', 'password'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAuthTab(t)}
                  className={`px-3 py-1.5 rounded-xl font-bold ${
                    authTab === t ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {t === 'magic' ? 'Magic Link' : t === 'otp' ? '6-Digit Code' : 'Password'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
              />
              {authTab === 'otp' && (
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="6-digit code from email"
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              )}
              {authTab === 'password' && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {authTab === 'magic' && (
                <button
                  onClick={() =>
                    void syncEngine
                      .sendMagicLinkOrOtp(email)
                      .then(() => setAuthMsg('Magic link & 6-digit code sent to your email.'))
                      .catch((e) => setAuthMsg(String(e.message || e)))
                  }
                  className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold"
                >
                  Send Magic Link
                </button>
              )}
              {authTab === 'otp' && (
                <>
                  <button
                    onClick={() =>
                      void syncEngine
                        .sendMagicLinkOrOtp(email)
                        .then(() => setAuthMsg('6-digit code sent to your email.'))
                        .catch((e) => setAuthMsg(String(e.message || e)))
                    }
                    className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                  >
                    Send Code
                  </button>
                  <button
                    onClick={() =>
                      void syncEngine
                        .verifySixDigitCode(email, otpCode)
                        .then(() => setAuthMsg('Verified and signed in!'))
                        .catch((e) => setAuthMsg(String(e.message || e)))
                    }
                    className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold"
                  >
                    Verify 6-Digit Code
                  </button>
                </>
              )}
              {authTab === 'password' && (
                <>
                  <button
                    onClick={() =>
                      void syncEngine
                        .signInWithPassword(email, password)
                        .then(() => setAuthMsg('Signed in!'))
                        .catch((e) => setAuthMsg(String(e.message || e)))
                    }
                    className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() =>
                      void syncEngine
                        .signUpWithPassword(email, password)
                        .then(() => setAuthMsg('Account created!'))
                        .catch((e) => setAuthMsg(String(e.message || e)))
                    }
                    className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
            {authMsg && <p className="text-sky-300 font-semibold">{authMsg}</p>}
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.04]">
              <div>
                <div className="text-slate-400">Signed in as</div>
                <strong className="text-white text-sm">{syncInfo.userEmail}</strong>
                <div className="text-[11px] text-slate-400">seq cursor: {syncInfo.seqCursor} | pending: {syncInfo.pendingCount}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void syncEngine.syncNow()} className="px-3.5 py-2 rounded-xl bg-sky-500 text-white font-bold">
                  Sync Now
                </button>
                <button onClick={() => void syncEngine.signOut()} className="px-3.5 py-2 rounded-xl bg-white/10 text-white font-bold">
                  Sign Out
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Device name"
                className="bg-white/5 border border-white/10 rounded-xl p-2 text-white"
              />
              <button onClick={() => void syncEngine.setDeviceName(deviceName)} className="px-3 py-2 rounded-xl bg-white/10 text-white font-bold">
                Save Device Name
              </button>
            </div>
          </div>
        )}

        {/* Hidden Advanced Override */}
        <div className="pt-2 border-t border-white/10">
          <button onClick={() => setShowAdvanced((v) => !v)} className="text-xs text-slate-400 underline">
            {showAdvanced ? 'Hide Advanced Supabase Override' : 'Advanced: Custom Supabase Override'}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-2 text-xs">
              <input
                type="url"
                value={advUrl}
                onChange={(e) => setAdvUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white font-mono"
              />
              <input
                type="password"
                value={advKey}
                onChange={(e) => setAdvKey(e.target.value)}
                placeholder="Public Anon / Publishable Key"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white font-mono"
              />
              <div className="flex gap-2">
                <button onClick={() => syncEngine.saveAdvancedOverride(advUrl, advKey)} className="px-3 py-1.5 rounded-xl bg-sky-500 text-white font-bold">
                  Apply Override
                </button>
                <button onClick={() => syncEngine.clearAdvancedOverride()} className="px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold">
                  Clear Override
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Conflicts */}
      {conflicts.length > 0 && (
        <div className="glass-card rounded-3xl p-6 space-y-3 border border-amber-500/30 text-xs">
          <h3 className="text-sm font-bold text-amber-300">Restorable Sync Conflicts ({conflicts.length})</h3>
          {conflicts.map((c) => (
            <div key={c.conflictId} className="p-3 rounded-xl bg-black/30 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white">{c.title}</div>
                <div className="text-slate-400">Losing device: {c.losingDevice} ({c.collection})</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void restore(c.conflictId)} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold">
                  Restore
                </button>
                <button onClick={() => void dismiss(c.conflictId)} className="px-3 py-1 rounded-lg bg-white/10 text-slate-300 font-bold">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appearance & Glass Quality (Part 13) */}
      <div className="glass-card rounded-3xl p-6 space-y-4">
        <h2 className="text-base font-extrabold text-white">Appearance &amp; Glass Quality (Part 13)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Glass Quality</label>
            <select
              value={getSetting('glassQuality') || 'auto'}
              onChange={(e) => setSetting('glassQuality', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
            >
              <option value="auto" className="bg-slate-900">Auto (1-second FPS probe)</option>
              <option value="high" className="bg-slate-900">High (Full Liquid Glass)</option>
              <option value="low" className="bg-slate-900">Low (Solid Translucent)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 w-full cursor-pointer">
              <input
                type="checkbox"
                checked={getSetting('reduceTransparency') === 'true'}
                onChange={(e) => setSetting('reduceTransparency', e.target.checked)}
              />
              <span className="text-slate-200 font-semibold">Reduce transparency (high contrast)</span>
            </label>
          </div>
          <div className="flex items-end col-span-1 sm:col-span-2">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 w-full cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={getSetting('disableHaptics') !== 'true'}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setSetting('disableHaptics', !enabled);
                  setHapticsEnabled(enabled);
                  if (enabled) triggerHaptic('success');
                }}
              />
              <div>
                <span className="text-slate-200 font-semibold block">Tactile Haptic Feedback</span>
                <span className="text-slate-400 text-[11px] block">Vibrate gently on card swipe, answer selection, and navigation taps on supported mobile devices</span>
              </div>
            </label>
          </div>
          <div className="flex items-end col-span-1 sm:col-span-2">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 w-full cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={soundFX.isEnabled()}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  soundFX.setEnabled(enabled);
                  setSetting('soundEnabled', enabled);
                  if (enabled) soundFX.playChime();
                }}
              />
              <div>
                <span className="text-slate-200 font-semibold block">Tactile Web Audio Sound Effects</span>
                <span className="text-slate-400 text-[11px] block">Subtle mechanical click on card flip, soft positive chimes on timer & quiz completions</span>
              </div>
            </label>
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              FSRS Desired Retention: {getSetting('retention') || '90'}%
            </label>
            <input
              type="range"
              min="80"
              max="97"
              value={getSetting('retention') || '90'}
              onChange={(e) => {
                setSetting('retention', e.target.value);
                soundFX.playTap();
              }}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>80% (Longer intervals)</span>
              <span>90% (Recommended)</span>
              <span>97% (Strict Exam Mode)</span>
            </div>
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Question Text Font Size: {getSetting('fontSize') || '16'}px
            </label>
            <input
              type="range"
              min="13"
              max="22"
              value={getSetting('fontSize') || '16'}
              onChange={(e) => {
                setSetting('fontSize', e.target.value);
                soundFX.playTap();
              }}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>13px (Compact)</span>
              <span>16px (Default)</span>
              <span>22px (Large / High Legibility)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rule R4 Personal Settings (No Defaults in Code) */}
      <div className="glass-card rounded-3xl p-6 space-y-4">
        <h2 className="text-base font-extrabold text-white">Personal Exam Settings (Rule R4 - No Defaults)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Exam Date</label>
            <input type="date" value={getSetting('examDate')} onChange={(e) => setSetting('examDate', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Internship Completion Date</label>
            <input type="date" value={getSetting('internshipDate')} onChange={(e) => setSetting('internshipDate', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">State (for State Quota)</label>
            <input type="text" value={getSetting('stateName')} onChange={(e) => setSetting('stateName', e.target.value)} placeholder="Enter your state" className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Reservation Category</label>
            <input type="text" value={getSetting('reservationCategory')} onChange={(e) => setSetting('reservationCategory', e.target.value)} placeholder="e.g. UR, EWS, OBC-NCL, SC, ST" className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Target Branch</label>
            <input type="text" value={getSetting('targetBranch')} onChange={(e) => setSetting('targetBranch', e.target.value)} placeholder="e.g. OMFS" className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Daily Study Hours</label>
            <input type="number" min={1} max={16} value={getSetting('dailyHours')} onChange={(e) => setSetting('dailyHours', e.target.value)} placeholder="e.g. 8" className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
        </div>
      </div>

      {/* IndexedDB Storage & JSON Backup */}
      <div className="glass-card rounded-3xl p-6 space-y-4 text-xs">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-extrabold text-white">Local Storage & JSON Backup</h2>
            <p className="text-slate-400">
              IndexedDB Used: <strong className="text-white">{usageMb} MB</strong> / {quotaMb} MB | Persistent Storage:{' '}
              <strong className="text-emerald-400">{syncInfo?.storagePersisted ? 'Granted' : 'Best-effort'}</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void handleExport()} className="px-4 py-2.5 rounded-xl bg-sky-500 text-white font-bold">
            Export JSON Backup
          </button>
          <label className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold cursor-pointer">
            Import JSON (MDS OS or Build A)
            <input type="file" accept=".json,application/json" onChange={(e) => void handleImport(e)} className="hidden" />
          </label>
          <button
            onClick={() => {
              if (confirm('Clear local IndexedDB records on this device?')) {
                void syncEngine.resetLocalDatabase();
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold"
          >
            Reset Local Data
          </button>
        </div>

        {syncInfo?.userEmail && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE CLOUD DATA"
              className="bg-black/30 border border-rose-500/30 rounded-xl p-2 text-white font-mono"
            />
            <button
              disabled={deleteConfirm !== 'DELETE CLOUD DATA'}
              onClick={() => void syncEngine.deleteCloudData().then(() => setDeleteConfirm(''))}
              className="px-4 py-2 rounded-xl bg-rose-500 disabled:opacity-40 text-white font-bold"
            >
              Delete Cloud Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
