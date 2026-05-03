'use client';

import { useState, useEffect } from 'react';
import { loadData, saveData, generateId, todayString } from '@/lib/storage';
import { Skill } from '@/lib/types';

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const data = loadData();
    setSkills(data.skills);
  }, []);

  function persist(updated: Skill[]) {
    setSkills(updated);
    const data = loadData();
    saveData({ ...data, skills: updated });
  }

  function addSkill() {
    if (!newName.trim()) return;
    const skill: Skill = {
      id: generateId(),
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

  function addSession(skillId: string) {
    const updated = skills.map((s) => {
      if (s.id !== skillId) return s;
      return {
        ...s,
        sessions: [
          ...s.sessions,
          {
            id: generateId(),
            date: todayString(),
            durationMinutes: 30,
            notes: '',
          },
        ],
      };
    });
    persist(updated);
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
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addSkill}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">
          No skills yet. Add one to start tracking!
        </p>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: skill.color }}
                  />
                  <h3 className="font-medium">{skill.name}</h3>
                </div>
                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {getLevel(skill)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {getTotalHours(skill)}h total &middot; {skill.sessions.length} sessions
                </p>
                <button
                  onClick={() => addSession(skill.id)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                >
                  + 30min
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
