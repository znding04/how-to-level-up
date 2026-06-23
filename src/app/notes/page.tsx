'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { loadData, createQuickNote, saveQuickNote, deleteQuickNote, loadQuickNotes, togglePinQuickNote } from '@/lib/storage';
import { AppData, QuickNote } from '@/lib/types';

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface NoteCardProps {
  note: QuickNote;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onUpdate: (note: QuickNote) => void;
}

function NoteCard({ note, onDelete, onPin, onUpdate }: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  function handleSaveEdit() {
    if (!editContent.trim()) return;
    onUpdate({ ...note, content: editContent.trim() });
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditContent(note.content);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveEdit();
    }
  }

  if (editing) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-4">
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
          onKeyDown={handleKeyDown}
          maxLength={500}
          rows={3}
          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
          placeholder="Note content..."
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-fg-muted">{editContent.length}/500</span>
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-xs rounded-lg bg-surface hover:bg-surface-hover text-fg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
              className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <p className="text-xs text-fg-muted mt-1.5">Cmd+Enter to save, Esc to cancel</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-foreground flex-1 whitespace-pre-wrap break-words">{note.content}</p>
        {note.pinned && (
          <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded flex-shrink-0">
            📌
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-fg-muted">{relativeTime(note.updatedAt)}</span>
        <div className="flex gap-1">
          <button
            onClick={() => onPin(note.id)}
            title={note.pinned ? 'Unpin' : 'Pin'}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-muted transition-colors"
          >
            {note.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-muted transition-colors"
            title="Edit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this note?')) onDelete(note.id);
            }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-fg-muted transition-colors"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [data, setData] = useState<AppData | null>(() => loadData());
  const notes = useMemo(() => data ? loadQuickNotes(data.activeProfileId) : [], [data]);
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showForm && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showForm]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim() || !data) return;

    setSaving(true);
    const note = createQuickNote(data.activeProfileId, newContent.trim());
    saveQuickNote(note);
    setData(loadData());
    setNewContent('');
    setShowForm(false);
    setSaving(false);
  }

  function handleDelete(id: string) {
    deleteQuickNote(id);
    if (data) {
      setData(loadData());
    }
  }

  function handlePin(id: string) {
    togglePinQuickNote(id);
    if (data) {
      setData(loadData());
    }
  }

  function handleUpdate(updated: QuickNote) {
    saveQuickNote(updated);
    if (data) {
      setData(loadData());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowForm(false);
      setNewContent('');
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCreate(e as unknown as React.FormEvent);
    }
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {notes.length === 0 ? 'Your scratchpad' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold transition-colors"
        >
          +
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-2xl p-4 mb-6">
          <h2 className="font-semibold mb-3">New Note</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <textarea
              ref={textareaRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              maxLength={500}
              rows={4}
              placeholder="What's on your mind?"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              required
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-fg-muted">{newContent.length}/500</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNewContent('');
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-surface hover:bg-surface-hover text-fg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim() || saving}
                  className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white transition-colors"
                >
                  Save Note
                </button>
              </div>
            </div>
            <p className="text-xs text-fg-muted">Cmd+Enter to save, Esc to cancel</p>
          </form>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="font-semibold text-lg mb-1">No notes yet</h3>
          <p className="text-fg-muted text-sm mb-4">
            Tap + to add your first note
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Add Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
              onPin={handlePin}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
