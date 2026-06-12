'use client';

import { useState } from 'react';
import { DailyIntention } from '@/lib/types';
import { loadDailyIntention, saveDailyIntention, clearDailyIntention, todayString } from '@/lib/storage';

const EMOJI_OPTIONS = ['💪', '🚀', '🎯', '✨', '🔥', '💡', '🧘', '📚', '🏃', '🍎', '💤', '🧠', '🙏', '⭐', '🌟'];

export default function IntentionSetter() {
  const today = todayString();
  const [intention, setIntention] = useState<DailyIntention | null>(() => loadDailyIntention(today));
  const [editing, setEditing] = useState(!intention);
  const [text, setText] = useState(intention?.text ?? '');
  const [emoji, setEmoji] = useState(intention?.emoji ?? '');
  const [label, setLabel] = useState(intention?.label ?? '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function handleSave() {
    if (!text.trim()) return;
    const newIntention: DailyIntention = {
      text: text.trim().slice(0, 120),
      emoji: emoji || undefined,
      createdAt: new Date().toISOString(),
      label: label.trim() ? label.trim().slice(0, 30) : undefined,
    };
    saveDailyIntention(newIntention);
    setIntention(newIntention);
    setEditing(false);
  }

  function handleClear() {
    clearDailyIntention(today);
    setIntention(null);
    setText('');
    setEmoji('');
    setLabel('');
    setEditing(true);
  }

  function handleCancel() {
    if (intention) {
      setText(intention.text);
      setEmoji(intention.emoji ?? '');
      setLabel(intention.label ?? '');
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-fg-secondary">
          {intention ? 'Edit Intention' : "Set today's intention..."}
        </h3>

        {/* Emoji picker */}
        <div>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-2xl p-1 rounded-lg hover:bg-surface-hover transition-colors"
          >
            {emoji || '😀'}
          </button>
          {showEmojiPicker && (
            <div className="flex flex-wrap gap-1 mt-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                  className={`text-xl p-1 rounded-lg transition-colors ${
                    emoji === e ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : 'hover:bg-surface-hover'
                  }`}
                >
                  {e}
                </button>
              ))}
              {emoji && (
                <button
                  type="button"
                  onClick={() => { setEmoji(''); setShowEmojiPicker(false); }}
                  className="text-xs text-fg-muted px-2 py-1 rounded-lg hover:bg-surface-hover"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Text input */}
        <div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 120))}
            placeholder="What's your focus for today?"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            maxLength={120}
          />
          <p className="text-xs text-fg-muted text-right mt-1">{text.length}/120</p>
        </div>

        {/* Label input */}
        <div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 30))}
            placeholder="Label (e.g. Today's Focus)"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            maxLength={30}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              text.trim()
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-surface-dim text-fg-muted cursor-not-allowed'
            }`}
          >
            Save
          </button>
          {intention && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-surface hover:bg-surface-hover text-foreground transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fg-secondary font-medium mb-1">
            {intention?.label || "Today's Intention"}
          </p>
          <p className="text-foreground font-medium">
            {intention?.emoji && <span className="mr-2">{intention.emoji}</span>}
            {intention?.text}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-secondary transition-colors"
            aria-label="Edit intention"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-secondary transition-colors"
            aria-label="Clear intention"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
