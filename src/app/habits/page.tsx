'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, generateId, todayString, loadProfileData } from '@/lib/storage';
import { Habit } from '@/lib/types';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).habits;
  });
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly'>('daily');
  const [editColor, setEditColor] = useState('#3b82f6');
  const today = todayString();

  function persist(updated: Habit[]) {
    setHabits(updated);
    const data = loadData();
    // Replace only habits for the active profile, keep other profiles' habits
    const otherHabits = data.habits.filter((h) => h.profileId !== data.activeProfileId);
    saveData({ ...data, habits: [...otherHabits, ...updated] });
  }

  function addHabit() {
    if (!newName.trim()) return;
    const data = loadData();
    const habit: Habit = {
      id: generateId(),
      profileId: data.activeProfileId,
      name: newName.trim(),
      frequency: 'daily',
      color: PRESET_COLORS[Math.floor(Math.random() * 5)],
      createdAt: today,
      completions: {},
    };
    persist([...habits, habit]);
    setNewName('');
  }

  function toggleCompletion(id: string) {
    const updated = habits.map((h) => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      completions[today] = !completions[today];
      return { ...h, completions };
    });
    persist(updated);
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditFrequency(habit.frequency);
    setEditColor(habit.color);
  }

  function saveEdit(id: string) {
    if (!editName.trim()) return;
    const updated = habits.map((h) => {
      if (h.id !== id) return h;
      return { ...h, name: editName.trim(), frequency: editFrequency, color: editColor };
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
      const weeks = new Set<string>();
      for (const date of dates) {
        const d = new Date(date + 'T00:00:00');
        const day = d.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diffToMonday);
        weeks.add(d.toISOString().split('T')[0]);
      }
      const sortedWeeks = [...weeks].sort();
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
    let streak = 0;
    const d = new Date();
    const day = d.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diffToMonday);

    while (true) {
      let weekCompleted = false;
      for (let i = 0; i < 7; i++) {
        const check = new Date(d);
        check.setDate(check.getDate() + i);
        const key = check.toISOString().split('T')[0];
        if (habit.completions[key]) {
          weekCompleted = true;
          break;
        }
      }
      if (weekCompleted) {
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
        <Link
          href="/habits/trends"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Trends &rarr;
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
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
                      onClick={() => setEditFrequency('daily')}
                      className={`text-xs px-2 py-1 rounded ${
                        editFrequency === 'daily'
                          ? 'bg-blue-600 text-white'
                          : 'bg-surface text-fg-secondary'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setEditFrequency('weekly')}
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
                      {habit.frequency === 'weekly' ? 'weekly' : ''}
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
