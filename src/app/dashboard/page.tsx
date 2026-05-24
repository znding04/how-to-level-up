'use client';

import { useState } from 'react';
import { loadData, saveData, loadProfileData, todayString, generateId } from '@/lib/storage';
import { AppData } from '@/lib/types';
import { runAchievementCheck } from '@/lib/useAchievementCheck';
import Link from 'next/link';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Night owl? 🦉';
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 18) return 'Good afternoon 💪';
  return 'Good evening 🌙';
}

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function DashboardPage() {
  const [data, setData] = useState<AppData>(() => {
    const d = loadData();
    return runAchievementCheck(d);
  });
  const initialLog = (() => {
    const pd = loadProfileData(data);
    return pd.dailyLogs.find((l) => l.date === todayString());
  })();
  const [quickMood, setQuickMood] = useState<1 | 2 | 3 | 4 | 5 | null>(initialLog?.mood ?? null);
  const [quickEnergy, setQuickEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(initialLog?.energy ?? null);
  const [quickNotes, setQuickNotes] = useState(initialLog?.notes || '');
  const [logSuccess, setLogSuccess] = useState(false);

  const today = todayString();
  const profileData = loadProfileData(data);
  const activeProfile = data.profiles.find((p) => p.id === data.activeProfileId);

  // Habits summary — only habits scheduled for today
  const todayDow = new Date().getDay();
  const todaysHabits = profileData.habits.filter((h) => {
    const days = h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
    return days.includes(todayDow);
  });
  const totalHabits = todaysHabits.length;
  const completedToday = todaysHabits.filter((h) => h.completions[today]).length;
  const uncheckedHabits = todaysHabits.filter((h) => !h.completions[today]);

  // Daily check-in
  const todayLog = profileData.dailyLogs.find((l) => l.date === today);

  // Goals progress
  const activeGoals = profileData.goals.filter((g) => g.status === 'active');
  const allMilestones = activeGoals.flatMap((g) => g.milestones);
  const completedMilestones = allMilestones.filter((m) => m.completed).length;
  const goalPercent =
    allMilestones.length > 0
      ? Math.round((completedMilestones / allMilestones.length) * 100)
      : 0;

  // Skills - hours this week
  const weekDates = getWeekDates();
  const weekMinutes = profileData.skills.reduce((sum, skill) => {
    return (
      sum +
      skill.sessions
        .filter((s) => weekDates.includes(s.date))
        .reduce((m, s) => m + s.durationMinutes, 0)
    );
  }, 0);
  const weekHours = (weekMinutes / 60).toFixed(1);

  // Streak - consecutive days with at least one habit completed
  let streak = 0;
  if (totalHabits > 0) {
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      const anyCompleted = profileData.habits.some((h) => h.completions[dateStr]);
      if (!anyCompleted) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }

  // Daily habits for quick actions — only habits scheduled for today
  const dailyHabits = todaysHabits;


  function handleToggleHabit(habitId: string) {
    const updated = { ...data };
    const habit = updated.habits.find((h) => h.id === habitId);
    if (!habit) return;
    if (habit.completions[today]) {
      delete habit.completions[today];
    } else {
      habit.completions[today] = true;
    }
    saveData(updated);
    setData(runAchievementCheck({ ...updated }));
  }

  function handleQuickLog() {
    if (!quickMood || !quickEnergy) return;
    const updated = { ...data };
    const existingIndex = updated.dailyLogs.findIndex(
      (l) => l.date === today && l.profileId === data.activeProfileId
    );
    const log = {
      id: existingIndex >= 0 ? updated.dailyLogs[existingIndex].id : generateId(),
      profileId: data.activeProfileId,
      date: today,
      mood: quickMood,
      energy: quickEnergy,
      notes: quickNotes,
    };
    if (existingIndex >= 0) {
      updated.dailyLogs[existingIndex] = log;
    } else {
      updated.dailyLogs.push(log);
    }
    saveData(updated);
    setData(runAchievementCheck({ ...updated }));
    setLogSuccess(true);
    setTimeout(() => setLogSuccess(false), 2000);
  }

  const moodEmojis = ['', '😞', '😐', '🙂', '😊', '🤩'];
  const energyEmojis = ['', '🪫', '🔋', '⚡', '🔥', '💥'];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}</h1>
        <p className="text-fg-secondary text-sm">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
          {activeProfile && data.profiles.length > 1 && (
            <span className="ml-2 text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">
              {activeProfile.name}
            </span>
          )}
        </p>
      </div>

      {/* Streak / Motivation */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold">🔥 {streak} day streak</p>
          <p className="text-fg-secondary text-sm mt-1">
            {streak >= 7
              ? "You're on fire! Keep it going!"
              : streak >= 3
                ? 'Building momentum — nice work!'
                : 'Great start, keep showing up!'}
          </p>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="bg-card border border-card-border rounded-2xl p-4 space-y-4">
        <h2 className="font-semibold text-lg">⚡ Quick Actions</h2>

        {/* Today's Habits Checklist */}
        <div>
          <h3 className="text-sm font-medium text-fg-secondary mb-2">Today&apos;s Daily Habits</h3>
          {dailyHabits.length === 0 ? (
            <p className="text-fg-muted text-sm">No daily habits yet — <Link href="/habits" className="text-blue-400 underline">add one</Link></p>
          ) : dailyHabits.every((h) => h.completions[today]) ? (
            <p className="text-green-400 text-sm font-medium">All done for today! 🔥</p>
          ) : null}
          {dailyHabits.length > 0 && (
            <div className="space-y-2">
              {dailyHabits.map((h) => (
                <label key={h.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!h.completions[today]}
                    onChange={() => handleToggleHabit(h.id)}
                    className="w-5 h-5 rounded border-2 border-gray-500 accent-blue-500 cursor-pointer"
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className={`text-sm ${h.completions[today] ? 'line-through text-fg-muted' : 'text-foreground'}`}>
                    {h.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Quick Daily Check-in */}
        <div>
          <h3 className="text-sm font-medium text-fg-secondary mb-3">Quick Check-in</h3>
          <div className="space-y-3">
            {/* Mood */}
            <div role="group" aria-labelledby="mood-label">
              <label id="mood-label" className="text-xs text-fg-muted block mb-1">Mood</label>
              <div className="flex gap-2" role="radiogroup" aria-label="Mood selection">
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setQuickMood(v)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const next = (v < 5 ? v + 1 : 1) as 1 | 2 | 3 | 4 | 5;
                        setQuickMood(next);
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prev = (v > 1 ? v - 1 : 5) as 1 | 2 | 3 | 4 | 5;
                        setQuickMood(prev);
                      }
                    }}
                    aria-label={`Mood ${v} of 5 - ${['very sad', 'sad', 'neutral', 'happy', 'very happy'][v - 1]}`}
                    aria-checked={quickMood === v}
                    role="radio"
                    className={`text-2xl p-1 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      quickMood === v
                        ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                        : 'hover:bg-surface-hover'
                    }`}
                  >
                    {['😞', '😕', '😐', '🙂', '😄'][v - 1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div role="group" aria-labelledby="energy-label">
              <label id="energy-label" className="text-xs text-fg-muted block mb-1">Energy</label>
              <div className="flex gap-2" role="radiogroup" aria-label="Energy selection">
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setQuickEnergy(v)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const next = (v < 5 ? v + 1 : 1) as 1 | 2 | 3 | 4 | 5;
                        setQuickEnergy(next);
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prev = (v > 1 ? v - 1 : 5) as 1 | 2 | 3 | 4 | 5;
                        setQuickEnergy(prev);
                      }
                    }}
                    aria-label={`Energy ${v} of 5 - ${['exhausted', 'tired', 'moderate', 'energized', 'fully charged'][v - 1]}`}
                    aria-checked={quickEnergy === v}
                    role="radio"
                    className={`text-2xl p-1 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      quickEnergy === v
                        ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                        : 'hover:bg-surface-hover'
                    }`}
                  >
                    {['🪫', '😴', '😐', '⚡', '🔥'][v - 1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <textarea
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="How's your day going?"
              rows={2}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />

            {/* Submit */}
            <button
              onClick={handleQuickLog}
              disabled={!quickMood || !quickEnergy}
              className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                logSuccess
                  ? 'bg-green-500 text-white'
                  : !quickMood || !quickEnergy
                    ? 'bg-surface-dim text-fg-muted cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {logSuccess ? '✓ Saved!' : todayLog ? 'Update' : 'Log Day'}
            </button>
          </div>
        </div>
      </div>

      {/* Habits Summary */}
      <Link href="/habits" className="block">
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              🔄 Habits
            </h2>
            <span className="text-sm text-fg-secondary">
              {completedToday}/{totalHabits} done
            </span>
          </div>
          {totalHabits === 0 ? (
            <p className="text-fg-muted text-sm">No habits yet — add one!</p>
          ) : completedToday === totalHabits ? (
            <p className="text-green-400 text-sm">✅ All done for today!</p>
          ) : (
            <div className="space-y-1">
              {uncheckedHabits.slice(0, 3).map((h) => (
                <p key={h.id} className="text-sm text-fg-secondary">
                  ○ {h.name}
                </p>
              ))}
              {uncheckedHabits.length > 3 && (
                <p className="text-xs text-fg-muted">
                  +{uncheckedHabits.length - 3} more
                </p>
              )}
            </div>
          )}
          {totalHabits > 0 && (
            <div className="mt-3 w-full bg-bar-track rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(completedToday / totalHabits) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* Daily Check-in */}
      <Link href="/daily" className="block">
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            📝 Daily Check-in
          </h2>
          {todayLog ? (
            <div className="flex items-center gap-4 text-sm">
              <span>
                Mood: {moodEmojis[todayLog.mood]} {todayLog.mood}/5
              </span>
              <span>
                Energy: {energyEmojis[todayLog.energy]} {todayLog.energy}/5
              </span>
            </div>
          ) : (
            <p className="text-fg-muted text-sm">
              Haven&apos;t checked in yet — tap to log today
            </p>
          )}
        </div>
      </Link>

      {/* Goals Progress */}
      <Link href="/goals" className="block">
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              🎯 Goals
            </h2>
            <span className="text-sm text-fg-secondary">
              {activeGoals.length} active
            </span>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-fg-muted text-sm">No active goals — set one!</p>
          ) : (
            <>
              <p className="text-sm text-fg-secondary">
                {completedMilestones}/{allMilestones.length} milestones done
              </p>
              <div className="mt-2 w-full bg-bar-track rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
              <p className="text-right text-xs text-fg-muted mt-1">
                {goalPercent}%
              </p>
            </>
          )}
        </div>
      </Link>

      {/* Skills Practice */}
      <Link href="/skills" className="block">
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            ⚡ Skills Practice
          </h2>
          <p className="text-2xl font-bold">
            {weekHours}
            <span className="text-sm font-normal text-fg-secondary ml-1">
              hrs this week
            </span>
          </p>
          {profileData.skills.length === 0 && (
            <p className="text-fg-muted text-sm mt-1">
              No skills tracked yet — start one!
            </p>
          )}
        </div>
      </Link>

    </div>
  );
}
