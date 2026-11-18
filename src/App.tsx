import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { CornerTipsCoach, HIGH_YIELD_TIPS } from './components/CornerTipsCoach';
import { SyncStatusChip } from './components/SyncStatusChip';
import { useSyncCollection, useSyncStatus } from './hooks/useSyncStore';
import type { ScreenId } from './screens/TodayScreen';
import { syncEngine } from './sync/syncEngine';

const TodayScreen = lazy(() => import('./screens/TodayScreen'));
const DailyQuizScreen = lazy(() => import('./screens/DailyQuizScreen'));
const PlanScreen = lazy(() => import('./screens/PlanScreen'));
const SubjectsScreen = lazy(() => import('./screens/SubjectsScreen'));
const CbtMockScreen = lazy(() => import('./screens/CbtMockScreen'));
const ErrorLogScreen = lazy(() => import('./screens/ErrorLogScreen'));
const VolatileVaultScreen = lazy(() => import('./screens/VolatileVaultScreen'));
const ImageAtlasScreen = lazy(() => import('./screens/ImageAtlasScreen'));
const OmfsDeepDiveScreen = lazy(() => import('./screens/OmfsDeepDiveScreen'));
const CollegesScreen = lazy(() => import('./screens/CollegesScreen'));
const AfterResultScreen = lazy(() => import('./screens/AfterResultScreen'));
const HiddenRulesScreen = lazy(() => import('./screens/HiddenRulesScreen'));
const ChecklistsScreen = lazy(() => import('./screens/ChecklistsScreen'));
const UpdateCentreScreen = lazy(() => import('./screens/UpdateCentreScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const MemoryScreen = lazy(() => import('./screens/MemoryScreen'));
const OpenSourceHubScreen = lazy(() => import('./screens/OpenSourceHubScreen'));
const PdfReportScreen = lazy(() => import('./screens/PdfReportScreen'));

interface NavItem {
  id: ScreenId;
  label: string;
  group: 'Core' | 'Practice' | 'Strategy' | 'System';
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Today', group: 'Core' },
  { id: 'plan', label: 'Smart Timetable & Plan', group: 'Core' },
  { id: 'curriculum', label: '17 Subjects', group: 'Core' },
  { id: 'open_source_hub', label: '7-Repo Exam Hub', group: 'Practice' },
  { id: 'memory', label: 'Memory (FSRS)', group: 'Practice' },
  { id: 'daily_quiz', label: 'Daily Quiz', group: 'Practice' },
  { id: 'cbt_mock', label: 'CBT & Mocks', group: 'Practice' },
  { id: 'error_log', label: 'Mistake Log', group: 'Practice' },
  { id: 'volatile_vault', label: 'Volatile Vault', group: 'Practice' },
  { id: 'ibq_spotter', label: 'Image Atlas', group: 'Practice' },
  { id: 'pdf_report', label: 'PDF to Report', group: 'Practice' },
  { id: 'omfs_deep_dive', label: 'OMFS Deep Dive', group: 'Strategy' },
  { id: 'colleges', label: 'Colleges & Cutoffs', group: 'Strategy' },
  { id: 'after_result', label: 'After Result', group: 'Strategy' },
  { id: 'hidden_neglected', label: '19 Hidden Rules', group: 'Strategy' },
  { id: 'watchlists', label: 'Checklists', group: 'Strategy' },
  { id: 'update_centre', label: 'Update Centre', group: 'System' },
  { id: 'settings', label: 'Settings & Sync', group: 'System' }
];

const MOBILE_TABS: { id: ScreenId; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'plan', label: 'Plan' },
  { id: 'memory', label: 'Memory' },
  { id: 'cbt_mock', label: 'Mocks' }
];

const SIMPLE_SCREENS: Record<Exclude<ScreenId, 'dashboard'>, LazyExoticComponent<ComponentType<Record<string, never>>>> = {
  open_source_hub: OpenSourceHubScreen,
  memory: MemoryScreen,
  daily_quiz: DailyQuizScreen,
  plan: PlanScreen,
  curriculum: SubjectsScreen,
  cbt_mock: CbtMockScreen,
  error_log: ErrorLogScreen,
  volatile_vault: VolatileVaultScreen,
  ibq_spotter: ImageAtlasScreen,
  omfs_deep_dive: OmfsDeepDiveScreen,
  colleges: CollegesScreen,
  after_result: AfterResultScreen,
  hidden_neglected: HiddenRulesScreen,
  watchlists: ChecklistsScreen,
  update_centre: UpdateCentreScreen,
  settings: SettingsScreen,
  pdf_report: PdfReportScreen
};

type ThemeMode = 'dark' | 'light' | 'system';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  const syncInfo = useSyncStatus();
  const { items: settingsRows, putItem: putSetting } = useSyncCollection<{ value: unknown }>('settings');

  const themeMode = useMemo<ThemeMode>(() => {
    const found = settingsRows.find((r) => r.id === 'theme');
    const v = found?.data?.value;
    if (v === 'light' || v === 'dark' || v === 'system') return v;
    return 'dark';
  }, [settingsRows]);

  const glassQuality = useMemo<'auto' | 'high' | 'low'>(() => {
    const found = settingsRows.find((r) => r.id === 'glassQuality');
    const v = found?.data?.value;
    if (v === 'high' || v === 'low' || v === 'auto') return v;
    return 'auto';
  }, [settingsRows]);

  const reduceTransparency = useMemo<boolean>(() => {
    const found = settingsRows.find((r) => r.id === 'reduceTransparency');
    return Boolean(found?.data?.value);
  }, [settingsRows]);

  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-transparency', reduceTransparency ? 'true' : 'false');
    if (glassQuality === 'high' || glassQuality === 'low') {
      document.documentElement.setAttribute('data-glass', glassQuality);
      return;
    }
    let rafId = 0;
    let frames = 0;
    const start = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - start < 1000) {
        rafId = requestAnimationFrame(tick);
      } else {
        const avgMs = (now - start) / Math.max(1, frames);
        document.documentElement.setAttribute('data-glass', avgMs > 24 ? 'low' : 'high');
      }
    };
    document.documentElement.setAttribute('data-glass', 'high');
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [glassQuality, reduceTransparency]);

  useEffect(() => {
    const applyTheme = () => {
      let resolved: 'dark' | 'light' = themeMode === 'light' ? 'light' : 'dark';
      if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
        resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      document.documentElement.setAttribute('data-theme', resolved);
    };
    applyTheme();
    if (themeMode !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setCmdQuery('');
      } else if (e.key === 'Escape') {
        setCmdOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const cycleTheme = () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark';
    void putSetting('theme', { value: next });
  };

  const navigate = (id: ScreenId) => {
    setActiveScreen(id);
    setMoreOpen(false);
    setCmdOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredCmds = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [cmdQuery]);

  const ActiveSimple = activeScreen === 'dashboard' ? null : SIMPLE_SCREENS[activeScreen];
  const loadingTip = HIGH_YIELD_TIPS[Math.floor(Date.now() / 10000) % HIGH_YIELD_TIPS.length];

  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row">
      <div className="ambient-canvas" aria-hidden="true">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
      </div>

      {/* Desktop Sidebar (>= 1024px / lg) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 glass-sidebar sticky top-0 h-screen z-20 p-4 justify-between">
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="px-2 pt-1 pb-2 border-b border-white/10">
            <div className="text-xs font-bold uppercase tracking-widest text-sky-400">ApexMDS</div>
            <div className="text-sm font-extrabold text-white">Liquid Glass Edition</div>
          </div>

          {(['Core', 'Practice', 'Strategy', 'System'] as const).map((group) => (
            <div key={group} className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group}</div>
              {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all apple-press ${
                      active
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center justify-between apple-press"
          >
            <span>Quick Jump</span>
            <span className="font-mono text-[10px] text-slate-400">Cmd+K</span>
          </button>
          <a
            href="/build-a-planner.html"
            target="_blank"
            rel="noreferrer"
            className="block text-center text-[11px] text-slate-400 hover:text-sky-400 py-1"
          >
            Build A Static Fallback
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Glass Bar */}
        <header className="glass-nav-bar sticky top-0 z-20 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-xs font-extrabold text-sky-400 uppercase tracking-wider">ApexMDS</span>
          </div>
          <div className="hidden lg:block text-xs text-slate-400 font-semibold">
            {NAV_ITEMS.find((n) => n.id === activeScreen)?.label || 'Today'}
          </div>

          <div className="flex items-center gap-2">
            <SyncStatusChip info={syncInfo} onClick={() => navigate('settings')} />
            <button
              onClick={cycleTheme}
              title="Switch Theme (Dark / Light / System)"
              className="px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 apple-press"
            >
              {themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Auto'}
            </button>
            <button
              onClick={() => void syncEngine.syncNow()}
              title="Sync Now"
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-sky-400 apple-press"
            >
              Sync
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-16">
          <Suspense
            fallback={
              <div className="glass-card rounded-3xl p-8 max-w-xl mx-auto text-center space-y-2 fluid-screen">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
                  Loading Module - {loadingTip.tag}
                </div>
                <div className="text-sm font-bold text-white">{loadingTip.title}</div>
                <p className="text-xs text-slate-300">{loadingTip.tip}</p>
              </div>
            }
          >
            <div key={activeScreen} className="fluid-screen">
              {activeScreen === 'dashboard' ? (
                <TodayScreen onNavigate={navigate} syncInfo={syncInfo} />
              ) : (
                ActiveSimple && <ActiveSimple />
              )}
            </div>
          </Suspense>
        </main>
      </div>

      {/* Floating Corner High-Yield Tips Coach */}
      <CornerTipsCoach />

      {/* Mobile 5-Tab Bottom Bar (< 1024px) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-tab-bar safe-bottom px-2 pt-2 flex items-center justify-around">
        {MOBILE_TABS.map((tab) => {
          const active = activeScreen === tab.id && !moreOpen;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold text-center apple-press ${
                active ? 'text-sky-400' : 'text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold text-center apple-press ${
            moreOpen ? 'text-sky-400' : 'text-slate-400'
          }`}
        >
          More
        </button>
      </nav>

      {/* Mobile "More" Bottom Sheet */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full glass-card rounded-t-3xl p-5 safe-bottom max-h-[80vh] overflow-y-auto space-y-4 fluid-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <strong className="text-sm font-extrabold text-white">All 16 Screens</strong>
              <button onClick={() => setMoreOpen(false)} className="text-xs text-slate-400 font-bold">
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`p-3 rounded-2xl text-left text-xs font-bold border apple-press ${
                    activeScreen === item.id
                      ? 'bg-sky-500 text-white border-sky-400'
                      : 'bg-white/5 border-white/10 text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Command Palette (Cmd/Ctrl+K) */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="w-full max-w-lg glass-card rounded-3xl p-4 space-y-3 fluid-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              placeholder="Jump to screen (e.g. Mock, Atlas, Timetable, Colleges)..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white"
            />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredCmds.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-xs text-slate-200 flex items-center justify-between"
                >
                  <span className="font-bold">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
