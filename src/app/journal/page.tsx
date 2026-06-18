'use client';

import { useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadData, loadJournalEntry, saveJournalEntry, generateId } from '@/lib/storage';
import { JournalEntry, JournalMood } from '@/lib/types';

const PROMPTS = [
  'What did you learn today?',
  'What are you grateful for?',
  "What's one thing you could improve?",
  'What made you smile today?',
  'What challenged you today?',
  "What's on your mind?",
];

const MOOD_OPTIONS: { value: JournalMood; emoji: string; label: string }[] = [
  { value: 'terrible', emoji: '😞', label: 'terrible' },
  { value: 'bad', emoji: '😕', label: 'bad' },
  { value: 'okay', emoji: '😐', label: 'okay' },
  { value: 'good', emoji: '🙂', label: 'good' },
  { value: 'great', emoji: '😊', label: 'great' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function JournalEditor({ date }: { date: string }) {
  const initial = useMemo(() => {
    if (typeof window === 'undefined') return { content: '', mood: undefined as JournalMood | undefined, id: '', createdAt: '', profileId: '' };
    const data = loadData();
    const pid = data.activeProfileId;
    const entry = loadJournalEntry(date, pid);
    return {
      content: entry?.content ?? '',
      mood: entry?.mood,
      id: entry?.id ?? '',
      createdAt: entry?.createdAt ?? '',
      profileId: pid,
    };
  }, [date]);

  const [content, setContent] = useState(initial.content);
  const [mood, setMood] = useState<JournalMood | undefined>(initial.mood);
  const [saved, setSaved] = useState(false);
  const entryIdRef = useRef(initial.id);
  const createdAtRef = useRef(initial.createdAt);
  const moodRef = useRef<JournalMood | undefined>(initial.mood);
  const contentRef = useRef(initial.content);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const prompt = PROMPTS[Math.abs(date.split('-').reduce((a, b) => a + parseInt(b), 0)) % PROMPTS.length];

  const doSave = useCallback((text: string, currentMood: JournalMood | undefined) => {
    if (!initial.profileId) return;
    const now = new Date().toISOString();
    const id = entryIdRef.current || generateId();
    const created = createdAtRef.current || now;
    const entry: JournalEntry = {
      id,
      profileId: initial.profileId,
      date,
      content: text.slice(0, 5000),
      mood: currentMood,
      createdAt: created,
      updatedAt: now,
    };
    saveJournalEntry(entry);
    entryIdRef.current = entry.id;
    createdAtRef.current = entry.createdAt;
    setSaved(true);
  }, [date, initial.profileId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, 5000);
    setContent(text);
    contentRef.current = text;
    setSaved(false);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(text, moodRef.current), 1000);
  };

  const handleMoodSelect = (selected: JournalMood) => {
    const newMood = mood === selected ? undefined : selected;
    setMood(newMood);
    moodRef.current = newMood;
    setSaved(false);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(contentRef.current, newMood), 1000);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      {/* Mood selector */}
      <div className="mb-3">
        <p className="text-xs text-fg-secondary mb-2">How are you feeling?</p>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => handleMoodSelect(m.value)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-colors ${
                mood === m.value
                  ? 'bg-blue-600/20 border-blue-500 text-foreground'
                  : 'bg-input border-input-border text-fg-secondary hover:bg-surface-hover'
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[10px]">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm italic text-fg-secondary mb-3">{prompt}</p>

      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Start writing..."
        className="w-full min-h-[300px] bg-input border border-input-border rounded-lg p-4 text-foreground placeholder:text-fg-secondary resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
        maxLength={5000}
      />

      <div className="flex items-center justify-between mt-3 text-xs text-fg-secondary">
        <div className="flex items-center gap-4">
          <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
          <span>{content.length}/5000</span>
        </div>
        <div>
          {saved && (
            <span className="text-green-400 font-medium">Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}

function JournalPageContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const [currentDate, setCurrentDate] = useState(() => dateParam || todayString());

  const goToPrevDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setCurrentDate(todayString());
  };

  return (
    <div className="space-y-4">
      {/* Date Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevDay}
          className="p-2 rounded-lg bg-card border border-card-border hover:bg-surface-hover transition-colors"
          aria-label="Previous day"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold">{formatDate(currentDate)}</h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            {currentDate !== todayString() && (
              <button
                onClick={goToToday}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Back to Today
              </button>
            )}
            <Link
              href="/journal/calendar"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              📅 View Calendar
            </Link>
          </div>
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 rounded-lg bg-card border border-card-border hover:bg-surface-hover transition-colors"
          aria-label="Next day"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Journal Editor — keyed by date so it remounts on date change */}
      <JournalEditor key={currentDate} date={currentDate} />
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="text-fg-secondary text-sm">Loading...</div>}>
      <JournalPageContent />
    </Suspense>
  );
}
