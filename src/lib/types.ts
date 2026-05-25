export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  profileId: string;
  name: string;
  frequency: 'daily' | 'weekly';
  scheduledDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  color: string;
  createdAt: string;
  completions: Record<string, boolean>;
}

export type GoalCategory = 'career' | 'health' | 'learning' | 'personal' | 'financial' | 'creative';

export interface Goal {
  id: string;
  profileId: string;
  title: string;
  description: string;
  targetDate: string;
  category?: GoalCategory;
  milestones: Milestone[];
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface DailyLog {
  id: string;
  profileId: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface Skill {
  id: string;
  profileId: string;
  name: string;
  color: string;
  sessions: SkillSession[];
  createdAt: string;
}

export interface SkillSession {
  id: string;
  date: string;
  durationMinutes: number;
  notes: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  category: 'habits' | 'goals' | 'daily' | 'skills' | 'streaks' | 'milestones';
}

export interface NotificationSettings {
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:MM
  goalAlerts: boolean;
  streakAlerts: boolean;
}

export interface AppData {
  profiles: Profile[];
  activeProfileId: string;
  habits: Habit[];
  goals: Goal[];
  dailyLogs: DailyLog[];
  skills: Skill[];
  achievements?: Record<string, Achievement[]>; // profileId -> unlocked achievements
}
