'use client';

import { useEffect } from 'react';
import {
  loadData,
  loadProfileData,
  loadNotificationSettings,
  getNotifiedGoals,
  markGoalNotified,
  todayString,
} from '@/lib/storage';

function showNotification(title: string, body: string, url?: string) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/icon-192.svg',
  });
  if (url) {
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }
}

export default function NotificationService() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const settings = loadNotificationSettings();
    const fullData = loadData();
    const data = loadProfileData(fullData);
    const today = todayString();

    // Daily reminder check
    if (settings.dailyReminder) {
      const todayLog = data.dailyLogs.find((l) => l.date === today);
      if (!todayLog) {
        const now = new Date();
        const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        if (now >= reminderTime) {
          showNotification(
            'Daily Check-in Reminder',
            "You haven't logged your mood and energy today. Take a moment to check in!",
            '/daily'
          );
        }
      }
    }

    // Goal deadline alerts
    if (settings.goalAlerts) {
      const notifiedGoals = getNotifiedGoals();
      const activeGoals = data.goals.filter((g) => g.status === 'active' && g.targetDate);
      const nowMs = new Date(today).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      for (const goal of activeGoals) {
        if (notifiedGoals.includes(goal.id)) continue;
        const targetMs = new Date(goal.targetDate).getTime();
        const diff = targetMs - nowMs;

        if (diff < 0) {
          showNotification(
            'Goal Overdue!',
            `"${goal.title}" is past its target date.`,
            '/goals'
          );
          markGoalNotified(goal.id);
        } else if (diff <= threeDaysMs) {
          const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
          showNotification(
            'Goal Deadline Approaching',
            `"${goal.title}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
            '/goals'
          );
          markGoalNotified(goal.id);
        }
      }
    }
  }, []);

  return null;
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90];

export function checkStreakMilestone(habitName: string, streak: number) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const settings = loadNotificationSettings();
  if (!settings.streakAlerts) return;

  if (STREAK_MILESTONES.includes(streak)) {
    showNotification(
      'Streak Milestone! 🎉',
      `"${habitName}" has reached a ${streak}-day streak! Keep it up!`
    );
  }
}
