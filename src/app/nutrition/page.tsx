'use client';

import { useState } from 'react';
import { loadData, todayString, loadNutritionEntry, saveNutritionEntry, createDefaultNutritionEntry, getCalorieGoal, setCalorieGoal, loadNutritionEntriesForWeek, generateId } from '@/lib/storage';
import { NutritionEntry, Meal, MealType, FoodItem } from '@/lib/types';

const MEAL_CONFIGS: { value: MealType; label: string; icon: string; color: string; bgColor: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅', color: 'text-orange-400', bgColor: 'bg-orange-500/20', emoji: '🍳' },
  { value: 'lunch', label: 'Lunch', icon: '☀️', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', emoji: '🍱' },
  { value: 'dinner', label: 'Dinner', icon: '🌙', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', emoji: '🍽️' },
  { value: 'snack', label: 'Snack', icon: '🍎', color: 'text-green-400', bgColor: 'bg-green-500/20', emoji: '🥨' },
];

// Quick-add presets: common foods with approximate calories
const QUICK_ADD_PRESETS = [
  { name: 'Rice', calories: 200, portion: '1 cup', icon: '🍚' },
  { name: 'Bread', calories: 80, portion: '1 slice', icon: '🍞' },
  { name: 'Egg', calories: 70, portion: '1 large', icon: '🥚' },
  { name: 'Chicken', calories: 165, portion: '100g', icon: '🍗' },
  { name: 'Apple', calories: 95, portion: '1 medium', icon: '🍎' },
  { name: 'Banana', calories: 105, portion: '1 medium', icon: '🍌' },
  { name: 'Milk', calories: 150, portion: '1 cup', icon: '🥛' },
  { name: 'Coffee', calories: 5, portion: '1 cup', icon: '☕' },
  { name: 'Salad', calories: 35, portion: '1 bowl', icon: '🥗' },
  { name: 'Yogurt', calories: 100, portion: '1 cup', icon: '🥛' },
  { name: 'Pasta', calories: 220, portion: '1 cup', icon: '🍝' },
  { name: 'Oatmeal', calories: 150, portion: '1 cup', icon: '🥣' },
];

function getMealConfig(type: MealType) {
  return MEAL_CONFIGS.find(m => m.value === type) ?? MEAL_CONFIGS[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function computeMealCalories(meal: Meal): number {
  return meal.foodItems.reduce((sum, item) => sum + (item.calories ?? 0), 0);
}

function computeTotalCalories(entry: NutritionEntry): number {
  return entry.meals.reduce((sum, meal) => sum + computeMealCalories(meal), 0);
}

interface AddFoodFormData {
  name: string;
  calories: string;
  portion: string;
}

function AddFoodForm({ onAdd, onCancel }: { onAdd: (item: FoodItem) => void; onCancel: () => void }) {
  const [form, setForm] = useState<AddFoodFormData>({ name: '', calories: '', portion: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const item: FoodItem = {
      id: generateId(),
      name: form.name.trim(),
      calories: form.calories ? parseInt(form.calories, 10) : undefined,
      portion: form.portion.trim() || undefined,
    };
    onAdd(item);
    setForm({ name: '', calories: '', portion: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-card-border rounded-xl p-3 space-y-2">
      <input
        type="text"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="Food name"
        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500"
        autoFocus
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={form.calories}
          onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
          placeholder="kcal"
          min="0"
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          value={form.portion}
          onChange={e => setForm(f => ({ ...f, portion: e.target.value }))}
          placeholder="Portion"
          className="flex-1 bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-background border border-card-border text-fg-secondary hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Add
        </button>
      </div>
    </form>
  );
}

function MealSection({
  mealType,
  meal,
  onAddFood,
  onRemoveFood,
}: {
  mealType: MealType;
  meal: Meal;
  onAddFood: (mealType: MealType, item: FoodItem) => void;
  onRemoveFood: (mealType: MealType, itemId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const cfg = getMealConfig(mealType);
  const mealCalories = computeMealCalories(meal);

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      {/* Meal header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.emoji}</span>
          <span className="font-medium text-foreground">{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {meal.foodItems.length > 0 && (
            <span className={`text-sm font-medium ${cfg.color}`}>{mealCalories} kcal</span>
          )}
          <span className="text-fg-muted text-lg">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {/* Food items */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {meal.foodItems.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.name}</p>
                {(item.portion || item.calories) && (
                  <p className="text-xs text-fg-muted">
                    {item.portion && <span>{item.portion}</span>}
                    {item.portion && item.calories && <span> · </span>}
                    {item.calories != null && <span>{item.calories} kcal</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemoveFood(mealType, item.id)}
                className="text-fg-muted hover:text-red-400 transition-colors ml-2 shrink-0"
                title="Remove"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}

          {/* Add food inline */}
          {showForm ? (
            <AddFoodForm
              onAdd={item => { onAddFood(mealType, item); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2 rounded-lg border border-dashed border-card-border text-fg-secondary hover:text-blue-400 hover:border-blue-500/50 transition-colors text-xs font-medium"
            >
              + Add food
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QuickAddBar({ onQuickAdd }: { onQuickAdd: (name: string, calories: number, portion: string) => void }) {
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="space-y-2">
      {/* Meal type selector */}
      <div className="flex gap-1">
        {MEAL_CONFIGS.map(cfg => (
          <button
            key={cfg.value}
            onClick={() => setMealType(cfg.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${mealType === cfg.value ? `${cfg.bgColor} ${cfg.color} border-transparent` : 'bg-surface border-card-border text-fg-secondary hover:border-blue-500/50'}`}
          >
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>
      {/* Quick presets */}
      <button
        onClick={() => setShowPresets(s => !s)}
        className="w-full py-2 rounded-xl border border-dashed border-card-border text-fg-secondary hover:text-blue-400 hover:border-blue-500/50 transition-colors text-xs font-medium"
      >
        {showPresets ? 'Hide' : 'Show'} quick-add presets
      </button>
      {showPresets && (
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_ADD_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => onQuickAdd(preset.name, preset.calories, preset.portion)}
              className="bg-surface hover:bg-surface-hover border border-card-border rounded-lg p-2 flex flex-col items-center gap-0.5 transition-colors"
            >
              <span className="text-base">{preset.icon}</span>
              <span className="text-xs text-fg-secondary truncate w-full text-center">{preset.name}</span>
              <span className="text-xs text-fg-muted">{preset.calories}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NutritionPage() {
  const [date, setDate] = useState(todayString());
  const [entry, setEntry] = useState<NutritionEntry | null>(null);
  const [calorieGoal, setCalorieGoalState] = useState(() => getCalorieGoal());
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState(String(calorieGoal));
  const [weekEntries, setWeekEntries] = useState<NutritionEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load entry when date changes
  const loadForDate = (d: string) => {
    if (typeof window === 'undefined') return;
    const data = loadData();
    let e = loadNutritionEntry(d, data.activeProfileId);
    if (!e) {
      e = createDefaultNutritionEntry(data.activeProfileId, d);
    }
    setEntry(e);
    // Load week entries
    const weekDates = getWeekDates();
    setWeekEntries(loadNutritionEntriesForWeek(data.activeProfileId, weekDates));
  };

  if (!hydrated) {
    loadForDate(date);
    setHydrated(true);
  }

  const today = todayString();

  const handleAddFood = (mealType: MealType, item: FoodItem) => {
    if (!entry) return;
    const updatedMeals = [...entry.meals];
    let meal = updatedMeals.find(m => m.type === mealType);
    if (!meal) {
      const cfg = getMealConfig(mealType);
      meal = { id: generateId(), type: mealType, name: cfg.label, foodItems: [] };
      updatedMeals.push(meal);
    }
    meal.foodItems.push(item);
    const updated = { ...entry, meals: updatedMeals };
    setEntry(updated);
    saveNutritionEntry(updated);
    // Refresh week entries
    const weekDates = getWeekDates();
    const data = loadData();
    setWeekEntries(loadNutritionEntriesForWeek(data.activeProfileId, weekDates));
  };

  const handleRemoveFood = (mealType: MealType, itemId: string) => {
    if (!entry) return;
    const updatedMeals = entry.meals.map(m => {
      if (m.type !== mealType) return m;
      return { ...m, foodItems: m.foodItems.filter(f => f.id !== itemId) };
    }).filter(m => m.foodItems.length > 0);
    const updated = { ...entry, meals: updatedMeals };
    setEntry(updated);
    saveNutritionEntry(updated);
    // Refresh week entries
    const weekDates = getWeekDates();
    const data = loadData();
    setWeekEntries(loadNutritionEntriesForWeek(data.activeProfileId, weekDates));
  };

  const handleQuickAddPreset = (name: string, calories: number, portion: string) => {
    const item: FoodItem = { id: generateId(), name, calories, portion };
    handleAddFood('breakfast', item);
  };

  const handleSaveGoal = () => {
    const goal = parseInt(goalInput, 10);
    if (!isNaN(goal) && goal > 0) {
      setCalorieGoal(goal);
      setCalorieGoalState(goal);
      setShowGoalEdit(false);
    }
  };

  const totalToday = entry ? computeTotalCalories(entry) : 0;
  const caloriePercent = Math.min(100, Math.round((totalToday / calorieGoal) * 100));
  const remaining = calorieGoal - totalToday;

  // Weekly stats
  const weekDates = getWeekDates();
  const daysAtGoal = weekEntries.filter(e => (e.totalCalories ?? 0) >= calorieGoal).length;
  const weekTotal = weekEntries.reduce((sum, e) => sum + (e.totalCalories ?? 0), 0);
  const weekDaysWithData = weekEntries.filter(e => e.meals.length > 0).length;
  const weekAvg = weekDaysWithData > 0 ? Math.round(weekTotal / weekDaysWithData) : 0;

  // Weekly bars: show each day of the week
  const weekBars = weekDates.map(d => {
    const e = weekEntries.find(n => n.date === d);
    return { date: d, calories: e?.totalCalories ?? 0, hasData: !!e && e.meals.length > 0 };
  });

  const getBarHeight = (cal: number) => {
    if (cal === 0) return 4;
    return Math.max(4, Math.min(48, (cal / calorieGoal) * 48));
  };

  const isToday = date === today;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-card-border px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">Nutrition</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const nd = addDays(date, -1); setDate(nd); loadForDate(nd); }}
              className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors"
            >
              ‹
            </button>
            <button
              onClick={() => { setDate(today); loadForDate(today); }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isToday ? 'bg-blue-600 text-white' : 'bg-surface text-fg-secondary hover:bg-surface-hover'}`}
            >
              Today
            </button>
            <button
              onClick={() => { const nd = addDays(date, 1); setDate(nd); loadForDate(nd); }}
              disabled={isToday}
              className="bg-surface hover:bg-surface-hover px-2 py-1 rounded text-sm transition-colors disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
        <p className="text-sm text-fg-secondary">{formatDate(date)}</p>

        {/* Daily calorie summary */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">
              {totalToday} <span className="text-fg-muted">/ {calorieGoal} kcal</span>
            </span>
            {remaining >= 0 ? (
              <span className="text-xs text-green-400">{remaining} left</span>
            ) : (
              <span className="text-xs text-red-400">{Math.abs(remaining)} over</span>
            )}
          </div>
          <div className="w-full bg-surface rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${remaining >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
              style={{ width: `${caloriePercent}%` }}
            />
          </div>
        </div>

        {/* Goal editor */}
        <div className="mt-3 flex items-center gap-2">
          {showGoalEdit ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className="flex-1 bg-surface border border-card-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-blue-500"
                placeholder="Daily goal (kcal)"
                autoFocus
              />
              <button onClick={handleSaveGoal} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">Save</button>
              <button onClick={() => setShowGoalEdit(false)} className="px-2 py-1.5 rounded-lg text-xs bg-surface border border-card-border text-fg-secondary hover:text-foreground transition-colors">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setGoalInput(String(calorieGoal)); setShowGoalEdit(true); }}
              className="text-xs text-fg-muted hover:text-blue-400 transition-colors"
            >
              Goal: {calorieGoal} kcal · tap to edit
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Quick add presets */}
        <QuickAddBar onQuickAdd={handleQuickAddPreset} />

        {/* Weekly summary bar */}
        {weekEntries.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-foreground text-sm">This Week</h2>
              <div className="flex gap-3 text-xs text-fg-secondary">
                <span>{weekTotal.toLocaleString()} kcal total</span>
                <span>·</span>
                <span>avg {weekAvg}</span>
                <span>·</span>
                <span className={daysAtGoal >= 3 ? 'text-green-400' : 'text-fg-secondary'}>{daysAtGoal} at goal</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-1 h-12">
              {weekBars.map((bar) => {
                const dayLabel = new Date(bar.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
                const isBarToday = bar.date === today;
                const metGoal = bar.calories >= calorieGoal;
                return (
                  <div key={bar.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: 48 }}>
                      <div
                        className={`w-full rounded-sm transition-all ${isBarToday ? 'ring-1 ring-blue-400' : ''} ${metGoal && bar.hasData ? 'bg-green-500' : bar.hasData ? 'bg-blue-500' : 'bg-surface'}`}
                        style={{ height: getBarHeight(bar.calories) }}
                      />
                    </div>
                    <span className={`text-xs ${isBarToday ? 'text-blue-400 font-medium' : 'text-fg-muted'}`}>{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Meal sections */}
        {MEAL_CONFIGS.map(cfg => {
          const meal = entry?.meals.find(m => m.type === cfg.value);
          return (
            <MealSection
              key={cfg.value}
              mealType={cfg.value}
              meal={meal ?? { id: '', type: cfg.value, name: cfg.label, foodItems: [] }}
              onAddFood={handleAddFood}
              onRemoveFood={handleRemoveFood}
            />
          );
        })}

        {/* Empty state */}
        {entry && entry.meals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No meals logged</h3>
            <p className="text-sm text-fg-muted">Add foods to your meals using the quick presets or the + Add food button in each meal section</p>
          </div>
        )}
      </div>
    </div>
  );
}
