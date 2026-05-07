'use client';

import { useEffect, useState } from 'react';
import { loadData, todayString } from '@/lib/storage';
import { AppData } from '@/lib/types';
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
  const [data, setData] = useState<AppData>(() => loadData());

  useEffect(() => {
    setData(loadData());
  }, []);

  const today = todayString();

  // Habits summary
  const totalHabits = data.habits.length;
  const completedToday = data.habits.filter((h) => h.completions[today]).length;
  const uncheckedHabits = data.habits.filter((h) => !h.completions[today]);

  // Daily check-in
  const todayLog = data.dailyLogs.find((l) => l.date === today);

  // Goals progress
  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const allMilestones = activeGoals.flatMap((g) => g.milestones);
  const completedMilestones = allMilestones.filter((m) => m.completed).length;
  const goalPercent =
    allMilestones.length > 0
      ? Math.round((completedMilestones / allMilestones.length) * 100)
      : 0;

  // Skills - hours this week
  const weekDates = getWeekDates();
  const weekMinutes = data.skills.reduce((sum, skill) => {
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
      const anyCompleted = data.habits.some((h) => h.completions[dateStr]);
      if (!anyCompleted) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
  }

  const moodEmojis = ['', '😞', '😕', '😐', '🙂', '😄'];
  const energyEmojis = ['', '🪫', '🔋', '⚡', '🔥', '🚀'];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">{getGreeting()}</h1>
        <p className="text-gray-400 text-sm">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Streak / Motivation */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold">🔥 {streak} day streak</p>
          <p className="text-gray-300 text-sm mt-1">
            {streak >= 7
              ? "You're on fire! Keep it going!"
              : streak >= 3
                ? 'Building momentum — nice work!'
                : 'Great start, keep showing up!'}
          </p>
        </div>
      )}

      {/* Habits Summary */}
      <Link href="/habits" className="block">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              🔄 Habits
            </h2>
            <span className="text-sm text-gray-400">
              {completedToday}/{totalHabits} done
            </span>
          </div>
          {totalHabits === 0 ? (
            <p className="text-gray-500 text-sm">No habits yet — add one!</p>
          ) : completedToday === totalHabits ? (
            <p className="text-green-400 text-sm">✅ All done for today!</p>
          ) : (
            <div className="space-y-1">
              {uncheckedHabits.slice(0, 3).map((h) => (
                <p key={h.id} className="text-sm text-gray-400">
                  ○ {h.name}
                </p>
              ))}
              {uncheckedHabits.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{uncheckedHabits.length - 3} more
                </p>
              )}
            </div>
          )}
          {totalHabits > 0 && (
            <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
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
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
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
            <p className="text-gray-500 text-sm">
              Haven&apos;t checked in yet — tap to log today
            </p>
          )}
        </div>
      </Link>

      {/* Goals Progress */}
      <Link href="/goals" className="block">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              🎯 Goals
            </h2>
            <span className="text-sm text-gray-400">
              {activeGoals.length} active
            </span>
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-gray-500 text-sm">No active goals — set one!</p>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                {completedMilestones}/{allMilestones.length} milestones done
              </p>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-500 mt-1">
                {goalPercent}%
              </p>
            </>
          )}
        </div>
      </Link>

      {/* Skills Practice */}
      <Link href="/skills" className="block">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            ⚡ Skills Practice
          </h2>
          <p className="text-2xl font-bold">
            {weekHours}
            <span className="text-sm font-normal text-gray-400 ml-1">
              hrs this week
            </span>
          </p>
          {data.skills.length === 0 && (
            <p className="text-gray-500 text-sm mt-1">
              No skills tracked yet — start one!
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
