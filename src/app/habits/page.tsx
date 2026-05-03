'use client';

import { useState, useEffect } from 'react';
import { loadData, saveData, generateId, todayString } from '@/lib/storage';
import { Habit } from '@/lib/types';

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newName, setNewName] = useState('');
  const today = todayString();

  useEffect(() => {
    const data = loadData();
    setHabits(data.habits);
  }, []);

  function persist(updated: Habit[]) {
    setHabits(updated);
    const data = loadData();
    saveData({ ...data, habits: updated });
  }

  function addHabit() {
    if (!newName.trim()) return;
    const habit: Habit = {
      id: generateId(),
      name: newName.trim(),
      frequency: 'daily',
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][
        Math.floor(Math.random() * 5)
      ],
      createdAt: today,
      completions: {},
    };
    persist([...habits, habit]);
    setNewName('');
  }

  function toggleCompletion(id: string) {
    const updated = habits.map((h) => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      completions[today] = !completions[today];
      return { ...h, completions };
    });
    persist(updated);
  }

  function getStreak(habit: Habit): number {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if (habit.completions[key]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Habits</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addHabit()}
          placeholder="New habit..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addHabit}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {habits.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">
          No habits yet. Add one to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center gap-3 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
            >
              <button
                onClick={() => toggleCompletion(habit.id)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                  habit.completions[today]
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                {habit.completions[today] && '✓'}
              </button>
              <div className="flex-1">
                <span
                  className={`font-medium ${
                    habit.completions[today] ? 'line-through text-gray-500' : ''
                  }`}
                >
                  {habit.name}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {getStreak(habit) > 0 && `🔥 ${getStreak(habit)}d`}
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: habit.color }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
