'use client';

import { useState } from 'react';
import {
  loadHabitReminderSettings,
  saveHabitReminderSettings,
  getOptimalReminderTime,
  HabitReminderSettings,
} from '@/lib/reminders';

export default function HabitReminders({
  habitId,
  habitName,
}: {
  habitId: string;
  habitName: string;
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<HabitReminderSettings>(() =>
    loadHabitReminderSettings(habitId)
  );

  const optimalTime = getOptimalReminderTime(habitId);

  function update(partial: Partial<HabitReminderSettings>) {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveHabitReminderSettings(habitId, updated);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`transition-colors ${
          settings.muted
            ? 'text-fg-muted'
            : 'text-fg-secondary hover:text-blue-400'
        }`}
        title={`Reminder settings for ${habitName}`}
        aria-label={`Reminder settings for ${habitName}`}
      >
        {settings.muted ? '🔕' : '🔔'}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-8 z-50 w-56 bg-card border border-card-border rounded-xl p-3 shadow-lg space-y-3">
            <p className="text-xs font-medium text-fg-secondary truncate">
              {habitName}
            </p>

            {/* Smart time toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs">Use smart time</span>
              <button
                role="switch"
                aria-checked={settings.useSmartTime}
                onClick={() => update({ useSmartTime: !settings.useSmartTime, muted: false })}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  settings.useSmartTime ? 'bg-blue-600' : 'bg-surface-dim'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.useSmartTime ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            {settings.useSmartTime && (
              <p className="text-xs text-fg-muted">
                {optimalTime
                  ? `Learned: ${optimalTime}`
                  : 'Not enough data yet (need 5+ completions)'}
              </p>
            )}

            {/* Custom time picker */}
            {!settings.useSmartTime && !settings.muted && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-fg-secondary">Time:</span>
                <input
                  type="time"
                  value={settings.customTime}
                  onChange={(e) => update({ customTime: e.target.value })}
                  className="bg-input border border-input-border rounded-lg px-2 py-1 text-xs text-foreground"
                />
              </div>
            )}

            {/* Mute toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs">Mute reminders</span>
              <button
                role="switch"
                aria-checked={settings.muted}
                onClick={() => update({ muted: !settings.muted })}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  settings.muted ? 'bg-red-600' : 'bg-surface-dim'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.muted ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            <button
              onClick={() => setOpen(false)}
              className="w-full text-xs text-center py-1 bg-surface hover:bg-surface-hover rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
