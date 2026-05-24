'use client';

import { useState, useEffect, useRef } from 'react';
import { loadData, saveData } from '@/lib/storage';
import { Achievement } from '@/lib/types';
import {
  getAllAchievementsWithStatus,
  checkAchievements,
  persistAchievements,
  ACHIEVEMENT_DEFS,
} from '@/lib/achievements';

const CATEGORIES = ['all', 'habits', 'goals', 'daily', 'skills', 'streaks', 'milestones'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  habits: 'Habits',
  goals: 'Goals',
  daily: 'Daily',
  skills: 'Skills',
  streaks: 'Streaks',
  milestones: 'Milestones',
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const data = loadData();
    return getAllAchievementsWithStatus(data, data.activeProfileId);
  });
  const [category, setCategory] = useState<Category>('all');
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const data = loadData();
    const profileId = data.activeProfileId;

    // Check for new achievements
    const newly = checkAchievements(data, profileId);
    if (newly.length > 0) {
      const updated = persistAchievements(data, profileId, newly);
      saveData(updated);
      // Defer state updates to avoid synchronous setState in effect
      setTimeout(() => {
        setNewUnlocks(newly);
        setShowBanner(true);
        setAchievements(getAllAchievementsWithStatus(updated, profileId));
        setTimeout(() => setShowBanner(false), 4000);
      }, 0);
    }
  }, []);

  const filtered =
    category === 'all'
      ? achievements
      : achievements.filter((a) => a.category === category);

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = ACHIEVEMENT_DEFS.length;
  const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Achievements</h1>

      {/* New unlock banner */}
      {showBanner && newUnlocks.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-600/30 to-amber-600/30 border border-yellow-500/30 rounded-2xl p-4 text-center animate-pulse">
          <p className="text-lg font-bold">
            {newUnlocks.map((a) => a.icon).join(' ')} New Achievement{newUnlocks.length > 1 ? 's' : ''} Unlocked!
          </p>
          <p className="text-fg-secondary text-sm mt-1">
            {newUnlocks.map((a) => a.title).join(', ')}
          </p>
        </div>
      )}

      {/* Progress summary */}
      <div className="bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-fg-secondary">Progress</span>
          <span className="text-sm font-medium">
            {unlockedCount} / {totalCount} unlocked
          </span>
        </div>
        <div className="w-full bg-bar-track rounded-full h-3">
          <div
            className="bg-yellow-500 h-3 rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-right text-xs text-fg-muted mt-1">{percent}%</p>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-blue-600 text-white'
                : 'bg-surface text-fg-secondary hover:bg-surface-hover'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((achievement) => {
          const unlocked = !!achievement.unlockedAt;
          const isNew = newUnlocks.some((n) => n.id === achievement.id);
          return (
            <div
              key={achievement.id}
              className={`bg-card border rounded-xl p-4 text-center transition-all ${
                unlocked
                  ? isNew
                    ? 'border-yellow-500/50 ring-1 ring-yellow-500/30'
                    : 'border-card-border'
                  : 'border-card-border opacity-50 grayscale'
              }`}
            >
              <div className="text-3xl mb-2">
                {unlocked ? achievement.icon : '🔒'}
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${unlocked ? '' : 'text-fg-muted'}`}>
                {achievement.title}
              </h3>
              <p className="text-xs text-fg-muted">{achievement.description}</p>
              {unlocked && achievement.unlockedAt && (
                <p className="text-xs text-fg-muted mt-2">
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-fg-muted text-center mt-8 text-sm">
          No achievements in this category yet.
        </p>
      )}
    </div>
  );
}
