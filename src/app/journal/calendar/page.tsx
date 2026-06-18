'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { loadData, loadJournalEntriesForMonth } from '@/lib/storage';
import { JournalMood } from '@/lib/types';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MOOD_EMOJI: Record<JournalMood, string> = {
  terrible: '😞',
  bad: '😕',
  okay: '😐',
  good: '🙂',
  great: '😊',
};

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
      day: d,
      dateKey: formatDateKey(prevYear, prevMonth, d),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    days.push({
      day: d,
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
        day: d,
        dateKey: formatDateKey(nextYear, nextMonth, d),
        isCurrentMonth: false,
        isToday: false,
      });
    }
  }

  return days;
}

export default function JournalCalendarPage() {
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()), [now]);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const profileId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return loadData().activeProfileId;
  }, []);

  // Load entries for current, previous, and next months (to cover fill days)
  const entryDates = useMemo(() => {
    if (!profileId) return new Map<string, JournalMood | undefined>();
    const map = new Map<string, JournalMood | undefined>();

    const months = [
      // Previous month
      { m: viewMonth === 0 ? 11 : viewMonth - 1, y: viewMonth === 0 ? viewYear - 1 : viewYear },
      // Current month
      { m: viewMonth, y: viewYear },
      // Next month
      { m: viewMonth === 11 ? 0 : viewMonth + 1, y: viewMonth === 11 ? viewYear + 1 : viewYear },
    ];

    for (const { m, y } of months) {
      for (const entry of loadJournalEntriesForMonth(m + 1, y, profileId)) {
        if (entry.content.trim()) {
          map.set(entry.date, entry.mood);
        }
      }
    }

    return map;
  }, [profileId, viewMonth, viewYear]);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/journal" className="text-sm text-blue-400 hover:text-blue-300">
          ← Back to Journal
        </Link>
        <h1 className="text-xl font-bold">Journal Calendar</h1>
        <div className="w-20" />
      </div>

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
          const hasEntry = entryDates.has(cd.dateKey);
          const mood = entryDates.get(cd.dateKey);

          return (
            <Link
              key={i}
              href={`/journal?date=${cd.dateKey}`}
              className={`bg-card p-1 min-h-[4rem] text-left flex flex-col items-center transition-colors ${
                !cd.isCurrentMonth ? 'opacity-40' : ''
              } ${cd.isToday ? 'ring-2 ring-blue-500 ring-inset' : ''} hover:bg-surface`}
            >
              <span className={`text-xs font-medium ${cd.isToday ? 'text-blue-400' : 'text-fg-secondary'}`}>
                {cd.day}
              </span>
              {hasEntry && (
                <div className="flex flex-col items-center mt-auto mb-1 gap-0.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  {mood && <span className="text-[10px] leading-none">{MOOD_EMOJI[mood]}</span>}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 bg-card border border-card-border rounded-xl p-3">
        <h3 className="text-xs font-semibold text-fg-secondary mb-2">Legend</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-secondary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Has journal entry
          </span>
          <span>😞😕😐🙂😊 Mood</span>
        </div>
      </div>

      {/* Bottom padding for tab nav */}
      <div className="h-20" />
    </div>
  );
}
