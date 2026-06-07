'use client';

import { useState, useCallback } from 'react';
import { loadData, loadProfileData, getWeekKey, loadWeeklyPlan, saveWeeklyPlan, todayString } from '@/lib/storage';
import { WeeklyPlan } from '@/lib/types';

function getWeekRange(weeksOffset: number): { start: Date; end: Date; dates: string[] } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday + weeksOffset * 7);
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

export default function WeeklyPlanningPage() {
  const [fullData] = useState(() => loadData());
  const profileId = fullData.activeProfileId;
  const data = { ...fullData, ...loadProfileData(fullData) };

  const [weeksOffset, setWeeksOffset] = useState(0);
  const week = getWeekRange(weeksOffset);
  const weekKey = getWeekKey(week.start);

  const [plan, setPlan] = useState<WeeklyPlan | null>(() =>
    loadWeeklyPlan(profileId, weekKey)
  );
  const [intention, setIntention] = useState(plan?.intention ?? '');
  const [priorities, setPriorities] = useState<string[]>(plan?.priorities ?? []);
  const [saved, setSaved] = useState(false);

  const weekLabel =
    weeksOffset === 0
      ? 'This Week'
      : weeksOffset === 1
        ? 'Next Week'
        : weeksOffset === -1
          ? 'Last Week'
          : weeksOffset > 0
            ? `${weeksOffset} weeks ahead`
            : `${Math.abs(weeksOffset)} weeks ago`;

  const navigateWeek = useCallback((newOffset: number) => {
    setWeeksOffset(newOffset);
    const newWeek = getWeekRange(newOffset);
    const newKey = getWeekKey(newWeek.start);
    const loaded = loadWeeklyPlan(profileId, newKey);
    setPlan(loaded);
    setIntention(loaded?.intention ?? '');
    setPriorities(loaded?.priorities ?? []);
    setSaved(false);
  }, [profileId]);

  const handleSave = () => {
    const now = new Date().toISOString();
    const updated: WeeklyPlan = {
      intention: intention.trim(),
      priorities: priorities.filter(p => p.trim()),
      createdAt: plan?.createdAt ?? now,
      updatedAt: now,
    };
    saveWeeklyPlan(profileId, weekKey, updated);
    setPlan(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addPriority = () => {
    if (priorities.length < 3) {
      setPriorities([...priorities, '']);
    }
  };

  const updatePriority = (index: number, value: string) => {
    const updated = [...priorities];
    updated[index] = value;
    setPriorities(updated);
  };

  const removePriority = (index: number) => {
    setPriorities(priorities.filter((_, i) => i !== index));
  };

  // Week overview: habits scheduled per day
  const dailyHabits = data.habits.filter(h => h.frequency === 'daily');
  const today = todayString();

  const dayOverview = week.dates.map((date, i) => {
    const dayOfWeek = (i + 1) % 7; // Mon=1...Sun=0
    const scheduledHabits = dailyHabits.filter(h => {
      if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
      return h.scheduledDays.includes(dayOfWeek);
    });
    const completedHabits = scheduledHabits.filter(h => h.completions[date]);
    const goalsdue = data.goals.filter(g => g.status === 'active' && g.targetDate === date);
    return {
      date,
      dayLabel: dayLabels[i],
      isToday: date === today,
      isPast: date < today,
      scheduledCount: scheduledHabits.length,
      completedCount: completedHabits.length,
      goalsDue: goalsdue.length,
    };
  });

  // Week stats
  const daysInWeek = week.dates;
  const daysLeft = daysInWeek.filter(d => d >= today).length;
  const totalScheduled = dayOverview.reduce((sum, d) => sum + d.scheduledCount, 0);
  const totalCompleted = dayOverview.reduce((sum, d) => sum + d.completedCount, 0);
  const habitRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const activeGoals = data.goals.filter(g => g.status === 'active');
  const totalMilestones = activeGoals.reduce((sum, g) => sum + g.milestones.length, 0);
  const completedMilestones = activeGoals.reduce((sum, g) => sum + g.milestones.filter(m => m.completed).length, 0);
  const goalProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weekly Plan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(weeksOffset - 1)}
            className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors"
          >
            &larr;
          </button>
          <button
            onClick={() => navigateWeek(0)}
            className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek(weeksOffset + 1)}
            className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {formatDate(week.start)} &ndash; {formatDate(week.end)}
        </p>
        <span className="text-sm text-fg-secondary">{weekLabel}</span>
      </div>

      {/* Quick week stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{daysLeft}</p>
          <p className="text-xs text-fg-secondary">Days Left</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{habitRate}%</p>
          <p className="text-xs text-fg-secondary">Habits</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{goalProgress}%</p>
          <p className="text-xs text-fg-secondary">Goals</p>
        </div>
      </div>

      {/* Intention form */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="font-semibold mb-2">This week I want to...</h2>
        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value.slice(0, 280))}
          placeholder="Set your intention for the week..."
          className="w-full bg-surface border border-card-border rounded-lg p-3 text-sm text-foreground placeholder:text-fg-muted resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          maxLength={280}
        />
        <p className="text-xs text-fg-muted text-right mt-1">{intention.length}/280</p>
      </div>

      {/* Priorities */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Top Priorities</h2>
          {priorities.length < 3 && (
            <button
              onClick={addPriority}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              + Add
            </button>
          )}
        </div>
        {priorities.length === 0 ? (
          <button
            onClick={addPriority}
            className="w-full text-center py-3 text-sm text-fg-muted hover:text-fg-secondary transition-colors"
          >
            + Add your first priority
          </button>
        ) : (
          <div className="space-y-2">
            {priorities.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-fg-muted text-sm w-5">{i + 1}.</span>
                <input
                  type="text"
                  value={p}
                  onChange={(e) => updatePriority(i, e.target.value)}
                  placeholder={`Priority ${i + 1}`}
                  className="flex-1 bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removePriority(i)}
                  className="text-fg-muted hover:text-red-400 text-sm transition-colors px-1"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors"
      >
        {saved ? '✓ Saved!' : plan ? 'Update Plan' : 'Save Plan'}
      </button>

      {/* Week overview */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Week Overview</h2>
        <div className="grid grid-cols-7 gap-1">
          {dayOverview.map((day) => (
            <div
              key={day.date}
              className={`text-center rounded-lg p-2 ${
                day.isToday
                  ? 'ring-2 ring-blue-500 bg-surface'
                  : day.isPast
                    ? 'bg-surface opacity-60'
                    : 'bg-surface'
              }`}
            >
              <p className="text-xs font-medium text-fg-secondary">{day.dayLabel}</p>
              <p className={`text-xs mt-1 ${day.isToday ? 'text-blue-400 font-bold' : 'text-fg-muted'}`}>
                {new Date(day.date + 'T12:00:00').getDate()}
              </p>
              {day.scheduledCount > 0 && (
                <div className="mt-1">
                  <div className="w-full bg-bar-track rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${day.scheduledCount > 0 ? (day.completedCount / day.scheduledCount) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-fg-muted mt-0.5">
                    {day.completedCount}/{day.scheduledCount}
                  </p>
                </div>
              )}
              {day.goalsDue > 0 && (
                <p className="text-[10px] text-orange-400 mt-0.5">
                  {day.goalsDue} goal{day.goalsDue > 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active goals this week */}
      {activeGoals.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Active Goals</h2>
          <div className="space-y-2">
            {activeGoals.map((g) => {
              const done = g.milestones.filter(m => m.completed).length;
              const total = g.milestones.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isDueThisWeek = week.dates.includes(g.targetDate);
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{g.title}</span>
                    <span className="text-xs text-fg-muted ml-2">
                      {total > 0 ? `${done}/${total}` : 'No milestones'}
                      {isDueThisWeek && <span className="text-orange-400 ml-1">Due this week</span>}
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
          </div>
        </div>
      )}
    </div>
  );
}
