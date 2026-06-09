'use client';

import { useState } from 'react';
import { loadData, loadProfileData, loadFocusSessions } from '@/lib/storage';
import { AppData, Habit, Achievement, FocusSession } from '@/lib/types';

function getWeekDates(weeksAgo: number): string[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToSun = day; // days since Sunday
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - diffToSun - weeksAgo * 7);
  sunday.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getHabitCompletionRate(habit: Habit, dates: string[]): number {
  const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
  const scheduledDates = dates.filter((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return scheduled.includes(d.getDay());
  });
  if (scheduledDates.length === 0) return 0;
  const completions = scheduledDates.filter((d) => habit.completions[d]).length;
  return completions / scheduledDates.length;
}

export default function InsightsPage() {
  const [fullData] = useState<AppData>(() => loadData());
  const profileData = loadProfileData(fullData);

  const [focusSessions] = useState<FocusSession[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadFocusSessions();
  });

  const thisWeekDates = getWeekDates(0);
  const lastWeekDates = getWeekDates(1);

  // 1. Habit Leaderboard — daily habits ranked by completion rate
  const dailyHabits = profileData.habits.filter((h) => h.frequency === 'daily');
  const habitRanking = dailyHabits
    .map((h) => ({
      name: h.name,
      color: h.color,
      rate: getHabitCompletionRate(h, thisWeekDates),
    }))
    .sort((a, b) => b.rate - a.rate);
  const top3 = habitRanking.slice(0, 3);

  // 2. Most Consistent Habit
  const mostConsistent = habitRanking.length > 0 ? habitRanking[0] : null;
  function getConsistencyLabel(rate: number): string {
    if (rate >= 0.8) return 'On Fire 🔥';
    if (rate >= 0.6) return 'Steady ⚡';
    return 'Building 🏗️';
  }

  // 3. Skill of the Week
  const skillMinutes = profileData.skills.map((s) => {
    const mins = s.sessions
      .filter((sess) => thisWeekDates.includes(sess.date))
      .reduce((sum, sess) => sum + sess.durationMinutes, 0);
    return { name: s.name, color: s.color, minutes: mins };
  });
  const topSkill = skillMinutes.sort((a, b) => b.minutes - a.minutes)[0];

  // 4. Mood Snapshot
  const weekLogs = profileData.dailyLogs.filter((l) => thisWeekDates.includes(l.date));
  const moodEmojis = ['', '😞', '😕', '😐', '🙂', '😄'];
  const avgMood = weekLogs.length > 0
    ? weekLogs.reduce((sum, l) => sum + l.mood, 0) / weekLogs.length
    : null;

  // 5. Energy Snapshot
  const energyEmojis = ['', '🪫', '😴', '😐', '⚡', '🔥'];
  const avgEnergy = weekLogs.length > 0
    ? weekLogs.reduce((sum, l) => sum + l.energy, 0) / weekLogs.length
    : null;

  // 6. Achievements Unlocked This Week
  const profileAchievements: Achievement[] =
    (fullData.achievements && fullData.achievements[fullData.activeProfileId]) || [];
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const recentAchievements = profileAchievements.filter((a) => {
    if (!a.unlockedAt) return false;
    const unlocked = new Date(a.unlockedAt);
    return unlocked >= sevenDaysAgo && unlocked <= now;
  });

  function daysAgo(dateStr: string): number {
    const d = new Date(dateStr);
    const diff = now.getTime() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // 7. Goal Milestones This Week
  // We don't have milestone completion dates in the data model,
  // so we show goals with completed milestones that are active this week
  const goalsWithCompletedMilestones = profileData.goals.filter(
    (g) => g.milestones.some((m) => m.completed)
  );

  // 8. Week-Over-Week Comparison
  const thisWeekRate = dailyHabits.length > 0
    ? dailyHabits.reduce((sum, h) => sum + getHabitCompletionRate(h, thisWeekDates), 0) / dailyHabits.length
    : 0;
  const lastWeekRate = dailyHabits.length > 0
    ? dailyHabits.reduce((sum, h) => sum + getHabitCompletionRate(h, lastWeekDates), 0) / dailyHabits.length
    : 0;
  const deltaRate = Math.round((thisWeekRate - lastWeekRate) * 100);

  // Focus Quality
  const weekStart = new Date(thisWeekDates[0] + 'T00:00:00');
  const weekEnd = new Date(thisWeekDates[6] + 'T23:59:59');
  const weekFocusSessions = focusSessions.filter((fs) => {
    const d = new Date(fs.date);
    return d >= weekStart && d <= weekEnd;
  });
  const ratedWeekSessions = weekFocusSessions.filter((fs) => fs.rating);
  const avgFocusRating = ratedWeekSessions.length > 0
    ? ratedWeekSessions.reduce((sum, fs) => sum + (fs.rating ?? 0), 0) / ratedWeekSessions.length
    : null;
  const bestRatedSession = ratedWeekSessions.length > 0
    ? ratedWeekSessions.reduce((best, fs) => (fs.rating ?? 0) > (best.rating ?? 0) ? fs : best, ratedWeekSessions[0])
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Weekly Insights</h1>
      <p className="text-sm text-fg-muted">
        {thisWeekDates[0]} &ndash; {thisWeekDates[6]}
      </p>

      {/* Week-Over-Week Comparison */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Week-Over-Week</h2>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{Math.round(thisWeekRate * 100)}%</p>
            <p className="text-xs text-fg-secondary">This week</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-fg-muted">{Math.round(lastWeekRate * 100)}%</p>
            <p className="text-xs text-fg-secondary">Last week</p>
          </div>
          <div className="text-center">
            <p className={`text-xl font-bold ${deltaRate > 0 ? 'text-green-400' : deltaRate < 0 ? 'text-red-400' : 'text-fg-muted'}`}>
              {deltaRate > 0 ? '+' : ''}{deltaRate}%
            </p>
            <p className="text-xs text-fg-secondary">Delta</p>
          </div>
        </div>
      </div>

      {/* Habit Leaderboard */}
      {top3.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Habit Leaderboard</h2>
          <div className="space-y-3">
            {top3.map((h, i) => (
              <div key={h.name} className="flex items-center gap-3">
                <span className="text-lg font-bold text-fg-muted w-6">{i + 1}</span>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="text-sm flex-1 truncate">{h.name}</span>
                <div className="w-24 bg-bar-track rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.round(h.rate * 100)}%`, backgroundColor: h.color }}
                  />
                </div>
                <span className="text-xs text-fg-secondary w-10 text-right">{Math.round(h.rate * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Consistent Habit */}
      {mostConsistent && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">Most Consistent Habit</h2>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mostConsistent.color }} />
            <span className="font-medium">{mostConsistent.name}</span>
            <span className="text-sm">{getConsistencyLabel(mostConsistent.rate)}</span>
            <span className="text-xs text-fg-secondary ml-auto">{Math.round(mostConsistent.rate * 100)}%</span>
          </div>
        </div>
      )}

      {/* Skill of the Week */}
      {topSkill && topSkill.minutes > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">Skill of the Week</h2>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: topSkill.color }} />
            <span className="font-medium">{topSkill.name}</span>
            <span className="text-sm text-fg-secondary ml-auto">
              {topSkill.minutes >= 60
                ? `${(topSkill.minutes / 60).toFixed(1)}h`
                : `${topSkill.minutes}m`}
            </span>
          </div>
        </div>
      )}

      {/* Focus Quality */}
      {weekFocusSessions.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Focus Quality</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-secondary">Sessions this week</span>
              <span className="text-sm font-medium">{weekFocusSessions.length}</span>
            </div>
            {avgFocusRating !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-secondary">Avg rating</span>
                <span className="text-sm font-medium">
                  <span className="text-amber-400">
                    {'\u2605'.repeat(Math.round(avgFocusRating))}
                    <span className="text-gray-600">{'\u2606'.repeat(5 - Math.round(avgFocusRating))}</span>
                  </span>
                  <span className="ml-1 text-fg-muted text-xs">{avgFocusRating.toFixed(1)}</span>
                </span>
              </div>
            )}
            {bestRatedSession && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-secondary">Best session</span>
                <span className="text-sm font-medium">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: bestRatedSession.skillColor }}
                  />
                  {bestRatedSession.skillName}
                  <span className="ml-1 text-amber-400">{'\u2605'.repeat(bestRatedSession.rating ?? 0)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mood & Energy Snapshots */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Mood</h2>
          {avgMood !== null ? (
            <>
              <p className="text-3xl">{moodEmojis[Math.round(avgMood)]}</p>
              <p className="text-sm text-fg-secondary mt-1">{avgMood.toFixed(1)} / 5</p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">No check-ins</p>
          )}
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 text-center">
          <h2 className="text-lg font-semibold mb-2">Energy</h2>
          {avgEnergy !== null ? (
            <>
              <p className="text-3xl">{energyEmojis[Math.round(avgEnergy)]}</p>
              <p className="text-sm text-fg-secondary mt-1">{avgEnergy.toFixed(1)} / 5</p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">No check-ins</p>
          )}
        </div>
      </div>

      {/* Achievements Unlocked This Week */}
      {recentAchievements.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Achievements Unlocked</h2>
          <div className="space-y-2">
            {recentAchievements.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xl">{a.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-fg-muted">
                    unlocked {daysAgo(a.unlockedAt!)} day{daysAgo(a.unlockedAt!) !== 1 ? 's' : ''} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals with Completed Milestones */}
      {goalsWithCompletedMilestones.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Goals Milestone Progress</h2>
          <div className="space-y-2">
            {goalsWithCompletedMilestones.map((g) => {
              const done = g.milestones.filter((m) => m.completed).length;
              const total = g.milestones.length;
              return (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-sm flex-1 truncate">{g.title}</span>
                  <span className="text-xs text-fg-secondary">{done}/{total} milestones</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {dailyHabits.length === 0 && profileData.skills.length === 0 && weekLogs.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
          <p className="text-fg-muted">Start tracking habits, skills, and daily check-ins to see your weekly insights here.</p>
        </div>
      )}
    </div>
  );
}
