const HABIT_PATTERNS_KEY = 'habit-patterns';

interface CompletionEntry {
  hour: number;
  timestamp: number; // ms since epoch
}

interface HabitPatternData {
  completions: CompletionEntry[];
}

type HabitPatternsMap = Record<string, HabitPatternData>;

function loadPatterns(): HabitPatternsMap {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(HABIT_PATTERNS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePatterns(patterns: HabitPatternsMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HABIT_PATTERNS_KEY, JSON.stringify(patterns));
}

function pruneOldEntries(entries: CompletionEntry[]): CompletionEntry[] {
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.timestamp >= fourteenDaysAgo);
}

export function recordHabitCompletion(habitId: string, hour: number): void {
  const patterns = loadPatterns();
  const data = patterns[habitId] ?? { completions: [] };
  data.completions = pruneOldEntries(data.completions);
  data.completions.push({ hour, timestamp: Date.now() });
  patterns[habitId] = data;
  savePatterns(patterns);
}

export function getOptimalReminderTime(habitId: string): string | null {
  const patterns = loadPatterns();
  const data = patterns[habitId];
  if (!data) return null;

  const recent = pruneOldEntries(data.completions);
  if (recent.length < 5) return null;

  // Count frequency per hour
  const hourCounts: Record<number, number> = {};
  for (const entry of recent) {
    hourCounts[entry.hour] = (hourCounts[entry.hour] ?? 0) + 1;
  }

  // Find the hour with highest count
  let bestHour = 0;
  let bestCount = 0;
  for (const [hourStr, count] of Object.entries(hourCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestHour = Number(hourStr);
    }
  }

  return `${String(bestHour).padStart(2, '0')}:00`;
}

export function getHabitCompletionPattern(
  habitId: string
): { hour: number; count: number }[] {
  const patterns = loadPatterns();
  const data = patterns[habitId];
  if (!data) return [];

  const recent = pruneOldEntries(data.completions);
  const hourCounts: Record<number, number> = {};
  for (const entry of recent) {
    hourCounts[entry.hour] = (hourCounts[entry.hour] ?? 0) + 1;
  }

  return Object.entries(hourCounts)
    .map(([hourStr, count]) => ({ hour: Number(hourStr), count }))
    .sort((a, b) => a.hour - b.hour);
}

export function clearPatternData(habitId: string): void {
  const patterns = loadPatterns();
  delete patterns[habitId];
  savePatterns(patterns);
}

// Per-habit reminder settings
export interface HabitReminderSettings {
  useSmartTime: boolean;
  customTime: string; // HH:MM
  muted: boolean;
}

const DEFAULT_HABIT_REMINDER: HabitReminderSettings = {
  useSmartTime: true,
  customTime: '09:00',
  muted: false,
};

export function loadHabitReminderSettings(
  habitId: string
): HabitReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_HABIT_REMINDER;
  const raw = localStorage.getItem(`habit-reminders-${habitId}`);
  if (!raw) return DEFAULT_HABIT_REMINDER;
  try {
    return { ...DEFAULT_HABIT_REMINDER, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HABIT_REMINDER;
  }
}

export function saveHabitReminderSettings(
  habitId: string,
  settings: HabitReminderSettings
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    `habit-reminders-${habitId}`,
    JSON.stringify(settings)
  );
}
