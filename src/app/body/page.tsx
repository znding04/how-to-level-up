'use client';

import { useState } from 'react';
import { loadData, todayString, loadBodyMetricEntry, saveBodyMetricEntry, deleteBodyMetricEntry, loadAllBodyMetricEntries, createDefaultBodyMetricEntry } from '@/lib/storage';
import { BodyMetricEntry } from '@/lib/types';

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

export default function BodyPage() {
  const today = todayString();
  const [entries, setEntries] = useState<BodyMetricEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadAllBodyMetricEntries(data.activeProfileId);
  });
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Today's entry state
  const [weight, setWeight] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const data = loadData();
    const entry = loadBodyMetricEntry(today, data.activeProfileId);
    return entry?.weight ?? 0;
  });
  const [bodyFat, setBodyFat] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const data = loadData();
    const entry = loadBodyMetricEntry(today, data.activeProfileId);
    return entry?.bodyFat ?? 0;
  });
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    const data = loadData();
    const entry = loadBodyMetricEntry(today, data.activeProfileId);
    return entry?.notes ?? '';
  });

  // Load today's entry on mount
  function saveEntry() {
    const data = loadData();
    const profileId = data.activeProfileId;
    const existing = loadBodyMetricEntry(today, profileId);
    const entry: BodyMetricEntry = {
      id: existing?.id ?? (createDefaultBodyMetricEntry(profileId, today).id),
      profileId,
      date: today,
      weight: weight > 0 ? weight : undefined,
      bodyFat: bodyFat > 0 ? bodyFat : undefined,
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveBodyMetricEntry(entry);
    // Refresh entries list
    setEntries(loadAllBodyMetricEntries(profileId));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete(id: string) {
    deleteBodyMetricEntry(id);
    const data = loadData();
    setEntries(loadAllBodyMetricEntries(data.activeProfileId));
    setDeletingId(null);
  }

  // Stats calculations
  const weights = entries.filter(e => e.weight != null && e.weight > 0);
  const currentWeight = weights[0]?.weight;
  const firstWeight = weights[weights.length - 1]?.weight;
  const weightChange = currentWeight && firstWeight && weights.length > 1
    ? +(currentWeight - firstWeight).toFixed(1)
    : null;

  // Weekly average
  const weekStart = getWeekStart(new Date());
  const weekEntries = entries.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= weekStart && e.weight != null && e.weight > 0;
  });
  const weeklyAvg = weekEntries.length > 0
    ? +(weekEntries.reduce((sum, e) => sum + (e.weight ?? 0), 0) / weekEntries.length).toFixed(1)
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Body Metrics</h1>
          <p className="text-sm text-fg-secondary mt-1">Track weight, body fat, and measurements</p>
        </div>
        {saved && (
          <span className="text-xs font-medium text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
            Saved
          </span>
        )}
      </div>

      {/* Today's Entry Card */}
      <div className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Today</h2>
          <span className="text-sm text-fg-secondary">{formatDate(today)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-fg-secondary mb-2">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={weight || ''}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              onBlur={saveEntry}
              placeholder="0.0"
              className="w-full bg-surface border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm text-fg-secondary mb-2">Body Fat %</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={bodyFat || ''}
              onChange={(e) => setBodyFat(parseFloat(e.target.value) || 0)}
              onBlur={saveEntry}
              placeholder="0.0"
              className="w-full bg-surface border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-fg-secondary mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            onBlur={saveEntry}
            placeholder="Optional notes..."
            rows={2}
            maxLength={200}
            className="w-full bg-surface border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-fg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <div className="text-xs text-fg-secondary/60 text-right mt-1">{notes.length}/200</div>
        </div>
      </div>

      {/* Stats Summary Card */}
      {(currentWeight != null || weeklyAvg != null) && (
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {currentWeight != null ? `${currentWeight} kg` : '—'}
              </div>
              <div className="text-xs text-fg-secondary mt-1">Current</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${weightChange != null ? (weightChange < 0 ? 'text-green-400' : 'text-red-400') : 'text-foreground'}`}>
                {weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : '—'}
              </div>
              <div className="text-xs text-fg-secondary mt-1">Total Change</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {weeklyAvg != null ? `${weeklyAvg} kg` : '—'}
              </div>
              <div className="text-xs text-fg-secondary mt-1">Weekly Avg</div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">History</h2>
        {entries.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">⚖️</div>
            <p className="text-fg-secondary text-sm">No entries yet</p>
            <p className="text-fg-secondary/60 text-xs mt-1">Start tracking your weight above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{formatDate(entry.date)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {entry.weight != null && entry.weight > 0 && (
                      <span className="text-sm text-fg-secondary">{entry.weight} kg</span>
                    )}
                    {entry.bodyFat != null && entry.bodyFat > 0 && (
                      <span className="text-sm text-fg-secondary">{entry.bodyFat}% bf</span>
                    )}
                    {entry.notes && (
                      <span className="text-sm text-fg-secondary/60 truncate">{entry.notes}</span>
                    )}
                    {entry.weight == null && entry.bodyFat == null && !entry.notes && (
                      <span className="text-sm text-fg-secondary/40 italic">No data</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeletingId(entry.id)}
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-foreground mb-2">Delete Entry?</h3>
            <p className="text-sm text-fg-secondary mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-card-border text-foreground text-sm font-medium hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
