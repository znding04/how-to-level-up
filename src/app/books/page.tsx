'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { loadData, createBook, saveBook, deleteBook, loadBooks } from '@/lib/storage';
import { BookEntry, BookStatus, BookRating } from '@/lib/types';

type FilterStatus = 'all' | BookStatus;

const STATUS_CONFIG: { value: BookStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'want_to_read', label: 'Want to Read', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  { value: 'reading', label: 'Reading', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  { value: 'completed', label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  { value: 'paused', label: 'Paused', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
];

function getStatusConfig(status: BookStatus) {
  return STATUS_CONFIG.find(s => s.value === status) ?? STATUS_CONFIG[0];
}

function StarRating({ rating, onRate }: { rating?: BookRating; onRate?: (r: BookRating) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onRate?.(n as BookRating)}
          onMouseEnter={() => onRate && setHover(n)}
          onMouseLeave={() => onRate && setHover(0)}
          className={`text-lg ${onRate ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'} ${n <= (hover || rating || 0) ? 'text-amber-400' : 'text-gray-600'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function BookCard({ book, onEdit }: { book: BookEntry; onEdit: (b: BookEntry) => void }) {
  const cfg = getStatusConfig(book.status);
  const progressPct = book.pagesTotal && book.pagesRead != null
    ? Math.min(100, Math.round((book.pagesRead / book.pagesTotal) * 100))
    : null;

  return (
    <div
      className="bg-card border border-card-border rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:border-blue-500/50 transition-colors"
      onClick={() => onEdit(book)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{book.title}</h3>
          <p className="text-sm text-fg-secondary truncate">{book.author}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cfg.bgColor} ${cfg.color} border-transparent`}>
          {cfg.label}
        </span>
      </div>

      {/* Reading progress */}
      {book.status === 'reading' && progressPct !== null && book.pagesTotal && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-fg-secondary">
            <span>{book.pagesRead} of {book.pagesTotal} pages</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Completed: rating + date */}
      {book.status === 'completed' && (
        <div className="flex items-center gap-3">
          <StarRating rating={book.rating} />
          {book.completedDate && (
            <span className="text-xs text-fg-muted">
              {new Date(book.completedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      )}

      {/* Notes preview */}
      {book.notes && (
        <p className="text-xs text-fg-muted line-clamp-2 italic">{book.notes}</p>
      )}
    </div>
  );
}

interface BookFormData {
  title: string;
  author: string;
  status: BookStatus;
  pagesTotal: string;
  pagesRead: string;
  rating: BookRating | '';
  notes: string;
}

function defaultForm(): BookFormData {
  return { title: '', author: '', status: 'want_to_read', pagesTotal: '', pagesRead: '', rating: '', notes: '' };
}

function BookModal({ book, profileId, onClose, onSave, onDelete }: {
  book?: BookEntry;
  profileId: string;
  onClose: () => void;
  onSave: (b: BookEntry) => void;
  onDelete?: (id: string) => void;
}) {
  const [form, setForm] = useState<BookFormData>(() => {
    if (!book) return defaultForm();
    return {
      title: book.title,
      author: book.author,
      status: book.status,
      pagesTotal: book.pagesTotal?.toString() ?? '',
      pagesRead: book.pagesRead?.toString() ?? '',
      rating: book.rating ?? '',
      notes: book.notes ?? '',
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.author.trim()) e.author = 'Author is required';
    if (form.pagesTotal && (isNaN(Number(form.pagesTotal)) || Number(form.pagesTotal) <= 0)) {
      e.pagesTotal = 'Must be a positive number';
    }
    if (form.pagesRead && (isNaN(Number(form.pagesRead)) || Number(form.pagesRead) < 0)) {
      e.pagesRead = 'Must be 0 or more';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const now = new Date().toISOString();
    const pagesTotal = form.pagesTotal ? parseInt(form.pagesTotal, 10) : undefined;
    const pagesRead = form.pagesRead ? parseInt(form.pagesRead, 10) : undefined;

    // Auto-set startDate when changing to 'reading'
    let startDate = book?.startDate;
    if (form.status === 'reading' && !startDate) {
      startDate = now.split('T')[0];
    }

    // Auto-set completedDate when changing to 'completed'
    let completedDate = book?.completedDate;
    if (form.status === 'completed' && !completedDate) {
      completedDate = now.split('T')[0];
    }

    const entry: BookEntry = {
      id: book?.id ?? '',
      profileId,
      title: form.title.trim(),
      author: form.author.trim(),
      status: form.status,
      rating: form.rating || undefined,
      pagesTotal,
      pagesRead,
      startDate,
      completedDate,
      notes: form.notes.trim() || undefined,
      createdAt: book?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(entry);
    onClose();
  };

  const handleDelete = () => {
    if (book && onDelete) {
      if (confirm(`Delete "${book.title}"?`)) {
        onDelete(book.id);
        onClose();
      }
    }
  };

  const statusIsReading = form.status === 'reading';
  const statusIsCompleted = form.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{book ? 'Edit Book' : 'Add Book'}</h2>
            <button type="button" onClick={onClose} className="text-fg-muted hover:text-foreground text-xl leading-none">×</button>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg-secondary">Title *</label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Book title"
              className={`bg-surface border ${errors.title ? 'border-red-500' : 'border-card-border'} rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500`}
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Author */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg-secondary">Author *</label>
            <input
              value={form.author}
              onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              placeholder="Author name"
              className={`bg-surface border ${errors.author ? 'border-red-500' : 'border-card-border'} rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500`}
            />
            {errors.author && <p className="text-xs text-red-400">{errors.author}</p>}
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-fg-secondary">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_CONFIG.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: s.value }))}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${form.status === s.value ? `${s.bgColor} ${s.color} border-transparent` : 'bg-surface border-card-border text-fg-secondary hover:border-blue-500/50'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pages (show for reading, or always available) */}
          {(statusIsReading || form.status !== 'completed') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg-secondary">Total Pages</label>
                <input
                  type="number"
                  min="1"
                  value={form.pagesTotal}
                  onChange={e => setForm(f => ({ ...f, pagesTotal: e.target.value }))}
                  placeholder="e.g. 350"
                  className={`bg-surface border ${errors.pagesTotal ? 'border-red-500' : 'border-card-border'} rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500`}
                />
                {errors.pagesTotal && <p className="text-xs text-red-400">{errors.pagesTotal}</p>}
              </div>
              {statusIsReading && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-fg-secondary">Pages Read</label>
                  <input
                    type="number"
                    min="0"
                    value={form.pagesRead}
                    onChange={e => setForm(f => ({ ...f, pagesRead: e.target.value }))}
                    placeholder="e.g. 120"
                    className={`bg-surface border ${errors.pagesRead ? 'border-red-500' : 'border-card-border'} rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500`}
                  />
                  {errors.pagesRead && <p className="text-xs text-red-400">{errors.pagesRead}</p>}
                </div>
              )}
            </div>
          )}

          {/* Rating (only for completed) */}
          {statusIsCompleted && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-fg-secondary">Rating</label>
              <StarRating
                rating={form.rating || undefined}
                onRate={(r) => setForm(f => ({ ...f, rating: r }))}
              />
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg-secondary flex justify-between">
              <span>Notes</span>
              <span className="text-fg-muted">{form.notes.length}/1000</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value.slice(0, 1000) }))}
              placeholder="Personal notes, takeaways, quotes..."
              rows={3}
              className="bg-surface border border-card-border rounded-lg px-3 py-2 text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {book && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-card-border text-fg-secondary hover:text-foreground hover:border-blue-500/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              {book ? 'Save Changes' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [profileId, setProfileId] = useState<string>('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalBook, setModalBook] = useState<BookEntry | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBooksData = useCallback(() => {
    const data = loadData();
    setProfileId(data.activeProfileId);
    setBooks(loadBooks(data.activeProfileId));
  }, []);

  useEffect(() => {
    loadBooksData();
  }, [loadBooksData]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const filteredBooks = books.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter;
    const q = debouncedSearch.toLowerCase();
    const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts: Record<FilterStatus, number> = { all: books.length, want_to_read: 0, reading: 0, completed: 0, paused: 0 };
  for (const b of books) {
    if (b.status in counts) counts[b.status]++;
  }

  const handleSave = (book: BookEntry) => {
    if (modalBook) {
      saveBook(book);
    } else {
      createBook(book);
    }
    loadBooksData();
  };

  const handleDelete = (id: string) => {
    deleteBook(id);
    loadBooksData();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-card-border px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Books</h1>
            <p className="text-sm text-fg-secondary mt-0.5">Reading List</p>
          </div>
          <button
            onClick={() => { setModalBook(undefined); setShowModal(true); }}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            + Add Book
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by title or author..."
          className="w-full bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-fg-muted focus:outline-none focus:border-blue-500 mb-3"
        />

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'want_to_read', 'reading', 'completed', 'paused'] as FilterStatus[]).map(s => {
            const label = s === 'all' ? `All (${counts.all})` : getStatusConfig(s).label;
            const cfg = s === 'all' ? { bgColor: 'bg-surface', color: 'text-foreground' } : getStatusConfig(s);
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? `${cfg.bgColor} ${cfg.color}` : 'bg-surface text-fg-secondary border border-card-border hover:border-blue-500/50'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Book List */}
      <div className="px-4 pt-4">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Your reading list is empty</h3>
            <p className="text-sm text-fg-muted mb-4">Start tracking books you want to read</p>
            <button
              onClick={() => { setModalBook(undefined); setShowModal(true); }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Add your first book
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} onEdit={b => { setModalBook(b); setShowModal(true); }} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && profileId && (
        <BookModal
          book={modalBook}
          profileId={profileId}
          onClose={() => { setShowModal(false); setModalBook(undefined); }}
          onSave={handleSave}
          onDelete={modalBook ? handleDelete : undefined}
        />
      )}
    </div>
  );
}