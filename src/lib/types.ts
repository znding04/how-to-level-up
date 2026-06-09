export interface Profile {
  id: string;
  name: string;
  createdAt: string;
}

export type HabitCategory = 'health' | 'work' | 'learning' | 'personal' | 'fitness' | 'mindfulness';

export interface Habit {
  id: string;
  profileId: string;
  name: string;
  frequency: 'daily' | 'weekly';
  scheduledDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  color: string;
  category?: HabitCategory;
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

export type SkillCategory = 'health' | 'fitness' | 'learning' | 'work' | 'creative' | 'mindfulness';

export const SKILL_CATEGORY_CONFIG: { value: SkillCategory; label: string; icon: string; color: string }[] = [
  { value: 'health', label: 'Health', icon: '💪', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'fitness', label: 'Fitness', icon: '🏃', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'learning', label: 'Learning', icon: '📚', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'work', label: 'Work', icon: '💼', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'creative', label: 'Creative', icon: '🎨', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'mindfulness', label: 'Mindfulness', icon: '🧘', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

export interface Skill {
  id: string;
  profileId: string;
  name: string;
  color: string;
  category?: SkillCategory;
  sessions: SkillSession[];
  createdAt: string;
}

export interface SkillSession {
  id: string;
  date: string;
  durationMinutes: number;
  notes: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';

export const SKILL_LEVELS: { key: SkillLevel; label: string; minHours: number; color: string }[] = [
  { key: 'beginner', label: 'Beginner', minHours: 0, color: 'text-gray-400' },
  { key: 'intermediate', label: 'Intermediate', minHours: 10, color: 'text-blue-400' },
  { key: 'advanced', label: 'Advanced', minHours: 30, color: 'text-purple-400' },
  { key: 'expert', label: 'Expert', minHours: 60, color: 'text-orange-400' },
  { key: 'master', label: 'Master', minHours: 120, color: 'text-pink-400' },
];

export function getSkillLevel(totalMinutes: number): { level: SkillLevel; label: string; color: string; xpPercent: number; totalHours: number; nextLevelHours: number } {
  const totalHours = totalMinutes / 60;
  let level = SKILL_LEVELS[0];
  for (let i = SKILL_LEVELS.length - 1; i >= 0; i--) {
    if (totalHours >= SKILL_LEVELS[i].minHours) {
      level = SKILL_LEVELS[i];
      break;
    }
  }
  const idx = SKILL_LEVELS.findIndex(l => l.key === level.key);
  const nextLevel = SKILL_LEVELS[idx + 1];
  const hoursInLevel = totalHours - level.minHours;
  const xpPercent = nextLevel
    ? Math.min(100, (hoursInLevel / (nextLevel.minHours - level.minHours)) * 100)
    : 100;
  return { level: level.key, label: level.label, color: level.color, xpPercent, totalHours, nextLevelHours: nextLevel?.minHours ?? level.minHours };
}

export interface FocusSession {
  id: string;
  skillId: string;
  skillName: string;
  skillColor: string;
  date: string;
  durationMinutes: number;
  note: string;
  rating?: number; // 1-5
  sessionNote?: string;
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
  focusSoundMuted: boolean;
}

export interface WeeklyPlan {
  intention: string;
  priorities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  profiles: Profile[];
  activeProfileId: string;
  habits: Habit[];
  goals: Goal[];
  dailyLogs: DailyLog[];
  skills: Skill[];
  achievements?: Record<string, Achievement[]>; // profileId -> unlocked achievements
  onboardingCompleted?: Record<string, boolean>;
  habitNotes?: Record<string, Record<string, string>>; // habitId -> date -> note
  weeklyPlans?: Record<string, Record<string, WeeklyPlan>>; // profileId -> weekKey -> plan
}
