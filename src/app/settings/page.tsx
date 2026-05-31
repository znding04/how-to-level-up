'use client';

import { useState, useRef } from 'react';
import {
  loadData,
  saveData,
  createProfile,
  renameProfile,
  deleteProfile,
  setActiveProfile,
  todayString,
  resetOnboarding,
} from '@/lib/storage';
import { AppData, Profile } from '@/lib/types';
import { useTheme } from '@/components/ThemeProvider';
import NotificationSettings from '@/components/NotificationSettings';

const LAST_BACKUP_KEY = 'last-backup-date';

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-fg-secondary">{icon}</span>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-fg-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LAST_BACKUP_KEY);
    }
    return null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Profile management
  function handleSwitchProfile(profileId: string) {
    const updated = setActiveProfile(profileId);
    setData(updated);
  }

  function handleCreateProfile() {
    const name = newProfileName.trim();
    if (!name) return;
    const updated = createProfile(name);
    setData(updated);
    setNewProfileName('');
  }

  function startRename(profile: Profile) {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
  }

  function handleRename(profileId: string) {
    const name = renameValue.trim();
    if (!name) return;
    const updated = renameProfile(profileId, name);
    setData(updated);
    setRenamingId(null);
    setRenameValue('');
  }

  function handleDeleteProfile(profileId: string) {
    if (data.profiles.length <= 1) return;
    if (!window.confirm('Delete this profile and all its data? This cannot be undone.')) return;
    const updated = deleteProfile(profileId);
    setData(updated);
  }

  // Data export/import
  function handleExport() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `level-up-backup-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const today = todayString();
    localStorage.setItem(LAST_BACKUP_KEY, today);
    setLastBackup(today);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (
          !Array.isArray(parsed.habits) ||
          !Array.isArray(parsed.goals) ||
          !Array.isArray(parsed.dailyLogs) ||
          !Array.isArray(parsed.skills)
        ) {
          alert('Invalid backup file format.');
          return;
        }
        if (!confirm('Replace all current data with this backup?')) return;
        saveData(parsed as AppData);
        setData(parsed as AppData);
      } catch {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile Management */}
      <Section
        title="Profile Management"
        defaultOpen
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      >
        <div className="space-y-3">
          {data.profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                profile.id === data.activeProfileId
                  ? 'border-blue-500/50 bg-blue-600/10'
                  : 'border-border bg-surface'
              }`}
            >
              {renamingId === profile.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(profile.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    autoFocus
                    className="flex-1 bg-input border border-input-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleRename(profile.id)}
                    className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-white transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="text-sm text-fg-muted hover:text-fg-secondary px-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSwitchProfile(profile.id)}
                    className="flex-1 text-left"
                  >
                    <span className="text-sm font-medium">{profile.name}</span>
                    {profile.id === data.activeProfileId && (
                      <span className="ml-2 text-xs text-blue-400">(active)</span>
                    )}
                  </button>
                  <button
                    onClick={() => startRename(profile)}
                    className="p-1.5 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-surface-hover transition-colors"
                    title="Rename"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {data.profiles.length > 1 && (
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="p-1.5 rounded-lg text-fg-muted hover:text-red-400 hover:bg-surface-hover transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Create new profile */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
              placeholder="New profile name..."
              className="flex-1 bg-input border border-input-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreateProfile}
              disabled={!newProfileName.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-surface-dim disabled:text-fg-muted text-white text-sm px-4 py-2 rounded-xl transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        }
      >
        <NotificationSettings />
      </Section>

      {/* Appearance */}
      <Section
        title="Appearance"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-fg-muted">
              Switch between dark and light mode
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-surface-dim'
            }`}
            aria-label="Toggle theme"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                </svg>
              )}
            </span>
          </button>
        </div>
        <p className="text-xs text-fg-muted">
          Current: {theme === 'dark' ? 'Dark' : 'Light'} mode
        </p>
      </Section>

      {/* Data */}
      <Section
        title="Data"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 bg-surface-dim hover:bg-surface text-sm text-fg-secondary rounded-xl py-3 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Export Backup
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 bg-surface-dim hover:bg-surface text-sm text-fg-secondary rounded-xl py-3 transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Import Backup
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
          {lastBackup && (
            <p className="text-xs text-fg-muted">
              Last backup: {lastBackup}
            </p>
          )}
        </div>
      </Section>

      {/* About */}
      <Section
        title="About"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        }
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">How to Level Up</p>
          <p className="text-xs text-fg-muted">Version 1.0.0</p>
          <p className="text-sm text-fg-secondary">
            A self-improvement tracking app to build habits, set goals, log your
            daily mood and energy, and track skill progress.
          </p>
          <button
            onClick={() => {
              resetOnboarding(data.activeProfileId);
              alert('Onboarding has been reset. Visit the dashboard to see it again.');
            }}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Reset Onboarding
          </button>
        </div>
      </Section>
    </div>
  );
}
