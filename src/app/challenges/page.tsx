'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, generateId, todayString, loadProfileData, getChallengeCompletionRate } from '@/lib/storage';
import { AppData, HabitChallenge } from '@/lib/types';
import { runAchievementCheck } from '@/lib/useAchievementCheck';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}

function daysRemaining(endDate: string): number {
  const today = new Date();
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - today.getTime()) / 86400000);
  return diff;
}

function getStatusBadge(status: HabitChallenge['status']) {
  if (status === 'active') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (status === 'completed') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function getStatusLabel(status: HabitChallenge['status']) {
  if (status === 'active') return 'Active';
  if (status === 'completed') return 'Completed';
  return 'Abandoned';
}

interface ChallengeCardProps {
  challenge: HabitChallenge;
  profileData: ReturnType<typeof loadProfileData>;
  onDelete: (id: string) => void;
}

function ChallengeCard({ challenge, profileData, onDelete }: ChallengeCardProps) {
  const today = todayString();
  const rate = getChallengeCompletionRate(challenge.id, today);
  const remaining = daysRemaining(challenge.endDate);
  const includedHabits = profileData.habits.filter((h) => challenge.habitIds.includes(h.id));

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{challenge.name}</h3>
          {challenge.description && (
            <p className="text-sm text-fg-muted mt-0.5 line-clamp-2">{challenge.description}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${getStatusBadge(challenge.status)}`}>
          {getStatusLabel(challenge.status)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-fg-muted mb-3">
        <span>{formatDateRange(challenge.startDate, challenge.endDate)}</span>
        {challenge.status === 'active' && remaining > 0 && (
          <span>{remaining} day{remaining !== 1 ? 's' : ''} left</span>
        )}
        <span>{challenge.habitIds.length} habit{challenge.habitIds.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Progress bar */}
      {challenge.status === 'active' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-fg-muted mb-1">
            <span>Completion rate</span>
            <span>{rate}%</span>
          </div>
          <div className="w-full bg-bar-track rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Habit preview dots */}
      {includedHabits.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {includedHabits.slice(0, 6).map((h) => (
            <span
              key={h.id}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: h.color }}
              title={h.name}
            />
          ))}
          {includedHabits.length > 6 && (
            <span className="text-xs text-fg-muted">+{includedHabits.length - 6}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/challenges/detail?id=${challenge.id}`}
          className="flex-1 text-center py-1.5 text-sm bg-surface hover:bg-surface-hover rounded-lg text-fg-secondary transition-colors"
        >
          View
        </Link>
        {challenge.status === 'active' && (
          <button
            onClick={() => {
              if (confirm('Abandon this challenge? Your progress will be lost.')) {
                onDelete(challenge.id);
              }
            }}
            className="px-3 py-1.5 text-sm bg-surface hover:bg-surface-hover rounded-lg text-fg-muted transition-colors"
          >
            Abandon
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChallengesPage() {
  const [data, setData] = useState<AppData>(() => runAchievementCheck(loadData()));
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);

  const profileData = loadProfileData(data);
  const allChallenges = data.challenges ?? [];
  const active = allChallenges.filter((c) => c.status === 'active');
  const inactive = allChallenges.filter((c) => c.status !== 'active');

  // Only daily habits can be in challenges
  const dailyHabits = profileData.habits;

  function toggleHabit(id: string) {
    setSelectedHabits((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selectedHabits.length === 0) return;

    setSaving(true);
    const challenge: HabitChallenge = {
      id: generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      habitIds: selectedHabits,
      startDate,
      endDate,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updatedData = { ...data, challenges: [...(data.challenges ?? []), challenge] };
    const updated = runAchievementCheck(updatedData);
    saveData(updatedData);
    setData(updated);
    setShowForm(false);
    setName('');
    setDescription('');
    setSelectedHabits([]);
    setSaving(false);
  }

  function handleAbandon(id: string) {
    const challenges = (data.challenges ?? []).map((c) =>
      c.id === id ? { ...c, status: 'abandoned' as const } : c
    );
    const updatedData = { ...data, challenges };
    const updated = runAchievementCheck(updatedData);
    saveData(updatedData);
    setData(updated);
  }

  function handleDelete(id: string) {
    const challenges = (data.challenges ?? []).filter((c) => c.id !== id);
    const updatedData = { ...data, challenges };
    const updated = runAchievementCheck(updatedData);
    saveData(updatedData);
    setData(updated);
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-sm text-fg-muted mt-0.5">Commit to your habits, day by day</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold transition-colors"
        >
          +
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-6">
          <h2 className="font-semibold mb-4">New Challenge</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm text-fg-muted block mb-1">Challenge Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 30-Day Fitness Challenge"
                maxLength={60}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-fg-muted block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this challenge about?"
                maxLength={140}
                rows={2}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Habit selection */}
            <div>
              <label className="text-sm text-fg-muted block mb-2">Select Habits *</label>
              {dailyHabits.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  No habits yet.{' '}
                  <Link href="/habits" className="text-blue-400 underline">
                    Create some habits first
                  </Link>
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {dailyHabits.map((h) => (
                    <label
                      key={h.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedHabits.includes(h.id)
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'bg-surface hover:bg-surface-hover border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedHabits.includes(h.id)}
                        onChange={() => toggleHabit(h.id)}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: h.color }}
                      />
                      <span className="text-sm flex-1">{h.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedHabits.length > 0 && (
                <p className="text-xs text-fg-muted mt-1.5">
                  {selectedHabits.length} habit{selectedHabits.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-fg-muted block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-sm text-fg-muted block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-xl text-sm bg-surface hover:bg-surface-hover text-fg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || selectedHabits.length === 0 || saving}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white transition-colors"
              >
                Create Challenge
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Challenges */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-fg-secondary text-sm uppercase tracking-wider mb-3">
            Active ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                profileData={profileData}
                onDelete={handleAbandon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed / Abandoned */}
      {inactive.length > 0 && (
        <div>
          <h2 className="font-semibold text-fg-secondary text-sm uppercase tracking-wider mb-3">
            Past ({inactive.length})
          </h2>
          <div className="space-y-3">
            {inactive.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                profileData={profileData}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allChallenges.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="font-semibold text-lg mb-1">No challenges yet</h3>
          <p className="text-fg-muted text-sm mb-4">
            Create a challenge to commit to your habits for a set period
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Start a Challenge
          </button>
        </div>
      )}
    </div>
  );
}
