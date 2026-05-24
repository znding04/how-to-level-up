import { Achievement, AppData } from './types';
import { todayString } from './storage';

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: Achievement['category'];
  check: (data: ProfileSnapshot) => boolean;
};

type ProfileSnapshot = {
  habits: AppData['habits'];
  goals: AppData['goals'];
  dailyLogs: AppData['dailyLogs'];
  skills: AppData['skills'];
  profiles: AppData['profiles'];
  profileId: string;
  hasExported: boolean;
};

function getHabitStreak(habit: { completions: Record<string, boolean> }): number {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (habit.completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getConsecutiveDailyLogs(logs: AppData['dailyLogs']): number {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.map((l) => l.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_habit',
    title: 'Habit Started',
    description: 'Create your first habit',
    icon: '🌱',
    category: 'habits',
    check: (s) => s.habits.length > 0,
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: '7-day habit streak',
    icon: '🔥',
    category: 'streaks',
    check: (s) => s.habits.some((h) => getHabitStreak(h) >= 7),
  },
  {
    id: 'month_streak',
    title: 'Monthly Master',
    description: '30-day habit streak',
    icon: '💪',
    category: 'streaks',
    check: (s) => s.habits.some((h) => getHabitStreak(h) >= 30),
  },
  {
    id: 'all_daily_habits',
    title: 'Perfect Day',
    description: 'Complete all daily habits in a single day',
    icon: '⭐',
    category: 'habits',
    check: (s) => {
      if (s.habits.length === 0) return false;
      const today = todayString();
      const todayDow = new Date().getDay();
      const todaysHabits = s.habits.filter((h) => {
        const days = h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
        return days.includes(todayDow);
      });
      return todaysHabits.length > 0 && todaysHabits.every((h) => h.completions[today]);
    },
  },
  {
    id: 'first_goal',
    title: 'Goal Setter',
    description: 'Create your first goal',
    icon: '🎯',
    category: 'goals',
    check: (s) => s.goals.length > 0,
  },
  {
    id: 'goal_complete',
    title: 'Goal Crusher',
    description: 'Complete a goal',
    icon: '🏆',
    category: 'goals',
    check: (s) => s.goals.some((g) => g.status === 'completed'),
  },
  {
    id: 'first_milestone',
    title: 'Milestone Reached',
    description: 'Complete a milestone',
    icon: '🪨',
    category: 'milestones',
    check: (s) => s.goals.some((g) => g.milestones.some((m) => m.completed)),
  },
  {
    id: 'daily_checkin_3',
    title: 'Consistent Logger',
    description: 'Log daily check-in 3 days in a row',
    icon: '📝',
    category: 'daily',
    check: (s) => getConsecutiveDailyLogs(s.dailyLogs) >= 3,
  },
  {
    id: 'daily_checkin_7',
    title: 'Week of Reflection',
    description: 'Log daily check-in 7 days in a row',
    icon: '📖',
    category: 'daily',
    check: (s) => getConsecutiveDailyLogs(s.dailyLogs) >= 7,
  },
  {
    id: 'first_skill',
    title: 'Skill Seeker',
    description: 'Add your first skill',
    icon: '⚡',
    category: 'skills',
    check: (s) => s.skills.length > 0,
  },
  {
    id: 'skill_hour',
    title: 'Hour of Practice',
    description: 'Log 1 hour of skill practice',
    icon: '⏱️',
    category: 'skills',
    check: (s) =>
      s.skills.some(
        (sk) => sk.sessions.reduce((sum, sess) => sum + sess.durationMinutes, 0) >= 60
      ),
  },
  {
    id: 'skill_day',
    title: 'Dedicated Learner',
    description: 'Practice a skill on 7 different days',
    icon: '📚',
    category: 'skills',
    check: (s) =>
      s.skills.some((sk) => {
        const uniqueDays = new Set(sk.sessions.map((sess) => sess.date));
        return uniqueDays.size >= 7;
      }),
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Log a daily check-in before 8am',
    icon: '🌅',
    category: 'daily',
    check: () => {
      const hour = new Date().getHours();
      return hour < 8;
    },
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Log a daily check-in after 10pm',
    icon: '🦉',
    category: 'daily',
    check: () => {
      const hour = new Date().getHours();
      return hour >= 22;
    },
  },
  {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: '100% habit completion for a full week',
    icon: '🌟',
    category: 'habits',
    check: (s) => {
      if (s.habits.length === 0) return false;
      // Check last 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date();
        d.setDate(d.getDate() - dayOffset);
        const dateStr = d.toISOString().split('T')[0];
        const dow = d.getDay();
        const scheduledHabits = s.habits.filter((h) => {
          const days = h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
          return days.includes(dow);
        });
        if (scheduledHabits.length === 0) continue;
        if (!scheduledHabits.every((h) => h.completions[dateStr])) return false;
      }
      return true;
    },
  },
  {
    id: 'profile_switcher',
    title: 'Profile Switcher',
    description: 'Use 2+ profiles',
    icon: '👥',
    category: 'habits',
    check: (s) => s.profiles.length >= 2,
  },
  {
    id: 'data_backup',
    title: 'Data Guardian',
    description: 'Export a data backup',
    icon: '💾',
    category: 'milestones',
    check: (s) => s.hasExported,
  },
  {
    id: 'streak_60',
    title: 'Two Month Titan',
    description: '60-day habit streak',
    icon: '🏅',
    category: 'streaks',
    check: (s) => s.habits.some((h) => getHabitStreak(h) >= 60),
  },
  {
    id: 'streak_90',
    title: 'Quarter Champion',
    description: '90-day habit streak',
    icon: '👑',
    category: 'streaks',
    check: (s) => s.habits.some((h) => getHabitStreak(h) >= 90),
  },
];

const LAST_BACKUP_KEY = 'last-backup-date';

export function checkAchievements(data: AppData, profileId: string): Achievement[] {
  const existing: Achievement[] = data.achievements?.[profileId] ?? [];
  const existingIds = new Set(existing.map((a) => a.id));

  const snapshot: ProfileSnapshot = {
    habits: data.habits.filter((h) => h.profileId === profileId),
    goals: data.goals.filter((g) => g.profileId === profileId),
    dailyLogs: data.dailyLogs.filter((l) => l.profileId === profileId),
    skills: data.skills.filter((s) => s.profileId === profileId),
    profiles: data.profiles,
    profileId,
    hasExported: typeof window !== 'undefined' && !!localStorage.getItem(LAST_BACKUP_KEY),
  };

  const newlyUnlocked: Achievement[] = [];
  const now = new Date().toISOString();

  for (const def of ACHIEVEMENT_DEFS) {
    if (existingIds.has(def.id)) continue;
    if (def.check(snapshot)) {
      const achievement: Achievement = {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        unlockedAt: now,
      };
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

export function persistAchievements(data: AppData, profileId: string, newAchievements: Achievement[]): AppData {
  const existing = data.achievements?.[profileId] ?? [];
  const updated: AppData = {
    ...data,
    achievements: {
      ...(data.achievements ?? {}),
      [profileId]: [...existing, ...newAchievements],
    },
  };
  return updated;
}

export function getUnlockedAchievements(data: AppData, profileId: string): Achievement[] {
  return data.achievements?.[profileId] ?? [];
}

export function getAllAchievementsWithStatus(data: AppData, profileId: string): Achievement[] {
  const unlocked = getUnlockedAchievements(data, profileId);
  const unlockedMap = new Map(unlocked.map((a) => [a.id, a]));

  return ACHIEVEMENT_DEFS.map((def) => {
    const existing = unlockedMap.get(def.id);
    if (existing) return existing;
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      unlockedAt: undefined,
    };
  });
}
