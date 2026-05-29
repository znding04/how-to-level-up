'use client';

import { useEffect } from 'react';
import {
  loadData,
  loadProfileData,
  loadNotificationSettings,
  todayString,
} from '@/lib/storage';
import {
  getOptimalReminderTime,
  loadHabitReminderSettings,
} from '@/lib/reminders';

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

export default function SmartNotificationService() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const settings = loadNotificationSettings();
    if (!settings.dailyReminder) return;

    const fullData = loadData();
    const data = loadProfileData(fullData);
    const today = todayString();
    const todayDow = new Date().getDay();
    const nowHour = new Date().getHours();
    const nowMinute = new Date().getMinutes();
    const nowTotalMinutes = nowHour * 60 + nowMinute;

    // Check each habit scheduled for today
    const todaysHabits = data.habits.filter((h) => {
      const days = h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
      return days.includes(todayDow);
    });

    for (const habit of todaysHabits) {
      // Skip already completed habits
      if (habit.completions[today]) continue;

      // Check per-habit reminder settings
      const habitReminder = loadHabitReminderSettings(habit.id);
      if (habitReminder.muted) continue;

      // Determine the reminder time for this habit
      let reminderTimeStr: string | null = null;

      if (habitReminder.useSmartTime) {
        reminderTimeStr = getOptimalReminderTime(habit.id);
        // Fall back to configured daily reminder time if insufficient data
        if (!reminderTimeStr) {
          reminderTimeStr = settings.dailyReminderTime;
        }
      } else {
        reminderTimeStr = habitReminder.customTime;
      }

      if (!reminderTimeStr) continue;

      const [rHour, rMinute] = reminderTimeStr.split(':').map(Number);
      const reminderTotalMinutes = rHour * 60 + rMinute;

      // Fire if within 30-minute window around optimal time
      const diff = Math.abs(nowTotalMinutes - reminderTotalMinutes);
      if (diff <= 30) {
        showNotification(
          'Habit Reminder',
          `Time to complete "${habit.name}"!`,
          '/habits'
        );
      }
    }
  }, []);

  return null;
}
