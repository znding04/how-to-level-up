'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { loadData, saveData, generateId, todayString, loadProfileData } from '@/lib/storage';
import { Goal, GoalCategory } from '@/lib/types';
import { runAchievementCheck } from '@/lib/useAchievementCheck';

const CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'career', label: 'Career', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'health', label: 'Health', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'learning', label: 'Learning', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'personal', label: 'Personal', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'financial', label: 'Financial', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'creative', label: 'Creative', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

function getCategoryStyle(cat?: GoalCategory): string {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found ? found.color : 'bg-surface text-fg-muted border-card-border';
}

function getCategoryLabel(cat?: GoalCategory): string {
  const found = CATEGORIES.find((c) => c.value === cat);
  return found ? found.label : 'Uncategorized';
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).goals;
  });
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [addingMilestoneFor, setAddingMilestoneFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filterCategory, setFilterCategory] = useState<GoalCategory | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 150);
  }, []);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function persist(updated: Goal[]) {
    setGoals(updated);
    const data = loadData();
    const otherGoals = data.goals.filter((g) => g.profileId !== data.activeProfileId);
    const merged = { ...data, goals: [...otherGoals, ...updated] };
    saveData(merged);
    runAchievementCheck(merged);
  }

  function addGoal() {
    if (!newTitle.trim()) return;
    const data = loadData();
    const goal: Goal = {
      id: generateId(),
      profileId: data.activeProfileId,
      title: newTitle.trim(),
      description: '',
      targetDate: newTargetDate,
      category: newCategory || undefined,
      milestones: [],
      status: 'active',
      createdAt: todayString(),
    };
    persist([...goals, goal]);
    setNewTitle('');
    setNewTargetDate('');
    setNewCategory('');
  }

  function toggleGoalStatus(id: string) {
    const updated = goals.map((g) => {
      if (g.id !== id) return g;
      return { ...g, status: g.status === 'active' ? 'completed' : 'active' } as Goal;
    });
    persist(updated);
  }

  function archiveGoal(id: string) {
    const updated = goals.map((g) => {
      if (g.id !== id) return g;
      return { ...g, status: g.status === 'archived' ? 'active' : 'archived' } as Goal;
    });
    persist(updated);
  }

  function deleteGoal(id: string) {
    if (!window.confirm('Delete this goal permanently?')) return;
    persist(goals.filter((g) => g.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function updateGoalField(id: string, field: 'description' | 'targetDate' | 'category', value: string) {
    const updated = goals.map((g) => {
      if (g.id !== id) return g;
      if (field === 'category') {
        return { ...g, category: (value || undefined) as GoalCategory | undefined };
      }
      return { ...g, [field]: value };
    });
    persist(updated);
  }

  function getProgress(goal: Goal): number {
    if (goal.milestones.length === 0) return goal.status === 'completed' ? 100 : 0;
    const done = goal.milestones.filter((m) => m.completed).length;
    return Math.round((done / goal.milestones.length) * 100);
  }

  function addMilestone(goalId: string) {
    if (!newMilestoneTitle.trim()) return;
    const updated = goals.map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        milestones: [
          ...g.milestones,
          { id: generateId(), title: newMilestoneTitle.trim(), completed: false },
        ],
      };
    });
    persist(updated);
    setNewMilestoneTitle('');
    setAddingMilestoneFor(null);
  }

  function toggleMilestone(goalId: string, milestoneId: string) {
    const updated = goals.map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        milestones: g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        ),
      };
    });
    persist(updated);
  }

  const filteredGoals = goals.filter((g) => {
    if (!showArchived && g.status === 'archived') return false;
    if (filterCategory !== 'all' && g.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Goals</h1>

      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="New goal..."
            className="flex-1 bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addGoal}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-secondary">Target:</span>
          <input
            type="date"
            value={newTargetDate}
            onChange={(e) => setNewTargetDate(e.target.value)}
            className="bg-input border border-input-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {newTargetDate && (
            <button
              onClick={() => setNewTargetDate('')}
              className="text-xs text-fg-muted hover:text-fg-secondary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-fg-secondary">Category:</span>
          <button
            onClick={() => setNewCategory('')}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              newCategory === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface text-fg-secondary border-card-border'
            }`}
          >
            None
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setNewCategory(cat.value)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                newCategory === cat.value ? 'bg-blue-600 text-white border-blue-600' : `${cat.color} border`
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search goals..."
          className="w-full border border-border bg-card rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-fg-secondary">Filter:</span>
        <button
          onClick={() => setFilterCategory('all')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-surface text-fg-secondary'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              filterCategory === cat.value ? 'bg-blue-600 text-white border-blue-600' : `${cat.color} border`
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-fg-secondary flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-blue-500"
          />
          Show archived
        </label>
      </div>

      {goals.length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          No goals yet. Set one to start leveling up!
        </p>
      ) : filteredGoals.length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          {searchQuery ? 'No goals match your search' : 'No goals match this filter.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="bg-card border border-card-border rounded-xl p-4"
            >
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3
                      className={`font-medium truncate ${
                        goal.status === 'completed' ? 'line-through text-fg-muted' : ''
                      }`}
                    >
                      {goal.title}
                    </h3>
                    {goal.category && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${getCategoryStyle(goal.category)}`}>
                        {getCategoryLabel(goal.category)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGoalStatus(goal.id);
                    }}
                    className={`text-xs px-2 py-1 rounded shrink-0 ml-2 ${
                      goal.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-surface text-fg-secondary hover:bg-surface-hover'
                    }`}
                  >
                    {goal.status === 'completed' ? 'Done' : 'Mark Done'}
                  </button>
                </div>
                <div className="w-full bg-bar-track rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${getProgress(goal)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-fg-secondary">{getProgress(goal)}% complete</p>
                  {goal.targetDate && (
                    <p className="text-xs text-fg-muted">Due: {goal.targetDate}</p>
                  )}
                </div>
              </div>

              {expandedId === goal.id && (
                <div className="mt-3 pt-3 border-t border-card-border">
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="text-xs text-fg-secondary block mb-1">Category</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); updateGoalField(goal.id, 'category', ''); }}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            !goal.category ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface text-fg-secondary border-card-border'
                          }`}
                        >
                          None
                        </button>
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            onClick={(e) => { e.stopPropagation(); updateGoalField(goal.id, 'category', cat.value); }}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              goal.category === cat.value ? 'bg-blue-600 text-white border-blue-600' : `${cat.color} border`
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-fg-secondary block mb-1">Description</label>
                      <textarea
                        value={goal.description}
                        onChange={(e) => updateGoalField(goal.id, 'description', e.target.value)}
                        placeholder="Describe this goal..."
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-fg-secondary block mb-1">Target Date</label>
                      <input
                        type="date"
                        value={goal.targetDate}
                        onChange={(e) => updateGoalField(goal.id, 'targetDate', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {goal.milestones.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {goal.milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="flex items-center gap-2"
                        >
                          <button
                            onClick={() => toggleMilestone(goal.id, milestone.id)}
                            role="checkbox"
                            aria-checked={milestone.completed}
                            aria-label={`Toggle ${milestone.title} — ${milestone.completed ? 'completed' : 'not completed'}`}
                            className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                              milestone.completed
                                ? 'border-green-500 bg-green-500/20 text-green-400'
                                : 'border-input-border hover:border-fg-secondary'
                            }`}
                          >
                            {milestone.completed && '✓'}
                          </button>
                          <span
                            className={`text-sm ${
                              milestone.completed ? 'line-through text-fg-muted' : 'text-fg-secondary'
                            }`}
                          >
                            {milestone.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {addingMilestoneFor === goal.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMilestone(goal.id)}
                        placeholder="Milestone title..."
                        autoFocus
                        className="flex-1 bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => addMilestone(goal.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingMilestoneFor(null);
                          setNewMilestoneTitle('');
                        }}
                        className="text-xs bg-surface hover:bg-surface-hover px-2 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setAddingMilestoneFor(goal.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        + Add milestone
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveGoal(goal.id);
                          }}
                          className="text-xs text-fg-muted hover:text-yellow-400 transition-colors"
                        >
                          {goal.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGoal(goal.id);
                          }}
                          className="text-xs text-fg-muted hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
