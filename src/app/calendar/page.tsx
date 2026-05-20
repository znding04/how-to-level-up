'use client';

import { useState, useMemo } from 'react';
import { loadData, loadProfileData } from '@/lib/storage';
import { Habit, Goal, DailyLog, Skill } from '@/lib/types';

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
const ENERGY_EMOJI: Record<number, string> = { 1: '🪫', 2: '😴', 3: '😐', 4: '⚡', 5: '🔥' };
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface CalendarDay {
  day: number;
  month: number;
  year: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildCalendarDays(year: number, month: number, todayKey: string): CalendarDay[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: CalendarDay[] = [];

  // Previous month fill
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDaysInMonth - i;
    days.push({
      day: d, month: prevMonth, year: prevYear,
      dateKey: formatDateKey(prevYear, prevMonth, d),
      isCurrentMonth: false, isToday: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    days.push({
      day: d, month, year,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  // Next month fill
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push({
        day: d, month: nextMonth, year: nextYear,
        dateKey: formatDateKey(nextYear, nextMonth, d),
        isCurrentMonth: false, isToday: false,
      });
    }
  }

  return days;
}

export default function CalendarPage() {
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()), [now]);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { habits, goals, dailyLogs, skills } = useMemo(() => {
    if (typeof window === 'undefined') return { habits: [] as Habit[], goals: [] as Goal[], dailyLogs: [] as DailyLog[], skills: [] as Skill[] };
    const data = loadData();
    return loadProfileData(data);
  }, []);

  // Index daily logs by date
  const logsByDate = useMemo(() => {
    const map: Record<string, DailyLog> = {};
    for (const log of dailyLogs) map[log.date] = log;
    return map;
  }, [dailyLogs]);

  // Index skill sessions by date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, { skill: Skill; durationMinutes: number; notes: string }[]> = {};
    for (const skill of skills) {
      for (const session of skill.sessions) {
        if (!map[session.date]) map[session.date] = [];
        map[session.date].push({ skill, durationMinutes: session.durationMinutes, notes: session.notes });
      }
    }
    return map;
  }, [skills]);

  // Goal milestones don't have completion dates in the type, so we can't show them per-day
  // We'll show goals with target dates on their target date

  const calendarDays = useMemo(() => buildCalendarDays(viewYear, viewMonth, todayKey), [viewYear, viewMonth, todayKey]);

  function goToPrevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function goToToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  function getHabitsCompletedOnDate(dateKey: string) {
    return habits.filter((h) => h.completions[dateKey]);
  }

  function getGoalsWithTargetDate(dateKey: string) {
    return goals.filter((g) => g.targetDate === dateKey);
  }

  const selectedLog = selectedDate ? logsByDate[selectedDate] : null;
  const selectedHabits = selectedDate ? habits.map((h) => ({ ...h, completed: !!h.completions[selectedDate] })) : [];
  const selectedSessions = selectedDate ? (sessionsByDate[selectedDate] || []) : [];
  const selectedGoals = selectedDate ? getGoalsWithTargetDate(selectedDate) : [];

  function formatSelectedDate(dateKey: string): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-surface transition-colors text-fg-secondary hover:text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth()) && (
            <button onClick={goToToday} className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded transition-colors">
              Today
            </button>
          )}
        </div>
        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-surface transition-colors text-fg-secondary hover:text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs text-fg-muted font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-card-border rounded-lg overflow-hidden">
        {calendarDays.map((cd, i) => {
          const completedHabits = getHabitsCompletedOnDate(cd.dateKey);
          const log = logsByDate[cd.dateKey];
          const hasGoalTarget = getGoalsWithTargetDate(cd.dateKey).length > 0;
          const hasSessions = !!sessionsByDate[cd.dateKey];
          const isSelected = selectedDate === cd.dateKey;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : cd.dateKey)}
              className={`bg-card p-1 min-h-[4rem] text-left flex flex-col transition-colors ${
                !cd.isCurrentMonth ? 'opacity-40' : ''
              } ${cd.isToday ? 'ring-2 ring-blue-500 ring-inset' : ''} ${
                isSelected ? 'bg-surface' : 'hover:bg-surface'
              }`}
            >
              <span className={`text-xs font-medium ${cd.isToday ? 'text-blue-400' : 'text-fg-secondary'}`}>
                {cd.day}
              </span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {completedHabits.slice(0, 4).map((h) => (
                  <span key={h.id} className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: h.color }} />
                ))}
                {completedHabits.length > 4 && (
                  <span className="text-[8px] text-fg-muted">+{completedHabits.length - 4}</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 mt-auto">
                {log && <span className="text-[10px] leading-none">{MOOD_EMOJI[log.mood]}</span>}
                {log && <span className="text-[10px] leading-none">{ENERGY_EMOJI[log.energy]}</span>}
                {hasGoalTarget && <span className="text-[10px] leading-none">🎯</span>}
                {hasSessions && <span className="text-[10px] leading-none">📚</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 bg-card border border-card-border rounded-xl p-3">
        <h3 className="text-xs font-semibold text-fg-secondary mb-2">Legend</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-secondary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Habit done
          </span>
          <span>😞😕😐🙂😄 Mood</span>
          <span>🪫😴😐⚡🔥 Energy</span>
          <span>🎯 Goal target</span>
          <span>📚 Skill session</span>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <div className="mt-4 bg-card border border-card-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{formatSelectedDate(selectedDate)}</h2>
            <button onClick={() => setSelectedDate(null)} className="text-fg-muted hover:text-foreground transition-colors text-lg">&times;</button>
          </div>

          {/* Habits */}
          <div>
            <h3 className="text-sm font-semibold text-fg-secondary mb-2">Habits</h3>
            {selectedHabits.length === 0 ? (
              <p className="text-xs text-fg-muted">No habits tracked</p>
            ) : (
              <div className="space-y-1">
                {selectedHabits.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: h.color }} />
                    <span className={h.completed ? 'text-green-400' : 'text-fg-muted'}>{h.name}</span>
                    <span className="text-xs">{h.completed ? '✓' : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Log */}
          <div>
            <h3 className="text-sm font-semibold text-fg-secondary mb-2">Daily Log</h3>
            {selectedLog ? (
              <div className="space-y-1 text-sm">
                <div>Mood: {MOOD_EMOJI[selectedLog.mood]} <span className="text-fg-muted">({selectedLog.mood}/5)</span></div>
                <div>Energy: {ENERGY_EMOJI[selectedLog.energy]} <span className="text-fg-muted">({selectedLog.energy}/5)</span></div>
                {selectedLog.notes && <div className="text-fg-secondary mt-1">{selectedLog.notes}</div>}
              </div>
            ) : (
              <p className="text-xs text-fg-muted">No log for this day</p>
            )}
          </div>

          {/* Goals */}
          {selectedGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-fg-secondary mb-2">Goals</h3>
              <div className="space-y-1">
                {selectedGoals.map((g) => (
                  <div key={g.id} className="text-sm">
                    <span className="text-fg-secondary">🎯 {g.title}</span>
                    <span className={`text-xs ml-2 ${g.status === 'completed' ? 'text-green-400' : 'text-fg-muted'}`}>
                      ({g.status})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Sessions */}
          {selectedSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-fg-secondary mb-2">Skill Sessions</h3>
              <div className="space-y-1">
                {selectedSessions.map((s, i) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.skill.color }} />
                    <span>{s.skill.name}</span>
                    <span className="text-fg-muted text-xs">{s.durationMinutes}min</span>
                    {s.notes && <span className="text-fg-muted text-xs">— {s.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom padding for tab nav */}
      <div className="h-20" />
    </div>
  );
}
