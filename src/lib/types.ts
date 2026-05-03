export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  color: string;
  createdAt: string;
  completions: Record<string, boolean>;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
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
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface Skill {
  id: string;
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

export interface AppData {
  habits: Habit[];
  goals: Goal[];
  dailyLogs: DailyLog[];
  skills: Skill[];
}
