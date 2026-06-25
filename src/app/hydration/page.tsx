'use client';

import { useState } from 'react';
import { loadData, todayString, loadWaterEntry, saveWaterEntry, loadAllWaterEntries, deleteWaterEntry, createDefaultWaterEntry, getWaterGoal, setWaterGoal, addWaterEntry } from '@/lib/storage';
import { WaterEntry } from '@/lib/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function WaterRing({ current, goal }: { current: number; goal: number }) {
  const percent = Math.min(100, Math.round((current / goal) * 100));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background ring */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-surface"
        />
        {/* Progress ring */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-400 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-foreground">{current}</div>
        <div className="text-xs text-fg-secondary">of {goal} ml</div>
        <div className="text-sm font-medium text-blue-400 mt-1">{percent}%</div>
      </div>
    </div>
  );
}

const QUICK_AMOUNTS = [
  { label: '+250ml', ml: 250 },
  { label: '+500ml', ml: 500 },
  { label: '+750ml', ml: 750 },
];

export default function HydrationPage() {
  const today = todayString();

  const [goal, setGoal] = useState<number>(() => {
    if (typeof window === 'undefined') return 2500;
    return getWaterGoal();
  });
  const [customAmount, setCustomAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goal));
  const [saved, setSaved] = useState(false);

  // Today's entry
  const [todayEntry, setTodayEntry] = useState<WaterEntry | null>(() => {
    if (typeof window === 'undefined') return null;
    const data = loadData();
    return loadWaterEntry(today, data.activeProfileId);
  });

  // All entries for stats
  const [entries, setEntries] = useState<WaterEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadAllWaterEntries(data.activeProfileId);
  });

  // Today's amount
  const todayAmount = todayEntry?.amountMl ?? 0;

  function handleAdd(amount: number) {
    const data = loadData();
    const profileId = data.activeProfileId;
    const updated = addWaterEntry(profileId, today, amount);
    setTodayEntry({ ...updated, amountMl: updated.amountMl });
    setEntries(loadAllWaterEntries(profileId));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleCustomAdd() {
    const ml = parseInt(customAmount, 10);
    if (isNaN(ml) || ml <= 0) return;
    handleAdd(ml);
    setCustomAmount('');
  }

  function handleGoalSave() {
    const newGoal = parseInt(goalInput, 10);
    if (isNaN(newGoal) || newGoal < 500) return;
    setGoal(newGoal);
    setWaterGoal(newGoal);
    setEditingGoal(false);
  }

  function handleDelete(id: string) {
    deleteWaterEntry(id);
    const data = loadData();
    setEntries(loadAllWaterEntries(data.activeProfileId));
    setTodayEntry(loadWaterEntry(today, data.activeProfileId));
  }

  // Stats calculations
  const weekStart = getWeekStart(new Date());
  const weekEntries = entries.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= weekStart;
  });
  const weekTotal = weekEntries.reduce((sum, e) => sum + e.amountMl, 0);
  const weekDays = weekEntries.filter(e => e.amountMl > 0).length;
  const weekAvg = weekDays > 0 ? Math.round(weekTotal / weekDays) : 0;

  // Best streak: consecutive days meeting goal
  function calcStreak(entries: WaterEntry[], goal: number): number {
    const byDate = new Map<string, number>();
    entries.forEach(e => byDate.set(e.date, e.amountMl));
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (byDate.get(key) ?? 0 >= goal) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
  const streak = calcStreak(entries, goal);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hydration</h1>
          <p className="text-sm text-fg-secondary mt-1">Track your daily water intake</p>
        </div>
        {saved && (
          <span className="text-xs font-medium text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
            Saved
          </span>
        )}
      </div>

      {/* Progress Ring Card */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Today</h2>
          <span className="text-sm text-fg-secondary">{formatDate(today)}</span>
        </div>

        <WaterRing current={todayAmount} goal={goal} />

        {/* Quick Add Buttons */}
        <div className="flex justify-center gap-3 mt-6">
          {QUICK_AMOUNTS.map(({ label, ml }) => (
            <button
              key={ml}
              onClick={() => handleAdd(ml)}
              className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="flex gap-2 mt-3 max-w-xs mx-auto">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomAdd()}
            placeholder="Custom (ml)"
            min="1"
            className="flex-1 bg-surface border border-card-border rounded-xl px-3 py-2 text-foreground placeholder:text-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <button
            onClick={handleCustomAdd}
            className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Goal Setting */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Daily Goal</h2>
          {!editingGoal ? (
            <button
              onClick={() => { setEditingGoal(true); setGoalInput(String(goal)); }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Edit
            </button>
          ) : null}
        </div>
        {!editingGoal ? (
          <div className="mt-2 text-2xl font-bold text-foreground">{goal} ml</div>
        ) : (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoalSave()}
              min="500"
              className="flex-1 bg-surface border border-card-border rounded-xl px-3 py-2 text-foreground placeholder:text-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <button
              onClick={handleGoalSave}
              className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditingGoal(false)}
              className="px-3 py-2 rounded-xl border border-card-border text-fg-secondary text-sm hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="bg-card border border-card-border rounded-2xl p-5">
        <h2 className="font-semibold text-foreground mb-4">This Week</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {weekTotal > 0 ? `${(weekTotal / 1000).toFixed(1)}L` : '—'}
            </div>
            <div className="text-xs text-fg-secondary mt-1">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {weekAvg > 0 ? `${weekAvg}ml` : '—'}
            </div>
            <div className="text-xs text-fg-secondary mt-1">Daily Avg</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${streak > 0 ? 'text-blue-400' : 'text-foreground'}`}>
              {streak > 0 ? streak : '—'}
            </div>
            <div className="text-xs text-fg-secondary mt-1">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Recent Days</h2>
        {entries.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">💧</div>
            <p className="text-fg-secondary text-sm">No entries yet</p>
            <p className="text-fg-secondary/60 text-xs mt-1">Start logging your water intake above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 14).map((entry) => (
              <div key={entry.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
                <div className="text-2xl">💧</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{formatDate(entry.date)}</span>
                    <span className={`text-sm font-bold ${entry.amountMl >= goal ? 'text-blue-400' : 'text-fg-secondary'}`}>
                      {entry.amountMl} ml
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (entry.amountMl / goal) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-fg-secondary/40 hover:text-red-400 transition-colors p-1"
                  title="Delete entry"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
