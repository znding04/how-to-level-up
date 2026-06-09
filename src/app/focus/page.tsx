'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadData, saveData, loadProfileData, generateId, todayString, loadFocusSessions, saveFocusSession, updateFocusSession, clearFocusSessions, loadNotificationSettings } from '@/lib/storage';
import { Skill, FocusSession, SKILL_CATEGORY_CONFIG } from '@/lib/types';

const PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

type TimerState = 'idle' | 'running' | 'paused' | 'done';
type PomodoroPhase = 'work' | 'break';

function playTone(type: 'work-done' | 'break-done') {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'work-done') {
      // Ascending tone
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523, ctx.currentTime);
      osc1.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      osc1.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc1.connect(gain);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.5);
    } else {
      // Gentle chime
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc1.connect(gain);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.8);
    }
  } catch {
    // Web Audio not available
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

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

  // Pomodoro state
  const [pomodoroEnabled, setPomodoroEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pomodoro-mode') === 'true';
  });
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [breakReady, setBreakReady] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sound mute state
  const [soundMuted, setSoundMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return loadNotificationSettings().focusSoundMuted;
  });

  // Session history
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadFocusSessions();
  });
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Session review state
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  const [workDuration, setWorkDuration] = useState(25 * 60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneLoggedRef = useRef(false);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null;

  // Track fullscreen changes
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Persist pomodoro preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pomodoro-mode', String(pomodoroEnabled));
    }
  }, [pomodoroEnabled]);

  // Tick the timer
  useEffect(() => {
    if (timerState !== 'running') return;

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
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

  // Log session after timer completes
  useEffect(() => {
    if (timerState !== 'done' || doneLoggedRef.current) return;
    doneLoggedRef.current = true;

    const tid = setTimeout(() => {
      // Play sound
      if (!soundMuted) {
        playTone(pomodoroPhase === 'work' ? 'work-done' : 'break-done');
      }

      if (pomodoroPhase === 'work' && selectedSkillId) {
        // Log skill session
        const data = loadData();
        const profileSkills = loadProfileData(data).skills;
        const skill = profileSkills.find((s) => s.id === selectedSkillId);
        if (skill) {
          const minutes = Math.round(workDuration / 60);
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

          // Save to focus session history
          const sessionId = generateId();
          const focusSession: FocusSession = {
            id: sessionId,
            skillId: skill.id,
            skillName: skill.name,
            skillColor: skill.color,
            date: new Date().toISOString(),
            durationMinutes: minutes,
            note: `Focus session (${minutes} min)`,
          };
          saveFocusSession(focusSession);
          setSessionHistory(loadFocusSessions());

          // Show review panel (non-pomodoro only)
          if (!pomodoroEnabled) {
            setReviewingSessionId(sessionId);
            setReviewRating(0);
            setReviewHoverRating(0);
            setReviewNote('');
            setReviewSaved(false);
          }
        }

        setSessionsCompleted((n) => n + 1);

        // Handle pomodoro auto-transition
        if (pomodoroEnabled) {
          const newCount = pomodoroCount + 1;
          setPomodoroCount(newCount);
          const breakMinutes = newCount % 4 === 0 ? 15 : 5;
          setPomodoroPhase('break');
          setTotalSeconds(breakMinutes * 60);
          setRemainingSeconds(breakMinutes * 60);
          doneLoggedRef.current = false;
          setTimerState('running');
        }
      } else if (pomodoroPhase === 'break' && pomodoroEnabled) {
        // Break done — show ready prompt
        setPomodoroPhase('work');
        setTotalSeconds(workDuration);
        setRemainingSeconds(workDuration);
        setBreakReady(true);
        doneLoggedRef.current = false;
      }
    }, 0);

    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState]);

  // Reset done-logged flag when timer resets
  useEffect(() => {
    if (timerState === 'idle' || timerState === 'running') {
      doneLoggedRef.current = false;
    }
  }, [timerState, selectedSkillId]);

  const applyPreset = useCallback((minutes: number) => {
    setCustomMinutes(String(minutes));
    setTotalSeconds(minutes * 60);
    setRemainingSeconds(minutes * 60);
    setWorkDuration(minutes * 60);
    setTimerState('idle');
    doneLoggedRef.current = false;
    setPomodoroPhase('work');
    setBreakReady(false);
  }, []);

  const applyCustom = useCallback(() => {
    const m = parseInt(customMinutes, 10);
    if (!m || m <= 0) return;
    setTotalSeconds(m * 60);
    setRemainingSeconds(m * 60);
    setWorkDuration(m * 60);
    setTimerState('idle');
    doneLoggedRef.current = false;
    setPomodoroPhase('work');
    setBreakReady(false);
  }, [customMinutes]);

  function start() {
    if (remainingSeconds <= 0) return;
    setBreakReady(false);
    setTimerState('running');
  }

  function pause() {
    setTimerState('paused');
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemainingSeconds(workDuration);
    setTotalSeconds(workDuration);
    setTimerState('idle');
    doneLoggedRef.current = false;
    setPomodoroPhase('work');
    setBreakReady(false);
    setPomodoroCount(0);
  }

  function dismissDone() {
    setTimerState('idle');
    doneLoggedRef.current = false;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function handleClearHistory() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearFocusSessions();
    setSessionHistory([]);
    setConfirmClear(false);
  }

  function saveReview() {
    if (!reviewingSessionId) return;
    const updates: Partial<FocusSession> = {};
    if (reviewRating > 0) updates.rating = reviewRating;
    if (reviewNote.trim()) updates.sessionNote = reviewNote.trim().slice(0, 280);
    updateFocusSession(reviewingSessionId, updates);
    setSessionHistory(loadFocusSessions());
    setReviewSaved(true);
    setTimeout(() => {
      setReviewingSessionId(null);
      setReviewSaved(false);
    }, 1000);
  }

  function dismissReview() {
    setReviewingSessionId(null);
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (progress / 100) * circumference;

  const timerColor = pomodoroPhase === 'break' ? '#10b981' : '#3b82f6';

  // Fullscreen focus view
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
        {/* Exit fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 text-xs text-fg-muted hover:text-foreground bg-surface hover:bg-surface-hover border border-card-border px-3 py-1.5 rounded-lg transition-colors"
        >
          Exit Full Screen
        </button>

        {/* Sound toggle */}
        <button
          onClick={() => setSoundMuted(!soundMuted)}
          className="absolute top-4 left-4 text-lg p-2 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label={soundMuted ? 'Unmute' : 'Mute'}
        >
          {soundMuted ? '🔇' : '🔊'}
        </button>

        {/* Pomodoro info */}
        {pomodoroEnabled && (
          <div className="mb-4 text-center">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              pomodoroPhase === 'work' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {pomodoroPhase === 'work' ? 'Work' : 'Break'} — {pomodoroCount % 4}/4
            </span>
          </div>
        )}

        {/* Large timer */}
        <div className="relative w-64 h-64 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--card-border)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={timerState === 'done' ? '#10b981' : timerColor}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={timerState === 'idle' ? circumference : dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold tabular-nums">{formatTime(remainingSeconds)}</div>
            {selectedSkill && (
              <div className="text-sm text-fg-muted mt-2">{selectedSkill.name}</div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {timerState === 'running' && (
            <button onClick={pause} className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors">
              Pause
            </button>
          )}
          {timerState === 'paused' && (
            <>
              <button onClick={start} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                Resume
              </button>
              <button onClick={reset} className="px-6 py-3 bg-surface hover:bg-surface-hover border border-card-border rounded-lg transition-colors">
                Reset
              </button>
            </>
          )}
          {timerState === 'idle' && (
            <button onClick={start} disabled={remainingSeconds <= 0} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-lg font-medium transition-colors">
              Start
            </button>
          )}
          {timerState === 'done' && !pomodoroEnabled && (
            <button onClick={reset} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
              New Session
            </button>
          )}
        </div>

        {breakReady && (
          <div className="mt-6 text-center">
            <p className="text-fg-secondary mb-3">Break over! Ready for next session?</p>
            <button onClick={start} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors">
              Start Work Session
            </button>
          </div>
        )}

        {sessionsCompleted > 0 && (
          <p className="mt-4 text-sm text-fg-muted">
            {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} completed
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Focus</h1>

      {/* Pomodoro Mode Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium">Pomodoro Mode</span>
            <button
              role="switch"
              aria-checked={pomodoroEnabled}
              onClick={() => {
                if (timerState === 'running') return;
                setPomodoroEnabled(!pomodoroEnabled);
                if (!pomodoroEnabled) {
                  setPomodoroCount(0);
                  setPomodoroPhase('work');
                  setBreakReady(false);
                }
              }}
              disabled={timerState === 'running'}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                pomodoroEnabled ? 'bg-blue-600' : 'bg-surface-dim'
              } ${timerState === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  pomodoroEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          {pomodoroEnabled && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              pomodoroPhase === 'work' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
            }`}>
              {pomodoroPhase === 'work' ? 'Work' : 'Break'} {pomodoroCount % 4}/4
            </span>
          )}
        </div>
        {/* Sound toggle */}
        <button
          onClick={() => setSoundMuted(!soundMuted)}
          className="text-lg p-1 rounded-lg hover:bg-surface-hover transition-colors"
          aria-label={soundMuted ? 'Unmute focus sounds' : 'Mute focus sounds'}
        >
          {soundMuted ? '🔇' : '🔊'}
        </button>
      </div>

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
                {skill.category && (() => {
                  const cat = SKILL_CATEGORY_CONFIG.find((c) => c.value === skill.category);
                  return cat ? <span className="ml-1 opacity-70">{cat.icon}</span> : null;
                })()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Duration presets */}
      {timerState === 'idle' && pomodoroPhase === 'work' && (
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
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke="var(--card-border)" strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={timerState === 'done' ? '#10b981' : timerColor}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={timerState === 'idle' ? circumference : dashOffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {timerState === 'done' && !pomodoroEnabled ? (
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
                {pomodoroEnabled && pomodoroPhase === 'break' && timerState === 'running' && (
                  <div className="text-xs text-green-400 mt-0.5">Break</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {timerState === 'idle' && !breakReady && (
            <>
              <button
                onClick={start}
                disabled={remainingSeconds <= 0 || (!selectedSkillId && skills.length > 0)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white rounded-lg font-medium text-sm transition-colors"
              >
                {skills.length > 0 && !selectedSkillId ? 'Select a skill' : 'Start'}
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-2 bg-surface hover:bg-surface-hover border border-card-border rounded-lg text-sm transition-colors"
                aria-label="Full screen"
              >
                ⛶
              </button>
            </>
          )}
          {timerState === 'running' && (
            <>
              <button
                onClick={pause}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Pause
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-2 bg-surface hover:bg-surface-hover border border-card-border rounded-lg text-sm transition-colors"
                aria-label="Full screen"
              >
                ⛶
              </button>
            </>
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
              <button
                onClick={toggleFullscreen}
                className="px-3 py-2 bg-surface hover:bg-surface-hover border border-card-border rounded-lg text-sm transition-colors"
                aria-label="Full screen"
              >
                ⛶
              </button>
            </>
          )}
          {timerState === 'done' && !pomodoroEnabled && (
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

        {/* Break ready prompt (pomodoro) */}
        {breakReady && (
          <div className="mt-4 text-center">
            <p className="text-sm text-fg-secondary mb-2">Break over! Ready for next session?</p>
            <button
              onClick={start}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Start Work Session
            </button>
          </div>
        )}

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
              {Math.round(workDuration / 60)} min × {sessionsCompleted} ={' '}
              <strong>{(Math.round(workDuration / 60) * sessionsCompleted).toFixed(0)} min</strong>{' '}
              total practice
            </p>
          </div>
        </div>
      )}

      {/* Session Review Panel */}
      {reviewingSessionId && (
        <div className="bg-card border border-card-border rounded-xl p-4 mt-4">
          {reviewSaved ? (
            <div className="text-center py-2">
              <p className="text-green-400 font-medium">Session saved!</p>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-3">Rate Your Session</h2>
              {/* Star Rating */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setReviewHoverRating(star)}
                    onMouseLeave={() => setReviewHoverRating(0)}
                    className="text-2xl transition-transform hover:scale-110"
                  >
                    <span className={
                      (reviewHoverRating || reviewRating) >= star
                        ? 'text-amber-400'
                        : 'text-gray-600'
                    }>
                      {(reviewHoverRating || reviewRating) >= star ? '\u2605' : '\u2606'}
                    </span>
                  </button>
                ))}
                {reviewRating > 0 && (
                  <span className="text-xs text-fg-muted ml-2">{reviewRating}/5</span>
                )}
              </div>
              {/* Notes */}
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value.slice(0, 280))}
                placeholder="What did you work on?"
                rows={2}
                className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">{reviewNote.length}/280</span>
                <div className="flex gap-2">
                  <button
                    onClick={dismissReview}
                    className="text-xs px-3 py-1.5 bg-surface hover:bg-surface-hover border border-card-border rounded-lg transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={saveReview}
                    className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Save &amp; Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Session History */}
      <div className="mt-6">
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-sm font-semibold">Session History</h2>
          <span className="text-fg-muted text-xs">{historyExpanded ? '▲' : '▼'}</span>
        </button>

        {historyExpanded && (
          <div className="mt-3 space-y-2">
            {sessionHistory.length === 0 ? (
              <p className="text-xs text-fg-muted">No sessions yet</p>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {sessionHistory.slice(0, 10).map((session) => {
                    const sessionSkill = skills.find((s) => s.id === session.skillId);
                    const sessionCat = sessionSkill?.category ? SKILL_CATEGORY_CONFIG.find((c) => c.value === sessionSkill.category) : null;
                    return (
                    <div
                      key={session.id}
                      className="bg-card border border-card-border rounded-lg px-3 py-2 flex items-center gap-3"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: session.skillColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {session.skillName}
                          {sessionCat && (
                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded border ${sessionCat.color}`}>
                              {sessionCat.icon} {sessionCat.label}
                            </span>
                          )}
                          {session.rating && (
                            <span className="ml-1.5 text-amber-400 text-xs">
                              {'\u2605'.repeat(session.rating)}
                              <span className="text-gray-600">{'\u2606'.repeat(5 - session.rating)}</span>
                            </span>
                          )}
                        </p>
                        {session.sessionNote ? (
                          <p className="text-xs text-fg-muted truncate">{session.sessionNote}</p>
                        ) : (
                          <p className="text-xs text-fg-muted">{session.note}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-fg-secondary">{session.durationMinutes} min</p>
                        <p className="text-xs text-fg-muted">{relativeTime(session.date)}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleClearHistory}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    confirmClear
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-surface hover:bg-surface-hover border border-card-border text-fg-muted'
                  }`}
                >
                  {confirmClear ? 'Confirm Clear' : 'Clear History'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
