'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadData, saveData, loadProfileData, generateId, todayString } from '@/lib/storage';
import { Skill } from '@/lib/types';

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export default function FocusPage() {
  const [skills, setSkills] = useState<Skill[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).skills;
  });

  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneLoggedRef = useRef(false);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null;

  // Tick the timer — also handles completion logging
  useEffect(() => {
    if (timerState !== 'running') return;

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          // Synchronously set done; use deferred callback for logging to avoid
          // calling setState inside this setter (avoids cascading render warning)
          setTimerState('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState]);

  // Log session after timer completes — uses a deferred timer callback
  // to avoid calling setState synchronously inside a state updater
  useEffect(() => {
    if (timerState !== 'done' || !selectedSkillId || doneLoggedRef.current) return;
    doneLoggedRef.current = true;

    // Defer to next tick so we're outside the setRemainingSeconds setter
    const tid = setTimeout(() => {
      const data = loadData();
      const profileSkills = loadProfileData(data).skills;
      const skill = profileSkills.find((s) => s.id === selectedSkillId);
      if (!skill) return;

      const minutes = Math.round(totalSeconds / 60);
      const updated = profileSkills.map((s) => {
        if (s.id !== selectedSkillId) return s;
        return {
          ...s,
          sessions: [
            ...s.sessions,
            {
              id: generateId(),
              date: todayString(),
              durationMinutes: minutes,
              notes: `Focus session (${minutes} min)`,
            },
          ],
        };
      });
      setSkills(updated);
      const otherSkills = data.skills.filter((s) => s.profileId !== data.activeProfileId);
      saveData({ ...data, skills: [...otherSkills, ...updated] });
      setSessionsCompleted((n) => n + 1);
    }, 0);

    return () => clearTimeout(tid);
  }, [timerState, selectedSkillId, totalSeconds]);

  // Reset done-logged flag when timer resets or skill changes
  useEffect(() => {
    if (timerState === 'idle' || timerState === 'running') {
      doneLoggedRef.current = false;
    }
  }, [timerState, selectedSkillId]);

  const applyPreset = useCallback((minutes: number) => {
    setCustomMinutes(String(minutes));
    setTotalSeconds(minutes * 60);
    setRemainingSeconds(minutes * 60);
    setTimerState('idle');
    doneLoggedRef.current = false;
  }, []);

  const applyCustom = useCallback(() => {
    const m = parseInt(customMinutes, 10);
    if (!m || m <= 0) return;
    setTotalSeconds(m * 60);
    setRemainingSeconds(m * 60);
    setTimerState('idle');
    doneLoggedRef.current = false;
  }, [customMinutes]);

  function start() {
    if (remainingSeconds <= 0) return;
    setTimerState('running');
  }

  function pause() {
    setTimerState('paused');
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemainingSeconds(totalSeconds);
    setTimerState('idle');
    doneLoggedRef.current = false;
  }

  function dismissDone() {
    setTimerState('idle');
    doneLoggedRef.current = false;
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Focus</h1>

      {/* Skill selector */}
      {skills.length > 0 && (
        <div className="mb-6">
          <label className="text-sm text-fg-secondary mb-2 block">Practice Skill</label>
          <div className="flex gap-2 flex-wrap">
            {skills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => {
                  if (timerState === 'running') return;
                  setSelectedSkillId(skill.id);
                }}
                disabled={timerState === 'running'}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedSkillId === skill.id
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-card-border bg-card text-fg-secondary hover:bg-surface-hover'
                } ${timerState === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: skill.color }}
                />
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Duration presets */}
      {timerState === 'idle' && (
        <div className="mb-6">
          <label className="text-sm text-fg-secondary mb-2 block">Duration</label>
          <div className="flex gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.minutes}
                onClick={() => applyPreset(p.minutes)}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-card-border transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
              placeholder="Custom min"
              min={1}
              className="w-28 bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={applyCustom}
              className="text-xs bg-surface hover:bg-surface-hover border border-card-border px-3 py-2 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-36 h-36 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Track */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="var(--card-border)"
              strokeWidth="8"
            />
            {/* Progress */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={timerState === 'done' ? '#10b981' : '#3b82f6'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={timerState === 'idle' ? circumference : dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {timerState === 'done' ? (
              <div className="text-center">
                <div className="text-2xl">🎉</div>
                <div className="text-xs text-green-400 mt-1">Done!</div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold tabular-nums">
                  {formatTime(remainingSeconds)}
                </div>
                {selectedSkill && (
                  <div className="text-xs text-fg-muted mt-1">{selectedSkill.name}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {timerState === 'idle' && (
            <button
              onClick={start}
              disabled={remainingSeconds <= 0 || (!selectedSkillId && skills.length > 0)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-lg font-medium text-sm transition-colors"
            >
              {skills.length > 0 && !selectedSkillId ? 'Select a skill' : 'Start'}
            </button>
          )}
          {timerState === 'running' && (
            <button
              onClick={pause}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Pause
            </button>
          )}
          {timerState === 'paused' && (
            <>
              <button
                onClick={start}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Resume
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-card-border rounded-lg text-sm transition-colors"
              >
                Reset
              </button>
            </>
          )}
          {timerState === 'done' && (
            <>
              <button
                onClick={reset}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors"
              >
                New Session
              </button>
              <button
                onClick={dismissDone}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-card-border rounded-lg text-sm transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </div>

        {/* Sessions completed this session */}
        {sessionsCompleted > 0 && (
          <p className="text-xs text-fg-muted mt-3">
            {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} logged today
          </p>
        )}
      </div>

      {/* Status message */}
      {timerState === 'idle' && skills.length === 0 && (
        <div className="text-center text-fg-muted text-sm">
          <p>Add skills first to start a focus session.</p>
        </div>
      )}

      {/* Session summary */}
      {sessionsCompleted > 0 && selectedSkill && (
        <div className="bg-card border border-card-border rounded-xl p-4 mt-4">
          <h2 className="text-sm font-semibold mb-2">Session Summary</h2>
          <div className="text-xs text-fg-secondary space-y-1">
            <p>
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: selectedSkill.color }}
              />
              {selectedSkill.name}
            </p>
            <p>
              {Math.round(totalSeconds / 60)} min × {sessionsCompleted} ={' '}
              <strong>{(Math.round(totalSeconds / 60) * sessionsCompleted).toFixed(0)} min</strong>{' '}
              total practice
            </p>
          </div>
        </div>
      )}
    </div>
  );
}