'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { loadData, saveData, loadProfileData, todayString, generateId } from '@/lib/storage';
import { recordHabitCompletion } from '@/lib/reminders';

export default function QuickAddFAB() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'habits' | 'checkin' | 'skill' | null>(null);

  // Habit logging state
  const [habitData, setHabitData] = useState<{ id: string; name: string; color: string; done: boolean }[]>([]);

  // Check-in state
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // Skill session state
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [skillSuccess, setSkillSuccess] = useState(false);

  // Hide on settings page
  if (pathname.startsWith('/settings')) return null;

  function openPanel(panel: 'habits' | 'checkin' | 'skill') {
    const data = loadData();
    const pd = loadProfileData(data);
    const today = todayString();
    const todayDow = new Date().getDay();

    if (panel === 'habits') {
      const todaysHabits = pd.habits.filter((h) => {
        const days = h.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6];
        return days.includes(todayDow);
      });
      setHabitData(
        todaysHabits.map((h) => ({
          id: h.id,
          name: h.name,
          color: h.color,
          done: !!h.completions[today],
        }))
      );
    }

    if (panel === 'checkin') {
      const todayLog = pd.dailyLogs.find((l) => l.date === today);
      setMood(todayLog?.mood ?? null);
      setEnergy(todayLog?.energy ?? null);
      setCheckinSuccess(false);
    }

    if (panel === 'skill') {
      setSkills(pd.skills.map((s) => ({ id: s.id, name: s.name })));
      setSelectedSkill(pd.skills[0]?.id ?? '');
      setSessionMinutes(30);
      setSkillSuccess(false);
    }

    setActivePanel(panel);
    setOpen(false);
  }

  function toggleHabit(habitId: string) {
    const today = todayString();
    const data = loadData();
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const wasComplete = !!habit.completions[today];
    habit.completions[today] = !wasComplete;
    if (!wasComplete) {
      recordHabitCompletion(habitId, new Date().getHours());
    }
    saveData(data);
    setHabitData((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, done: !h.done } : h))
    );
  }

  function saveCheckin() {
    if (!mood || !energy) return;
    const today = todayString();
    const data = loadData();
    const existingIndex = data.dailyLogs.findIndex(
      (l) => l.date === today && l.profileId === data.activeProfileId
    );
    const log = {
      id: existingIndex >= 0 ? data.dailyLogs[existingIndex].id : generateId(),
      profileId: data.activeProfileId,
      date: today,
      mood,
      energy,
      notes: existingIndex >= 0 ? data.dailyLogs[existingIndex].notes : '',
    };
    if (existingIndex >= 0) {
      data.dailyLogs[existingIndex] = log;
    } else {
      data.dailyLogs.push(log);
    }
    saveData(data);
    setCheckinSuccess(true);
    setTimeout(() => {
      setCheckinSuccess(false);
      setActivePanel(null);
    }, 1500);
  }

  function saveSkillSession() {
    if (!selectedSkill || sessionMinutes <= 0) return;
    const data = loadData();
    const skill = data.skills.find((s) => s.id === selectedSkill);
    if (!skill) return;
    skill.sessions.push({
      id: generateId(),
      date: todayString(),
      durationMinutes: sessionMinutes,
      notes: '',
    });
    saveData(data);
    setSkillSuccess(true);
    setTimeout(() => {
      setSkillSuccess(false);
      setActivePanel(null);
    }, 1500);
  }

  function closeAll() {
    setOpen(false);
    setActivePanel(null);
  }

  return (
    <>
      {/* Backdrop */}
      {(open || activePanel) && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeAll}
        />
      )}

      {/* Active Panel */}
      {activePanel && (
        <div className="fixed bottom-24 right-4 z-50 w-72 bg-card border border-card-border rounded-2xl p-4 shadow-lg">
          {/* Log Habit Panel */}
          {activePanel === 'habits' && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Log Habits</h3>
              {habitData.length === 0 ? (
                <p className="text-sm text-fg-muted">No habits scheduled today</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {habitData.map((h) => (
                    <label key={h.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.done}
                        onChange={() => toggleHabit(h.id)}
                        className="w-4 h-4 rounded border-2 border-gray-500 accent-blue-500 cursor-pointer"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: h.color }}
                      />
                      <span className={`text-sm ${h.done ? 'line-through text-fg-muted' : ''}`}>
                        {h.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <button
                onClick={() => setActivePanel(null)}
                className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Quick Check-in Panel */}
          {activePanel === 'checkin' && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Quick Check-in</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-fg-muted block mb-1">Mood</label>
                  <div className="flex gap-1.5">
                    {([1, 2, 3, 4, 5] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setMood(v)}
                        className={`text-xl p-1 rounded-lg transition-all ${
                          mood === v
                            ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                            : 'hover:bg-surface-hover'
                        }`}
                      >
                        {['😞', '😕', '😐', '🙂', '😄'][v - 1]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-fg-muted block mb-1">Energy</label>
                  <div className="flex gap-1.5">
                    {([1, 2, 3, 4, 5] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setEnergy(v)}
                        className={`text-xl p-1 rounded-lg transition-all ${
                          energy === v
                            ? 'bg-blue-500/20 scale-110 ring-2 ring-blue-500/50'
                            : 'hover:bg-surface-hover'
                        }`}
                      >
                        {['🪫', '😴', '😐', '⚡', '🔥'][v - 1]}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={saveCheckin}
                  disabled={!mood || !energy}
                  className={`w-full py-1.5 text-sm rounded-lg transition-all ${
                    checkinSuccess
                      ? 'bg-green-500 text-white'
                      : !mood || !energy
                        ? 'bg-surface-dim text-fg-muted cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {checkinSuccess ? '✓ Saved!' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Add Skill Session Panel */}
          {activePanel === 'skill' && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Add Skill Session</h3>
              {skills.length === 0 ? (
                <p className="text-sm text-fg-muted">No skills yet — add one on the Skills page</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-fg-muted block mb-1">Skill</label>
                    <select
                      value={selectedSkill}
                      onChange={(e) => setSelectedSkill(e.target.value)}
                      className="w-full bg-input border border-input-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-fg-muted block mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={sessionMinutes}
                      onChange={(e) => setSessionMinutes(Number(e.target.value))}
                      min={1}
                      className="w-full bg-input border border-input-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={saveSkillSession}
                    disabled={!selectedSkill || sessionMinutes <= 0}
                    className={`w-full py-1.5 text-sm rounded-lg transition-all ${
                      skillSuccess
                        ? 'bg-green-500 text-white'
                        : !selectedSkill || sessionMinutes <= 0
                          ? 'bg-surface-dim text-fg-muted cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {skillSuccess ? '✓ Saved!' : 'Done'}
                  </button>
                </div>
              )}
              {skills.length === 0 && (
                <button
                  onClick={() => setActivePanel(null)}
                  className="mt-3 w-full py-1.5 bg-surface hover:bg-surface-hover text-sm rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Menu Items */}
      {open && !activePanel && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 items-end">
          <button
            onClick={() => openPanel('habits')}
            className="flex items-center gap-2 bg-card border border-card-border rounded-xl px-4 py-2.5 shadow-lg hover:bg-surface-hover transition-colors"
          >
            <span className="text-sm">✅</span>
            <span className="text-sm font-medium">Log Habit</span>
          </button>
          <button
            onClick={() => openPanel('checkin')}
            className="flex items-center gap-2 bg-card border border-card-border rounded-xl px-4 py-2.5 shadow-lg hover:bg-surface-hover transition-colors"
          >
            <span className="text-sm">📝</span>
            <span className="text-sm font-medium">Quick Daily Check-in</span>
          </button>
          <button
            onClick={() => openPanel('skill')}
            className="flex items-center gap-2 bg-card border border-card-border rounded-xl px-4 py-2.5 shadow-lg hover:bg-surface-hover transition-colors"
          >
            <span className="text-sm">⚡</span>
            <span className="text-sm font-medium">Add Skill Session</span>
          </button>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => {
          if (activePanel) {
            closeAll();
          } else {
            setOpen(!open);
          }
        }}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
        aria-label={open || activePanel ? 'Close quick add menu' : 'Open quick add menu'}
      >
        <span className={`text-2xl font-light transition-transform duration-200 ${open || activePanel ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
    </>
  );
}
