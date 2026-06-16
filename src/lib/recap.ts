import { AppData, Habit, FocusSession } from './types';
import { loadProfileData, loadFocusSessions, todayString } from './storage';

interface RecapData {
  dateRange: string;
  habitsCompleted: number;
  habitsScheduled: number;
  avgMood: number | null;
  avgEnergy: number | null;
  skillMinutes: { name: string; minutes: number }[];
  milestonesCompleted: number;
  focusCount: number;
  focusTotalMinutes: number;
  streakHighlights: { name: string; streak: number }[];
}

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getHabitStreak(habit: Habit): number {
  const today = new Date();
  let streak = 0;
  const currentDate = new Date(today);
  const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
  const todayStr = today.toISOString().split('T')[0];
  const todayDay = today.getDay();

  if (scheduled.includes(todayDay) && !habit.completions[todayStr]) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

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

function gatherRecapData(appData: AppData, mode: 'today' | 'week'): RecapData {
  const profileData = loadProfileData(appData);
  const focusSessions = loadFocusSessions();
  const today = todayString();
  const weekDates = getWeekDates();
  const dates = mode === 'today' ? [today] : weekDates;

  // Habits
  let habitsCompleted = 0;
  let habitsScheduled = 0;
  for (const habit of profileData.habits) {
    const scheduled = habit.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
    for (const dateStr of dates) {
      const d = new Date(dateStr + 'T00:00:00');
      if (scheduled.includes(d.getDay())) {
        habitsScheduled++;
        if (habit.completions[dateStr]) {
          habitsCompleted++;
        }
      }
    }
  }

  // Mood & Energy
  const logs = profileData.dailyLogs.filter((l) => dates.includes(l.date));
  const avgMood = logs.length > 0 ? logs.reduce((s, l) => s + l.mood, 0) / logs.length : null;
  const avgEnergy = logs.length > 0 ? logs.reduce((s, l) => s + l.energy, 0) / logs.length : null;

  // Skills
  const skillMinutes: { name: string; minutes: number }[] = [];
  for (const skill of profileData.skills) {
    const mins = skill.sessions
      .filter((s) => dates.includes(s.date))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    if (mins > 0) {
      skillMinutes.push({ name: skill.name, minutes: mins });
    }
  }
  skillMinutes.sort((a, b) => b.minutes - a.minutes);

  // Goals milestones completed (total completed milestones across active goals)
  const milestonesCompleted = profileData.goals
    .filter((g) => g.status === 'active')
    .reduce((sum, g) => sum + g.milestones.filter((m) => m.completed).length, 0);

  // Focus sessions
  const relevantFocus = focusSessions.filter((fs: FocusSession) => dates.includes(fs.date));
  const focusCount = relevantFocus.length;
  const focusTotalMinutes = relevantFocus.reduce((sum: number, fs: FocusSession) => sum + fs.durationMinutes, 0);

  // Streak highlights (7+ days)
  const streakHighlights: { name: string; streak: number }[] = [];
  for (const habit of profileData.habits) {
    const streak = getHabitStreak(habit);
    if (streak >= 7) {
      streakHighlights.push({ name: habit.name, streak });
    }
  }
  streakHighlights.sort((a, b) => b.streak - a.streak);

  const dateRange =
    mode === 'today'
      ? today
      : `${weekDates[0]} to ${weekDates[6]}`;

  return {
    dateRange,
    habitsCompleted,
    habitsScheduled,
    avgMood,
    avgEnergy,
    skillMinutes,
    milestonesCompleted,
    focusCount,
    focusTotalMinutes,
    streakHighlights,
  };
}

const CLOSING_LINES = [
  'Keep showing up — consistency beats intensity.',
  'Small steps, big results. Keep going!',
  'Every day you show up is a win.',
  'Progress is progress, no matter how small.',
  'You are building something great, one day at a time.',
  'The best time to start was yesterday. The next best time is now.',
  'Discipline is choosing between what you want now and what you want most.',
];

function getClosingLine(): string {
  const idx = Math.floor(Math.random() * CLOSING_LINES.length);
  return CLOSING_LINES[idx];
}

const moodLabels: Record<number, string> = { 1: 'Very Low', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };

export function generateRecap(appData: AppData, mode: 'today' | 'week'): string {
  const data = gatherRecapData(appData, mode);
  const title = mode === 'today' ? 'Daily Recap' : 'Weekly Recap';
  const lines: string[] = [];

  lines.push(`--- ${title} ---`);
  lines.push(data.dateRange);
  lines.push('');

  // Habits
  const habitPct = data.habitsScheduled > 0 ? Math.round((data.habitsCompleted / data.habitsScheduled) * 100) : 0;
  lines.push(`Habits: ${data.habitsCompleted}/${data.habitsScheduled} completed (${habitPct}%)`);

  // Mood & Energy
  if (data.avgMood !== null && data.avgEnergy !== null) {
    lines.push(`Mood: ${data.avgMood.toFixed(1)}/5 (${moodLabels[Math.round(data.avgMood)] ?? ''})`);
    lines.push(`Energy: ${data.avgEnergy.toFixed(1)}/5`);
  } else {
    lines.push('Mood & Energy: No check-ins logged');
  }

  // Skills
  if (data.skillMinutes.length > 0) {
    lines.push('');
    lines.push('Skills practiced:');
    for (const s of data.skillMinutes) {
      const display = s.minutes >= 60 ? `${(s.minutes / 60).toFixed(1)}h` : `${s.minutes}m`;
      lines.push(`  - ${s.name}: ${display}`);
    }
  }

  // Goals milestones
  if (data.milestonesCompleted > 0) {
    lines.push('');
    lines.push(`Goal milestones completed: ${data.milestonesCompleted}`);
  }

  // Focus sessions
  if (data.focusCount > 0) {
    const display = data.focusTotalMinutes >= 60
      ? `${(data.focusTotalMinutes / 60).toFixed(1)}h`
      : `${data.focusTotalMinutes}m`;
    lines.push(`Focus sessions: ${data.focusCount} (${display} total)`);
  }

  // Streak highlights
  if (data.streakHighlights.length > 0) {
    lines.push('');
    lines.push('Streak highlights:');
    for (const s of data.streakHighlights) {
      lines.push(`  - ${s.name}: ${s.streak}-day streak`);
    }
  }

  lines.push('');
  lines.push(getClosingLine());

  return lines.join('\n');
}
