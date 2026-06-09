import { AppData, FocusSession, NotificationSettings, Profile, WeeklyPlan } from './types';

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
  } as AppData;
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
