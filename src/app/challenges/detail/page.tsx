'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadData, saveData, todayString, loadProfileData, getChallengeCompletionRate } from '@/lib/storage';
import { AppData, HabitChallenge } from '@/lib/types';
import { runAchievementCheck } from '@/lib/useAchievementCheck';

function getHeatmapColor(rate: number): string {
  if (rate === 0) return 'bg-gray-700';
  if (rate <= 25) return 'bg-red-900';
  if (rate <= 50) return 'bg-yellow-700';
  if (rate <= 75) return 'bg-emerald-700';
  return 'bg-emerald-500';
}

function getDayCompletionRate(challenge: HabitChallenge, date: string, habits: Map<string, { completions: Record<string, boolean>; skippedDates?: string[] }>): number {
  if (date < challenge.startDate || date > challenge.endDate) return -1;
  const total = challenge.habitIds.length;
  if (total === 0) return 0;
  const done = challenge.habitIds.filter((id) => {
    const h = habits.get(id);
    if (!h) return false;
    return !!h.completions[date] || h.skippedDates?.includes(date);
  }).length;
  return Math.round((done / total) * 100);
}

export default function ChallengeDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-fg-muted">Loading...</p></div>}>
      <ChallengeDetailContent />
    </Suspense>
  );
}

function ChallengeDetailContent() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('id');

  const [data, setData] = useState<AppData>(() => {
    const d = loadData();
    return runAchievementCheck(d);
  });
  const [challenge, setChallenge] = useState<HabitChallenge | null>(() => {
    const d = loadData();
    return (d.challenges ?? []).find((c) => c.id === challengeId) ?? null;
  });

  if (!data || !challenge) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  const profileData = loadProfileData(data);
  const today = todayString();

  // Check if challenge ended
  if (challenge.status === 'active' && today > challenge.endDate) {
    const rate = getChallengeCompletionRate(challenge.id, challenge.endDate);
    const updatedChallenge = { ...challenge, status: rate >= 50 ? 'completed' as const : 'abandoned' as const };
    const challenges = (data.challenges ?? []).map((c) => c.id === challengeId ? updatedChallenge : c);
    const updatedData = { ...data, challenges };
    const updated = runAchievementCheck(updatedData);
    saveData(updatedData);
    setData(updated);
    setChallenge(updatedChallenge);
  }

  const includedHabits = profileData.habits.filter((h) => challenge.habitIds.includes(h.id));
  const habitMap = new Map(includedHabits.map((h) => [h.id, h]));
  const overallRate = getChallengeCompletionRate(challenge.id, today);

  // Build 8-week heatmap
  const weeks: { date: string; rate: number }[][] = [];
  const todayDate = new Date();
  const startOfHeatmap = new Date(todayDate);
  startOfHeatmap.setDate(todayDate.getDate() - 55); // ~8 weeks back
  // Align to Sunday
  const dayOfWeek = startOfHeatmap.getDay();
  startOfHeatmap.setDate(startOfHeatmap.getDate() - dayOfWeek);

  for (let w = 0; w < 8; w++) {
    const week: { date: string; rate: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(startOfHeatmap);
      dt.setDate(startOfHeatmap.getDate() + w * 7 + d);
      const dateStr = dt.toISOString().split('T')[0];
      const rate = getDayCompletionRate(challenge, dateStr, habitMap as Map<string, { completions: Record<string, boolean>; skippedDates?: string[] }>);
      week.push({ date: dateStr, rate });
    }
    weeks.push(week);
  }

  // Calculate days
  const totalDays = Math.round((new Date(challenge.endDate).getTime() - new Date(challenge.startDate).getTime()) / 86400000) + 1;
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, Math.round((new Date(today).getTime() - new Date(challenge.startDate).getTime()) / 86400000) + 1)
  );
  const daysRemaining = Math.max(0, totalDays - elapsedDays);

  // Per-habit completion rates
  const habitRates = includedHabits.map((h) => {
    let completed = 0;
    for (let i = 0; i < elapsedDays && i < 90; i++) {
      const dt = new Date(challenge.startDate);
      dt.setDate(dt.getDate() + i);
      const dateStr = dt.toISOString().split('T')[0];
      if (dateStr > today) break;
      if (h.completions[dateStr] || h.skippedDates?.includes(dateStr)) completed++;
    }
    const days = Math.min(elapsedDays, 90);
    return { habit: h, rate: days > 0 ? Math.round((completed / days) * 100) : 0 };
  });

  function handleAbandon() {
    if (!confirm('Are you sure you want to abandon this challenge?')) return;
    const updated = { ...challenge, status: 'abandoned' as const } as HabitChallenge;
    const challenges = (data.challenges ?? []).map((c) => c.id === challengeId ? updated : c);
    const newData = { ...data, challenges };
    const withAchievements = runAchievementCheck(newData);
    saveData(newData);
    setData(withAchievements);
    setChallenge(updated);
  }

  function formatDate(str: string): string {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/challenges" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
          ← Back to Challenges
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{challenge.name}</h1>
        {challenge.description && (
          <p className="text-fg-muted text-sm">{challenge.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-fg-muted">
          <span>{formatDate(challenge.startDate)} – {formatDate(challenge.endDate)}</span>
          <span className={`px-2 py-0.5 rounded text-xs border ${
            challenge.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            challenge.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
            'bg-gray-500/20 text-gray-400 border-gray-500/30'
          }`}>
            {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-card-border rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{elapsedDays}</p>
          <p className="text-xs text-fg-muted">Days Elapsed</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{daysRemaining}</p>
          <p className="text-xs text-fg-muted">Days Left</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold">{challenge.habitIds.length}</p>
          <p className="text-xs text-fg-muted">Habits</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Overall Completion</h2>
          <span className={`text-2xl font-bold ${
            overallRate >= 80 ? 'text-green-400' : overallRate >= 50 ? 'text-blue-400' : 'text-yellow-400'
          }`}>{overallRate}%</span>
        </div>
        <div className="w-full bg-bar-track rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              overallRate >= 80 ? 'bg-green-500' : overallRate >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${overallRate}%` }}
          />
        </div>
        <p className="text-xs text-fg-muted mt-1.5">
          {challenge.habitIds.length} habits × {elapsedDays} days = {challenge.habitIds.length * elapsedDays} possible completions
        </p>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-6">
        <h2 className="font-semibold mb-3">Activity Heatmap</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(({ date, rate }, di) => {
                  const inRange = rate >= 0;
                  return (
                    <div
                      key={di}
                      className={`w-4 h-4 rounded-sm ${inRange ? getHeatmapColor(rate) : 'bg-transparent'}`}
                      title={`${date}: ${inRange ? rate + '%' : 'N/A'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-fg-muted">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-700" />
            <div className="w-3 h-3 rounded-sm bg-red-900" />
            <div className="w-3 h-3 rounded-sm bg-yellow-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Per-habit breakdown */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-6">
        <h2 className="font-semibold mb-3">Habit Breakdown</h2>
        <div className="space-y-3">
          {habitRates.map(({ habit, rate }) => (
            <div key={habit.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span className="text-sm">{habit.name}</span>
                </div>
                <span className="text-xs text-fg-muted">{rate}%</span>
              </div>
              <div className="w-full bg-bar-track rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {challenge.status === 'active' && (
        <button
          onClick={handleAbandon}
          className="w-full py-3 rounded-xl text-sm font-medium bg-surface hover:bg-surface-hover text-fg-muted border border-border transition-colors"
        >
          Abandon Challenge
        </button>
      )}
    </div>
  );
}
