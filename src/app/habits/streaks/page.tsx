'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData, loadProfileData, todayString, loadHabitNotes } from '@/lib/storage';
import { Habit } from '@/lib/types';

function getStreak(habit: Habit): number {
  const skipped = new Set(habit.skippedDates ?? []);
  if (habit.frequency === 'weekly') {
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
        if (habit.completions[key] || skipped.has(key)) {
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

  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (habit.completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (skipped.has(key)) {
      // Skipped days don't break the streak
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getBestStreak(habit: Habit): number {
  const completionDates = Object.keys(habit.completions).filter((k) => habit.completions[k]).sort();
  const skippedSet = new Set(habit.skippedDates ?? []);
  const allActiveDates = new Set([...completionDates, ...(habit.skippedDates ?? [])]);
  const sortedAll = [...allActiveDates].sort();
  if (completionDates.length === 0 && sortedAll.length === 0) return 0;

  if (habit.frequency === 'weekly') {
    const weeks = new Set<string>();
    for (const date of sortedAll) {
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

  if (sortedAll.length === 0) return 0;
  let best = 0;
  let current = 0;
  let prevDate: Date | null = null;
  for (const dateStr of sortedAll) {
    const curr = new Date(dateStr + 'T00:00:00');
    if (prevDate) {
      const diff = (curr.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
      } else {
        current = skippedSet.has(dateStr) ? 0 : 1;
      }
    } else {
      current = skippedSet.has(dateStr) ? 0 : 1;
    }
    best = Math.max(best, current);
    prevDate = curr;
  }
  return best;
}

function getLast30Days(habit: Habit): { completed: boolean; skipped: boolean; dateKey: string }[] {
  const result: { completed: boolean; skipped: boolean; dateKey: string }[] = [];
  const skippedSet = new Set(habit.skippedDates ?? []);
  const d = new Date();
  for (let i = 29; i >= 0; i--) {
    const check = new Date(d);
    check.setDate(d.getDate() - i);
    const key = check.toISOString().split('T')[0];
    result.push({ completed: !!habit.completions[key], skipped: skippedSet.has(key), dateKey: key });
  }
  return result;
}

function getStreakStatus(habit: Habit): 'active' | 'at-risk' | 'broken' {
  const today = todayString();
  const skippedSet = new Set(habit.skippedDates ?? []);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (habit.completions[today] || skippedSet.has(today)) return 'active';
  if (habit.completions[yesterdayStr] || skippedSet.has(yesterdayStr)) return 'at-risk';
  return 'broken';
}

function getStreakBadge(streak: number): string {
  if (streak >= 90) return '👑';
  if (streak >= 60) return '⭐';
  if (streak >= 30) return '💪';
  if (streak >= 14) return '🔥🔥';
  if (streak >= 7) return '🔥';
  return '';
}

export default function HabitStreaksPage() {
  const [habits] = useState<Habit[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).habits;
  });
  const [allNotes] = useState<Record<string, Record<string, string>>>(() => {
    if (typeof window === 'undefined') return {};
    return loadHabitNotes();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Habit Streaks</h1>
        <Link
          href="/habits"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          &larr; Habits
        </Link>
      </div>

      {habits.length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          No habits yet. <Link href="/habits" className="text-blue-400 underline">Add some habits</Link> to see streaks!
        </p>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => {
            const streak = getStreak(habit);
            const best = getBestStreak(habit);
            const last30 = getLast30Days(habit);
            const status = getStreakStatus(habit);
            const badge = getStreakBadge(streak);
            const statusColor =
              status === 'active'
                ? 'text-green-400'
                : status === 'at-risk'
                  ? 'text-orange-400'
                  : 'text-fg-muted';
            const statusBorder =
              status === 'active'
                ? 'border-green-500/30'
                : status === 'at-risk'
                  ? 'border-orange-500/30'
                  : 'border-card-border';

            return (
              <div
                key={habit.id}
                className={`bg-card border ${statusBorder} rounded-xl p-4`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="font-medium">{habit.name}</span>
                    {badge && <span className="text-lg">{badge}</span>}
                  </div>
                  <span className={`text-xs font-medium uppercase ${statusColor}`}>
                    {status === 'active' ? 'Active' : status === 'at-risk' ? 'At Risk' : 'Broken'}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mb-3">
                  <div>
                    <p className={`text-2xl font-bold ${statusColor}`}>{streak}</p>
                    <p className="text-xs text-fg-muted">Current{habit.frequency === 'weekly' ? ' (weeks)' : ''}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-fg-secondary">{best}</p>
                    <p className="text-xs text-fg-muted">Best{habit.frequency === 'weekly' ? ' (weeks)' : ''}</p>
                  </div>
                </div>

                {/* 30-day sparkline bar chart */}
                <div>
                  <p className="text-xs text-fg-muted mb-1.5">Last 30 days</p>
                  <div className="flex gap-px items-end h-6">
                    {last30.map((day, i) => {
                      const note = allNotes[habit.id]?.[day.dateKey];
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm relative group"
                          style={{
                            height: day.completed ? '100%' : day.skipped ? '60%' : '20%',
                            backgroundColor: day.completed
                              ? status === 'active'
                                ? '#22c55e'
                                : status === 'at-risk'
                                  ? '#f97316'
                                  : '#6b7280'
                              : day.skipped
                                ? '#6b7280'
                                : 'var(--bar-track)',
                          }}
                          title={day.skipped ? `${day.dateKey}: skipped` : note ? `${day.dateKey}: ${note}` : day.dateKey}
                        >
                          {note && (
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-fg-muted">30d ago</span>
                    <span className="text-[10px] text-fg-muted">Today</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Milestone Legend */}
      {habits.length > 0 && (
        <div className="mt-6 bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-fg-secondary mb-2">Streak Milestones</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-fg-muted">
            <span>🔥 7 days</span>
            <span>🔥🔥 14 days</span>
            <span>💪 30 days</span>
            <span>⭐ 60 days</span>
            <span>👑 90 days</span>
          </div>
        </div>
      )}
    </div>
  );
}
