import { AppData } from './types';

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
