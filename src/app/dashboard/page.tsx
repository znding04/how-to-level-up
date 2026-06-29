'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadData, saveData, loadProfileData, todayString, generateId, needsOnboarding, skipHabit, unskipHabit, getActiveChallenges, getChallengeCompletionRate, loadYearlyVision, getCurrentYear, loadSleepEntry, loadQuickNotes, loadAllBodyMetricEntries, loadWaterEntry, getWaterGoal, addWaterEntry, loadBooks, getCalorieGoal, loadNutritionEntry } from '@/lib/storage';
import { AppData } from '@/lib/types';
import { runAchievementCheck } from '@/lib/useAchievementCheck';
import { getAllAchievementsWithStatus, ACHIEVEMENT_DEFS } from '@/lib/achievements';
import { recordHabitCompletion } from '@/lib/reminders';
import IntentionSetter from '@/components/IntentionSetter';
import Link from 'next/link';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Night owl? 🦉';
  if (hour < 12) return 'Good morning ☀️';
  if (hour < 18) return 'Good afternoon 💪';
  return 'Good evening 🌙';
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
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
  const router = useRouter();
  const [data, setData] = useState<AppData>(() => {
    const d = loadData();
    return runAchievementCheck(d);
  });

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (needsOnboarding(data, data.activeProfileId)) {
      router.replace('/onboarding');
    }
  }, [data, router]);
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
  const uncheckedHabits = todaysHabits.filter((h) => !h.completions[today] && !h.skippedDates?.includes(today));

  // Daily check-in
  const todayLog = profileData.dailyLogs.find((l) => l.date === today);

  // Sleep entry
  const todaySleep = (() => {
    const d = loadData();
    return loadSleepEntry(today, d.activeProfileId);
  })();

  // Body metrics entry
  const allBodyMetrics = (() => {
    const d = loadData();
    return loadAllBodyMetricEntries(d.activeProfileId);
  })();
  const currentWeight = allBodyMetrics[0]?.weight;
  const firstWeight = allBodyMetrics[allBodyMetrics.length - 1]?.weight;
  const weightChange = currentWeight != null && firstWeight != null && allBodyMetrics.length > 1
    ? +(currentWeight - firstWeight).toFixed(1)
    : null;

  // Water intake
  const waterGoal = getWaterGoal();
  const [todayWater, setTodayWater] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const d = loadData();
    const entry = loadWaterEntry(today, d.activeProfileId);
    return entry?.amountMl ?? 0;
  });
  const waterPercent = Math.min(100, Math.round((todayWater / waterGoal) * 100));

  function handleWaterAdd(ml: number) {
    const d = loadData();
    addWaterEntry(d.activeProfileId, today, ml);
    setTodayWater(prev => prev + ml);
  }

  // Nutrition / Calories
  const calorieGoal = getCalorieGoal();
  const todayNutrition = (() => {
    if (typeof window === 'undefined') return null;
    const d = loadData();
    return loadNutritionEntry(today, d.activeProfileId);
  })();
  const todayCalories = todayNutrition?.totalCalories ?? 0;
  const caloriePercent = calorieGoal > 0 ? Math.min(100, Math.round((todayCalories / calorieGoal) * 100)) : 0;

  // Goals progress
  const activeGoals = profileData.goals.filter((g) => g.status === 'active');
  const allMilestones = activeGoals.flatMap((g) => g.milestones);
  const completedMilestones = allMilestones.filter((m) => m.completed).length;
  const goalPercent =
    allMilestones.length > 0
      ? Math.round((completedMilestones / allMilestones.length) * 100)
      : 0;

  // Yearly Vision
  const currentYear = getCurrentYear();
  const yearlyVision = loadYearlyVision(data.activeProfileId, currentYear);
  const visionWord = yearlyVision?.yearWord;
  const visionStatements = yearlyVision?.identityStatements ?? [];
  const visionGoals = yearlyVision?.annualGoals ?? [];
  const visionGoalMilestones = visionGoals.reduce((acc, g) => acc + g.milestones.length, 0);
  const visionCompletedMilestones = visionGoals.reduce((acc, g) => acc + g.milestones.filter(m => m.completed).length, 0);

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

  // Active challenges
  const activeChallenges = getActiveChallenges();

  // Books
  const allBooks = loadBooks(data.activeProfileId);
  const currentlyReading = allBooks.filter(b => b.status === 'reading');
  const completedThisYear = allBooks.filter(b => b.status === 'completed' && b.completedDate?.startsWith(String(new Date().getFullYear())));
  const readingBook = currentlyReading[0];

  // Quick notes - most recent 3
  const quickNotesList = loadQuickNotes(data.activeProfileId).slice(0, 3);

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

  // Achievements
  const allAchievements = getAllAchievementsWithStatus(data, data.activeProfileId);
  const unlockedAchievements = allAchievements.filter((a) => a.unlockedAt);
  const totalAchievements = ACHIEVEMENT_DEFS.length;
  const unlockedCount = unlockedAchievements.length;

  // Most recently unlocked achievement
  const recentUnlock = unlockedAchievements.length > 0
    ? unlockedAchievements.reduce((latest, a) =>
        (a.unlockedAt! > (latest.unlockedAt ?? '')) ? a : latest
      )
    : null;

  // Near-miss: locked achievements at ≥80% progress
  const lockedIds = new Set(allAchievements.filter((a) => !a.unlockedAt).map((a) => a.id));
  const nearMisses: { id: string; title: string; icon: string }[] = [];

  if (lockedIds.size > 0) {
    const dailyLogStreak = (() => {
      const dates = new Set(profileData.dailyLogs.map((l) => l.date));
      let s = 0;
      const d = new Date();
      while (dates.has(d.toISOString().split('T')[0])) {
        s++;
        d.setDate(d.getDate() - 1);
      }
      return s;
    })();

    const totalSkillMinutes = profileData.skills.reduce(
      (sum, sk) => sum + sk.sessions.reduce((m, s) => m + s.durationMinutes, 0), 0
    );

    const nearMissChecks: { id: string; progress: number; threshold: number }[] = [
      { id: 'first_habit', progress: profileData.habits.length, threshold: 1 },
      { id: 'first_goal', progress: profileData.goals.length, threshold: 1 },
      { id: 'first_skill', progress: profileData.skills.length, threshold: 1 },
      { id: 'daily_checkin_3', progress: dailyLogStreak, threshold: 3 },
      { id: 'daily_checkin_7', progress: dailyLogStreak, threshold: 7 },
      { id: 'week_streak', progress: streak, threshold: 7 },
      { id: 'month_streak', progress: streak, threshold: 30 },
      { id: 'streak_60', progress: streak, threshold: 60 },
      { id: 'streak_90', progress: streak, threshold: 90 },
      { id: 'skill_hour', progress: totalSkillMinutes, threshold: 60 },
      {
        id: 'all_daily_habits',
        progress: totalHabits > 0 ? completedToday : 0,
        threshold: totalHabits > 0 ? totalHabits : 1,
      },
      {
        id: 'goal_complete',
        progress: profileData.goals.some((g) => g.milestones.some((m) => m.completed)) ? 1 : 0,
        threshold: 1,
      },
    ];

    for (const check of nearMissChecks) {
      if (!lockedIds.has(check.id)) continue;
      if (check.threshold > 0 && check.progress / check.threshold >= 0.8) {
        const def = ACHIEVEMENT_DEFS.find((d) => d.id === check.id);
        if (def) nearMisses.push({ id: def.id, title: def.title, icon: def.icon });
      }
    }
  }

  const nearMissHint = nearMisses.length > 0 ? nearMisses[0] : null;

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
      recordHabitCompletion(habitId, new Date().getHours());
    }
    saveData(updated);
    setData(runAchievementCheck({ ...updated }));
  }

  function handleSkipHabit(habitId: string) {
    const updated = { ...data };
    const habit = updated.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const isSkipped = habit.skippedDates?.includes(today);
    if (isSkipped) {
      unskipHabit(habitId, today);
      habit.skippedDates = (habit.skippedDates ?? []).filter((d) => d !== today);
    } else {
      skipHabit(habitId, today);
      if (!habit.skippedDates) habit.skippedDates = [];
      habit.skippedDates.push(today);
      delete habit.completions[today];
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

      {/* Daily Intention */}
      <IntentionSetter />

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
          ) : dailyHabits.every((h) => h.completions[today] || h.skippedDates?.includes(today)) ? (
            <p className="text-green-400 text-sm font-medium">All done for today! 🔥</p>
          ) : null}
          {dailyHabits.length > 0 && (
            <div className="space-y-2">
              {dailyHabits.map((h) => {
                const isSkipped = h.skippedDates?.includes(today);
                return isSkipped ? (
                  <div key={h.id} className="flex items-center gap-3 opacity-50">
                    <span className="w-5 h-5 flex items-center justify-center text-gray-500 text-xs">—</span>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: h.color }}
                    />
                    <span className="text-sm line-through text-fg-muted flex-1">{h.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      skipped
                    </span>
                    <button
                      onClick={() => handleSkipHabit(h.id)}
                      className="text-xs text-gray-400 hover:text-fg-secondary px-1"
                      title="Unskip"
                    >
                      Unskip
                    </button>
                  </div>
                ) : (
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
                    <span className={`text-sm ${h.completions[today] ? 'line-through text-fg-muted' : 'text-foreground'} flex-1`}>
                      {h.name}
                    </span>
                    {!h.completions[today] && (
                      <button
                        onClick={(e) => { e.preventDefault(); handleSkipHabit(h.id); }}
                        className="text-xs text-fg-muted hover:text-fg-secondary hover:bg-surface-hover px-1.5 py-0.5 rounded transition-colors"
                        title="Skip today"
                      >
                        Skip
                      </button>
                    )}
                  </label>
                );
              })}
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
        <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
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
        <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
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

      {/* Sleep */}
      <Link href="/daily" className="block">
        <div className="bg-card border border-card-border hover:border-indigo-500/40 rounded-2xl p-4 transition-colors">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            😴 Sleep
          </h2>
          {todaySleep ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-lg font-bold">{todaySleep.hours}h</span>
              <span>
                {{ terrible: '😞', bad: '😕', okay: '😐', good: '🙂', great: '😊' }[todaySleep.quality]}
              </span>
            </div>
          ) : (
            <p className="text-fg-muted text-sm">
              No sleep logged yet — tap to log
            </p>
          )}
        </div>
      </Link>

      {/* Body Metrics */}
      <Link href="/body" className="block">
        <div className="bg-card border border-card-border hover:border-teal-500/40 rounded-2xl p-4 transition-colors">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            ⚖️ Body
          </h2>
          {currentWeight != null ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-lg font-bold">{currentWeight} kg</span>
              {weightChange != null && (
                <span className={`text-sm font-medium ${weightChange < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {weightChange > 0 ? '↑' : '↓'} {Math.abs(weightChange)} kg
                </span>
              )}
            </div>
          ) : (
            <p className="text-fg-muted text-sm">
              No weight logged yet — tap to track
            </p>
          )}
        </div>
      </Link>

      {/* Nutrition */}
      <Link href="/nutrition" className="block">
        <div className="bg-card border border-card-border hover:border-orange-500/40 rounded-2xl p-4 transition-colors">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            🍽️ Nutrition
          </h2>
          {todayCalories > 0 || calorieGoal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-secondary">
                  {todayCalories} / {calorieGoal} kcal
                </span>
                <span className={`text-sm font-bold ${caloriePercent >= 100 ? 'text-green-400' : 'text-fg-secondary'}`}>
                  {caloriePercent}%
                </span>
              </div>
              <div className="w-full bg-bar-track rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${caloriePercent >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
              {todayNutrition && todayNutrition.meals.length > 0 && (
                <p className="text-xs text-fg-muted">{todayNutrition.meals.length} meal{todayNutrition.meals.length !== 1 ? 's' : ''} logged</p>
              )}
            </div>
          ) : (
            <p className="text-fg-muted text-sm">No calories logged yet — tap to start</p>
          )}
        </div>
      </Link>

      {/* Hydration */}
      <Link href="/hydration" className="block">
        <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            💧 Hydration
          </h2>
          {todayWater > 0 || waterGoal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-secondary">
                  {todayWater} / {waterGoal} ml
                </span>
                <span className={`text-sm font-bold ${waterPercent >= 100 ? 'text-blue-400' : 'text-fg-secondary'}`}>
                  {waterPercent}%
                </span>
              </div>
              <div className="w-full bg-bar-track rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
              <button
                onClick={(e) => { e.preventDefault(); handleWaterAdd(250); }}
                className="mt-1 px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
              >
                +250ml
              </button>
            </div>
          ) : (
            <p className="text-fg-muted text-sm">
              No water logged yet — tap to start
            </p>
          )}
        </div>
      </Link>

      {/* Books */}
      <Link href="/books" className="block">
        <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            📚 Books
          </h2>
          {readingBook ? (
            <div className="space-y-2">
              <p className="text-sm text-fg-secondary truncate">Now reading: <span className="text-foreground">{readingBook.title}</span></p>
              {readingBook.pagesTotal && readingBook.pagesRead != null ? (
                <>
                  <div className="flex justify-between text-xs text-fg-muted">
                    <span>p. {readingBook.pagesRead} / {readingBook.pagesTotal}</span>
                    <span>{Math.min(100, Math.round((readingBook.pagesRead / readingBook.pagesTotal) * 100))}%</span>
                  </div>
                  <div className="w-full bg-bar-track rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((readingBook.pagesRead / readingBook.pagesTotal) * 100))}%` }}
                    />
                  </div>
                </>
              ) : null}
              {completedThisYear.length > 0 && (
                <p className="text-xs text-fg-muted">{completedThisYear.length} completed this year</p>
              )}
            </div>
          ) : allBooks.length > 0 ? (
            <p className="text-sm text-fg-secondary">
              {allBooks.filter(b => b.status === 'want_to_read').length} want to read · {allBooks.filter(b => b.status === 'completed').length} completed
            </p>
          ) : (
            <p className="text-fg-muted text-sm">No books yet — tap to add</p>
          )}
        </div>
      </Link>

      {/* Goals Progress */}
      <Link href="/goals" className="block">
        <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
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
        <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
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

      {/* Achievements */}
      <Link href="/achievements" className="block">
      <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            🏆 Achievements
          </h2>
          <span className="text-sm text-blue-400">
            View All →
          </span>
        </div>

        {/* Progress bar */}
        <p className="text-sm text-fg-secondary mb-2">
          {unlockedCount} / {totalAchievements} unlocked
        </p>
        <div className="w-full bg-bar-track rounded-full h-2 mb-3">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0}%` }}
          />
        </div>

        {/* Recent unlock */}
        {recentUnlock && (
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-lg">{recentUnlock.icon}</span>
            <span className="text-foreground font-medium">{recentUnlock.title}</span>
            <span className="text-fg-muted text-xs">unlocked {timeAgo(recentUnlock.unlockedAt!)}</span>
          </div>
        )}

        {/* Near-miss hint */}
        {nearMissHint && (
          <p className="text-xs text-fg-muted mt-1">
            So close: {nearMissHint.icon} {nearMissHint.title}
          </p>
        )}
      </div>
      </Link>

      {/* Active Challenges */}
      <Link href="/challenges" className="block">
      <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            🎯 Challenges
          </h2>
          <span className="text-sm text-blue-400">
            View All →
          </span>
        </div>
        {activeChallenges.length === 0 ? (
          <p className="text-fg-muted text-sm">
            No active challenges.{' '}
            <span className="text-blue-400">Start one →</span>
          </p>
        ) : (
          <div className="space-y-2">
            {activeChallenges.slice(0, 2).map((c) => {
              const rate = getChallengeCompletionRate(c.id, today);
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate flex-1 mr-2">{c.name}</span>
                    <span className="text-xs text-fg-muted">{rate}%</span>
                  </div>
                  <div className="w-full bg-bar-track rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </Link>

      {/* Yearly Vision */}
      <Link href="/yearly" className="block">
      <div className="bg-card border border-card-border hover:border-purple-500/40 rounded-2xl p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            ⭐ Yearly Vision
          </h2>
          <span className="text-sm text-blue-400">
            {currentYear} →
          </span>
        </div>
        {visionWord && (
          <p className="text-lg font-bold text-purple-400 mb-2">{visionWord}</p>
        )}
        {visionStatements.length > 0 ? (
          <p className="text-sm text-foreground italic">&quot;I am {visionStatements[0].text}&quot;</p>
        ) : (
          <p className="text-fg-muted text-sm">
            No vision set.{' '}
            <span className="text-purple-400">Plan your {currentYear} →</span>
          </p>
        )}
        {visionGoals.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-fg-muted mb-1">
              {visionGoals.length} goal{visionGoals.length !== 1 ? 's' : ''} · {visionGoalMilestones > 0 ? `${visionCompletedMilestones}/${visionGoalMilestones} milestones` : 'no milestones yet'}
            </p>
          </div>
        )}
      </div>
      </Link>

      {/* Quick Notes */}
      <Link href="/notes" className="block">
      <div className="bg-card border border-card-border hover:border-blue-500/40 rounded-2xl p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            📝 Quick Notes
          </h2>
          <span className="text-sm text-blue-400">
            View All →
          </span>
        </div>
        {quickNotesList.length === 0 ? (
          <p className="text-fg-muted text-sm">No notes yet</p>
        ) : (
          <div className="space-y-2">
            {quickNotesList.map((n) => (
              <p key={n.id} className="text-sm text-foreground truncate">
                {n.pinned && <span className="mr-1">📌</span>}
                {n.content.length > 60 ? n.content.slice(0, 60) + '…' : n.content}
              </p>
            ))}
          </div>
        )}
      </div>
      </Link>

    </div>
  );
}
