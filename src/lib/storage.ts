import { AppData, BodyMetricEntry, DailyIntention, FocusSession, HabitChallenge, JournalEntry, NotificationSettings, Profile, QuickNote, SleepEntry, WeeklyPlan, YearlyVision } from './types';

const STORAGE_KEY = 'how-to-level-up';

const DEFAULT_PROFILE_ID = 'default-personal';

function createDefaultProfile(): Profile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Personal',
    createdAt: new Date().toISOString().split('T')[0],
  };
}

const defaultData: AppData = {
  profiles: [createDefaultProfile()],
  activeProfileId: DEFAULT_PROFILE_ID,
  habits: [],
  goals: [],
  dailyLogs: [],
  skills: [],
  journalEntries: [],
};

// Migrate old-format data (no profiles) to new format
function migrateData(raw: Record<string, unknown>): AppData {
  // Already migrated
  if (Array.isArray(raw.profiles) && raw.activeProfileId) {
    return raw as unknown as AppData;
  }

  // Old format: no profiles — migrate existing data into a default profile
  const profile = createDefaultProfile();
  const profileId = profile.id;

  const habits = (Array.isArray(raw.habits) ? raw.habits : []).map(
    (h: Record<string, unknown>) => ({ ...h, profileId: h.profileId || profileId })
  );
  const goals = (Array.isArray(raw.goals) ? raw.goals : []).map(
    (g: Record<string, unknown>) => ({ ...g, profileId: g.profileId || profileId })
  );
  const dailyLogs = (Array.isArray(raw.dailyLogs) ? raw.dailyLogs : []).map(
    (l: Record<string, unknown>) => ({ ...l, profileId: l.profileId || profileId })
  );
  const skills = (Array.isArray(raw.skills) ? raw.skills : []).map(
    (s: Record<string, unknown>) => ({ ...s, profileId: s.profileId || profileId })
  );

  return {
    profiles: [profile],
    activeProfileId: profileId,
    habits,
    goals,
    dailyLogs,
    skills,
    journalEntries: [],
  } as unknown as AppData;
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return defaultData;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData;
  try {
    const parsed = JSON.parse(raw);
    return migrateData(parsed);
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getActiveProfileId(): string {
  const data = loadData();
  return data.activeProfileId;
}

export function getActiveProfile(): Profile | undefined {
  const data = loadData();
  return data.profiles.find((p) => p.id === data.activeProfileId);
}

export function setActiveProfile(profileId: string): AppData {
  const data = loadData();
  const updated = { ...data, activeProfileId: profileId };
  saveData(updated);
  return updated;
}

export function createProfile(name: string): AppData {
  const data = loadData();
  const profile: Profile = {
    id: generateId(),
    name,
    createdAt: new Date().toISOString().split('T')[0],
  };
  if (!data.onboardingCompleted) data.onboardingCompleted = {};
  data.onboardingCompleted[profile.id] = false;
  const updated = {
    ...data,
    profiles: [...data.profiles, profile],
  };
  saveData(updated);
  return updated;
}

export function renameProfile(profileId: string, newName: string): AppData {
  const data = loadData();
  const updated = {
    ...data,
    profiles: data.profiles.map((p) =>
      p.id === profileId ? { ...p, name: newName } : p
    ),
  };
  saveData(updated);
  return updated;
}

export function deleteProfile(profileId: string): AppData {
  const data = loadData();
  if (data.profiles.length <= 1) return data;

  const updated: AppData = {
    ...data,
    profiles: data.profiles.filter((p) => p.id !== profileId),
    habits: data.habits.filter((h) => h.profileId !== profileId),
    goals: data.goals.filter((g) => g.profileId !== profileId),
    dailyLogs: data.dailyLogs.filter((l) => l.profileId !== profileId),
    skills: data.skills.filter((s) => s.profileId !== profileId),
  };

  // If the deleted profile was active, switch to the first remaining profile
  if (updated.activeProfileId === profileId) {
    updated.activeProfileId = updated.profiles[0].id;
  }

  saveData(updated);
  return updated;
}

// Helper to get data filtered by active profile
export function loadProfileData(data: AppData) {
  const pid = data.activeProfileId;
  return {
    habits: data.habits.filter((h) => h.profileId === pid),
    goals: data.goals.filter((g) => g.profileId === pid),
    dailyLogs: data.dailyLogs.filter((l) => l.profileId === pid),
    skills: data.skills.filter((s) => s.profileId === pid),
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function needsOnboarding(appData: AppData, profileId: string): boolean {
  return !appData.onboardingCompleted?.[profileId];
}

export function markOnboardingCompleted(profileId: string): void {
  const data = loadData();
  if (!data.onboardingCompleted) data.onboardingCompleted = {};
  data.onboardingCompleted[profileId] = true;
  saveData(data);
}

export function resetOnboarding(profileId: string): void {
  const data = loadData();
  if (data.onboardingCompleted) {
    delete data.onboardingCompleted[profileId];
    saveData(data);
  }
}

export function loadHabitNotes(): Record<string, Record<string, string>> {
  const data = loadData();
  return data.habitNotes ?? {};
}

export function saveHabitNote(habitId: string, date: string, note: string): void {
  const data = loadData();
  if (!data.habitNotes) data.habitNotes = {};
  if (!data.habitNotes[habitId]) data.habitNotes[habitId] = {};
  if (note.trim()) {
    data.habitNotes[habitId][date] = note.trim().slice(0, 140);
  } else {
    delete data.habitNotes[habitId][date];
  }
  saveData(data);
}

export function removeHabitNote(habitId: string, date: string): void {
  const data = loadData();
  if (data.habitNotes?.[habitId]) {
    delete data.habitNotes[habitId][date];
    saveData(data);
  }
}

const FOCUS_SESSIONS_KEY = 'focusSessions';

export function loadFocusSessions(): FocusSession[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(FOCUS_SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveFocusSession(session: FocusSession): void {
  if (typeof window === 'undefined') return;
  const sessions = loadFocusSessions();
  sessions.unshift(session);
  localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(sessions));
}

export function updateFocusSession(id: string, updates: Partial<FocusSession>): void {
  if (typeof window === 'undefined') return;
  const sessions = loadFocusSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], ...updates };
  localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(sessions));
}

export function clearFocusSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FOCUS_SESSIONS_KEY);
}

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';
const NOTIFIED_GOALS_KEY = 'notified-goals';
const NOTIFIED_GOALS_DATE_KEY = 'notified-goals-date';

const defaultNotificationSettings: NotificationSettings = {
  dailyReminder: false,
  dailyReminderTime: '20:00',
  goalAlerts: false,
  streakAlerts: false,
  focusSoundMuted: false,
};

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return defaultNotificationSettings;
  const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
  if (!raw) return defaultNotificationSettings;
  try {
    return { ...defaultNotificationSettings, ...JSON.parse(raw) };
  } catch {
    return defaultNotificationSettings;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

export function getNotifiedGoals(): string[] {
  if (typeof window === 'undefined') return [];
  clearDailyNotifications();
  const raw = localStorage.getItem(NOTIFIED_GOALS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function markGoalNotified(id: string): void {
  if (typeof window === 'undefined') return;
  const notified = getNotifiedGoals();
  if (!notified.includes(id)) {
    notified.push(id);
    localStorage.setItem(NOTIFIED_GOALS_KEY, JSON.stringify(notified));
    localStorage.setItem(NOTIFIED_GOALS_DATE_KEY, todayString());
  }
}

export function clearDailyNotifications(): void {
  if (typeof window === 'undefined') return;
  const storedDate = localStorage.getItem(NOTIFIED_GOALS_DATE_KEY);
  if (storedDate !== todayString()) {
    localStorage.removeItem(NOTIFIED_GOALS_KEY);
    localStorage.setItem(NOTIFIED_GOALS_DATE_KEY, todayString());
  }
}

// --- Habit Skip ---

export function skipHabit(habitId: string, date: string): void {
  const data = loadData();
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return;
  if (!habit.skippedDates) habit.skippedDates = [];
  if (!habit.skippedDates.includes(date)) {
    habit.skippedDates.push(date);
  }
  saveData(data);
}

export function unskipHabit(habitId: string, date: string): void {
  const data = loadData();
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit || !habit.skippedDates) return;
  habit.skippedDates = habit.skippedDates.filter((d) => d !== date);
  saveData(data);
}

export function isHabitSkipped(habitId: string, date: string): boolean {
  const data = loadData();
  const habit = data.habits.find((h) => h.id === habitId);
  return habit?.skippedDates?.includes(date) ?? false;
}

// --- Weekly Plans ---

export function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setDate(d.getDate() + 3); // Thursday of the week (ISO week)
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

export function loadWeeklyPlan(profileId: string, weekKey: string): WeeklyPlan | null {
  const data = loadData();
  return data.weeklyPlans?.[profileId]?.[weekKey] ?? null;
}

export function saveWeeklyPlan(profileId: string, weekKey: string, plan: WeeklyPlan): void {
  const data = loadData();
  if (!data.weeklyPlans) data.weeklyPlans = {};
  if (!data.weeklyPlans[profileId]) data.weeklyPlans[profileId] = {};
  data.weeklyPlans[profileId][weekKey] = plan;
  saveData(data);
}

// --- Daily Intentions ---

export function loadDailyIntention(date: string): DailyIntention | null {
  const data = loadData();
  const profileId = data.activeProfileId;
  return data.dailyIntentions?.[profileId]?.[date] ?? null;
}

export function saveDailyIntention(intention: DailyIntention): void {
  const data = loadData();
  const profileId = data.activeProfileId;
  const date = intention.createdAt.split('T')[0];
  if (!data.dailyIntentions) data.dailyIntentions = {};
  if (!data.dailyIntentions[profileId]) data.dailyIntentions[profileId] = {};
  data.dailyIntentions[profileId][date] = intention;
  saveData(data);
}

export function clearDailyIntention(date: string): void {
  const data = loadData();
  const profileId = data.activeProfileId;
  if (data.dailyIntentions?.[profileId]?.[date]) {
    delete data.dailyIntentions[profileId][date];
    saveData(data);
  }
}

export function loadAllDailyIntentions(): Record<string, DailyIntention> {
  const data = loadData();
  const profileId = data.activeProfileId;
  return data.dailyIntentions?.[profileId] ?? {};
}

// --- Journal Entries ---

export function loadJournalEntry(date: string, profileId: string): JournalEntry | null {
  const data = loadData();
  const entries = data.journalEntries ?? [];
  return entries.find((e) => e.date === date && e.profileId === profileId) ?? null;
}

export function saveJournalEntry(entry: JournalEntry): void {
  const data = loadData();
  if (!data.journalEntries) data.journalEntries = [];
  const idx = data.journalEntries.findIndex(
    (e) => e.date === entry.date && e.profileId === entry.profileId
  );
  if (idx >= 0) {
    data.journalEntries[idx] = entry;
  } else {
    data.journalEntries.push(entry);
  }
  saveData(data);
}

export function loadJournalEntriesForMonth(month: number, year: number, profileId: string): JournalEntry[] {
  const data = loadData();
  const entries = data.journalEntries ?? [];
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return entries.filter((e) => e.profileId === profileId && e.date.startsWith(prefix));
}

export function loadAllJournalEntries(profileId: string): JournalEntry[] {
  const data = loadData();
  const entries = data.journalEntries ?? [];
  return entries
    .filter((e) => e.profileId === profileId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// --- Habit Challenges ---

export function loadChallenges(): HabitChallenge[] {
  const data = loadData();
  return data.challenges ?? [];
}

export function saveChallenge(challenge: HabitChallenge): void {
  const data = loadData();
  if (!data.challenges) data.challenges = [];
  const idx = data.challenges.findIndex((c) => c.id === challenge.id);
  if (idx >= 0) {
    data.challenges[idx] = challenge;
  } else {
    data.challenges.push(challenge);
  }
  saveData(data);
}

export function deleteChallenge(id: string): void {
  const data = loadData();
  if (data.challenges) {
    data.challenges = data.challenges.filter((c) => c.id !== id);
    saveData(data);
  }
}

export function getActiveChallenges(): HabitChallenge[] {
  const challenges = loadChallenges();
  return challenges.filter((c) => c.status === 'active');
}

export function getUpcomingChallenges(): HabitChallenge[] {
  const today = todayString();
  const challenges = loadChallenges();
  return challenges.filter((c) => c.status === 'active' && c.startDate > today);
}

export function getChallengeCompletionRate(challengeId: string, date: string): number {
  const data = loadData();
  const challenge = data.challenges?.find((c) => c.id === challengeId);
  if (!challenge) return 0;

  // Days from startDate to min(endDate, date or today)
  const today = todayString();
  const endDay = date > today ? today : date;
  if (endDay < challenge.startDate) return 100; // before start

  // Count total challenge days up to endDay
  const totalDays = countDaysBetween(challenge.startDate, endDay) + 1;
  if (totalDays <= 0) return 0;

  // Count days where ALL habits were completed (or skipped)
  let perfectDays = 0;
  for (let i = 0; i < totalDays; i++) {
    const day = addDays(challenge.startDate, i);
    const allDone = challenge.habitIds.every((habitId) => {
      const habit = data.habits.find((h) => h.id === habitId);
      if (!habit) return false;
      return !!habit.completions[day] || habit.skippedDates?.includes(day);
    });
    if (allDone) perfectDays++;
  }

  return Math.round((perfectDays / totalDays) * 100);
}

function countDaysBetween(start: string, end: string): number {
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function checkAndCloseChallenge(id: string): void {
  const data = loadData();
  const challenge = data.challenges?.find((c) => c.id === id);
  if (!challenge || challenge.status !== 'active') return;

  const today = todayString();
  if (today > challenge.endDate) {
    // Challenge ended — mark as completed if good rate, else abandoned
    const rate = getChallengeCompletionRate(id, challenge.endDate);
    challenge.status = rate >= 50 ? 'completed' : 'abandoned';
    saveData(data);
  }
}

// --- Yearly Vision ---

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function loadYearlyVision(profileId: string, year?: number): YearlyVision | null {
  const data = loadData();
  const vision = data.yearlyVision?.[profileId] ?? null;
  // If year is specified and vision year doesn't match, return null
  if (vision && year !== undefined && vision.year !== year) return null;
  return vision;
}

export function saveYearlyVision(profileId: string, vision: YearlyVision): void {
  const data = loadData();
  if (!data.yearlyVision) data.yearlyVision = {};
  data.yearlyVision[profileId] = vision;
  saveData(data);
}

export function createDefaultYearlyVision(profileId: string, year: number): YearlyVision {
  const now = new Date().toISOString();
  return {
    year,
    identityStatements: [],
    annualGoals: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Sleep tracking helpers

export function loadSleepEntry(date: string, profileId: string): SleepEntry | null {
  const data = loadData();
  const entries = data.sleepEntries ?? [];
  return entries.find(e => e.date === date && e.profileId === profileId) ?? null;
}

export function saveSleepEntry(entry: SleepEntry): void {
  const data = loadData();
  if (!data.sleepEntries) data.sleepEntries = [];
  const idx = data.sleepEntries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    data.sleepEntries[idx] = entry;
  } else {
    data.sleepEntries.push(entry);
  }
  saveData(data);
}

export function loadSleepEntriesForWeek(weekStart: string, profileId: string): SleepEntry[] {
  const data = loadData();
  const entries = data.sleepEntries ?? [];
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return entries.filter(e => {
    if (e.profileId !== profileId) return false;
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

export function loadAllSleepEntries(profileId: string): SleepEntry[] {
  const data = loadData();
  return (data.sleepEntries ?? []).filter(e => e.profileId === profileId);
}

// --- Quick Notes ---

export function createQuickNote(profileId: string, content: string): QuickNote {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    profileId,
    content: content.trim(),
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveQuickNote(note: QuickNote): void {
  const data = loadData();
  if (!data.quickNotes) data.quickNotes = [];
  const idx = data.quickNotes.findIndex(n => n.id === note.id);
  if (idx >= 0) {
    data.quickNotes[idx] = { ...note, updatedAt: new Date().toISOString() };
  } else {
    data.quickNotes.push(note);
  }
  saveData(data);
}

export function deleteQuickNote(id: string): void {
  const data = loadData();
  if (data.quickNotes) {
    data.quickNotes = data.quickNotes.filter(n => n.id !== id);
    saveData(data);
  }
}

export function loadQuickNotes(profileId: string): QuickNote[] {
  const data = loadData();
  const notes = (data.quickNotes ?? []).filter(n => n.profileId === profileId);
  // Sort: pinned first, then by updatedAt descending
  return notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function togglePinQuickNote(id: string): void {
  const data = loadData();
  const note = data.quickNotes?.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  saveData(data);
}

// --- Body Metrics ---

export function createDefaultBodyMetricEntry(profileId: string, date: string): BodyMetricEntry {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    profileId,
    date,
    weight: undefined,
    bodyFat: undefined,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function loadBodyMetricEntry(date: string, profileId: string): BodyMetricEntry | null {
  const data = loadData();
  const entries = data.bodyMetrics ?? [];
  return entries.find(e => e.date === date && e.profileId === profileId) ?? null;
}

export function saveBodyMetricEntry(entry: BodyMetricEntry): void {
  const data = loadData();
  if (!data.bodyMetrics) data.bodyMetrics = [];
  const idx = data.bodyMetrics.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    data.bodyMetrics[idx] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    data.bodyMetrics.push(entry);
  }
  saveData(data);
}

export function deleteBodyMetricEntry(id: string): void {
  const data = loadData();
  if (data.bodyMetrics) {
    data.bodyMetrics = data.bodyMetrics.filter(e => e.id !== id);
    saveData(data);
  }
}

export function loadAllBodyMetricEntries(profileId: string): BodyMetricEntry[] {
  const data = loadData();
  const entries = data.bodyMetrics ?? [];
  return entries
    .filter(e => e.profileId === profileId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
