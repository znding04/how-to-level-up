'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { loadData, loadProfileData, generateId, todayString, saveStudySession } from '@/lib/storage';
import { Skill, SkillStudySession } from '@/lib/types';

const STUDY_PROMPTS_QUESTION = [
  (name: string) => `What have you learned about "${name}" recently?`,
  (name: string) => `What progress have you made with "${name}"?`,
  (name: string) => `What is something new you discovered about "${name}"?`,
  (name: string) => `What was challenging about "${name}" this week?`,
  (name: string) => `What does "${name}" mean to you right now?`,
];

const STUDY_PROMPTS_ANSWER = [
  'What specifically did you work on?',
  "What's the most important insight?",
  "What's next for this skill?",
  'What would you do differently?',
  'What are you proud of?',
];

function getRandomPrompt(name: string): string {
  return STUDY_PROMPTS_QUESTION[Math.floor(Math.random() * STUDY_PROMPTS_QUESTION.length)](name);
}

function getRandomAnswer(): string {
  return STUDY_PROMPTS_ANSWER[Math.floor(Math.random() * STUDY_PROMPTS_ANSWER.length)];
}

type StudyPhase = 'select' | 'question' | 'answer' | 'done';

function getStudyStatsForSkill(profileId: string, skillId: string): { sessions: number; cards: number; avgRate: number } {
  const data = loadData();
  const sessions = (data.studySessions ?? []).filter(
    (s) => s.profileId === profileId && s.skillId === skillId
  );
  if (sessions.length === 0) return { sessions: 0, cards: 0, avgRate: 0 };
  const totalCards = sessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const avgRate = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0;
  return { sessions: sessions.length, cards: totalCards, avgRate };
}

export default function SkillStudyPage() {
  const [skills] = useState<Skill[]>(() => {
    if (typeof window === 'undefined') return [];
    const data = loadData();
    return loadProfileData(data).skills;
  });
  const [profileId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return loadData().activeProfileId;
  });
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [phase, setPhase] = useState<StudyPhase>('select');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionSkillId, setSessionSkillId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (phase === 'question' || phase === 'answer') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function startSession(skill: Skill) {
    setSelectedSkill(skill);
    setSessionSkillId(skill.id);
    setCardsReviewed(0);
    setCorrectCount(0);
    setElapsedSeconds(0);
    setPhase('question');
    showNewQuestion(skill);
  }

  function showNewQuestion(skill: Skill) {
    setQuestion(getRandomPrompt(skill.name));
    setAnswer(getRandomAnswer());
  }

  function showAnswer() {
    setPhase('answer');
  }

  function rateCard(knewIt: boolean) {
    if (!sessionSkillId) return;
    setCardsReviewed((c) => c + 1);
    if (knewIt) setCorrectCount((c) => c + 1);
    if (selectedSkill) showNewQuestion(selectedSkill);
    setPhase('question');
  }

  function endSession() {
    if (!sessionSkillId || cardsReviewed === 0) {
      setPhase('select');
      setSelectedSkill(null);
      return;
    }
    const session: SkillStudySession = {
      id: generateId(),
      profileId,
      skillId: sessionSkillId,
      date: todayString(),
      cardsReviewed,
      correctCount,
      sessionMinutes: Math.ceil(elapsedSeconds / 60),
      createdAt: new Date().toISOString(),
    };
    saveStudySession(session);
    setPhase('done');
  }

  function resetToSelect() {
    setPhase('select');
    setSelectedSkill(null);
    setSessionSkillId(null);
    setCardsReviewed(0);
    setCorrectCount(0);
    setElapsedSeconds(0);
  }

  if (skills.length === 0) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Skill Study</h1>
          <Link href="/skills" className="text-fg-muted hover:text-fg-secondary text-sm transition-colors">
            Back to Skills
          </Link>
        </div>
        <p className="text-fg-muted text-center mt-12">
          No skills to study yet.{' '}
          <Link href="/skills" className="text-blue-400 hover:text-blue-300">
            Add a skill first
          </Link>
        </p>
      </div>
    );
  }

  // Done screen
  if (phase === 'done') {
    const pct = cardsReviewed > 0 ? Math.round((correctCount / cardsReviewed) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Session Complete!</h1>
          <Link href="/skills" className="text-fg-muted hover:text-fg-secondary text-sm transition-colors">
            Back to Skills
          </Link>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-2">{pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚'}</div>
            <p className="text-fg-secondary text-sm">Overall score</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{cardsReviewed}</p>
              <p className="text-xs text-fg-muted">Cards Reviewed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{correctCount}</p>
              <p className="text-xs text-fg-muted">Knew It</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatTime(elapsedSeconds)}</p>
              <p className="text-xs text-fg-muted">Duration</p>
            </div>
          </div>

          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetToSelect}
              className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Study Another
            </button>
            <Link
              href="/skills"
              className="flex-1 bg-surface hover:bg-surface-hover py-2.5 rounded-lg text-sm font-medium transition-colors text-center"
            >
              Done
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Skill selector
  if (phase === 'select') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Skill Study</h1>
          <Link href="/skills" className="text-fg-muted hover:text-fg-secondary text-sm transition-colors">
            Back to Skills
          </Link>
        </div>

        <p className="text-fg-secondary text-sm mb-6">
          Select a skill to study. Each session uses reflection prompts to help you consolidate what you have learned.
        </p>

        <div className="space-y-3">
          {skills.map((skill) => {
            const stats = getStudyStatsForSkill(profileId, skill.id);
            return (
              <button
                key={skill.id}
                onClick={() => startSession(skill)}
                className="w-full bg-card border border-card-border rounded-xl p-4 hover:border-blue-500/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: skill.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{skill.name}</h3>
                    {stats.sessions > 0 && (
                      <p className="text-xs text-fg-muted mt-0.5">
                        {stats.sessions} session{stats.sessions !== 1 ? 's' : ''} · {stats.cards} cards · {stats.avgRate}% avg
                      </p>
                    )}
                  </div>
                  <span className="text-fg-muted group-hover:text-blue-400 transition-colors">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Question phase
  if (phase === 'question' && selectedSkill) {
    return (
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (cardsReviewed > 0) {
                if (window.confirm('End session? Your progress will be saved.')) {
                  endSession();
                }
              } else {
                resetToSelect();
              }
            }}
            className="text-fg-muted hover:text-fg-secondary text-sm transition-colors flex items-center gap-1"
          >
            <span>←</span> Exit
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">
              {cardsReviewed} card{cardsReviewed !== 1 ? 's' : ''}
            </span>
            <span className="text-xs font-mono text-fg-muted bg-surface px-2 py-1 rounded">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Skill name */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: selectedSkill.color }}
          />
          <span className="text-sm text-fg-secondary">{selectedSkill.name}</span>
        </div>

        {/* Question card */}
        <div className="bg-card border border-card-border rounded-xl p-8 min-h-[200px] flex flex-col justify-center">
          <p className="text-center text-lg font-medium leading-relaxed">{question}</p>
        </div>

        <button
          onClick={showAnswer}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          Show Answer
        </button>
      </div>
    );
  }

  // Answer phase
  if (phase === 'answer' && selectedSkill) {
    return (
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-16" /> {/* spacer */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">
              {cardsReviewed} card{cardsReviewed !== 1 ? 's' : ''}
            </span>
            <span className="text-xs font-mono text-fg-muted bg-surface px-2 py-1 rounded">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Question (faded) */}
        <div className="mb-3">
          <p className="text-xs text-fg-muted mb-1">Question</p>
          <p className="text-sm text-fg-secondary italic">{question}</p>
        </div>

        {/* Answer card */}
        <div className="bg-card border border-card-border rounded-xl p-8 min-h-[160px] flex flex-col justify-center mb-6">
          <p className="text-xs text-fg-muted mb-2">Reflection prompt</p>
          <p className="text-center text-base font-medium leading-relaxed">{answer}</p>
        </div>

        {/* Rating */}
        <p className="text-center text-sm text-fg-secondary mb-3">How well did you know this?</p>
        <div className="flex gap-3">
          <button
            onClick={() => rateCard(false)}
            className="flex-1 bg-orange-600/80 hover:bg-orange-600 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Review Again
          </button>
          <button
            onClick={() => rateCard(true)}
            className="flex-1 bg-green-600/80 hover:bg-green-600 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Knew It!
          </button>
        </div>

        <button
          onClick={endSession}
          className="w-full mt-4 text-fg-muted hover:text-fg-secondary text-xs transition-colors py-2"
        >
          End session ({cardsReviewed} card{cardsReviewed !== 1 ? 's' : ''} reviewed)
        </button>
      </div>
    );
  }

  return null;
}
