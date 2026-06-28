'use client';

import { useState } from 'react';
import { loadData, todayString, loadExerciseEntries, createExerciseEntry, deleteExerciseEntry } from '@/lib/storage';
import { ExerciseEntry, ExerciseType, ExerciseIntensity } from '@/lib/types';

const EXERCISE_TYPE_CONFIG: { value: ExerciseType; label: string; icon: string; color: string; bgColor: string }[] = [
  { value: 'cardio', label: 'Cardio', icon: '🏃', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { value: 'strength', label: 'Strength', icon: '💪', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  { value: 'flexibility', label: 'Yoga/Flex', icon: '🧘', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  { value: 'sports', label: 'Sports', icon: '⚽', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { value: 'other', label: 'Other', icon: '🏋️', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
];

const INTENSITY_CONFIG: { value: ExerciseIntensity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-red-400' },
];

const QUICK_ADD = [
  { type: 'cardio' as ExerciseType, label: 'Running', icon: '🏃', duration: 30 },
  { type: 'cardio' as ExerciseType, label: 'Cycling', icon: '🚴', duration: 45 },
  { type: 'strength' as ExerciseType, label: 'Gym', icon: '🏋️', duration: 60 },
  { type: 'strength' as ExerciseType, label: 'HIIT', icon: '🔥', duration: 30 },
  { type: 'flexibility' as ExerciseType, label: 'Yoga', icon: '🧘', duration: 30 },
  { type: 'flexibility' as ExerciseType, label: 'Stretch', icon: '🤸', duration: 15 },
  { type: 'sports' as ExerciseType, label: 'Basketball', icon: '🏀', duration: 60 },
  { type: 'other' as ExerciseType, label: 'Hike', icon: '🥾', duration: 90 },
];

function getTypeConfig(type: ExerciseType) {
  return EXERCISE_TYPE_CONFIG.find(t => t.value === type) ?? EXERCISE_TYPE_CONFIG[4];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getWeekDates(weeksAgo: number): string[] {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getWeekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return 'This Week';
  if (weeksAgo === 1) return 'Last Week';
  return `${weeksAgo} weeks ago`;
}

function WorkoutCard({ entry, onDelete }: { entry: ExerciseEntry; onDelete: (id: string) => void }) {
  const cfg = getTypeConfig(entry.type);
  const intCfg = INTENSITY_CONFIG.find(i => i.value === entry.intensity) ?? INTENSITY_CONFIG[1];

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${cfg.bgColor}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-medium text-foreground">{cfg.label}</span>
            <span className={`ml-2 text-xs ${intCfg.color}`}>{intCfg.label}</span>
          </div>
          <span className="text-sm text-fg-secondary shrink-0">{formatDuration(entry.durationMinutes)}</span>
        </div>
        <p className="text-xs text-fg-muted mt-0.5">{formatDate(entry.date)}</p>
        {entry.notes && (
          <p className="text-xs text-fg-secondary mt-1 line-clamp-2">{entry.notes}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="text-fg-muted hover:text-red-400 transition-colors shrink-0"
        title="Delete"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  );
}

interface AddFormData {
  type: ExerciseType;
  durationMinutes: number;
  intensity: ExerciseIntensity;
  notes: string;
}

function AddWorkoutForm({ onAdd }: { onAdd: (entry: Omit<ExerciseEntry, 'id' | 'createdAt' | 'updatedAt'>) => void }) {
  const [form, setForm] = useState<AddFormData>({
    type: 'cardio',
    durationMinutes: 30,
    intensity: 'medium',
    notes: '',
  });
  const [show, setShow] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.durationMinutes <= 0) return;
    const data = loadData();
    onAdd({
      profileId: data.activeProfileId,
      date: todayString(),
      type: form.type,
      durationMinutes: form.durationMinutes,
      intensity: form.intensity,
      notes: form.notes.trim() || undefined,
    });
    setForm({ type: form.type, durationMinutes: 30, intensity: 'medium', notes: '' });
    setShow(false);
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-card-border text-fg-secondary hover:border-blue-500 hover:text-blue-400 transition-colors text-sm font-medium"
      >
        + Log Workout
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Log Workout</h3>
        <button type="button" onClick={() => setShow(false)} className="text-fg-muted hover:text-foreground text-xl leading-none">×</button>
      </div>

      {/* Type */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-fg-secondary">Type</label>
        <div className="grid grid-cols-5 gap-1.5">
          {EXERCISE_TYPE_CONFIG.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: t.value }))}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium border transition-colors ${form.type === t.value ? `${t.bgColor} ${t.color} border-transparent` : 'bg-surface border-card-border text-fg-secondary hover:border-blue-500/50'}`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-fg-secondary">Duration (minutes)</label>
        <div className="flex gap-2">
          {[15, 30, 45, 60, 90].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setForm(f => ({ ...f, durationMinutes: m }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.durationMinutes === m ? 'bg-blue-600 text-white border-transparent' : 'bg-surface border-card-border text-fg-secondary hover:border-blue-500/50'}`}
            >
              {m}m
            </button>
          ))}
        </div>
        <input
          type="number"
          min="1"
          max="600"
          value={form.durationMinutes}
          onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 0 }))}
          className="bg-surface border border-card-border rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500"
          placeholder="Custom minutes"
        />
      </div>

      {/* Intensity */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-fg-secondary">Intensity</label>
        <div className="flex gap-2">
          {INTENSITY_CONFIG.map(int => (
            <button
              key={int.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, intensity: int.value }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.intensity === int.value ? 'bg-blue-600 text-white border-transparent' : 'bg-surface border-card-border text-fg-secondary hover:border-blue-500/50'}`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-fg-secondary">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value.slice(0, 300) }))}
          placeholder="Distance, reps, how you felt..."
          rows={2}
          className="bg-surface border border-card-border rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500 resize-none text-sm"
        />
        <p className="text-xs text-fg-muted text-right">{form.notes.length}/300</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShow(false)}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-card-border text-fg-secondary hover:text-foreground hover:border-blue-500/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );
}

export default function ExercisePage() {
  const today = todayString();
  const [entries, setEntries] = useState<ExerciseEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadExerciseEntries(loadData().activeProfileId);
  });
  const [weeksAgo, setWeeksAgo] = useState(0);

  const weekDates = getWeekDates(weeksAgo);
  const weekEntries = entries.filter(e => weekDates.includes(e.date));
  const weekWorkouts = weekEntries.length;
  const weekMinutes = weekEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const weekHours = (weekMinutes / 60).toFixed(1);

  // Streak: consecutive days with a workout ending today or in the past
  const sortedDates = [...entries.map(e => e.date)].sort().reverse();
  const uniqueDates = [...new Set(sortedDates)];
  let streak = 0;
  const todayStr = todayString();
  let checkDate = todayStr;
  while (uniqueDates.includes(checkDate)) {
    streak++;
    const d = new Date(checkDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().split('T')[0];
  }

  // Today's entries
  const todayEntries = entries.filter(e => e.date === today);

  // Type breakdown for the week
  const typeMinutes: Record<string, number> = {};
  for (const e of weekEntries) {
    typeMinutes[e.type] = (typeMinutes[e.type] ?? 0) + e.durationMinutes;
  }

  const handleAdd = (entry: Omit<ExerciseEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    createExerciseEntry(entry);
    setEntries(loadExerciseEntries(loadData().activeProfileId));
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this workout?')) {
      deleteExerciseEntry(id);
      setEntries(loadExerciseEntries(loadData().activeProfileId));
    }
  };

  const handleQuickAdd = (qa: typeof QUICK_ADD[0]) => {
    const data = loadData();
    createExerciseEntry({
      profileId: data.activeProfileId,
      date: todayString(),
      type: qa.type,
      durationMinutes: qa.duration,
      intensity: 'medium',
    });
    setEntries(loadExerciseEntries(loadData().activeProfileId));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-card-border px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">Exercise</h1>
          {/* Week nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeeksAgo(w => w + 1)}
              className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors"
            >
              ‹
            </button>
            <span className="text-sm text-fg-secondary min-w-[90px] text-center">
              {getWeekLabel(weeksAgo)}
            </span>
            <button
              onClick={() => setWeeksAgo(Math.max(0, weeksAgo - 1))}
              disabled={weeksAgo === 0}
              className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
        <p className="text-sm text-fg-secondary">
          {weekDates[0]} – {weekDates[6]}
        </p>

        {/* Weekly stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{weekWorkouts}</p>
            <p className="text-xs text-fg-secondary">Workouts</p>
          </div>
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{weekHours}h</p>
            <p className="text-xs text-fg-secondary">Total Time</p>
          </div>
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${streak > 0 ? 'text-green-400' : 'text-fg-muted'}`}>{streak}</p>
            <p className="text-xs text-fg-secondary">Day Streak</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Quick Add */}
        <div>
          <h2 className="font-semibold text-foreground mb-2 text-sm">Quick Add</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ADD.map((qa, i) => (
              <button
                key={i}
                onClick={() => handleQuickAdd(qa)}
                className="bg-card border border-card-border rounded-xl p-2 flex flex-col items-center gap-1 hover:border-blue-500/50 transition-colors"
              >
                <span className="text-xl">{qa.icon}</span>
                <span className="text-xs text-fg-secondary">{qa.label}</span>
                <span className="text-xs text-fg-muted">{formatDuration(qa.duration)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add workout form */}
        <AddWorkoutForm onAdd={handleAdd} />

        {/* Today's workouts */}
        {todayEntries.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-2 text-sm">Today</h2>
            <div className="space-y-2">
              {todayEntries.map(entry => (
                <WorkoutCard key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {/* Week breakdown by type */}
        {weekEntries.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h2 className="font-semibold text-foreground mb-3 text-sm">This Week by Type</h2>
            <div className="space-y-2">
              {Object.entries(typeMinutes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, mins]) => {
                  const cfg = getTypeConfig(type as ExerciseType);
                  const pct = weekMinutes > 0 ? (mins / weekMinutes) * 100 : 0;
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <span className="text-sm flex-1 truncate">{cfg.label}</span>
                      <div className="w-20 bg-bar-track rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color.replace('text-', '') }} />
                      </div>
                      <span className="text-xs text-fg-muted w-12 text-right">{formatDuration(mins)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Other week entries (not today) */}
        {weekEntries.filter(e => e.date !== today).length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-2 text-sm">This Week</h2>
            <div className="space-y-2">
              {weekEntries
                .filter(e => e.date !== today)
                .map(entry => (
                  <WorkoutCard key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No workouts logged yet</h3>
            <p className="text-sm text-fg-muted">Start tracking your exercise routine</p>
          </div>
        )}
      </div>
    </div>
  );
}
