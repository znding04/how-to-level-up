'use client';

import { useState } from 'react';
import {
  setActiveProfile,
  createProfile,
  renameProfile,
  deleteProfile,
} from '@/lib/storage';
import { AppData, Profile } from '@/lib/types';

export default function ProfileSelector({
  data,
  onDataChange,
}: {
  data: AppData;
  onDataChange: (data: AppData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeProfile = data.profiles.find((p) => p.id === data.activeProfileId);

  function handleSwitch(profileId: string) {
    const updated = setActiveProfile(profileId);
    onDataChange(updated);
    setOpen(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const updated = createProfile(name);
    onDataChange(updated);
    setNewName('');
  }

  function handleRename(profileId: string) {
    const name = renameValue.trim();
    if (!name) return;
    const updated = renameProfile(profileId, name);
    onDataChange(updated);
    setRenamingId(null);
    setRenameValue('');
  }

  function handleDelete(profileId: string) {
    if (data.profiles.length <= 1) return;
    if (!window.confirm('Delete this profile and all its data? This cannot be undone.')) return;
    const updated = deleteProfile(profileId);
    onDataChange(updated);
  }

  function startRename(profile: Profile) {
    setRenamingId(profile.id);
    setRenameValue(profile.name);
  }

  return (
    <div className="relative">
      {/* Profile button */}
      <button
        onClick={() => { setOpen(!open); setManaging(false); }}
        className="flex items-center gap-1.5 bg-surface hover:bg-surface-hover border border-border rounded-xl px-3 py-1.5 text-sm transition-colors"
      >
        <span className="font-medium truncate max-w-[120px]">
          {activeProfile?.name || 'Profile'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-card-border rounded-xl shadow-lg z-50 overflow-hidden">
          {!managing ? (
            <>
              <div className="p-2 space-y-1">
                {data.profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleSwitch(profile.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      profile.id === data.activeProfileId
                        ? 'bg-blue-600/20 text-blue-400 font-medium'
                        : 'hover:bg-surface-hover text-fg-secondary'
                    }`}
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-card-border p-2">
                <button
                  onClick={() => setManaging(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-fg-secondary hover:bg-surface-hover transition-colors"
                >
                  Manage Profiles
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Manage Profiles</h3>
                <button
                  onClick={() => setManaging(false)}
                  className="text-xs text-fg-muted hover:text-fg-secondary transition-colors"
                >
                  Back
                </button>
              </div>

              {/* Profile list */}
              <div className="space-y-2">
                {data.profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-2">
                    {renamingId === profile.id ? (
                      <div className="flex-1 flex gap-1">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(profile.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-input border border-input-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleRename(profile.id)}
                          className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white transition-colors"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm truncate">{profile.name}</span>
                        <button
                          onClick={() => startRename(profile)}
                          className="text-xs text-fg-muted hover:text-fg-secondary transition-colors"
                          title="Rename"
                        >
                          ✏️
                        </button>
                        {data.profiles.length > 1 && (
                          <button
                            onClick={() => handleDelete(profile.id)}
                            className="text-xs text-fg-muted hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Create new profile */}
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="New profile name..."
                  className="flex-1 bg-input border border-input-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreate}
                  className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click-outside overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setOpen(false); setManaging(false); }}
        />
      )}
    </div>
  );
}
