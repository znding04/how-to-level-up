'use client';

import { useState } from 'react';
import { loadData, saveData, generateId, todayString, loadProfileData } from '@/lib/storage';
import { DailyLog } from '@/lib/types';

export default function DailyPage() {
  const today = todayString();
  const [logs, setLogs] = useState<DailyLog[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).dailyLogs;
  });
  const [mood, setMood] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    const data = loadData();
    const profileLogs = loadProfileData(data).dailyLogs;
    const todayLog = profileLogs.find((l) => l.date === today);
    return todayLog ? todayLog.mood : 3;
  });
  const [energy, setEnergy] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    const data = loadData();
    const profileLogs = loadProfileData(data).dailyLogs;
    const todayLog = profileLogs.find((l) => l.date === today);
    return todayLog ? todayLog.energy : 3;
  });
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    const data = loadData();
    const profileLogs = loadProfileData(data).dailyLogs;
    const todayLog = profileLogs.find((l) => l.date === today);
    return todayLog ? todayLog.notes : '';
  });

  function saveLog() {
    const data = loadData();
    const profileLogs = loadProfileData(data).dailyLogs;
    const existing = profileLogs.findIndex((l) => l.date === today);
    const log: DailyLog = {
      id: existing >= 0 ? profileLogs[existing].id : generateId(),
      profileId: data.activeProfileId,
      date: today,
      mood: mood as DailyLog['mood'],
      energy: energy as DailyLog['energy'],
      notes,
    };
    const updatedProfileLogs =
      existing >= 0
        ? profileLogs.map((l, i) => (i === existing ? log : l))
        : [...profileLogs, log];
    const otherLogs = data.dailyLogs.filter((l) => l.profileId !== data.activeProfileId);
    saveData({ ...data, dailyLogs: [...otherLogs, ...updatedProfileLogs] });
    setLogs(updatedProfileLogs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function getCheckinStreak(logList: DailyLog[]): number {
    if (logList.length === 0) return 0;
    const dates = new Set(logList.map((l) => l.date));
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

  function getBestCheckinStreak(logList: DailyLog[]): number {
    if (logList.length === 0) return 0;
    const dates = [...new Set(logList.map((l) => l.date))].sort();
    let best = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }

  const [saved, setSaved] = useState(false);

  const reflectionPrompts = [
    'What was the highlight of your day?',
    'What did you learn today?',
    'What are you grateful for?',
    'What would you do differently?',
    'What challenged you today?',
    'What made you smile?',
    'What progress did you make on your goals?',
  ];
  const [promptIndex] = useState(() =>
    Math.floor(Math.random() * reflectionPrompts.length)
  );

  const moodLabels = ['😞', '😐', '🙂', '😊', '🤩'];
  const energyLabels = ['🪫', '🔋', '⚡', '🔥', '💥'];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Daily Check-in</h1>

      {logs.length > 0 && (
        <div className="flex gap-4 mb-4">
          <div className="bg-card border border-card-border rounded-lg px-4 py-2 text-center">
            <div className="text-lg font-bold">{getCheckinStreak(logs)}</div>
            <div className="text-xs text-fg-secondary">Current Streak</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg px-4 py-2 text-center">
            <div className="text-lg font-bold">{getBestCheckinStreak(logs)}</div>
            <div className="text-xs text-fg-secondary">Best Streak</div>
          </div>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
        <div>
          <label className="text-sm text-fg-secondary mb-2 block">
            Mood: {moodLabels[mood - 1]}
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="text-sm text-fg-secondary mb-2 block">
            Energy: {energyLabels[energy - 1]}
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="text-sm text-fg-secondary mb-1 block">Notes</label>
          <p className="text-xs text-fg-muted mb-2 italic">
            {reflectionPrompts[promptIndex]}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was your day? What did you learn?"
            rows={3}
            className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={saveLog}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {saved ? 'Saved!' : 'Save Check-in'}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Recent Logs</h2>
          <div className="space-y-2">
            {logs
              .slice()
              .reverse()
              .slice(0, 7)
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 bg-surface-dim rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-fg-secondary w-24">{log.date}</span>
                  <span>{moodLabels[log.mood - 1]}</span>
                  <span>{energyLabels[log.energy - 1]}</span>
                  <span className="text-fg-secondary truncate flex-1">
                    {log.notes || '—'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
