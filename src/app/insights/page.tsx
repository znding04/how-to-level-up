'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData, loadProfileData, loadFocusSessions, loadAllDailyIntentions, loadAllJournalEntries, loadAllSleepEntries, loadAllBodyMetricEntries, loadAllWaterEntries, getWaterGoal, loadBooks, getCalorieGoal, loadNutritionEntriesForWeek, getStudySessionsThisWeek } from '@/lib/storage';
import { AppData, Habit, Achievement, DailyIntention, FocusSession, JournalEntry, SleepQuality } from '@/lib/types';

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

// Calculate current streak for a habit
function getHabitStreak(habit: Habit): number {
  const today = new Date();
  let streak = 0;
  const currentDate = new Date(today);
  
  // Check if today is a scheduled day and if not completed, start checking from yesterday
  const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
  const todayStr = today.toISOString().split('T')[0];
  const todayDay = today.getDay();
  
  // If today is scheduled but not completed, start from yesterday
  if (scheduled.includes(todayDay) && !habit.completions[todayStr]) {
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  // Count backwards through scheduled days
  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    
    if (scheduled.includes(dayOfWeek)) {
      if (habit.completions[dateStr]) {
        streak++;
      } else {
        break;
      }
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
}

// Get longest streak ever for a habit (simplified calculation)
function getLongestStreak(habit: Habit): number {
  let longest = 0;
  let current = 0;
  const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
  
  // Get all completion dates sorted
  const completionDates = Object.keys(habit.completions).sort();
  
  for (let i = 0; i < completionDates.length; i++) {
    const date = new Date(completionDates[i] + 'T00:00:00');
    const dayOfWeek = date.getDay();
    
    if (!scheduled.includes(dayOfWeek)) continue;
    
    if (i === 0) {
      current = 1;
    } else {
      const prevDate = new Date(completionDates[i - 1] + 'T00:00:00');
      const diffDays = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if consecutive scheduled days
      let expectedDiff = 1;
      const checkDate = new Date(prevDate);
      while (checkDate < date) {
        checkDate.setDate(checkDate.getDate() + 1);
        const dow = checkDate.getDay();
        if (scheduled.includes(dow) && checkDate < date) {
          expectedDiff++;
        }
      }
      
      if (diffDays === expectedDiff) {
        current++;
      } else {
        current = 1;
      }
    }
    
    longest = Math.max(longest, current);
  }
  
  return longest;
}

export default function InsightsPage() {
  const [fullData] = useState<AppData>(() => loadData());
  const profileData = loadProfileData(fullData);

  const [focusSessions] = useState<FocusSession[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadFocusSessions();
  });

  const [allIntentions] = useState<Record<string, DailyIntention>>(() => {
    if (typeof window === 'undefined') return {};
    return loadAllDailyIntentions();
  });

  const [journalEntries] = useState<JournalEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadAllJournalEntries(fullData.activeProfileId);
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

  // 5b. Sleep Snapshot
  const sleepQualityEmojis: Record<SleepQuality, string> = {
    terrible: '😞',
    bad: '😕',
    okay: '😐',
    good: '🙂',
    great: '😊',
  };
  const allSleepEntries = loadAllSleepEntries(fullData.activeProfileId);
  const weekSleepEntries = allSleepEntries.filter((e) => thisWeekDates.includes(e.date));
  const lastWeekSleepEntries = allSleepEntries.filter((e) => lastWeekDates.includes(e.date));
  const avgSleepHours = weekSleepEntries.length > 0
    ? weekSleepEntries.reduce((sum, e) => sum + e.hours, 0) / weekSleepEntries.length
    : null;
  const avgSleepQualityNum = weekSleepEntries.length > 0
    ? weekSleepEntries.reduce((sum, e) => {
        const q: SleepQuality[] = ['terrible', 'bad', 'okay', 'good', 'great'];
        return sum + (q.indexOf(e.quality) + 1);
      }, 0) / weekSleepEntries.length
    : null;
  const avgSleepHoursLastWeek = lastWeekSleepEntries.length > 0
    ? lastWeekSleepEntries.reduce((sum, e) => sum + e.hours, 0) / lastWeekSleepEntries.length
    : null;

  // 5c. Body Metrics Snapshot
  const allBodyEntries = loadAllBodyMetricEntries(fullData.activeProfileId);
  const weightsWithValues = allBodyEntries.filter(e => e.weight != null && e.weight > 0);
  const currentBodyWeight = weightsWithValues[0]?.weight;
  const firstBodyWeight = weightsWithValues[weightsWithValues.length - 1]?.weight;
  const totalWeightChange = currentBodyWeight != null && firstBodyWeight != null && weightsWithValues.length > 1
    ? +(currentBodyWeight - firstBodyWeight).toFixed(1)
    : null;
  // Weekly average
  const bodyWeekStart = getWeekDates(0)[0];
  const bodyWeekEnd = getWeekDates(0)[6];
  const weekBodyEntries = allBodyEntries.filter(e => e.date >= bodyWeekStart && e.date <= bodyWeekEnd && e.weight != null && e.weight > 0);
  const weeklyBodyAvg = weekBodyEntries.length > 0
    ? +(weekBodyEntries.reduce((sum, e) => sum + (e.weight ?? 0), 0) / weekBodyEntries.length).toFixed(1)
    : null;
  // Last week average
  const lastWeekStart = getWeekDates(1)[0];
  const lastWeekEnd = getWeekDates(1)[6];
  const lastWeekBodyEntries = allBodyEntries.filter(e => e.date >= lastWeekStart && e.date <= lastWeekEnd && e.weight != null && e.weight > 0);
  const lastWeekBodyAvg = lastWeekBodyEntries.length > 0
    ? +(lastWeekBodyEntries.reduce((sum, e) => sum + (e.weight ?? 0), 0) / lastWeekBodyEntries.length).toFixed(1)
    : null;

  // 5d. Hydration Snapshot
  const waterGoal = getWaterGoal();
  const allWaterEntries = loadAllWaterEntries(fullData.activeProfileId);
  const thisWeekWaterDates = getWeekDates(0);
  const lastWeekWaterDates = getWeekDates(1);
  const thisWeekWaterEntries = allWaterEntries.filter(e => thisWeekWaterDates.includes(e.date));
  const lastWeekWaterEntries = allWaterEntries.filter(e => lastWeekWaterDates.includes(e.date));
  const thisWeekWaterTotal = thisWeekWaterEntries.reduce((sum, e) => sum + e.amountMl, 0);
  const thisWeekWaterDays = thisWeekWaterEntries.filter(e => e.amountMl >= waterGoal).length;
  const lastWeekWaterAvg = lastWeekWaterEntries.length > 0
    ? Math.round(lastWeekWaterEntries.reduce((sum, e) => sum + e.amountMl, 0) / lastWeekWaterEntries.filter(e => e.amountMl > 0).length)
    : null;
  const thisWeekWaterAvg = thisWeekWaterEntries.filter(e => e.amountMl > 0).length > 0
    ? Math.round(thisWeekWaterTotal / thisWeekWaterEntries.filter(e => e.amountMl > 0).length)
    : null;

  // 5f. Nutrition Snapshot
  const calorieGoal = getCalorieGoal();
  const thisWeekNutrition = loadNutritionEntriesForWeek(fullData.activeProfileId, getWeekDates(0));
  const lastWeekNutrition = loadNutritionEntriesForWeek(fullData.activeProfileId, getWeekDates(1));
  const thisWeekCalories = thisWeekNutrition.map(e => e.totalCalories);
  const thisWeekTotalCalories = thisWeekCalories.reduce((sum: number, c) => sum + (c ?? 0), 0);
  const thisWeekDaysWithFood = thisWeekCalories.filter(c => (c ?? 0) > 0).length;
  const thisWeekAvgCalories = thisWeekDaysWithFood > 0 ? Math.round(thisWeekTotalCalories / thisWeekDaysWithFood) : null;
  const thisWeekDaysOnGoal = thisWeekCalories.filter(c => calorieGoal > 0 && (c ?? 0) >= calorieGoal).length;
  const lastWeekAvgCalories = lastWeekNutrition.length > 0 && lastWeekNutrition.filter(e => (e.totalCalories ?? 0) > 0).length > 0
    ? Math.round(lastWeekNutrition.reduce((sum: number, e) => sum + (e.totalCalories ?? 0), 0) / lastWeekNutrition.filter(e => (e.totalCalories ?? 0) > 0).length)
    : null;

  // 5e. Books / Reading Snapshot
  const allBooks = loadBooks(fullData.activeProfileId);
  const booksCompletedThisMonth = allBooks.filter(b => {
    if (b.status !== 'completed' || !b.completedDate) return false;
    const d = new Date(b.completedDate + 'T00:00:00');
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const booksCompletedLastMonth = allBooks.filter(b => {
    if (b.status !== 'completed' || !b.completedDate) return false;
    const d = new Date(b.completedDate + 'T00:00:00');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
  });
  const currentlyReadingBooks = allBooks.filter(b => b.status === 'reading');
  const completedBooksWithRating = allBooks.filter(b => b.status === 'completed' && b.rating != null);
  const avgBookRating = completedBooksWithRating.length > 0
    ? +(completedBooksWithRating.reduce((sum, b) => sum + (b.rating ?? 0), 0) / completedBooksWithRating.length).toFixed(1)
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

  // 9. Habit Trend Analysis (up/down trending)
  const habitTrends = dailyHabits.map((h) => {
    const thisRate = getHabitCompletionRate(h, thisWeekDates);
    const lastRate = getHabitCompletionRate(h, lastWeekDates);
    const delta = thisRate - lastRate;
    return {
      name: h.name,
      color: h.color,
      thisRate,
      lastRate,
      delta,
      trend: delta > 0.1 ? 'up' : delta < -0.1 ? 'down' : 'stable',
    };
  }).sort((a, b) => b.delta - a.delta);
  
  const trendingUp = habitTrends.filter((h) => h.trend === 'up');
  const trendingDown = habitTrends.filter((h) => h.trend === 'down');

  // 10. Skill-Mood Correlation
  // Calculate correlation between skill minutes and mood/energy
  const skillMoodCorrelation = (() => {
    if (profileData.skills.length === 0 || profileData.dailyLogs.length === 0) return null;
    
    // Get skill minutes per day
    const skillMinutesByDate: Record<string, number> = {};
    profileData.skills.forEach((skill) => {
      skill.sessions.forEach((sess) => {
        if (!skillMinutesByDate[sess.date]) skillMinutesByDate[sess.date] = 0;
        skillMinutesByDate[sess.date] += sess.durationMinutes;
      });
    });
    
    // Get mood by date
    const moodByDate: Record<string, number> = {};
    profileData.dailyLogs.forEach((log) => {
      moodByDate[log.date] = log.mood;
    });
    
    // Find common dates
    const commonDates = Object.keys(skillMinutesByDate).filter(
      (date) => moodByDate[date] !== undefined
    );
    
    if (commonDates.length < 3) return null;
    
    // Calculate simple correlation coefficient
    const n = commonDates.length;
    const sumX = commonDates.reduce((s, d) => s + skillMinutesByDate[d], 0);
    const sumY = commonDates.reduce((s, d) => s + moodByDate[d], 0);
    const sumXY = commonDates.reduce((s, d) => s + skillMinutesByDate[d] * moodByDate[d], 0);
    const sumX2 = commonDates.reduce((s, d) => s + skillMinutesByDate[d] ** 2, 0);
    const sumY2 = commonDates.reduce((s, d) => s + moodByDate[d] ** 2, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
    
    if (denominator === 0) return null;
    
    return numerator / denominator;
  })();

  // 11. Weekly Highlight - Big Win & Watch Out
  const bigWin = trendingUp.length > 0 ? trendingUp[0] : null;
  const watchOut = trendingDown.length > 0 ? trendingDown[0] : null;

  // 12. Streak Insights
  const habitStreaks = dailyHabits.map((h) => ({
    name: h.name,
    color: h.color,
    currentStreak: getHabitStreak(h),
    longestStreak: getLongestStreak(h),
  }));
  
  const longestStreakHabit = habitStreaks.length > 0
    ? habitStreaks.reduce((best, h) => h.longestStreak > best.longestStreak ? h : best, habitStreaks[0])
    : null;
  
  // At-risk habits: scheduled today but not yet completed (or low this week rate)
  const todayStr = new Date().toISOString().split('T')[0];
  const atRiskHabits = dailyHabits.filter((h) => {
    const thisRate = getHabitCompletionRate(h, thisWeekDates);
    const todayScheduled = (h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(new Date().getDay());
    const notDoneToday = todayScheduled && !h.completions[todayStr];
    return notDoneToday || thisRate < 0.5;
  }).map((h) => ({
    name: h.name,
    color: h.color,
    rate: getHabitCompletionRate(h, thisWeekDates),
  }));

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

  // Daily Intentions insights
  const intentionDaysThisWeek = thisWeekDates.filter((d) => allIntentions[d]).length;
  const sortedIntentionDates = Object.keys(allIntentions).sort().reverse();
  const mostRecentIntention = sortedIntentionDates.length > 0 ? allIntentions[sortedIntentionDates[0]] : null;
  const intentionStreak = (() => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (allIntentions[dateStr]) {
        streak++;
      } else {
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  // Study Sessions this week
  const thisWeekStudySessions = getStudySessionsThisWeek(fullData.activeProfileId);
  const thisWeekStudyCards = thisWeekStudySessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
  const thisWeekStudyCorrect = thisWeekStudySessions.reduce((sum, s) => sum + s.correctCount, 0);
  const thisWeekStudyAvgRate = thisWeekStudyCards > 0
    ? Math.round((thisWeekStudyCorrect / thisWeekStudyCards) * 100)
    : null;

  // Last week study sessions
  const lwDates = getWeekDates(1);
  const lwStart = lwDates[0];
  const lwEnd = lwDates[6];
  const data = loadData();
  const lastWeekStudySessions = (data.studySessions ?? []).filter(s => {
    if (s.profileId !== fullData.activeProfileId) return false;
    return s.date >= lwStart && s.date <= lwEnd;
  });
  const lastWeekStudyCards = lastWeekStudySessions.reduce((sum, s) => sum + s.cardsReviewed, 0);

  // Journal insights
  const journalEntriesThisWeek = journalEntries.filter((e) => thisWeekDates.includes(e.date));
  const mostRecentJournalEntry = journalEntries.length > 0 ? journalEntries[0] : null;
  const journalStreak = (() => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (journalEntries.some((e) => e.date === dateStr)) {
        streak++;
      } else {
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();
  const hasTodayJournal = journalEntries.some((e) => e.date === todayStr);

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

      {/* Weekly Highlight - Big Win & Watch Out */}
      {(bigWin || watchOut) && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Weekly Highlights</h2>
          <div className="space-y-3">
            {bigWin && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-400/10 border border-green-400/20">
                <span className="text-2xl">🏆</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-400">Big Win</p>
                  <p className="text-sm font-medium truncate">{bigWin.name}</p>
                  <p className="text-xs text-fg-secondary">
                    Up {Math.round(bigWin.delta * 100)}% vs last week ({Math.round(bigWin.thisRate * 100)}%)
                  </p>
                </div>
              </div>
            )}
            {watchOut && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-400">Watch Out</p>
                  <p className="text-sm font-medium truncate">{watchOut.name}</p>
                  <p className="text-xs text-fg-secondary">
                    Down {Math.round(Math.abs(watchOut.delta) * 100)}% vs last week ({Math.round(watchOut.thisRate * 100)}%)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Habit Trend Analysis */}
      {habitTrends.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Habit Trends</h2>
          <div className="space-y-2">
            {trendingUp.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-green-400 font-medium mb-1">Trending Up ↑</p>
                <div className="space-y-1">
                  {trendingUp.slice(0, 3).map((h) => (
                    <div key={h.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                      <span className="text-sm flex-1 truncate">{h.name}</span>
                      <span className="text-xs text-green-400">+{Math.round(h.delta * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {trendingDown.length > 0 && (
              <div>
                <p className="text-xs text-red-400 font-medium mb-1">Trending Down ↓</p>
                <div className="space-y-1">
                  {trendingDown.slice(0, 3).map((h) => (
                    <div key={h.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                      <span className="text-sm flex-1 truncate">{h.name}</span>
                      <span className="text-xs text-red-400">{Math.round(h.delta * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {trendingUp.length === 0 && trendingDown.length === 0 && (
              <p className="text-sm text-fg-muted">No significant trend changes this week.</p>
            )}
          </div>
        </div>
      )}

      {/* Skill-Mood Correlation Card */}
      {skillMoodCorrelation !== null && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">Skill-Mood Connection</h2>
          <div className="flex items-center gap-4">
            <div className={`text-3xl ${skillMoodCorrelation > 0.3 ? 'text-green-400' : skillMoodCorrelation < -0.3 ? 'text-red-400' : 'text-fg-muted'}`}>
              {skillMoodCorrelation > 0.3 ? '📈' : skillMoodCorrelation < -0.3 ? '📉' : '➡️'}
            </div>
            <div className="flex-1">
              <p className="text-sm">
                {skillMoodCorrelation > 0.3
                  ? 'Your skill practice seems to lift your mood!'
                  : skillMoodCorrelation < -0.3
                  ? 'Notice: Your mood dips when you practice more skills.'
                  : 'No strong link between skill practice and mood yet.'}
              </p>
              <p className="text-xs text-fg-muted mt-1">
                Correlation: <span className="font-medium">{skillMoodCorrelation > 0 ? '+' : ''}{skillMoodCorrelation.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Streak Insights */}
      {habitStreaks.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Streak Insights</h2>
          <div className="space-y-3">
            {longestStreakHabit && longestStreakHabit.longestStreak > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-400/10 border border-purple-400/20">
                <span className="text-2xl">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Longest Streak</p>
                  <p className="text-sm font-medium truncate">{longestStreakHabit.name}</p>
                  <p className="text-xs text-fg-secondary">
                    {longestStreakHabit.longestStreak} day{longestStreakHabit.longestStreak !== 1 ? 's' : ''} best run
                  </p>
                </div>
              </div>
            )}
            {atRiskHabits.length > 0 && (
              <div>
                <p className="text-xs text-amber-400 font-medium mb-2">⚠️ Needs Attention</p>
                <div className="space-y-1">
                  {atRiskHabits.slice(0, 3).map((h) => (
                    <div key={h.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                      <span className="text-sm flex-1 truncate">{h.name}</span>
                      <span className="text-xs text-amber-400">{Math.round(h.rate * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {habitStreaks.filter((h) => h.currentStreak > 0).length > 0 && (
              <div className="pt-2 border-t border-card-border">
                <p className="text-xs text-fg-secondary">
                  Current streaks: {habitStreaks.filter((h) => h.currentStreak > 0).map((h) => `${h.name} (${h.currentStreak})`).join(', ') || 'none'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Daily Intentions */}
      {(intentionDaysThisWeek > 0 || mostRecentIntention) && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Daily Intentions</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-secondary">This week</span>
              <span className="text-sm font-medium">{intentionDaysThisWeek}/7 days</span>
            </div>
            {intentionStreak > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-secondary">Streak</span>
                <span className="text-sm font-medium">{intentionStreak} day{intentionStreak !== 1 ? 's' : ''}</span>
              </div>
            )}
            {mostRecentIntention && (
              <div className="mt-2 pt-2 border-t border-card-border">
                <p className="text-xs text-fg-muted mb-1">Most recent</p>
                <p className="text-sm text-foreground">
                  {mostRecentIntention.emoji && <span className="mr-1">{mostRecentIntention.emoji}</span>}
                  {mostRecentIntention.text}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Journal */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Journal</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-secondary">Entries this week</span>
            <span className="text-sm font-medium">{journalEntriesThisWeek.length}</span>
          </div>
          {journalStreak > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-secondary">Streak</span>
              <span className="text-sm font-medium">{journalStreak} day{journalStreak !== 1 ? 's' : ''}</span>
            </div>
          )}
          {mostRecentJournalEntry && (
            <div className="mt-2 pt-2 border-t border-card-border">
              <p className="text-xs text-fg-muted mb-1">Most recent</p>
              <p className="text-sm text-foreground">
                {mostRecentJournalEntry.content.length > 80
                  ? mostRecentJournalEntry.content.slice(0, 80) + '...'
                  : mostRecentJournalEntry.content}
              </p>
            </div>
          )}
          {!hasTodayJournal && (
            <div className="mt-2 pt-2 border-t border-card-border">
              <Link href="/journal" className="text-sm text-blue-400 hover:text-blue-300">
                Write today&apos;s entry &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

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

      {/* Sleep */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Sleep</h2>
        {avgSleepHours !== null ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{avgSleepHours.toFixed(1)}h</p>
                <p className="text-xs text-fg-secondary">avg per night</p>
              </div>
              <div className="text-center">
                <p className="text-2xl">{avgSleepQualityNum !== null ? sleepQualityEmojis[['terrible', 'bad', 'okay', 'good', 'great'][Math.round(avgSleepQualityNum) - 1] as SleepQuality] : '—'}</p>
                <p className="text-xs text-fg-secondary">avg quality</p>
              </div>
            </div>
            {avgSleepHoursLastWeek !== null && (
              <p className="text-xs text-fg-muted text-center pt-2 border-t border-card-border">
                {avgSleepHours > avgSleepHoursLastWeek ? '↑' : avgSleepHours < avgSleepHoursLastWeek ? '↓' : '—'} {Math.abs(avgSleepHours - avgSleepHoursLastWeek).toFixed(1)}h vs last week
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No sleep logged this week</p>
        )}
      </div>

      {/* Body Metrics */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Body Metrics</h2>
        {currentBodyWeight != null ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{currentBodyWeight} kg</p>
                <p className="text-xs text-fg-secondary">current weight</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyBodyAvg != null ? `${weeklyBodyAvg} kg` : '—'}</p>
                <p className="text-xs text-fg-secondary">weekly avg</p>
              </div>
            </div>
            {totalWeightChange != null && (
              <p className="text-xs text-fg-muted text-center pt-2 border-t border-card-border">
                Total change: <span className={totalWeightChange < 0 ? 'text-green-400' : 'text-red-400'}>
                  {totalWeightChange > 0 ? '+' : ''}{totalWeightChange} kg
                </span>
              </p>
            )}
            {lastWeekBodyAvg != null && weeklyBodyAvg != null && (
              <p className="text-xs text-fg-muted text-center">
                {weeklyBodyAvg > lastWeekBodyAvg ? '↑' : weeklyBodyAvg < lastWeekBodyAvg ? '↓' : '—'} {Math.abs(+weeklyBodyAvg - +lastWeekBodyAvg).toFixed(1)} kg vs last week
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No weight logged yet</p>
        )}
      </div>

      {/* Hydration */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">Hydration</h2>
        {allWaterEntries.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {thisWeekWaterAvg != null ? `${thisWeekWaterAvg}ml` : '—'}
                </p>
                <p className="text-xs text-fg-secondary">daily avg</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${thisWeekWaterDays >= 4 ? 'text-blue-400' : 'text-fg-secondary'}`}>
                  {thisWeekWaterDays}/7
                </p>
                <p className="text-xs text-fg-secondary">days on goal</p>
              </div>
            </div>
            {lastWeekWaterAvg != null && thisWeekWaterAvg != null && (
              <p className="text-xs text-fg-muted text-center pt-2 border-t border-card-border">
                {thisWeekWaterAvg > lastWeekWaterAvg ? '↑' : thisWeekWaterAvg < lastWeekWaterAvg ? '↓' : '—'}{' '}
                {Math.abs(thisWeekWaterAvg - lastWeekWaterAvg)}ml vs last week
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No water logged yet</p>
        )}
      </div>

      {/* Nutrition */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">🍽️ Nutrition</h2>
        {thisWeekNutrition.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {thisWeekAvgCalories != null ? `${thisWeekAvgCalories}` : '—'}
                </p>
                <p className="text-xs text-fg-secondary">daily avg kcal</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${thisWeekDaysOnGoal >= 4 ? 'text-green-400' : 'text-fg-secondary'}`}>
                  {thisWeekDaysOnGoal}/7
                </p>
                <p className="text-xs text-fg-secondary">days on goal</p>
              </div>
            </div>
            {lastWeekAvgCalories != null && thisWeekAvgCalories != null && (
              <p className="text-xs text-fg-muted text-center pt-2 border-t border-card-border">
                {thisWeekAvgCalories > lastWeekAvgCalories ? '↑' : thisWeekAvgCalories < lastWeekAvgCalories ? '↓' : '—'}{' '}
                {Math.abs(thisWeekAvgCalories - lastWeekAvgCalories)} kcal vs last week
              </p>
            )}
            {calorieGoal > 0 && (
              <p className="text-xs text-fg-muted text-center">Goal: {calorieGoal} kcal/day</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No nutrition logged yet</p>
        )}
      </div>

      {/* Reading */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">📚 Reading</h2>
        {allBooks.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{allBooks.length}</p>
                <p className="text-xs text-fg-secondary">total books</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{currentlyReadingBooks.length}</p>
                <p className="text-xs text-fg-secondary">reading</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{allBooks.filter(b => b.status === 'completed').length}</p>
                <p className="text-xs text-fg-secondary">completed</p>
              </div>
            </div>
            {booksCompletedThisMonth.length > 0 && (
              <p className="text-xs text-fg-muted text-center pt-2 border-t border-card-border">
                {booksCompletedThisMonth.length} book{booksCompletedThisMonth.length !== 1 ? 's' : ''} completed this month
                {booksCompletedLastMonth.length > 0 && (
                  <> · {booksCompletedThisMonth.length > booksCompletedLastMonth.length ? '↑' : '↓'} vs last month</>
                )}
              </p>
            )}
            {avgBookRating != null && (
              <p className="text-xs text-fg-muted text-center">
                Avg rating: {avgBookRating} ★
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No books in your library yet</p>
        )}
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

      {/* Study Sessions */}
      {thisWeekStudySessions.length > 0 || thisWeekStudyAvgRate !== null ? (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">📖 Study Sessions</h2>
            <Link href="/skills/study" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Study →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{thisWeekStudySessions.length}</p>
              <p className="text-xs text-fg-secondary">sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{thisWeekStudyCards}</p>
              <p className="text-xs text-fg-secondary">cards reviewed</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${thisWeekStudyAvgRate !== null && thisWeekStudyAvgRate >= 70 ? 'text-green-400' : 'text-fg-secondary'}`}>
                {thisWeekStudyAvgRate !== null ? `${thisWeekStudyAvgRate}%` : '—'}
              </p>
              <p className="text-xs text-fg-secondary">avg correct</p>
            </div>
          </div>
          {lastWeekStudyCards > 0 && (
            <p className="text-xs text-fg-muted text-center pt-2 border-t border-card-border">
              {thisWeekStudyCards > lastWeekStudyCards ? '↑' : thisWeekStudyCards < lastWeekStudyCards ? '↓' : '—'}{' '}
              {Math.abs(thisWeekStudyCards - lastWeekStudyCards)} cards vs last week
            </p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">📖 Study Sessions</h2>
            <Link href="/skills/study" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Start Studying →
            </Link>
          </div>
          <p className="text-sm text-fg-muted">Use flashcard-style reflection prompts to consolidate your skill learning.</p>
        </div>
      )}

      {/* Weekly Recap */}
      <Link href="/recap" className="block bg-card border border-card-border hover:border-blue-500/40 rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">Weekly Recap</h2>
            <p className="text-sm text-fg-secondary mt-1">Generate a shareable summary of your progress</p>
          </div>
          <span className="text-fg-muted text-lg">&rarr;</span>
        </div>
      </Link>

      {/* Empty state */}
      {dailyHabits.length === 0 && profileData.skills.length === 0 && weekLogs.length === 0 && (
        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
          <p className="text-fg-muted">Start tracking habits, skills, and daily check-ins to see your weekly insights here.</p>
        </div>
      )}
    </div>
  );
}
