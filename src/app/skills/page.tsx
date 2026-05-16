'use client';

import { useState } from 'react';
import { loadData, saveData, generateId, todayString, loadProfileData } from '@/lib/storage';
import { Skill } from '@/lib/types';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
      sessions: [],
      createdAt: todayString(),
    };
    persist([...skills, skill]);
    setNewName('');
  }

  function deleteSkill(id: string) {
    if (!window.confirm('Delete this skill and all its sessions?')) return;
    persist(skills.filter((s) => s.id !== id));
  }

  function startEditSkill(skill: Skill) {
    setEditingId(skill.id);
    setEditName(skill.name);
  }

  function saveEditSkill(id: string) {
    if (!editName.trim()) return;
    const updated = skills.map((s) => {
      if (s.id !== id) return s;
      return { ...s, name: editName.trim() };
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
    if (sessionDuration <= 0) return;
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

  function getLevel(skill: Skill): string {
    const hours = skill.sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;
    if (hours >= 100) return 'Advanced';
    if (hours >= 30) return 'Intermediate';
    if (hours >= 5) return 'Beginner';
    return 'Novice';
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
      <h1 className="text-2xl font-bold mb-6">Skills</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSkill()}
          placeholder="New skill..."
          className="flex-1 bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addSkill}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-fg-muted text-center mt-12">
          No skills yet. Add one to start tracking!
        </p>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
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
                    <div className="flex items-center gap-2">
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
                    <h3 className="font-medium">{skill.name}</h3>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-surface px-2 py-1 rounded">
                    {getLevel(skill)}
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

              {loggingId === skill.id && (
                <div className="mt-3 pt-3 border-t border-card-border space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-fg-secondary">Duration (min):</label>
                    <input
                      type="number"
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(Number(e.target.value))}
                      min={1}
                      className="w-20 bg-input border border-input-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
