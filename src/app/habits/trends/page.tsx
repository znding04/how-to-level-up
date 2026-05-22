'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { loadData, loadProfileData } from '@/lib/storage';
import { Habit } from '@/lib/types';

const WEEKS = 12;
const CHART_WEEKS = 8;

function getDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMondayOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export default function HabitTrendsPage() {
  const [habits] = useState<Habit[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).habits;
  });
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');

  const filteredHabits = useMemo(
    () => (selectedHabitId === 'all' ? habits : habits.filter((h) => h.id === selectedHabitId)),
    [habits, selectedHabitId]
  );

  // Build heatmap data: 12 weeks x 7 days grid
  const heatmapData = useMemo(() => {
    const today = new Date();
    const grid: { date: string; count: number; total: number }[][] = [];

    const startMonday = getMondayOfWeek(today);
    startMonday.setDate(startMonday.getDate() - (WEEKS - 1) * 7);

    for (let w = 0; w < WEEKS; w++) {
      const week: { date: string; count: number; total: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startMonday);
        cellDate.setDate(cellDate.getDate() + w * 7 + d);
        const key = getDateKey(cellDate);

        // Don't count future dates
        const isFuture = cellDate > today;
        let count = 0;
        let total = 0;

        if (!isFuture) {
          const cellDow = cellDate.getDay();
          for (const habit of filteredHabits) {
            if (habit.frequency === 'weekly') continue; // skip weekly habits in daily grid
            const scheduledDays = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
            if (!scheduledDays.includes(cellDow)) continue;
            if (key >= habit.createdAt) {
              total++;
              if (habit.completions[key]) count++;
            }
          }
        }

        week.push({ date: key, count, total });
      }
      grid.push(week);
    }
    return grid;
  }, [filteredHabits]);

  // Weekly completion rates for bar chart
  const weeklyRates = useMemo(() => {
    const today = new Date();
    const rates: { label: string; rate: number; completed: number; possible: number }[] = [];

    for (let w = CHART_WEEKS - 1; w >= 0; w--) {
      const weekStart = getMondayOfWeek(today);
      weekStart.setDate(weekStart.getDate() - w * 7);

      let completed = 0;
      let possible = 0;

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + d);
        if (cellDate > today) break;
        const key = getDateKey(cellDate);

        const cellDow = cellDate.getDay();
        for (const habit of filteredHabits) {
          if (habit.frequency === 'weekly') continue;
          const scheduledDays = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
          if (!scheduledDays.includes(cellDow)) continue;
          if (key >= habit.createdAt) {
            possible++;
            if (habit.completions[key]) completed++;
          }
        }
      }

      const monthDay = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      rates.push({
        label: monthDay,
        rate: possible > 0 ? Math.round((completed / possible) * 100) : 0,
        completed,
        possible,
      });
    }
    return rates;
  }, [filteredHabits]);

  // Per-habit stats for the last 30 days
  const habitStats = useMemo(() => {
    const today = new Date();
    return habits.map((habit) => {
      let completedLast30 = 0;
      let possibleLast30 = 0;
      const scheduledDays = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = getDateKey(d);
        if (key >= habit.createdAt) {
          if (habit.frequency === 'daily') {
            if (!scheduledDays.includes(d.getDay())) continue;
            possibleLast30++;
            if (habit.completions[key]) completedLast30++;
          }
        }
      }
      // For weekly habits, count weeks
      if (habit.frequency === 'weekly') {
        const weeks = new Set<string>();
        const completedWeeks = new Set<string>();
        for (let i = 0; i < 30; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = getDateKey(d);
          if (key >= habit.createdAt) {
            const monday = getDateKey(getMondayOfWeek(d));
            weeks.add(monday);
            if (habit.completions[key]) completedWeeks.add(monday);
          }
        }
        possibleLast30 = weeks.size;
        completedLast30 = completedWeeks.size;
      }
      const rate = possibleLast30 > 0 ? Math.round((completedLast30 / possibleLast30) * 100) : 0;
      return { habit, completedLast30, possibleLast30, rate };
    });
  }, [habits]);

  const maxRate = Math.max(...weeklyRates.map((r) => r.rate), 1);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function getCellColor(count: number, total: number): string {
    if (total === 0) return 'bg-gray-800';
    const ratio = count / total;
    if (ratio === 0) return 'bg-gray-800';
    if (ratio < 0.33) return 'bg-green-900';
    if (ratio < 0.66) return 'bg-green-700';
    if (ratio < 1) return 'bg-green-500';
    return 'bg-green-400';
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/habits"
          className="text-gray-400 hover:text-white transition-colors"
        >
          &larr;
        </Link>
        <h1 className="text-2xl font-bold">Habit Trends</h1>
      </div>

      {habits.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">
          No habits yet. Add some habits first to see trends.
        </p>
      ) : (
        <>
          {/* Habit filter */}
          <div className="mb-6">
            <select
              value={selectedHabitId}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="all">All daily habits</option>
              {habits
                .filter((h) => h.frequency === 'daily')
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Heatmap */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Last {WEEKS} Weeks
            </h2>
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-1">
                {dayLabels.map((label, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 text-[10px] text-gray-500 flex items-center justify-center"
                  >
                    {i % 2 === 0 ? label : ''}
                  </div>
                ))}
              </div>
              {/* Grid */}
              {heatmapData.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className={`w-4 h-4 rounded-sm ${getCellColor(cell.count, cell.total)}`}
                      title={`${cell.date}: ${cell.count}/${cell.total}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-green-900" />
              <div className="w-3 h-3 rounded-sm bg-green-700" />
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <div className="w-3 h-3 rounded-sm bg-green-400" />
              <span>More</span>
            </div>
          </div>

          {/* Weekly bar chart */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Weekly Completion Rate
            </h2>
            <div className="flex items-end gap-2 h-32">
              {weeklyRates.map((week, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">{week.rate}%</span>
                  <div className="w-full bg-gray-700 rounded-t-sm relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all duration-300"
                      style={{ height: `${(week.rate / maxRate) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{week.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-habit breakdown */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              30-Day Breakdown
            </h2>
            <div className="space-y-3">
              {habitStats.map(({ habit, completedLast30, possibleLast30, rate }) => (
                <div key={habit.id} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm truncate">{habit.name}</span>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">
                        {completedLast30}/{possibleLast30} ({rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${rate}%`,
                          backgroundColor: habit.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
