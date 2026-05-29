'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, generateId, todayString, loadProfileData } from '@/lib/storage';
import { Habit } from '@/lib/types';
import { runAchievementCheck } from '@/lib/useAchievementCheck';
import { recordHabitCompletion } from '@/lib/reminders';
import HabitReminders from '@/components/HabitReminders';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface HabitTemplate {
  name: string;
  frequency: 'daily' | 'weekly';
  scheduledDays: number[];
}

interface TemplateGroup {
  label: string;
  icon: string;
  templates: HabitTemplate[];
}

const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    label: 'Morning Routine',
    icon: '🌅',
    templates: [
      { name: 'Wake up early', frequency: 'daily', scheduledDays: [1, 2, 3, 4, 5] },
      { name: 'Drink water', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Meditate', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Stretch / Yoga', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Journal', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
    ],
  },
  {
    label: 'Fitness',
    icon: '💪',
    templates: [
      { name: 'Workout', frequency: 'daily', scheduledDays: [1, 3, 5] },
      { name: 'Run / Cardio', frequency: 'daily', scheduledDays: [2, 4, 6] },
      { name: '10,000 steps', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Push-ups', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Go to gym', frequency: 'daily', scheduledDays: [1, 3, 5] },
    ],
  },
  {
    label: 'Learning',
    icon: '📚',
    templates: [
      { name: 'Read 30 min', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Practice coding', frequency: 'daily', scheduledDays: [1, 2, 3, 4, 5] },
      { name: 'Study language', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Watch educational content', frequency: 'daily', scheduledDays: [0, 6] },
      { name: 'Review flashcards', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
    ],
  },
  {
    label: 'Health',
    icon: '🍎',
    templates: [
      { name: 'Eat healthy', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'No sugar', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Sleep 8 hours', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Take vitamins', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'No screens before bed', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
    ],
  },
  {
    label: 'Productivity',
    icon: '🎯',
    templates: [
      { name: 'Plan tomorrow', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Deep work session', frequency: 'daily', scheduledDays: [1, 2, 3, 4, 5] },
      { name: 'Inbox zero', frequency: 'daily', scheduledDays: [1, 2, 3, 4, 5] },
      { name: 'Weekly review', frequency: 'weekly', scheduledDays: [0] },
      { name: 'Clean workspace', frequency: 'daily', scheduledDays: [1, 5] },
    ],
  },
  {
    label: 'Mindfulness',
    icon: '🧘',
    templates: [
      { name: 'Gratitude practice', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Digital detox hour', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'Nature walk', frequency: 'daily', scheduledDays: [0, 6] },
      { name: 'Breathing exercises', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
      { name: 'No social media', frequency: 'daily', scheduledDays: [0, 1, 2, 3, 4, 5, 6] },
    ],
  },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).habits;
  });
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newScheduledDays, setNewScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly'>('daily');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editScheduledDays, setEditScheduledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateAdded, setTemplateAdded] = useState<string | null>(null);
  const today = todayString();
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function persist(updated: Habit[]) {
    setHabits(updated);
    const data = loadData();
    const otherHabits = data.habits.filter((h) => h.profileId !== data.activeProfileId);
    const merged = { ...data, habits: [...otherHabits, ...updated] };
    saveData(merged);
    runAchievementCheck(merged);
  }

  function pickColor(): string {
    return PRESET_COLORS[habits.length % PRESET_COLORS.length];
  }

  function addHabit() {
    if (!newName.trim() || newScheduledDays.length === 0) return;
    const data = loadData();
    const habit: Habit = {
      id: generateId(),
      profileId: data.activeProfileId,
      name: newName.trim(),
      frequency: newFrequency,
      scheduledDays: newScheduledDays,
      color: pickColor(),
      createdAt: today,
      completions: {},
    };
    persist([...habits, habit]);
    setNewName('');
    setNewFrequency('daily');
    setNewScheduledDays([0, 1, 2, 3, 4, 5, 6]);
  }

  function addFromTemplate(template: HabitTemplate) {
    const data = loadData();
    const habit: Habit = {
      id: generateId(),
      profileId: data.activeProfileId,
      name: template.name,
      frequency: template.frequency,
      scheduledDays: template.scheduledDays,
      color: pickColor(),
      createdAt: today,
      completions: {},
    };
    const updated = [...habits, habit];
    persist(updated);
    setTemplateAdded(template.name);
    setTimeout(() => setTemplateAdded(null), 1500);
  }

  function toggleNewDay(day: number) {
    if (newFrequency === 'weekly') {
      setNewScheduledDays([day]);
    } else {
      const next = newScheduledDays.includes(day)
        ? newScheduledDays.filter((d) => d !== day)
        : [...newScheduledDays, day];
      if (next.length > 0) setNewScheduledDays(next);
    }
  }

  function toggleEditDay(day: number) {
    if (editFrequency === 'weekly') {
      setEditScheduledDays([day]);
    } else {
      const next = editScheduledDays.includes(day)
        ? editScheduledDays.filter((d) => d !== day)
        : [...editScheduledDays, day];
      if (next.length > 0) setEditScheduledDays(next);
    }
  }

  function toggleCompletion(id: string) {
    const updated = habits.map((h) => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      const wasComplete = !!completions[today];
      completions[today] = !wasComplete;
      if (!wasComplete) {
        recordHabitCompletion(id, new Date().getHours());
      }
      return { ...h, completions };
    });
    persist(updated);
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditFrequency(habit.frequency);
    setEditColor(habit.color);
    setEditScheduledDays(habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6]);
  }

  function saveEdit(id: string) {
    if (!editName.trim() || editScheduledDays.length === 0) return;
    const updated = habits.map((h) => {
      if (h.id !== id) return h;
      return { ...h, name: editName.trim(), frequency: editFrequency, color: editColor, scheduledDays: editScheduledDays };
    });
    persist(updated);
    setEditingId(null);
  }

  function deleteHabit(id: string) {
    if (!window.confirm('Delete this habit?')) return;
    persist(habits.filter((h) => h.id !== id));
  }

  function getStreak(habit: Habit): number {
    if (habit.frequency === 'weekly') {
      return getWeeklyStreak(habit);
    }
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if (habit.completions[key]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function getBestStreak(habit: Habit): number {
    const dates = Object.keys(habit.completions).filter((k) => habit.completions[k]).sort();
    if (dates.length === 0) return 0;

    if (habit.frequency === 'weekly') {
      const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
      const completionSet = new Set(dates);
      const weekCompletions = new Map<string, boolean>();
      for (const date of dates) {
        const d = new Date(date + 'T00:00:00');
        const dow = d.getDay();
        if (!scheduled.includes(dow)) continue;
        const dayOfWeek = d.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(d);
        monday.setDate(monday.getDate() - diffToMonday);
        const weekKey = monday.toISOString().split('T')[0];
        if (!weekCompletions.has(weekKey)) {
          // Check if all scheduled days in this week have completions
          let allCompleted = true;
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(monday);
            checkDate.setDate(checkDate.getDate() + i);
            if (!scheduled.includes(checkDate.getDay())) continue;
            const checkKey = checkDate.toISOString().split('T')[0];
            if (!completionSet.has(checkKey)) {
              allCompleted = false;
              break;
            }
          }
          weekCompletions.set(weekKey, allCompleted);
        }
      }
      const sortedWeeks = [...weekCompletions.entries()]
        .filter(([, complete]) => complete)
        .map(([weekKey]) => weekKey)
        .sort();
      if (sortedWeeks.length === 0) return 0;
      let best = 1;
      let current = 1;
      for (let i = 1; i < sortedWeeks.length; i++) {
        const prev = new Date(sortedWeeks[i - 1] + 'T00:00:00');
        const curr = new Date(sortedWeeks[i] + 'T00:00:00');
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 7) {
          current++;
          best = Math.max(best, current);
        } else {
          current = 1;
        }
      }
      return best;
    }

    let best = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }

  function getWeeklyCompletionRate(habit: Habit): number {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const key = d.toISOString().split('T')[0];
      if (habit.completions[key]) count++;
      d.setDate(d.getDate() - 1);
    }
    return Math.round((count / 7) * 100);
  }

  function getWeeklyStreak(habit: Habit): number {
    const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
    let streak = 0;
    const d = new Date();
    const day = d.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diffToMonday);

    while (true) {
      let weekCompleted = true;
      let hasScheduledDay = false;
      for (let i = 0; i < 7; i++) {
        const check = new Date(d);
        check.setDate(check.getDate() + i);
        const dow = check.getDay();
        if (!scheduled.includes(dow)) continue;
        hasScheduledDay = true;
        const key = check.toISOString().split('T')[0];
        if (!habit.completions[key]) {
          weekCompleted = false;
          break;
        }
      }
      if (hasScheduledDay && weekCompleted) {
        streak++;
        d.setDate(d.getDate() - 7);
      } else {
        break;
      }
    }
    return streak;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Habits</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/habits/streaks"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Streaks
          </Link>
          <Link
            href="/habits/trends"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Trends &rarr;
          </Link>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder="New habit..."
            className="flex-1 bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addHabit}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-secondary">Frequency:</span>
          <button
            onClick={() => {
              setNewFrequency('daily');
              setNewScheduledDays([0, 1, 2, 3, 4, 5, 6]);
            }}
            className={`text-xs px-2 py-1 rounded ${
              newFrequency === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-surface text-fg-secondary'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => {
              setNewFrequency('weekly');
              setNewScheduledDays([new Date().getDay()]);
            }}
            className={`text-xs px-2 py-1 rounded ${
              newFrequency === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-surface text-fg-secondary'
            }`}
          >
            Weekly
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-secondary">Days:</span>
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleNewDay(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                newScheduledDays.includes(i)
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface text-fg-secondary hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showTemplates ? 'Hide templates' : 'Browse templates...'}
        </button>
      </div>

      {showTemplates && (
        <div className="mb-6 space-y-3">
          {templateAdded && (
            <div className="bg-green-500/20 text-green-400 text-sm px-3 py-2 rounded-lg text-center">
              Added &quot;{templateAdded}&quot;!
            </div>
          )}
          {TEMPLATE_GROUPS.map((group) => (
            <div key={group.label} className="bg-card border border-card-border rounded-xl p-3">
              <h3 className="text-sm font-medium mb-2">{group.icon} {group.label}</h3>
              <div className="flex flex-wrap gap-1.5">
                {group.templates.map((template) => {
                  const alreadyAdded = habits.some((h) => h.name === template.name);
                  return (
                    <button
                      key={template.name}
                      onClick={() => !alreadyAdded && addFromTemplate(template)}
                      disabled={alreadyAdded}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        alreadyAdded
                          ? 'bg-surface text-fg-muted border-card-border cursor-not-allowed'
                          : 'bg-surface text-fg-secondary border-card-border hover:border-blue-500 hover:text-blue-400'
                      }`}
                    >
                      {alreadyAdded ? '✓ ' : '+ '}{template.name}
                      {template.scheduledDays.length < 7 && (
                        <span className="text-fg-muted ml-1">
                          ({template.scheduledDays.sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join('')})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {habits.length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          No habits yet. Add one to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-card border border-card-border rounded-xl p-4"
            >
              {editingId === habit.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-fg-secondary">Frequency:</span>
                    <button
                      onClick={() => {
                        setEditFrequency('daily');
                        setEditScheduledDays([0, 1, 2, 3, 4, 5, 6]);
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        editFrequency === 'daily'
                          ? 'bg-blue-600 text-white'
                          : 'bg-surface text-fg-secondary'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => {
                        setEditFrequency('weekly');
                        setEditScheduledDays([new Date().getDay()]);
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        editFrequency === 'weekly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-surface text-fg-secondary'
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fg-secondary">Days:</span>
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => toggleEditDay(i)}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                          editScheduledDays.includes(i)
                            ? 'bg-blue-600 text-white'
                            : 'bg-surface text-fg-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fg-secondary">Color:</span>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full border-2 ${
                          editColor === c ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(habit.id)}
                      className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs bg-surface hover:bg-surface-hover px-3 py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCompletion(habit.id)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                      habit.completions[today]
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-input-border hover:border-fg-secondary'
                    }`}
                  >
                    {habit.completions[today] && '✓'}
                  </button>
                  <div className="flex-1">
                    <span
                      className={`font-medium ${
                        habit.completions[today] ? 'line-through text-fg-muted' : ''
                      }`}
                    >
                      {habit.name}
                    </span>
                    <span className="text-xs text-fg-muted ml-2">
                      {habit.scheduledDays && habit.scheduledDays.length < 7
                        ? habit.scheduledDays.sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join('/')
                        : ''}
                    </span>
                  </div>
                  <div className="text-xs text-fg-secondary text-right space-y-0.5">
                    {getStreak(habit) > 0 && (
                      <div>🔥 {getStreak(habit)}{habit.frequency === 'weekly' ? 'w' : 'd'}</div>
                    )}
                    {getBestStreak(habit) > 0 && (
                      <div className="text-fg-muted">Best: {getBestStreak(habit)}{habit.frequency === 'weekly' ? 'w' : 'd'}</div>
                    )}
                    {habit.frequency === 'daily' && (
                      <div className="text-fg-muted">7d: {getWeeklyCompletionRate(habit)}%</div>
                    )}
                  </div>
                  <HabitReminders habitId={habit.id} habitName={habit.name} />
                  <button
                    onClick={() => startEdit(habit)}
                    className="text-fg-muted hover:text-fg-secondary transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="text-fg-muted hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    🗑️
                  </button>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
