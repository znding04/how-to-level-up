'use client';

import { useState } from 'react';
import { loadData } from '@/lib/storage';
import { AppData } from '@/lib/types';

function getWeekRange(weeksAgo: number): { start: Date; end: Date; dates: string[] } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return { start: monday, end: sunday, dates };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ReviewPage() {
  const [data] = useState<AppData>(() => loadData());
  const [weeksAgo, setWeeksAgo] = useState(0);

  const week = getWeekRange(weeksAgo);
  const weekLabel =
    weeksAgo === 0
      ? 'This Week'
      : weeksAgo === 1
        ? 'Last Week'
        : `${weeksAgo} weeks ago`;

  // --- Habits ---
  const dailyHabits = data.habits.filter((h) => h.frequency === 'daily');
  const weeklyHabits = data.habits.filter((h) => h.frequency === 'weekly');

  const habitCompletions = dailyHabits.map((h) => {
    const done = week.dates.filter((d) => h.completions[d]).length;
    return { name: h.name, color: h.color, done, total: 7 };
  });

  const weeklyHabitCompletions = weeklyHabits.map((h) => {
    const done = week.dates.some((d) => h.completions[d]);
    return { name: h.name, color: h.color, done };
  });

  const totalPossible = dailyHabits.length * 7;
  const totalDone = habitCompletions.reduce((sum, h) => sum + h.done, 0);
  const habitRate = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  // Day-by-day habit completions
  const dayCompletions = week.dates.map((date) => {
    const completed = dailyHabits.filter((h) => h.completions[date]).length;
    return { date, completed, total: dailyHabits.length };
  });

  // --- Daily Logs ---
  const weekLogs = data.dailyLogs.filter((l) => week.dates.includes(l.date));
  const avgMood =
    weekLogs.length > 0
      ? (weekLogs.reduce((sum, l) => sum + l.mood, 0) / weekLogs.length).toFixed(1)
      : null;
  const avgEnergy =
    weekLogs.length > 0
      ? (weekLogs.reduce((sum, l) => sum + l.energy, 0) / weekLogs.length).toFixed(1)
      : null;

  const moodEmojis = ['', '😞', '😐', '🙂', '😊', '🤩'];
  const energyEmojis = ['', '🪫', '🔋', '⚡', '🔥', '💥'];

  // --- Skills ---
  const weekSkillMinutes = data.skills.map((s) => {
    const mins = s.sessions
      .filter((sess) => week.dates.includes(sess.date))
      .reduce((sum, sess) => sum + sess.durationMinutes, 0);
    return { name: s.name, color: s.color, minutes: mins };
  });
  const totalMinutes = weekSkillMinutes.reduce((sum, s) => sum + s.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const sessionCount = data.skills.reduce(
    (sum, s) => sum + s.sessions.filter((sess) => week.dates.includes(sess.date)).length,
    0
  );

  // --- Goals ---
  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const completedGoals = data.goals.filter((g) => g.status === 'completed');

  // Previous week for comparison
  const prevWeek = getWeekRange(weeksAgo + 1);
  const prevTotalDone = dailyHabits.reduce(
    (sum, h) => sum + prevWeek.dates.filter((d) => h.completions[d]).length,
    0
  );
  const prevRate = totalPossible > 0 ? Math.round((prevTotalDone / totalPossible) * 100) : 0;
  const rateDiff = habitRate - prevRate;

  const prevMinutes = data.skills.reduce(
    (sum, s) =>
      sum +
      s.sessions
        .filter((sess) => prevWeek.dates.includes(sess.date))
        .reduce((acc, sess) => acc + sess.durationMinutes, 0),
    0
  );
  const minutesDiff = totalMinutes - prevMinutes;

  return (
    <div className="space-y-4">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weekly Review</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeeksAgo(weeksAgo + 1)}
            className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors"
          >
            &larr;
          </button>
          <span className="text-sm text-fg-secondary min-w-[100px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={() => setWeeksAgo(Math.max(0, weeksAgo - 1))}
            disabled={weeksAgo === 0}
            className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors disabled:opacity-30"
          >
            &rarr;
          </button>
        </div>
      </div>

      <p className="text-sm text-fg-muted">
        {formatDate(week.start)} &ndash; {formatDate(week.end)}
      </p>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{habitRate}%</p>
          <p className="text-xs text-fg-secondary">Habit Rate</p>
          {totalPossible > 0 && (
            <p className={`text-xs mt-1 ${rateDiff > 0 ? 'text-green-400' : rateDiff < 0 ? 'text-red-400' : 'text-fg-muted'}`}>
              {rateDiff > 0 ? '+' : ''}{rateDiff}% vs prev
            </p>
          )}
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{totalHours}h</p>
          <p className="text-xs text-fg-secondary">Skills Practice</p>
          <p className={`text-xs mt-1 ${minutesDiff > 0 ? 'text-green-400' : minutesDiff < 0 ? 'text-red-400' : 'text-fg-muted'}`}>
            {minutesDiff > 0 ? '+' : ''}{(minutesDiff / 60).toFixed(1)}h vs prev
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          {avgMood ? (
            <>
              <p className="text-2xl font-bold">{moodEmojis[Math.round(Number(avgMood))]}</p>
              <p className="text-xs text-fg-secondary">Avg Mood {avgMood}/5</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">--</p>
              <p className="text-xs text-fg-muted">No check-ins</p>
            </>
          )}
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          {avgEnergy ? (
            <>
              <p className="text-2xl font-bold">{energyEmojis[Math.round(Number(avgEnergy))]}</p>
              <p className="text-xs text-fg-secondary">Avg Energy {avgEnergy}/5</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">--</p>
              <p className="text-xs text-fg-muted">No check-ins</p>
            </>
          )}
        </div>
      </div>

      {/* Daily Habit Breakdown */}
      {dailyHabits.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Daily Habits</h2>
          {/* Day-by-day bar */}
          <div className="flex gap-1 mb-4">
            {dayCompletions.map((day, i) => {
              const pct = day.total > 0 ? (day.completed / day.total) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 text-center">
                  <div className="h-16 bg-bar-track rounded relative overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-fg-muted mt-1">{dayLabels[i]}</p>
                </div>
              );
            })}
          </div>
          {/* Per-habit breakdown */}
          <div className="space-y-2">
            {habitCompletions.map((h) => (
              <div key={h.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="text-sm flex-1 truncate">{h.name}</span>
                <div className="w-24 bg-bar-track rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(h.done / h.total) * 100}%`,
                      backgroundColor: h.color,
                    }}
                  />
                </div>
                <span className="text-xs text-fg-muted w-8 text-right">{h.done}/7</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Habits */}
      {weeklyHabits.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Weekly Habits</h2>
          <div className="space-y-2">
            {weeklyHabitCompletions.map((h) => (
              <div key={h.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="text-sm flex-1 truncate">{h.name}</span>
                <span className={`text-xs ${h.done ? 'text-green-400' : 'text-fg-muted'}`}>
                  {h.done ? 'Done' : 'Not yet'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Breakdown */}
      {data.skills.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="font-semibold mb-1">Skills Practice</h2>
          <p className="text-xs text-fg-muted mb-3">{sessionCount} sessions this week</p>
          {weekSkillMinutes.filter((s) => s.minutes > 0).length === 0 ? (
            <p className="text-sm text-fg-muted">No practice logged this week</p>
          ) : (
            <div className="space-y-2">
              {weekSkillMinutes
                .filter((s) => s.minutes > 0)
                .sort((a, b) => b.minutes - a.minutes)
                .map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm flex-1 truncate">{s.name}</span>
                    <div className="w-24 bg-bar-track rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${totalMinutes > 0 ? (s.minutes / totalMinutes) * 100 : 0}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-fg-muted w-12 text-right">
                      {(s.minutes / 60).toFixed(1)}h
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Mood & Energy Timeline */}
      {weekLogs.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Mood & Energy</h2>
          <div className="space-y-1">
            {week.dates.map((date, i) => {
              const log = weekLogs.find((l) => l.date === date);
              return (
                <div key={date} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-fg-muted text-xs">{dayLabels[i]}</span>
                  {log ? (
                    <>
                      <span>{moodEmojis[log.mood]}</span>
                      <span>{energyEmojis[log.energy]}</span>
                      <span className="text-fg-muted text-xs truncate flex-1">
                        {log.notes || ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-fg-muted text-xs">--</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals Summary */}
      {(activeGoals.length > 0 || completedGoals.length > 0) && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Goals</h2>
          <div className="space-y-2">
            {activeGoals.map((g) => {
              const done = g.milestones.filter((m) => m.completed).length;
              const total = g.milestones.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{g.title}</span>
                    <span className="text-xs text-fg-muted ml-2">
                      {total > 0 ? `${done}/${total}` : 'No milestones'}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="w-full bg-bar-track rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {completedGoals.length > 0 && (
              <p className="text-xs text-fg-muted pt-1">
                {completedGoals.length} goal{completedGoals.length !== 1 ? 's' : ''} completed
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
