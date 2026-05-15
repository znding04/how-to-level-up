import { AppData, NotificationSettings } from './types';

const STORAGE_KEY = 'how-to-level-up';

const defaultData: AppData = {
  habits: [],
  goals: [],
  dailyLogs: [],
  skills: [],
};

export function loadData(): AppData {
  if (typeof window === 'undefined') return defaultData;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData;
  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';
const NOTIFIED_GOALS_KEY = 'notified-goals';
const NOTIFIED_GOALS_DATE_KEY = 'notified-goals-date';

const defaultNotificationSettings: NotificationSettings = {
  dailyReminder: false,
  dailyReminderTime: '20:00',
  goalAlerts: false,
  streakAlerts: false,
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
