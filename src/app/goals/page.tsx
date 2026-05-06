'use client';

import { useState } from 'react';
import { loadData, saveData, generateId, todayString } from '@/lib/storage';
import { Goal } from '@/lib/types';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return data.goals;
  });
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [addingMilestoneFor, setAddingMilestoneFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  function persist(updated: Goal[]) {
    setGoals(updated);
    const data = loadData();
    saveData({ ...data, goals: updated });
  }

  function addGoal() {
    if (!newTitle.trim()) return;
    const goal: Goal = {
      id: generateId(),
      title: newTitle.trim(),
      description: '',
      targetDate: '',
      milestones: [],
      status: 'active',
      createdAt: todayString(),
    };
    persist([...goals, goal]);
    setNewTitle('');
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

  function updateGoalField(id: string, field: 'description' | 'targetDate', value: string) {
    const updated = goals.map((g) => {
      if (g.id !== id) return g;
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Goals</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          placeholder="New goal..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addGoal}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-400 flex items-center gap-2 cursor-pointer">
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
        <p className="text-gray-500 text-center mt-12">
          No goals yet. Set one to start leveling up!
        </p>
      ) : (
        <div className="space-y-3">
          {goals.filter((g) => showArchived || g.status !== 'archived').map((goal) => (
            <div
              key={goal.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
            >
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`font-medium ${
                      goal.status === 'completed' ? 'line-through text-gray-500' : ''
                    }`}
                  >
                    {goal.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGoalStatus(goal.id);
                    }}
                    className={`text-xs px-2 py-1 rounded ${
                      goal.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {goal.status === 'completed' ? 'Done' : 'Mark Done'}
                  </button>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${getProgress(goal)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">{getProgress(goal)}% complete</p>
                  {goal.targetDate && (
                    <p className="text-xs text-gray-500">Due: {goal.targetDate}</p>
                  )}
                </div>
              </div>

              {expandedId === goal.id && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Description</label>
                      <textarea
                        value={goal.description}
                        onChange={(e) => updateGoalField(goal.id, 'description', e.target.value)}
                        placeholder="Describe this goal..."
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Target Date</label>
                      <input
                        type="date"
                        value={goal.targetDate}
                        onChange={(e) => updateGoalField(goal.id, 'targetDate', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                              milestone.completed
                                ? 'border-green-500 bg-green-500/20 text-green-400'
                                : 'border-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {milestone.completed && '✓'}
                          </button>
                          <span
                            className={`text-sm ${
                              milestone.completed ? 'line-through text-gray-500' : 'text-gray-300'
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
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveGoal(goal.id);
                        }}
                        className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
                      >
                        {goal.status === 'archived' ? 'Unarchive' : 'Archive'}
                      </button>
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
