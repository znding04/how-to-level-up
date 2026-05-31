'use client';

import { useState } from 'react';
import { loadData, saveData, generateId, markOnboardingCompleted, todayString } from '@/lib/storage';
import { AppData, Habit, Goal } from '@/lib/types';

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#14b8a6', '#eab308', '#ef4444',
];

interface OnboardingModalProps {
  profileId: string;
  onComplete: (updatedData: AppData) => void;
}

export default function OnboardingModal({ profileId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  // Step 2: Habit form
  const [habitName, setHabitName] = useState('Morning Exercise');
  const [habitColor, setHabitColor] = useState(PRESET_COLORS[0]);

  // Step 3: Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Created habit name for step 4 display
  const [createdHabitName, setCreatedHabitName] = useState('');

  function handleCreateHabit() {
    const name = habitName.trim();
    if (!name) return;

    const data = loadData();
    const habit: Habit = {
      id: generateId(),
      profileId,
      name,
      frequency: 'daily',
      scheduledDays: [0, 1, 2, 3, 4, 5, 6],
      color: habitColor,
      createdAt: todayString(),
      completions: {},
    };
    data.habits.push(habit);
    saveData(data);
    setCreatedHabitName(name);
    setStep(2);
  }

  function handleCreateGoal() {
    const title = goalTitle.trim();
    if (!title) return;

    const data = loadData();
    const goal: Goal = {
      id: generateId(),
      profileId,
      title,
      description: '',
      targetDate: goalTargetDate,
      milestones: [{ id: generateId(), title: 'Get started', completed: false }],
      status: 'active',
      createdAt: todayString(),
    };
    data.goals.push(goal);
    saveData(data);
    setStep(3);
  }

  function handleFinish() {
    markOnboardingCompleted(profileId);
    const data = loadData();
    onComplete(data);
  }

  const totalSteps = 4;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-card-border">
        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-blue-500' : 'bg-surface-dim'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-4">
            <div className="text-6xl">🚀</div>
            <h2 className="text-2xl font-bold">变强</h2>
            <p className="text-fg-secondary">Track your growth, one day at a time</p>
            <p className="text-fg-muted text-sm">
              Let&apos;s set up your first habit in under 2 minutes
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Create First Habit */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center">Create Your First Habit</h2>

            <div>
              <label className="text-sm text-fg-secondary block mb-1">Habit Name</label>
              <input
                type="text"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="text-sm text-fg-secondary block mb-1">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setHabitColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      habitColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-card scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-fg-secondary block mb-1">Frequency</label>
              <p className="text-sm text-fg-muted bg-surface border border-border rounded-xl px-3 py-2">
                Daily — all 7 days
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="text-fg-secondary text-sm px-4 py-2"
              >
                Back
              </button>
              <button
                onClick={handleCreateHabit}
                disabled={!habitName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
              >
                Create Habit
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Set a Goal (optional) */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center">Want to set a goal? (optional)</h2>

            {!showGoalForm ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="w-full bg-surface border border-border hover:bg-surface-hover text-foreground rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  Yes, set a goal
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                >
                  Skip
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Goal Title</label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Learn a new skill"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="text-fg-secondary text-sm px-4 py-2"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleCreateGoal}
                    disabled={!goalTitle.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                  >
                    Create Goal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: All Set! */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">All Set!</h2>
            <p className="text-fg-secondary">
              Your habit <span className="font-semibold text-foreground">&ldquo;{createdHabitName}&rdquo;</span> is ready to track.
            </p>
            <p className="text-fg-muted text-sm">
              You&apos;re ready to start tracking! 🚀
            </p>
            <button
              onClick={handleFinish}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
            >
              Start Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
