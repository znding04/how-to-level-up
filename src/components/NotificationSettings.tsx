'use client';

import { useState } from 'react';
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from '@/lib/storage';
import { NotificationSettings as NotificationSettingsType } from '@/lib/types';

export default function NotificationSettings({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [settings, setSettings] = useState<NotificationSettingsType>(() =>
    loadNotificationSettings()
  );
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  function updateSettings(partial: Partial<NotificationSettingsType>) {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveNotificationSettings(updated);
  }

  async function requestPermission() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function handleToggle(
    key: keyof Pick<NotificationSettingsType, 'dailyReminder' | 'goalAlerts' | 'streakAlerts'>,
    value: boolean
  ) {
    if (value && permission === 'default') {
      await requestPermission();
      if (Notification.permission !== 'granted') return;
    }
    updateSettings({ [key]: value });
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Notifications</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-foreground text-sm transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Permission status */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${
            permission === 'granted'
              ? 'bg-green-500'
              : permission === 'denied'
                ? 'bg-red-500'
                : 'bg-yellow-500'
          }`}
        />
        <span className="text-fg-secondary">
          Permission: {permission}
        </span>
        {permission === 'default' && (
          <button
            onClick={requestPermission}
            className="ml-auto text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg transition-colors"
          >
            Allow
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <p className="text-xs text-fg-muted">
          Notifications are blocked. Enable them in your browser settings.
        </p>
      )}

      {/* Daily Reminder */}
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium">Daily Check-in Reminder</p>
            <p className="text-xs text-fg-muted">
              Remind if you haven&apos;t logged today
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.dailyReminder}
            onClick={() => handleToggle('dailyReminder', !settings.dailyReminder)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.dailyReminder ? 'bg-blue-600' : 'bg-surface-dim'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.dailyReminder ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
        {settings.dailyReminder && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs text-fg-secondary">Remind after:</span>
            <input
              type="time"
              value={settings.dailyReminderTime}
              onChange={(e) =>
                updateSettings({ dailyReminderTime: e.target.value })
              }
              className="bg-input border border-input-border rounded-lg px-2 py-1 text-xs text-foreground"
            />
          </div>
        )}
      </div>

      {/* Goal Alerts */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <p className="text-sm font-medium">Goal Deadline Alerts</p>
          <p className="text-xs text-fg-muted">
            Notify when goals are due within 3 days
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.goalAlerts}
          onClick={() => handleToggle('goalAlerts', !settings.goalAlerts)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            settings.goalAlerts ? 'bg-blue-600' : 'bg-surface-dim'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              settings.goalAlerts ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>

      {/* Streak Alerts */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <p className="text-sm font-medium">Streak Milestones</p>
          <p className="text-xs text-fg-muted">
            Celebrate at 7, 14, 30, 60, 90 day streaks
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.streakAlerts}
          onClick={() => handleToggle('streakAlerts', !settings.streakAlerts)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            settings.streakAlerts ? 'bg-blue-600' : 'bg-surface-dim'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              settings.streakAlerts ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    </div>
  );
}
