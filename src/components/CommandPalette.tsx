'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { loadData, loadProfileData, todayString, generateId, saveData } from '@/lib/storage';
import { recordHabitCompletion } from '@/lib/reminders';
import { SKILL_CATEGORY_CONFIG, SkillCategory } from '@/lib/types';

interface CommandAction {
  id: string;
  label: string;
  icon: string;
  category: 'navigation' | 'action' | 'quick';
  href?: string;
  action?: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => open ? '' : '');
  const [selectedIndex, setSelectedIndex] = useState(() => open ? 0 : 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Habit logging state
  const [habits, setHabits] = useState<{ id: string; name: string; color: string; done: boolean }[]>(() => {
    if (!open) return [];
    return [];
  });
  const [showHabitLog, setShowHabitLog] = useState(false);

  // Check-in state
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  // Skill session state
  const [skills, setSkills] = useState<{ id: string; name: string; category?: SkillCategory }[]>([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [skillSuccess, setSkillSuccess] = useState(false);
  const [showSkillSession, setShowSkillSession] = useState(false);

  // All available commands
  const allCommands: CommandAction[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '🏠', category: 'navigation', href: '/dashboard' },
    { id: 'nav-notes', label: 'Go to Quick Notes', icon: '📝', category: 'navigation', href: '/notes' },
    { id: 'nav-habits', label: 'Go to Habits', icon: '🔄', category: 'navigation', href: '/habits' },
    { id: 'nav-goals', label: 'Go to Goals', icon: '🎯', category: 'navigation', href: '/goals' },
    { id: 'nav-achievements', label: 'Go to Achievements', icon: '🏆', category: 'navigation', href: '/achievements' },
    { id: 'nav-challenges', label: 'Go to Challenges', icon: '🎯', category: 'navigation', href: '/challenges' },
    { id: 'nav-daily', label: 'Go to Daily Check-in', icon: '📝', category: 'navigation', href: '/daily' },
    { id: 'nav-focus', label: 'Go to Focus', icon: '⏱️', category: 'navigation', href: '/focus' },
    { id: 'nav-calendar', label: 'Go to Calendar', icon: '📅', category: 'navigation', href: '/calendar' },
    { id: 'nav-skills', label: 'Go to Skills', icon: '⚡', category: 'navigation', href: '/skills' },
    { id: 'nav-insights', label: 'Go to Insights', icon: '🔮', category: 'navigation', href: '/insights' },
    { id: 'nav-yearly', label: 'Go to Yearly Vision', icon: '⭐', category: 'navigation', href: '/yearly' },
    { id: 'nav-body', label: 'Go to Body Metrics', icon: '⚖️', category: 'navigation', href: '/body' },
    { id: 'nav-hydration', label: 'Go to Hydration', icon: '💧', category: 'navigation', href: '/hydration' },
    { id: 'nav-books', label: 'Go to Books', icon: '📚', category: 'navigation', href: '/books' },
    { id: 'nav-weekly', label: 'Go to Weekly Review', icon: '📋', category: 'navigation', href: '/weekly' },
    { id: 'nav-review', label: 'Go to Review', icon: '📊', category: 'navigation', href: '/review' },
    { id: 'nav-settings', label: 'Go to Settings', icon: '⚙️', category: 'navigation', href: '/settings' },
    // Quick Actions
    { id: 'action-habit', label: 'Log Habit', icon: '✅', category: 'quick', action: () => openHabitLog() },
    { id: 'action-checkin', label: 'Quick Daily Check-in', icon: '📝', category: 'quick', action: () => openCheckin() },
    { id: 'action-skill', label: 'Add Skill Session', icon: '⚡', category: 'quick', action: () => openSkillSession() },
    { id: 'action-journal', label: 'Write Journal Entry', icon: '📖', category: 'quick', action: () => openJournal() },
  ];

  const filteredCommands = query
    ? allCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        if (showHabitLog) {
          setShowHabitLog(false);
        } else if (showCheckin) {
          setShowCheckin(false);
        } else if (showSkillSession) {
          setShowSkillSession(false);
        } else {
          setOpen(false);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showHabitLog, showCheckin, showSkillSession, setOpen]);

  const executeCommand = useCallback((cmd: CommandAction) => {
    if (cmd.href) {
      router.push(cmd.href);
      setOpen(false);
    } else if (cmd.action) {
      cmd.action();
    }
  }, [router, setOpen]);

  function openHabitLog() {
    const data = loadData();
    const pd = loadProfileData(data);
    const today = todayString();
    const todayDow = new Date().getDay();
    const todaysHabits = pd.habits.filter((h) => {
      const days = h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
      return days.includes(todayDow);
    });
    setHabits(todaysHabits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      done: !!h.completions[today],
    })));
    setShowHabitLog(true);
    setOpen(false);
  }

  function openCheckin() {
    const data = loadData();
    const pd = loadProfileData(data);
    const today = todayString();
    const todayLog = pd.dailyLogs.find((l) => l.date === today);
    setMood(todayLog?.mood ?? null);
    setEnergy(todayLog?.energy ?? null);
    setCheckinSuccess(false);
    setShowCheckin(true);
    setOpen(false);
  }

  function openSkillSession() {
    const data = loadData();
    const pd = loadProfileData(data);
    setSkills(pd.skills.map((s) => ({ id: s.id, name: s.name, category: s.category })));
    setSelectedSkill(pd.skills[0]?.id ?? '');
    setSessionMinutes(30);
    setSkillSuccess(false);
    setShowSkillSession(true);
    setOpen(false);
  }

  function openJournal() {
    router.push('/journal');
    setOpen(false);
  }

  function toggleHabit(habitId: string) {
    const today = todayString();
    const data = loadData();
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const wasComplete = !!habit.completions[today];
    habit.completions[today] = !wasComplete;
    if (!wasComplete) {
      recordHabitCompletion(habitId, new Date().getHours());
    }
    saveData(data);
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, done: !h.done } : h))
    );
  }

  function saveCheckin() {
    if (!mood || !energy) return;
    const today = todayString();
    const data = loadData();
    const existingIndex = data.dailyLogs.findIndex(
      (l) => l.date === today && l.profileId === data.activeProfileId
    );
    const log = {
      id: existingIndex >= 0 ? data.dailyLogs[existingIndex].id : generateId(),
      profileId: data.activeProfileId,
      date: today,
      mood,
      energy,
      notes: existingIndex >= 0 ? data.dailyLogs[existingIndex].notes : '',
    };
    if (existingIndex >= 0) {
      data.dailyLogs[existingIndex] = log;
    } else {
      data.dailyLogs.push(log);
    }
    saveData(data);
    setCheckinSuccess(true);
    setTimeout(() => setShowCheckin(false), 1500);
  }

  function saveSkillSession() {
    if (!selectedSkill || sessionMinutes <= 0) return;
    const data = loadData();
    const skill = data.skills.find((s) => s.id === selectedSkill);
    if (!skill) return;
    skill.sessions.push({
      id: generateId(),
      date: todayString(),
      durationMinutes: sessionMinutes,
      notes: '',
    });
    saveData(data);
    setSkillSuccess(true);
    setTimeout(() => setShowSkillSession(false), 1500);
  }

  // Hide on settings page or in fullscreen focus mode
  if (pathname.startsWith('/settings')) return null;

  return (
    <>
      {/* Keyboard shortcut hint in bottom-left */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-card-border rounded-lg px-3 py-1.5 text-xs text-fg-secondary hover:text-foreground hover:bg-card transition-colors"
        aria-label="Open command palette"
      >
        <span>⌘</span><span>K</span>
      </button>

      {/* Habit Log Panel */}
      {showHabitLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHabitLog(false)} />
          <div className="relative w-full max-w-md bg-card border border-card-border rounded-2xl p-4 shadow-2xl">
            <h3 className="text-sm font-semibold mb-3">Log Habits</h3>
            {habits.length === 0 ? (
              <p className="text-sm text-fg-muted">No habits scheduled today</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {habits.map((h) => (
                  <label key={h.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.done}
                      onChange={() => toggleHabit(h.id)}
                      className="w-4 h-4 rounded border-2 border-gray-500 accent-blue-500 cursor-pointer"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: h.color }}
                    />
                    <span className={`text-sm ${h.done ? 'line-through text-fg-muted' : ''}`}>
                      {h.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowHabitLog(false)}
              className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Quick Check-in Panel */}
      {showCheckin && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCheckin(false)} />
          <div className="relative w-full max-w-md bg-card border border-card-border rounded-2xl p-4 shadow-2xl">
            <h3 className="text-sm font-semibold mb-3">Quick Daily Check-in</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-fg-muted block mb-1">Mood</label>
                <div className="flex gap-1.5">
                  {([1, 2, 3, 4, 5] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setMood(v)}
                      className={`text-xl p-1.5 rounded-lg transition-all ${
                        mood === v
                          ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      {['😞', '😕', '😐', '🙂', '😄'][v - 1]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-fg-muted block mb-1">Energy</label>
                <div className="flex gap-1.5">
                  {([1, 2, 3, 4, 5] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEnergy(v)}
                      className={`text-xl p-1.5 rounded-lg transition-all ${
                        energy === v
                          ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      {['🪫', '😴', '😐', '⚡', '🔥'][v - 1]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={saveCheckin}
                disabled={!mood || !energy}
                className={`w-full py-2 text-sm rounded-lg transition-all ${
                  checkinSuccess
                    ? 'bg-green-500 text-white'
                    : !mood || !energy
                      ? 'bg-surface-dim text-fg-muted cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {checkinSuccess ? '✓ Saved!' : 'Save Check-in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Session Panel */}
      {showSkillSession && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSkillSession(false)} />
          <div className="relative w-full max-w-md bg-card border border-card-border rounded-2xl p-4 shadow-2xl">
            <h3 className="text-sm font-semibold mb-3">Add Skill Session</h3>
            {skills.length === 0 ? (
              <div>
                <p className="text-sm text-fg-muted mb-3">No skills yet — add one on the Skills page</p>
                <button
                  onClick={() => setShowSkillSession(false)}
                  className="w-full py-1.5 bg-surface hover:bg-surface-hover text-sm rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-fg-muted block mb-1">Skill</label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {skills.map((s) => {
                      const cat = s.category ? SKILL_CATEGORY_CONFIG.find((c) => c.value === s.category) : null;
                      return (
                        <option key={s.id} value={s.id}>
                          {cat ? `${cat.icon} ` : ''}{s.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fg-muted block mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={sessionMinutes}
                    onChange={(e) => setSessionMinutes(Number(e.target.value))}
                    min={1}
                    className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={saveSkillSession}
                  disabled={!selectedSkill || sessionMinutes <= 0}
                  className={`w-full py-2 text-sm rounded-lg transition-all ${
                    skillSuccess
                      ? 'bg-green-500 text-white'
                      : !selectedSkill || sessionMinutes <= 0
                        ? 'bg-surface-dim text-fg-muted cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {skillSuccess ? '✓ Saved!' : 'Save Session'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Command Palette Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <svg
                className="w-5 h-5 text-fg-muted flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
                    executeCommand(filteredCommands[selectedIndex]);
                  }
                }}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-foreground placeholder:text-fg-muted focus:outline-none text-sm"
              />
              <kbd className="text-xs text-fg-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                ESC
              </kbd>
            </div>

            {/* Command List */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <p className="text-sm text-fg-muted text-center py-6">No commands found</p>
              ) : (
                <>
                  {/* Navigation Commands */}
                  {filteredCommands.filter(c => c.category === 'navigation').length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-fg-muted px-2 py-1">Navigation</p>
                      {filteredCommands
                        .filter((cmd) => cmd.category === 'navigation')
                        .map((cmd) => {
                          const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                          return (
                            <button
                              key={cmd.id}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedIndex === globalIdx
                                  ? 'bg-blue-600/20 text-blue-400'
                                  : 'text-foreground hover:bg-surface-hover'
                              }`}
                            >
                              <span className="text-base">{cmd.icon}</span>
                              <span className="flex-1 text-left">{cmd.label}</span>
                              {selectedIndex === globalIdx && (
                                <kbd className="text-xs text-fg-muted">↵</kbd>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {/* Quick Actions */}
                  {filteredCommands.filter(c => c.category === 'quick').length > 0 && (
                    <div>
                      <p className="text-xs text-fg-muted px-2 py-1">Quick Actions</p>
                      {filteredCommands
                        .filter((cmd) => cmd.category === 'quick')
                        .map((cmd) => {
                          const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                          return (
                            <button
                              key={cmd.id}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                selectedIndex === globalIdx
                                  ? 'bg-blue-600/20 text-blue-400'
                                  : 'text-foreground hover:bg-surface-hover'
                              }`}
                            >
                              <span className="text-base">{cmd.icon}</span>
                              <span className="flex-1 text-left">{cmd.label}</span>
                              {selectedIndex === globalIdx && (
                                <kbd className="text-xs text-fg-muted">↵</kbd>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1">
                <kbd className="bg-surface px-1.5 py-0.5 rounded border border-border">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-surface px-1.5 py-0.5 rounded border border-border">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-surface px-1.5 py-0.5 rounded border border-border">ESC</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
