'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { loadData, loadJournalEntry, saveJournalEntry, generateId } from '@/lib/storage';
import { JournalEntry } from '@/lib/types';

const PROMPTS = [
  'What did you learn today?',
  'What are you grateful for?',
  "What's one thing you could improve?",
  'What made you smile today?',
  'What challenged you today?',
  "What's on your mind?",
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
    if (typeof window === 'undefined') return { content: '', id: '', createdAt: '', profileId: '' };
    const data = loadData();
    const pid = data.activeProfileId;
    const entry = loadJournalEntry(date, pid);
    return {
      content: entry?.content ?? '',
      id: entry?.id ?? '',
      createdAt: entry?.createdAt ?? '',
      profileId: pid,
    };
  }, [date]);

  const [content, setContent] = useState(initial.content);
  const [saved, setSaved] = useState(false);
  const entryIdRef = useRef(initial.id);
  const createdAtRef = useRef(initial.createdAt);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const prompt = PROMPTS[Math.abs(date.split('-').reduce((a, b) => a + parseInt(b), 0)) % PROMPTS.length];

  const doSave = useCallback((text: string) => {
    if (!initial.profileId) return;
    const now = new Date().toISOString();
    const id = entryIdRef.current || generateId();
    const created = createdAtRef.current || now;
    const entry: JournalEntry = {
      id,
      profileId: initial.profileId,
      date,
      content: text.slice(0, 5000),
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
    setSaved(false);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(text), 1000);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
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

export default function JournalPage() {
  const [currentDate, setCurrentDate] = useState(todayString);

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
          {currentDate !== todayString() && (
            <button
              onClick={goToToday}
              className="text-xs text-blue-400 hover:text-blue-300 mt-1"
            >
              Back to Today
            </button>
          )}
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
