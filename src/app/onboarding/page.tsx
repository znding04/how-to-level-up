'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadData,
  saveData,
  generateId,
  todayString,
  markOnboardingCompleted,
  needsOnboarding,
} from '@/lib/storage';
import { Habit, Goal, Skill } from '@/lib/types';

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#14b8a6', '#eab308', '#ef4444',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HABIT_SUGGESTIONS = [
  { name: 'Morning Exercise', emoji: '🏃' },
  { name: 'Read 30 minutes', emoji: '📚' },
  { name: 'Meditate', emoji: '🧘' },
];

const GOAL_SUGGESTIONS = [
  { title: 'Learn a new skill', emoji: '🎯' },
  { title: 'Exercise 3x/week', emoji: '💪' },
  { title: 'Finish a project', emoji: '🚀' },
];

const SKILL_SUGGESTIONS = [
  { name: 'Programming', emoji: '💻' },
  { name: 'Fitness', emoji: '🏋️' },
  { name: 'Creative Writing', emoji: '✍️' },
];

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const ENERGY_EMOJIS = ['🪫', '😴', '😐', '⚡', '🔥'];

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Redirect if already completed
  useEffect(() => {
    const data = loadData();
    if (!needsOnboarding(data, data.activeProfileId)) {
      router.replace('/dashboard');
    }
  }, [router]);

  // Step 2: Habit
  const [habitName, setHabitName] = useState('');
  const [habitColor, setHabitColor] = useState(PRESET_COLORS[0]);
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [habitDays, setHabitDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [habitCreated, setHabitCreated] = useState(false);

  // Step 3: Goal
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [goalCreated, setGoalCreated] = useState(false);

  // Step 4: Skill
  const [skillName, setSkillName] = useState('');
  const [skillColor, setSkillColor] = useState(PRESET_COLORS[4]);
  const [skillCreated, setSkillCreated] = useState(false);

  // Step 5: Preview
  const [previewMood, setPreviewMood] = useState<number | null>(null);
  const [previewEnergy, setPreviewEnergy] = useState<number | null>(null);

  function goToStep(target: number) {
    if (animating) return;
    setDirection(target > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      setAnimating(false);
    }, 150);
  }

  function handleSkip() {
    const data = loadData();
    markOnboardingCompleted(data.activeProfileId);
    router.replace('/dashboard');
  }

  function handleCreateHabit() {
    const name = habitName.trim();
    if (!name) return;
    const data = loadData();
    const habit: Habit = {
      id: generateId(),
      profileId: data.activeProfileId,
      name,
      frequency: habitFrequency,
      scheduledDays: habitFrequency === 'weekly' ? habitDays : [0, 1, 2, 3, 4, 5, 6],
      color: habitColor,
      createdAt: todayString(),
      completions: {},
    };
    data.habits.push(habit);
    saveData(data);
    setHabitCreated(true);
  }

  function handleCreateGoal() {
    const title = goalTitle.trim();
    if (!title) return;
    const data = loadData();
    const goal: Goal = {
      id: generateId(),
      profileId: data.activeProfileId,
      title,
      description: goalDescription.trim(),
      targetDate: goalTargetDate,
      milestones: [{ id: generateId(), title: 'Get started', completed: false }],
      status: 'active',
      createdAt: todayString(),
    };
    data.goals.push(goal);
    saveData(data);
    setGoalCreated(true);
  }

  function handleCreateSkill() {
    const name = skillName.trim();
    if (!name) return;
    const data = loadData();
    const skill: Skill = {
      id: generateId(),
      profileId: data.activeProfileId,
      name,
      color: skillColor,
      sessions: [],
      createdAt: todayString(),
    };
    data.skills.push(skill);
    saveData(data);
    setSkillCreated(true);
  }

  function handleFinish() {
    const data = loadData();
    markOnboardingCompleted(data.activeProfileId);
    router.replace('/dashboard');
  }

  function toggleDay(day: number) {
    setHabitDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  const animClass = animating
    ? direction === 'forward'
      ? 'opacity-0 translate-x-4'
      : 'opacity-0 -translate-x-4'
    : 'opacity-100 translate-x-0';

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Header: progress + skip */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 bg-blue-500'
                  : i < step
                    ? 'w-2.5 bg-blue-500/50'
                    : 'w-2.5 bg-surface-dim'
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-fg-muted hover:text-fg-secondary transition-colors"
        >
          Skip onboarding
        </button>
      </div>

      {/* Step content */}
      <div className={`flex-1 transition-all duration-150 ease-in-out ${animClass}`}>

        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6 py-8">
            <div className="text-7xl font-bold">变强</div>
            <p className="text-xl text-fg-secondary font-medium">How to Level Up</p>
            <div className="space-y-2 text-sm text-fg-muted max-w-xs mx-auto">
              <p>Build daily habits and track your streaks.</p>
              <p>Set goals with milestones and watch your progress.</p>
              <p>Log your mood, energy, and skill practice every day.</p>
            </div>
            <button
              onClick={() => goToStep(1)}
              className="w-full max-w-xs mx-auto bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 py-3 font-medium transition-colors block"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Create Habit */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">Create Your First Habit</h2>
              <p className="text-sm text-fg-muted mt-1">Start small — consistency beats intensity.</p>
            </div>

            {!habitCreated ? (
              <>
                {/* Suggestions */}
                <div>
                  <label className="text-xs text-fg-muted block mb-2">Quick add</label>
                  <div className="flex gap-2 flex-wrap">
                    {HABIT_SUGGESTIONS.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => setHabitName(`${s.name} ${s.emoji}`)}
                        className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                          habitName === `${s.name} ${s.emoji}`
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                            : 'bg-surface border-border text-fg-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {s.emoji} {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Habit Name</label>
                  <input
                    type="text"
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    placeholder="e.g. Morning Exercise"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Color */}
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
                      />
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Frequency</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHabitFrequency('daily')}
                      className={`flex-1 text-sm py-2 rounded-xl border transition-colors ${
                        habitFrequency === 'daily'
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                          : 'bg-surface border-border text-fg-secondary'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setHabitFrequency('weekly')}
                      className={`flex-1 text-sm py-2 rounded-xl border transition-colors ${
                        habitFrequency === 'weekly'
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                          : 'bg-surface border-border text-fg-secondary'
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>

                {/* Day picker for weekly */}
                {habitFrequency === 'weekly' && (
                  <div>
                    <label className="text-sm text-fg-secondary block mb-1">Which days?</label>
                    <div className="flex gap-1.5">
                      {DAY_LABELS.map((label, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay(i)}
                          className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                            habitDays.includes(i)
                              ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                              : 'bg-surface border-border text-fg-muted'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create button */}
                <button
                  onClick={handleCreateHabit}
                  disabled={!habitName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                >
                  Create Habit
                </button>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">✅</div>
                <p className="text-fg-secondary">
                  Habit <span className="font-semibold text-foreground">&ldquo;{habitName.trim()}&rdquo;</span> created!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Set a Goal */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">Set a Goal</h2>
              <p className="text-sm text-fg-muted mt-1">Give yourself something to aim for.</p>
            </div>

            {!goalCreated ? (
              <>
                {/* Suggestions */}
                <div>
                  <label className="text-xs text-fg-muted block mb-2">Quick add</label>
                  <div className="flex gap-2 flex-wrap">
                    {GOAL_SUGGESTIONS.map((s) => (
                      <button
                        key={s.title}
                        onClick={() => setGoalTitle(`${s.title} ${s.emoji}`)}
                        className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                          goalTitle === `${s.title} ${s.emoji}`
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                            : 'bg-surface border-border text-fg-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {s.emoji} {s.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Goal Title</label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Learn a new skill"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Description (optional)</label>
                  <textarea
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="Why this goal matters..."
                    rows={2}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-fg-muted resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Target date */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <button
                  onClick={handleCreateGoal}
                  disabled={!goalTitle.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                >
                  Create Goal
                </button>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">✅</div>
                <p className="text-fg-secondary">
                  Goal <span className="font-semibold text-foreground">&ldquo;{goalTitle.trim()}&rdquo;</span> created!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Track a Skill */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">Track a Skill</h2>
              <p className="text-sm text-fg-muted mt-1">Log practice sessions and level up over time.</p>
            </div>

            {!skillCreated ? (
              <>
                {/* Suggestions */}
                <div>
                  <label className="text-xs text-fg-muted block mb-2">Quick add</label>
                  <div className="flex gap-2 flex-wrap">
                    {SKILL_SUGGESTIONS.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => setSkillName(`${s.name} ${s.emoji}`)}
                        className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${
                          skillName === `${s.name} ${s.emoji}`
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                            : 'bg-surface border-border text-fg-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {s.emoji} {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Skill Name</label>
                  <input
                    type="text"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g. Programming"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm text-fg-secondary block mb-1">Color</label>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSkillColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          skillColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-card scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateSkill}
                  disabled={!skillName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                >
                  Create Skill
                </button>
              </>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">✅</div>
                <p className="text-fg-secondary">
                  Skill <span className="font-semibold text-foreground">&ldquo;{skillName.trim()}&rdquo;</span> created!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Daily Check-in Preview */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">Daily Check-in</h2>
              <p className="text-sm text-fg-muted mt-1">
                Track your mood and energy every day to spot patterns.
              </p>
            </div>

            <div className="bg-card border border-card-border rounded-2xl p-4 space-y-4">
              <p className="text-sm text-fg-secondary font-medium">Try it out — how are you feeling right now?</p>

              {/* Mood preview */}
              <div>
                <label className="text-xs text-fg-muted block mb-2">Mood</label>
                <div className="flex gap-2">
                  {MOOD_EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewMood(i)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        previewMood === i
                          ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy preview */}
              <div>
                <label className="text-xs text-fg-muted block mb-2">Energy</label>
                <div className="flex gap-2">
                  {ENERGY_EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewEnergy(i)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        previewEnergy === i
                          ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                          : 'hover:bg-surface-hover'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-fg-muted text-center">
              You&apos;ll find the full check-in on your dashboard and in the Daily page.
            </p>

            <button
              onClick={handleFinish}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              Finish Setup
            </button>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step > 0 && step < TOTAL_STEPS && (
        <div className="flex items-center justify-between pt-6 mt-auto">
          <button
            onClick={() => goToStep(step - 1)}
            className="text-sm text-fg-muted hover:text-fg-secondary transition-colors px-3 py-2"
          >
            Back
          </button>
          <button
            onClick={() => goToStep(step + 1)}
            className="text-sm text-fg-secondary hover:text-foreground bg-surface hover:bg-surface-hover border border-border rounded-xl px-5 py-2 transition-colors"
          >
            {step === TOTAL_STEPS - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
