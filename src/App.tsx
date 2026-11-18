import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { CornerTipsCoach, HIGH_YIELD_TIPS } from './components/CornerTipsCoach';
import { SyncStatusChip } from './components/SyncStatusChip';
import { useSyncCollection, useSyncStatus } from './hooks/useSyncStore';
import type { CardRecord } from './memory/types';
import type { ScreenId } from './screens/TodayScreen';
import { syncEngine } from './sync/syncEngine';
import { soundFX } from './utils/audio';
import { triggerHaptic } from './utils/haptics';

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

/* SVG icon paths for drawer nav groups */
const GROUP_ICONS: Record<string, string> = {
  Core: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  Practice: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  Strategy: 'M13 10V3L4 14h7v7l9-11h-7',
  System: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z'
};

const MOBILE_TABS: { id: ScreenId | 'menu'; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'plan', label: 'Plan' },
  { id: 'memory', label: 'Memory' },
  { id: 'cbt_mock', label: 'Mocks' },
  { id: 'menu', label: 'Menu' }
];

/* Inline SVG icons for the bottom bar tabs */
function TabIcon({ id, active }: { id: string; active: boolean }) {
  const cls = `w-5 h-5 ${active ? 'text-sky-400' : 'text-slate-400'}`;
  switch (id) {
    case 'dashboard':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'plan':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'memory':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
      );
    case 'cbt_mock':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'menu':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    default:
      return null;
  }
}

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const syncInfo = useSyncStatus();
  const { items: settingsRows, putItem: putSetting } = useSyncCollection<{ value: unknown }>('settings');
  const { items: cardRows } = useSyncCollection<CardRecord>('cards');

  const dueMemoryCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return cardRows.filter((c) => {
      const card = c.data;
      if (!card || card.suspended) return false;
      return card.state === 'new' || (card.dueAt && card.dueAt.slice(0, 10) <= todayStr);
    }).length;
  }, [cardRows]);

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

  const navigate = useCallback((id: ScreenId) => {
    soundFX.playTap();
    triggerHaptic('light');
    setActiveScreen(id);
    setDrawerOpen(false);
    setDrawerQuery('');
    setCmdOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const keyMap: Record<string, ScreenId> = {
          '1': 'dashboard',
          '2': 'plan',
          '3': 'memory',
          '4': 'cbt_mock',
          '5': 'volatile_vault',
          '6': 'ibq_spotter',
          '7': 'error_log',
          '8': 'daily_quiz',
          '9': 'colleges'
        };
        if (keyMap[e.key]) {
          e.preventDefault();
          navigate(keyMap[e.key]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  // Global Drag-and-Drop listener for .apkg and .csv flashcard decks
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.apkg') || file.name.endsWith('.csv')) {
          navigate('memory');
          soundFX.playChime();
        }
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [navigate]);

  /* Lock body scroll when drawer is open on mobile */
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const cycleTheme = () => {
    triggerHaptic('light');
    const next: ThemeMode = themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark';
    void putSetting('theme', { value: next });
  };

  const filteredDrawer = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [drawerQuery]);

  const ActiveSimple = activeScreen === 'dashboard' ? null : SIMPLE_SCREENS[activeScreen];
  const loadingTip = HIGH_YIELD_TIPS[Math.floor(Date.now() / 10000) % HIGH_YIELD_TIPS.length];
  const activeLabel = NAV_ITEMS.find((n) => n.id === activeScreen)?.label || 'Today';

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

      {/* Mobile Slide-Out Navigation Drawer (< 1024px) */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 drawer-scrim"
          onClick={() => { setDrawerOpen(false); setDrawerQuery(''); }}
          role="presentation"
        >
          <nav
            ref={drawerRef}
            className="drawer-panel w-[280px] max-w-[85vw] h-full glass-sidebar flex flex-col"
            onClick={(e) => e.stopPropagation()}
            aria-label="Navigation drawer"
          >
            {/* Drawer Header */}
            <div className="px-4 pt-5 pb-3 border-b border-white/10 shrink-0">
              <div className="text-xs font-bold uppercase tracking-widest text-sky-400">ApexMDS</div>
              <div className="text-sm font-extrabold text-white">Liquid Glass Edition</div>
            </div>

            {/* Quick Filter Search */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <input
                type="text"
                value={drawerQuery}
                onChange={(e) => setDrawerQuery(e.target.value)}
                placeholder="Filter screens..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 min-h-[44px]"
                autoFocus
              />
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4 overscroll-contain">
              {(['Core', 'Practice', 'Strategy', 'System'] as const).map((group) => {
                const groupItems = filteredDrawer.filter((i) => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={GROUP_ICONS[group] || ''} />
                        {group === 'System' && <circle cx="12" cy="12" r="3" />}
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{group}</span>
                    </div>
                    {groupItems.map((item) => {
                      const active = activeScreen === item.id;
                      const hasDueBadge = item.id === 'memory' && dueMemoryCount > 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center justify-between ${
                            active
                              ? 'bg-sky-500/20 text-sky-400 shadow-sm border border-sky-500/30'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          {hasDueBadge && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold shrink-0">
                              {dueMemoryCount} due
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Glass Bar */}
        <header className="glass-nav-bar sticky top-0 z-20 px-3 md:px-6 py-3 flex items-center justify-between gap-2">
          {/* Mobile: Hamburger + Screen Title */}
          <div className="flex items-center gap-2 lg:hidden min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDrawerOpen(true);
              }}
              aria-label="Open navigation menu"
              className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:scale-95 transition-transform shrink-0"
            >
              <svg className="w-5 h-5 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="text-sm font-bold text-white truncate">{activeLabel}</span>
          </div>

          {/* Desktop: breadcrumb label */}
          <div className="hidden lg:block text-xs text-slate-400 font-semibold">
            {activeLabel}
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

        <main className="flex-1 p-3 md:p-6 pb-24 lg:pb-16">
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

      {/* Mobile Icon Bottom Navigation Bar (< 1024px) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass-tab-bar safe-bottom" aria-label="Main navigation">
        <div className="flex items-stretch justify-around px-1 pt-1">
          {MOBILE_TABS.map((tab) => {
            const isMenu = tab.id === 'menu';
            const active = isMenu ? drawerOpen : (activeScreen === tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  if (isMenu) {
                    setDrawerOpen((v) => !v);
                  } else {
                    navigate(tab.id as ScreenId);
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-all min-h-[48px] ${
                  active
                    ? 'mobile-tab-active'
                    : ''
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <TabIcon id={tab.id} active={active} />
                  {tab.id === 'memory' && dueMemoryCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono leading-none shadow-sm">
                      {dueMemoryCount > 99 ? '99+' : dueMemoryCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold leading-tight ${active ? 'text-sky-400' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Command Palette (Cmd/Ctrl+K) */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={navigate}
        onToggleTheme={cycleTheme}
      />
    </div>
  );
}
