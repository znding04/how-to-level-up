'use client';

import { useState, useCallback } from 'react';
import { loadData, loadProfileData, loadYearlyVision, saveYearlyVision, createDefaultYearlyVision, getCurrentYear, generateId } from '@/lib/storage';
import { YearlyVision, IdentityStatement, AnnualGoal } from '@/lib/types';

const MIN_YEAR = getCurrentYear() - 1;
const MAX_YEAR = getCurrentYear() + 2;
const MAX_IDENTITY_STATEMENTS = 5;
const MAX_ANNUAL_GOALS = 10;

function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function YearlyPage() {
  const [fullData] = useState(() => loadData());
  const profileId = fullData.activeProfileId;
  const profileData = loadProfileData(fullData);

  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [vision, setVision] = useState<YearlyVision | null>(() => {
    const v = loadYearlyVision(profileId, selectedYear);
    return v ?? createDefaultYearlyVision(profileId, selectedYear);
  });
  const [saved, setSaved] = useState(false);

  // Identity statements
  const [statements, setStatements] = useState<IdentityStatement[]>(
    vision?.identityStatements ?? []
  );
  const [newStatement, setNewStatement] = useState('');

  // Year word/theme
  const [yearWord, setYearWord] = useState(vision?.yearWord ?? '');
  const [yearTheme, setYearTheme] = useState(vision?.yearTheme ?? '');

  // Annual goals
  const [annualGoals, setAnnualGoals] = useState<AnnualGoal[]>(
    vision?.annualGoals ?? []
  );
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalMilestone, setNewGoalMilestone] = useState('');
  const [newGoalMilestones, setNewGoalMilestones] = useState<string[]>([]);

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    const v = loadYearlyVision(profileId, year);
    const loaded = v ?? createDefaultYearlyVision(profileId, year);
    setVision(loaded);
    setStatements(loaded.identityStatements);
    setYearWord(loaded.yearWord ?? '');
    setYearTheme(loaded.yearTheme ?? '');
    setAnnualGoals(loaded.annualGoals);
    setSaved(false);
  }, [profileId]);

  function autoSave() {
    if (!vision) return;
    const updated: YearlyVision = {
      ...vision,
      year: selectedYear,
      identityStatements: statements,
      annualGoals,
      yearWord: yearWord.trim() || undefined,
      yearTheme: yearTheme.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    saveYearlyVision(profileId, updated);
    setVision(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function addStatement() {
    if (!newStatement.trim() || statements.length >= MAX_IDENTITY_STATEMENTS) return;
    const stmt: IdentityStatement = {
      id: generateId(),
      text: newStatement.trim().slice(0, 100),
      createdAt: new Date().toISOString(),
    };
    setStatements(prev => [...prev, stmt]);
    setNewStatement('');
  }

  function updateStatement(id: string, text: string) {
    setStatements(prev => prev.map(s => s.id === id ? { ...s, text: text.slice(0, 100) } : s));
  }

  function removeStatement(id: string) {
    setStatements(prev => prev.filter(s => s.id !== id));
  }

  function addMilestoneToNew() {
    if (!newGoalMilestone.trim()) return;
    setNewGoalMilestones(prev => [...prev, newGoalMilestone.trim()]);
    setNewGoalMilestone('');
  }

  function removeMilestoneFromNew(idx: number) {
    setNewGoalMilestones(prev => prev.filter((_, i) => i !== idx));
  }

  function addAnnualGoal() {
    if (!newGoalTitle.trim() || annualGoals.length >= MAX_ANNUAL_GOALS) return;
    const goal: AnnualGoal = {
      id: generateId(),
      title: newGoalTitle.trim().slice(0, 80),
      description: newGoalDesc.trim().slice(0, 200) || undefined,
      milestones: newGoalMilestones.map(m => ({ id: generateId(), title: m, completed: false })),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setAnnualGoals(prev => [...prev, goal]);
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalMilestones([]);
    setShowGoalForm(false);
  }

  function toggleGoalMilestone(goalId: string, milestoneId: string) {
    setAnnualGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        milestones: g.milestones.map(m =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        ),
      };
    }));
  }

  function removeGoal(goalId: string) {
    setAnnualGoals(prev => prev.filter(g => g.id !== goalId));
  }

  function archiveGoal(goalId: string) {
    setAnnualGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, status: 'archived' as const } : g
    ));
  }

  function getGoalProgress(goal: AnnualGoal): number {
    if (goal.milestones.length === 0) return 0;
    const done = goal.milestones.filter(m => m.completed).length;
    return Math.round((done / goal.milestones.length) * 100);
  }

  const activeGoals = annualGoals.filter(g => g.status === 'active');
  const archivedGoals = annualGoals.filter(g => g.status === 'archived');

  const totalMilestones = annualGoals.reduce((acc, g) => acc + g.milestones.length, 0);
  const completedMilestones = annualGoals.reduce((acc, g) => acc + g.milestones.filter(m => m.completed).length, 0);

  // Skills for linking
  const skills = profileData.skills;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Yearly Vision</h1>
          <p className="text-sm text-fg-muted mt-0.5">Who do you want to become in {selectedYear}?</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-400">Saved!</span>
          )}
          <button
            onClick={autoSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => handleYearChange(selectedYear - 1)}
          disabled={selectedYear <= MIN_YEAR}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-fg-secondary disabled:opacity-30 transition-colors"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex items-center gap-2">
          {yearWord && (
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium border border-purple-500/30">
              {yearWord}
            </span>
          )}
          <span className="text-xl font-bold">{selectedYear}</span>
        </div>
        <button
          onClick={() => handleYearChange(selectedYear + 1)}
          disabled={selectedYear >= MAX_YEAR}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-fg-secondary disabled:opacity-30 transition-colors"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Year Word & Theme Card */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
        <h2 className="font-semibold text-sm text-fg-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <StarIcon className="text-yellow-400" />
          Year Theme
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-fg-muted block mb-1">Year Word (single word intention)</label>
            <input
              type="text"
              value={yearWord}
              onChange={(e) => setYearWord(e.target.value.slice(0, 20))}
              placeholder="e.g. Discipline, Breakthrough, Growth..."
              maxLength={20}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-fg-muted block mb-1">Year Theme (phrase)</label>
            <input
              type="text"
              value={yearTheme}
              onChange={(e) => setYearTheme(e.target.value.slice(0, 30))}
              placeholder="e.g. Build lasting habits that compound"
              maxLength={30}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Identity Statements */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
        <h2 className="font-semibold text-sm text-fg-secondary uppercase tracking-wider mb-1 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">I</span>
          Identity Statements
        </h2>
        <p className="text-xs text-fg-muted mb-3">Declare who you are becoming. &quot;I am...&quot;</p>

        <div className="space-y-2 mb-3">
          {statements.map((stmt) => (
            <div key={stmt.id} className="flex items-center gap-2">
              <span className="text-blue-400 font-medium text-sm flex-shrink-0">I am&nbsp;</span>
              <input
                type="text"
                value={stmt.text}
                onChange={(e) => updateStatement(stmt.id, e.target.value)}
                onBlur={autoSave}
                maxLength={100}
                className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
              <button
                onClick={() => { removeStatement(stmt.id); }}
                className="text-fg-muted hover:text-red-400 transition-colors flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        {statements.length < MAX_IDENTITY_STATEMENTS && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newStatement}
              onChange={(e) => setNewStatement(e.target.value.slice(0, 100))}
              onKeyDown={(e) => e.key === 'Enter' && addStatement()}
              placeholder="I am a consistent daily learner..."
              maxLength={100}
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              onClick={addStatement}
              disabled={!newStatement.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
        )}
        <p className="text-xs text-fg-muted mt-2">{statements.length}/{MAX_IDENTITY_STATEMENTS} statements</p>
      </div>

      {/* Annual Goals */}
      <div className="bg-card border border-card-border rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-fg-secondary uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">G</span>
            Annual Goals
          </h2>
          {annualGoals.length < MAX_ANNUAL_GOALS && (
            <button
              onClick={() => setShowGoalForm(true)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Add Goal
            </button>
          )}
        </div>

        {/* Add Goal Form */}
        {showGoalForm && (
          <div className="bg-surface border border-border rounded-xl p-3 mb-3 space-y-2">
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value.slice(0, 80))}
              placeholder="Goal title (e.g. Run a marathon)"
              maxLength={80}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
            />
            <input
              type="text"
              value={newGoalDesc}
              onChange={(e) => setNewGoalDesc(e.target.value.slice(0, 200))}
              placeholder="Optional description..."
              maxLength={200}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {/* Milestones */}
            <div className="space-y-1">
              {newGoalMilestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-4 h-4 rounded border border-green-500/40 flex-shrink-0" />
                  <span className="flex-1 text-foreground">{m}</span>
                  <button onClick={() => removeMilestoneFromNew(i)} className="text-fg-muted hover:text-red-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoalMilestone}
                  onChange={(e) => setNewGoalMilestone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestoneToNew())}
                  placeholder="Add milestone..."
                  className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
                <button onClick={addMilestoneToNew} className="text-xs text-blue-400 hover:text-blue-300">Add</button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowGoalForm(false); setNewGoalTitle(''); setNewGoalDesc(''); setNewGoalMilestones([]); }}
                className="flex-1 py-2 rounded-xl text-sm bg-surface hover:bg-surface-hover text-fg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addAnnualGoal}
                disabled={!newGoalTitle.trim()}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white transition-colors"
              >
                Create Goal
              </button>
            </div>
          </div>
        )}

        {/* Goals List */}
        {activeGoals.length === 0 && !showGoalForm && (
          <p className="text-sm text-fg-muted text-center py-6">
            No goals for {selectedYear} yet.{' '}
            <button onClick={() => setShowGoalForm(true)} className="text-blue-400 underline">Create one</button>
          </p>
        )}

        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <div key={goal.id} className="bg-surface rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm text-foreground flex-1">{goal.title}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => archiveGoal(goal.id)} className="text-xs text-fg-muted hover:text-yellow-400 px-1" title="Archive">✓</button>
                    <button onClick={() => removeGoal(goal.id)} className="text-xs text-fg-muted hover:text-red-400 px-1" title="Delete">×</button>
                  </div>
                </div>
                {goal.description && (
                  <p className="text-xs text-fg-muted mb-2">{goal.description}</p>
                )}
                {/* Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-fg-muted mb-1">
                    <span>Milestones</span>
                    <span>{goal.milestones.filter(m => m.completed).length}/{goal.milestones.length}</span>
                  </div>
                  <div className="w-full bg-bar-track rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {/* Milestones */}
                <div className="space-y-1">
                  {goal.milestones.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <button
                        onClick={() => toggleGoalMilestone(goal.id, m.id)}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          m.completed
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'border-border hover:border-green-500/50'
                        }`}
                      >
                        {m.completed && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <span className={m.completed ? 'line-through text-fg-muted' : 'text-foreground'}>{m.title}</span>
                    </label>
                  ))}
                </div>
                {/* Linked skills */}
                {goal.targetSkills && goal.targetSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {goal.targetSkills.map(skillId => {
                      const skill = skills.find(s => s.id === skillId);
                      if (!skill) return null;
                      return (
                        <span key={skillId} className="text-xs px-1.5 py-0.5 rounded bg-surface-dim text-fg-secondary flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: skill.color }} />
                          {skill.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Archived goals */}
        {archivedGoals.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-fg-muted cursor-pointer hover:text-fg-secondary">
              Archived ({archivedGoals.length})
            </summary>
            <div className="space-y-2 mt-2 opacity-60">
              {archivedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between bg-surface rounded-lg p-2">
                  <span className="text-sm text-fg-muted line-through">{goal.title}</span>
                  <button onClick={() => removeGoal(goal.id)} className="text-xs text-fg-muted hover:text-red-400">×</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Progress Overview */}
      {(statements.length > 0 || annualGoals.length > 0) && (
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <h2 className="font-semibold text-sm text-fg-secondary uppercase tracking-wider mb-3">
            {selectedYear} at a Glance
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{statements.length}</div>
              <div className="text-xs text-fg-muted">Identities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{activeGoals.length}</div>
              <div className="text-xs text-fg-muted">Goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}%
              </div>
              <div className="text-xs text-fg-muted">Milestones</div>
            </div>
          </div>
          {/* Identity preview */}
          {statements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-fg-muted mb-1">Top identity:</p>
              <p className="text-sm text-foreground italic">&quot;I am {statements[0].text}&quot;</p>
            </div>
          )}
          {/* Year word display */}
          {yearWord && (
            <div className="mt-3 pt-3 border-t border-border text-center">
              <p className="text-xs text-fg-muted mb-1">{selectedYear} Word:</p>
              <p className="text-xl font-bold text-purple-400">{yearWord}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {statements.length === 0 && annualGoals.length === 0 && !yearWord && !yearTheme && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="font-semibold text-lg mb-1">Plan your {selectedYear}</h3>
          <p className="text-fg-muted text-sm mb-4">
            Set your year word, declare your identity, and create annual goals
          </p>
        </div>
      )}
    </div>
  );
}
