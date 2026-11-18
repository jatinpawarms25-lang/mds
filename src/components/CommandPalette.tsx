import React, { useState, useEffect, useRef } from 'react';
import type { ScreenId } from '../screens/TodayScreen';
import { soundFX } from '../utils/audio';

interface CommandItem {
  id: string;
  title: string;
  category: 'Screen' | 'Subject' | 'Tool' | 'Action';
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleTheme?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // Core Screens
    { id: 'screen-today', title: 'Today - Daily Command & Pomodoro', category: 'Screen', shortcut: 'Cmd+1', action: () => onNavigate('dashboard') },
    { id: 'screen-plan', title: 'Plan - Revision Schedule & Syllabus', category: 'Screen', shortcut: 'Cmd+2', action: () => onNavigate('plan') },
    { id: 'screen-memory', title: 'Memory - FSRS Flashcards & SRS Review', category: 'Screen', shortcut: 'Cmd+3', action: () => onNavigate('memory') },
    { id: 'screen-cbt', title: 'CBT Mock - Prometric Simulation & Rule 15.2', category: 'Screen', shortcut: 'Cmd+4', action: () => onNavigate('cbt_mock') },
    { id: 'screen-volatile', title: 'Volatile Vault - Formulas & LA Calculator', category: 'Screen', shortcut: 'Cmd+5', action: () => onNavigate('volatile_vault') },
    { id: 'screen-atlas', title: 'Image Atlas - Radiographs & Histopath', category: 'Screen', shortcut: 'Cmd+6', action: () => onNavigate('ibq_spotter') },
    { id: 'screen-error', title: 'Mistake Log - Error Taxonomy & Retest', category: 'Screen', shortcut: 'Cmd+7', action: () => onNavigate('error_log') },
    { id: 'screen-quiz', title: 'Daily Quiz - Rapid-Fire Diagnostic Drill', category: 'Screen', shortcut: 'Cmd+8', action: () => onNavigate('daily_quiz') },
    { id: 'screen-colleges', title: 'Colleges - Target Rank & Cutoffs', category: 'Screen', shortcut: 'Cmd+9', action: () => onNavigate('colleges') },
    { id: 'screen-omfs', title: 'OMFS Deep Dive - Surgical Flaps & Trauma', category: 'Screen', action: () => onNavigate('omfs_deep_dive') },
    { id: 'screen-subjects', title: 'Subjects - 17-Subject Matrix & Deck Sizes', category: 'Screen', action: () => onNavigate('curriculum') },
    { id: 'screen-checklists', title: 'Checklists - Exam Hall & Counselling', category: 'Screen', action: () => onNavigate('watchlists') },
    { id: 'screen-report', title: 'PDF Report - Executive Performance Analytics', category: 'Screen', action: () => onNavigate('pdf_report') },
    { id: 'screen-rules', title: 'Hidden Rules - NBE Scoring Secrets', category: 'Screen', action: () => onNavigate('hidden_neglected') },
    { id: 'screen-settings', title: 'Settings - Themes, Cloud Sync & Backups', category: 'Screen', action: () => onNavigate('settings') },

    // Clinical Tools
    { id: 'tool-la-calc', title: 'Tool: Local Anaesthesia Max Dose Calculator', category: 'Tool', action: () => { onNavigate('volatile_vault'); } },
    { id: 'tool-pederson', title: 'Tool: Pederson Third Molar Difficulty Index', category: 'Tool', action: () => { onNavigate('volatile_vault'); } },
    { id: 'tool-ceph', title: 'Tool: Cephalometric Norm Matrix (Steiner/Tweed)', category: 'Tool', action: () => { onNavigate('volatile_vault'); } },
    { id: 'tool-vertucci', title: 'Tool: Vertucci Root Canal Anatomy Classifier', category: 'Tool', action: () => { onNavigate('ibq_spotter'); } },

    // Actions
    { id: 'act-sound', title: 'Action: Toggle Tactile Sound Effects', category: 'Action', action: () => { soundFX.setEnabled(!soundFX.isEnabled()); } },
    { id: 'act-theme', title: 'Action: Switch Light / Dark / OLED Theme', category: 'Action', action: () => { if (onToggleTheme) onToggleTheme(); } },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      soundFX.playTap();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      soundFX.playTap();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        soundFX.playChime();
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle)] gap-3 bg-[var(--bg-base)]">
          <svg className="w-5 h-5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a screen, tool, or command... (e.g. Memory, LA, CBT)"
            className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base focus:outline-none min-h-[44px]"
            aria-label="Command search"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-[var(--border-subtle)]/40">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              No matching commands or screens found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    soundFX.playChime();
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors min-h-[44px] ${
                    isSelected
                      ? 'bg-[var(--accent-blue)] text-white'
                      : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    <span className="text-sm font-medium">{cmd.title}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd
                      className={`text-xs px-2 py-0.5 rounded font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-base)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] font-mono">Up/Down</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] font-mono">Enter</kbd> to select</span>
          </div>
          <span>ApexMDS Power Menu</span>
        </div>
      </div>
    </div>
  );
};
