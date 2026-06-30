'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, generateId, todayString, loadProfileData } from '@/lib/storage';
import { Skill, SkillCategory, SKILL_CATEGORY_CONFIG, getSkillLevel } from '@/lib/types';

function getSkillCategoryStyle(cat?: SkillCategory): string {
  const found = SKILL_CATEGORY_CONFIG.find((c) => c.value === cat);
  return found ? found.color : 'bg-surface text-fg-muted border-card-border';
}

function getSkillCategoryLabel(cat?: SkillCategory): string {
  const found = SKILL_CATEGORY_CONFIG.find((c) => c.value === cat);
  return found ? `${found.icon} ${found.label}` : '';
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).skills;
  });
  const [newName, setNewName] = useState('');
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionNotes, setSessionNotes] = useState('');
  const [durationError, setDurationError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newCategory, setNewCategory] = useState<SkillCategory | ''>('');
  const [editCategory, setEditCategory] = useState<SkillCategory | ''>('');
  const [filterCategory, setFilterCategory] = useState<SkillCategory | 'all'>('all');

  function persist(updated: Skill[]) {
    setSkills(updated);
    const data = loadData();
    const otherSkills = data.skills.filter((s) => s.profileId !== data.activeProfileId);
    saveData({ ...data, skills: [...otherSkills, ...updated] });
  }

  function addSkill() {
    if (!newName.trim()) return;
    const data = loadData();
    const skill: Skill = {
      id: generateId(),
      profileId: data.activeProfileId,
      name: newName.trim(),
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][
        Math.floor(Math.random() * 5)
      ],
      category: newCategory || undefined,
      sessions: [],
      createdAt: todayString(),
    };
    persist([...skills, skill]);
    setNewName('');
    setNewCategory('');
  }

  function deleteSkill(id: string) {
    if (!window.confirm('Delete this skill and all its sessions?')) return;
    persist(skills.filter((s) => s.id !== id));
  }

  function startEditSkill(skill: Skill) {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditCategory(skill.category ?? '');
  }

  function saveEditSkill(id: string) {
    if (!editName.trim()) return;
    const updated = skills.map((s) => {
      if (s.id !== id) return s;
      return { ...s, name: editName.trim(), category: editCategory || undefined };
    });
    persist(updated);
    setEditingId(null);
  }

  function startLogging(skillId: string) {
    setLoggingId(skillId);
    setSessionDuration(30);
    setSessionNotes('');
  }

  function saveSession(skillId: string) {
    if (sessionDuration <= 0) {
      setDurationError('Duration must be at least 1 minute');
      return;
    }
    setDurationError('');
    const updated = skills.map((s) => {
      if (s.id !== skillId) return s;
      return {
        ...s,
        sessions: [
          ...s.sessions,
          {
            id: generateId(),
            date: todayString(),
            durationMinutes: sessionDuration,
            notes: sessionNotes.trim(),
          },
        ],
      };
    });
    persist(updated);
    setLoggingId(null);
  }

  function getTotalHours(skill: Skill): string {
    const minutes = skill.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return (minutes / 60).toFixed(1);
  }

  function getLevel(skill: Skill) {
    const totalMinutes = skill.sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return getSkillLevel(totalMinutes);
  }

  function getLastSession(skill: Skill): string | null {
    if (skill.sessions.length === 0) return null;
    const sorted = [...skill.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].date;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Skills</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/skills/study"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Study
          </Link>
          <Link
            href="/skills/trends"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Trends
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSkill()}
          placeholder="New skill..."
          className="flex-1 bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as SkillCategory | '')}
          className="bg-input border border-input-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No category</option>
          {SKILL_CATEGORY_CONFIG.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
        <button
          onClick={addSkill}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {/* Category filter bar */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        <button
          onClick={() => setFilterCategory('all')}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-surface text-fg-secondary'
          }`}
        >
          All
        </button>
        {SKILL_CATEGORY_CONFIG.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              filterCategory === cat.value ? 'bg-blue-600 text-white border-blue-600' : `${cat.color} border`
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {skills.length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          No skills yet. Add one to start tracking!
        </p>
      ) : skills.filter((s) => filterCategory === 'all' || s.category === filterCategory).length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          No skills match this category filter
        </p>
      ) : (
        <div className="space-y-3">
          {skills.filter((s) => filterCategory === 'all' || s.category === filterCategory).map((skill) => (
            <div
              key={skill.id}
              className="bg-card border border-card-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: skill.color }}
                  />
                  {editingId === skill.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditSkill(skill.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as SkillCategory | '')}
                        className="bg-input border border-input-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No category</option>
                        {SKILL_CATEGORY_CONFIG.map((c) => (
                          <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveEditSkill(skill.id)}
                        className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs bg-surface hover:bg-surface-hover px-2 py-1 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{skill.name}</h3>
                      {skill.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSkillCategoryStyle(skill.category)}`}>
                          {getSkillCategoryLabel(skill.category)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium bg-surface px-2 py-1 rounded-full ${getLevel(skill).color}`}>
                    {getLevel(skill).label}
                  </span>
                  {editingId !== skill.id && (
                    <>
                      <button
                        onClick={() => startEditSkill(skill)}
                        className="text-fg-muted hover:text-fg-secondary transition-colors"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteSkill(skill.id)}
                        className="text-fg-muted hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-fg-secondary">
                    {getTotalHours(skill)}h total &middot; {skill.sessions.length} sessions
                  </p>
                  {getLastSession(skill) && (
                    <p className="text-xs text-fg-muted">Last: {getLastSession(skill)}</p>
                  )}
                </div>
                <button
                  onClick={() => startLogging(skill.id)}
                  className="text-xs bg-surface hover:bg-surface-hover px-2 py-1 rounded transition-colors"
                >
                  Log session
                </button>
              </div>

              {/* XP Progress Bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
                  <span>{getLevel(skill).label}</span>
                  <span>{Math.round(getLevel(skill).xpPercent)}% XP</span>
                </div>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${getLevel(skill).xpPercent}%`,
                      backgroundColor: skill.color,
                    }}
                  />
                </div>
              </div>

              {loggingId === skill.id && (
                <div className="mt-3 pt-3 border-t border-card-border space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-fg-secondary">Duration (min):</label>
                    <input
                      type="number"
                      value={sessionDuration}
                      onChange={(e) => { setSessionDuration(Number(e.target.value)); setDurationError(''); }}
                      min={1}
                      className="w-20 bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {durationError && <span className="text-xs text-red-400">{durationError}</span>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      placeholder="Notes (optional)..."
                      className="w-full bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSession(skill.id)}
                      className="text-xs bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setLoggingId(null)}
                      className="text-xs bg-surface hover:bg-surface-hover px-3 py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
