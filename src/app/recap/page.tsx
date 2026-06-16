'use client';

import { useState } from 'react';
import Link from 'next/link';
import { loadData } from '@/lib/storage';
import { generateRecap } from '@/lib/recap';

export default function RecapPage() {
  const [mode, setMode] = useState<'today' | 'week'>('week');
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const appData = loadData();
  const recap = generateRecap(appData, mode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recap);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = recap;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    setShareError(null);
    if (navigator.share) {
      try {
        await navigator.share({ title: mode === 'today' ? 'Daily Recap' : 'Weekly Recap', text: recap });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setShareError('Share failed. Try copying instead.');
        }
      }
    } else {
      setShareError('Web Share not available on this device. Use Copy instead.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recap</h1>
        <Link href="/dashboard" className="text-sm text-blue-400 hover:text-blue-300">
          &larr; Dashboard
        </Link>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('today')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-surface text-fg-secondary hover:bg-surface-hover'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setMode('week')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-surface text-fg-secondary hover:bg-surface-hover'
          }`}
        >
          This Week
        </button>
      </div>

      {/* Recap Text */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {recap}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-surface text-foreground hover:bg-surface-hover transition-colors"
        >
          Share
        </button>
      </div>

      {shareError && (
        <p className="text-sm text-amber-400 text-center">{shareError}</p>
      )}
    </div>
  );
}
