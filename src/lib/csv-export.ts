import { AppData, getSkillLevel } from './types';
import { loadFocusSessions } from './storage';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHabitsCsv(data: AppData, profileId: string): void {
  const habits = data.habits.filter((h) => h.profileId === profileId);
  if (habits.length === 0) return;

  // Collect all dates across all habits
  const allDates = new Set<string>();
  for (const habit of habits) {
    for (const date of Object.keys(habit.completions)) {
      allDates.add(date);
    }
    if (habit.skippedDates) {
      for (const date of habit.skippedDates) {
        allDates.add(date);
      }
    }
  }
  const sortedDates = Array.from(allDates).sort();
  if (sortedDates.length === 0) return;

  const header = ['Habit', 'Category', 'Frequency', 'Scheduled Days', ...sortedDates];
  const rows = [toCsvRow(header)];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const habit of habits) {
    const scheduledStr = habit.scheduledDays
      ? habit.scheduledDays.map((d) => dayNames[d]).join('/')
      : 'All';
    const fields = [
      habit.name,
      habit.category ?? '',
      habit.frequency,
      scheduledStr,
    ];
    for (const date of sortedDates) {
      if (habit.completions[date]) {
        fields.push('done');
      } else if (habit.skippedDates?.includes(date)) {
        fields.push('skipped');
      } else {
        fields.push('');
      }
    }
    rows.push(toCsvRow(fields));
  }

  downloadCsv(`habits-export-${new Date().toISOString().split('T')[0]}.csv`, rows.join('\n'));
}

export function exportSkillsCsv(data: AppData, profileId: string): void {
  const skills = data.skills.filter((s) => s.profileId === profileId);
  if (skills.length === 0) return;

  const header = ['Skill', 'Category', 'Total Hours', 'Level', 'Sessions', 'Date', 'Minutes', 'Notes'];
  const rows = [toCsvRow(header)];

  for (const skill of skills) {
    const totalMin = skill.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const levelInfo = getSkillLevel(totalMin);

    if (skill.sessions.length === 0) {
      rows.push(toCsvRow([
        skill.name,
        skill.category ?? '',
        levelInfo.totalHours.toFixed(1),
        levelInfo.label,
        '0',
        '',
        '',
        '',
      ]));
    } else {
      for (let i = 0; i < skill.sessions.length; i++) {
        const session = skill.sessions[i];
        rows.push(toCsvRow([
          i === 0 ? skill.name : '',
          i === 0 ? (skill.category ?? '') : '',
          i === 0 ? levelInfo.totalHours.toFixed(1) : '',
          i === 0 ? levelInfo.label : '',
          i === 0 ? String(skill.sessions.length) : '',
          session.date,
          String(session.durationMinutes),
          session.notes,
        ]));
      }
    }
  }

  downloadCsv(`skills-export-${new Date().toISOString().split('T')[0]}.csv`, rows.join('\n'));
}

export function exportDailyLogsCsv(data: AppData, profileId: string): void {
  const logs = data.dailyLogs
    .filter((l) => l.profileId === profileId)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (logs.length === 0) return;

  const header = ['Date', 'Mood (1-5)', 'Energy (1-5)', 'Notes'];
  const rows = [toCsvRow(header)];

  for (const log of logs) {
    rows.push(toCsvRow([
      log.date,
      String(log.mood),
      String(log.energy),
      log.notes,
    ]));
  }

  downloadCsv(`daily-logs-export-${new Date().toISOString().split('T')[0]}.csv`, rows.join('\n'));
}

export function exportFocusSessionsCsv(): void {
  const sessions = loadFocusSessions();
  if (sessions.length === 0) return;

  const header = ['Date', 'Skill', 'Duration (min)', 'Rating', 'Note'];
  const rows = [toCsvRow(header)];

  for (const session of sessions) {
    rows.push(toCsvRow([
      session.date,
      session.skillName,
      String(session.durationMinutes),
      session.rating ? String(session.rating) : '',
      session.sessionNote ?? session.note ?? '',
    ]));
  }

  downloadCsv(`focus-sessions-export-${new Date().toISOString().split('T')[0]}.csv`, rows.join('\n'));
}
