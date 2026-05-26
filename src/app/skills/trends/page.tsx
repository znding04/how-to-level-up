'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { loadData, loadProfileData } from '@/lib/storage';
import { Skill } from '@/lib/types';

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

export default function SkillTrendsPage() {
  const [skills] = useState<Skill[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).skills;
  });
  const [selectedSkillId, setSelectedSkillId] = useState<string>('all');

  const filteredSkills = useMemo(
    () => (selectedSkillId === 'all' ? skills : skills.filter((s) => s.id === selectedSkillId)),
    [skills, selectedSkillId]
  );

  // Build heatmap data: 12 weeks x 7 days grid, colored by total practice minutes
  const heatmapData = useMemo(() => {
    const today = new Date();
    const grid: { date: string; minutes: number }[][] = [];

    const startMonday = getMondayOfWeek(today);
    startMonday.setDate(startMonday.getDate() - (WEEKS - 1) * 7);

    for (let w = 0; w < WEEKS; w++) {
      const week: { date: string; minutes: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startMonday);
        cellDate.setDate(cellDate.getDate() + w * 7 + d);
        const key = getDateKey(cellDate);
        const isFuture = cellDate > today;

        let minutes = 0;
        if (!isFuture) {
          for (const skill of filteredSkills) {
            for (const session of skill.sessions) {
              if (session.date === key) {
                minutes += session.durationMinutes;
              }
            }
          }
        }

        week.push({ date: key, minutes });
      }
      grid.push(week);
    }
    return grid;
  }, [filteredSkills]);

  // Find max minutes for heatmap scaling
  const maxMinutes = useMemo(() => {
    let max = 0;
    for (const week of heatmapData) {
      for (const cell of week) {
        if (cell.minutes > max) max = cell.minutes;
      }
    }
    return max || 1;
  }, [heatmapData]);

  // Weekly totals for bar chart
  const weeklyTotals = useMemo(() => {
    const today = new Date();
    const totals: { label: string; minutes: number }[] = [];

    for (let w = CHART_WEEKS - 1; w >= 0; w--) {
      const weekStart = getMondayOfWeek(today);
      weekStart.setDate(weekStart.getDate() - w * 7);

      let minutes = 0;
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + d);
        if (cellDate > today) break;
        const key = getDateKey(cellDate);

        for (const skill of filteredSkills) {
          for (const session of skill.sessions) {
            if (session.date === key) {
              minutes += session.durationMinutes;
            }
          }
        }
      }

      const monthDay = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      totals.push({ label: monthDay, minutes });
    }
    return totals;
  }, [filteredSkills]);

  // Per-skill breakdown for last 30 days
  const skillStats = useMemo(() => {
    const today = new Date();
    const last30Dates = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last30Dates.add(getDateKey(d));
    }

    const stats = skills.map((skill) => {
      let minutes = 0;
      for (const session of skill.sessions) {
        if (last30Dates.has(session.date)) {
          minutes += session.durationMinutes;
        }
      }
      return { skill, minutes };
    });

    const totalAll = stats.reduce((sum, s) => sum + s.minutes, 0);

    return stats
      .map((s) => ({
        ...s,
        percentage: totalAll > 0 ? Math.round((s.minutes / totalAll) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [skills]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const today = new Date();
    const todayKey = getDateKey(today);

    // This week (from Monday)
    const monday = getMondayOfWeek(today);
    let weekMinutes = 0;
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(monday);
      cellDate.setDate(cellDate.getDate() + d);
      if (cellDate > today) break;
      const key = getDateKey(cellDate);
      for (const skill of filteredSkills) {
        for (const session of skill.sessions) {
          if (session.date === key) weekMinutes += session.durationMinutes;
        }
      }
    }

    // This month
    const monthStart = `${todayKey.slice(0, 7)}-01`;
    let monthMinutes = 0;
    let monthDays = 0;
    for (let i = 0; i < 31; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      if (key < monthStart) break;
      monthDays++;
      for (const skill of filteredSkills) {
        for (const session of skill.sessions) {
          if (session.date === key) monthMinutes += session.durationMinutes;
        }
      }
    }

    const avgPerDay = monthDays > 0 ? Math.round(monthMinutes / monthDays) : 0;

    return {
      weekHours: (weekMinutes / 60).toFixed(1),
      monthHours: (monthMinutes / 60).toFixed(1),
      avgPerDay,
    };
  }, [filteredSkills]);

  const maxWeeklyMinutes = Math.max(...weeklyTotals.map((w) => w.minutes), 1);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function getCellColor(minutes: number): string {
    if (minutes === 0) return 'bg-gray-800';
    const ratio = minutes / maxMinutes;
    if (ratio < 0.25) return 'bg-emerald-900';
    if (ratio < 0.5) return 'bg-emerald-700';
    if (ratio < 0.75) return 'bg-emerald-500';
    return 'bg-emerald-400';
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/skills"
          className="text-gray-400 hover:text-white transition-colors"
        >
          &larr;
        </Link>
        <h1 className="text-2xl font-bold">Skill Trends</h1>
      </div>

      {skills.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">
          No skills yet. Add some skills first to see trends.
        </p>
      ) : (
        <>
          {/* Skill filter */}
          <div className="mb-6">
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="all">All skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{summaryStats.weekHours}h</p>
              <p className="text-xs text-gray-400">This week</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{summaryStats.monthHours}h</p>
              <p className="text-xs text-gray-400">This month</p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{summaryStats.avgPerDay}m</p>
              <p className="text-xs text-gray-400">Avg/day</p>
            </div>
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
                      className={`w-4 h-4 rounded-sm ${getCellColor(cell.minutes)}`}
                      title={`${cell.date}: ${cell.minutes}min`}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-emerald-900" />
              <div className="w-3 h-3 rounded-sm bg-emerald-700" />
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span>More</span>
            </div>
          </div>

          {/* Weekly bar chart */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Weekly Practice Minutes
            </h2>
            <div className="flex items-end gap-2 h-32">
              {weeklyTotals.map((week, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">{week.minutes}m</span>
                  <div className="w-full bg-gray-700 rounded-t-sm relative" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-emerald-500 rounded-t-sm transition-all duration-300"
                      style={{ height: `${(week.minutes / maxWeeklyMinutes) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{week.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 30-day per-skill breakdown */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              30-Day Breakdown
            </h2>
            <div className="space-y-3">
              {skillStats.map(({ skill, minutes, percentage }) => (
                <div key={skill.id} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: skill.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm truncate">{skill.name}</span>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">
                        {minutes}min ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: skill.color,
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
