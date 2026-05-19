# 变强 — Progress Log

## 2026-05-09
### Added: PWA Support + Data Export/Import
- **PWA Manifest** (`public/manifest.json`): App name, standalone display, dark theme, icon references
- **App Icons** (`public/icon-192.svg`, `public/icon-512.svg`): Dark-themed SVG icons with 强 character
- **Service Worker** (`public/sw.js`): CacheFirst for static assets, NetworkFirst for navigation, cache versioning (v1)
- **SW Registrar** (`src/components/ServiceWorkerRegistrar.tsx`): Client component that registers sw.js
- **Layout updates** (`src/app/layout.tsx`): Added manifest link, theme-color meta, ServiceWorkerRegistrar
- **Data Export** (dashboard): Downloads `huang-up-backup-YYYY-MM-DD.json`
- **Data Import** (dashboard): File picker with JSON validation + confirmation dialog

## 2026-05-10
### Added: Habit Trends & Visualizations
- **Trends page** (`/habits/trends`): New page accessible via "Trends" link on the habits page
- **Heatmap grid**: GitHub-style contribution heatmap showing last 12 weeks of daily habit completions, color-coded by completion ratio
- **Weekly bar chart**: 8-week bar chart showing weekly completion rate percentages
- **30-day breakdown**: Per-habit progress bars with completion counts and percentages
- **Habit filter**: Dropdown to view trends for all daily habits or a single habit
- No external charting libraries — built with pure CSS/Tailwind

## 2026-05-11
### Added: Dark/Light Theme Toggle
- **ThemeProvider** (`src/components/ThemeProvider.tsx`): Client component with React context — manages theme state, reads/writes localStorage, applies `dark` class to `<html>` on mount
- **Tailwind v4 dark mode**: `@custom-variant dark (&:where(.dark, .dark *))` — class-based dark mode strategy
- **Light theme CSS variables**: Full set of light palette overrides (gray-50/gray-900 backgrounds, white cards, warm grays for secondary text)
- **Dark theme CSS variables**: Preserved as `.dark` class overrides in globals.css
- **Theme toggle button** in TabNav: Sun SVG in dark mode (click for light), moon SVG in light mode (click for dark)
- **No FOUC**: localStorage check on client-side useEffect prevents flash of wrong theme

## 2026-05-12
### Added: Weekly Review Page + Theme Bug Fix
- **Weekly Review page** (`/review`): New page accessible via "Review" tab in bottom nav
- **Overview cards**: Habit completion rate, skills practice hours, average mood, and average energy — each with week-over-week comparison
- **Daily habit breakdown**: Vertical bar chart showing day-by-day completion, plus per-habit progress bars with color coding
- **Weekly habits section**: Shows done/not-yet status for weekly-frequency habits
- **Skills breakdown**: Per-skill practice hours with proportional bars, session count
- **Mood & Energy timeline**: Day-by-day emoji timeline with notes
- **Goals summary**: Active goals with milestone progress bars
- **Week navigation**: Browse previous weeks with arrow buttons
- **Theme bug fix**: Updated Goals, Daily Check-in, and Skills pages to use CSS variable classes (`bg-card`, `text-fg-secondary`, etc.) instead of hardcoded `bg-gray-800`/`text-gray-400` — these pages now correctly respond to the dark/light theme toggle

## 2026-05-13
### Added: PWA Install Prompt
- **InstallPrompt component** (`src/components/InstallPrompt.tsx`): Client component that listens for the `beforeinstallprompt` event and shows a floating install banner above the bottom nav
- **One-time display**: Tracks dismissal in localStorage (`pwa-install-dismissed`) so the banner only appears once per device
- **Install flow**: "Install" button triggers the native browser install prompt; "Not now" dismisses and persists the choice
- **Theme-aware styling**: Uses CSS variable classes (`bg-card`, `text-foreground`, `text-fg-secondary`, `border-border`) for dark/light compatibility
- **Layout integration**: Added InstallPrompt to root layout inside ThemeProvider

## 2026-05-14
### Added: Static Export Config for Cloudflare Pages
- **Static export** (`next.config.ts`): Added `output: 'export'` and `images: { unoptimized: true }` for full static site generation
- **Build verified**: All 9 routes (/, dashboard, habits, habits/trends, goals, daily, skills, review, 404) export to `out/` directory
- **Deploy ready**: Static files in `out/` ready for `wrangler pages deploy` — requires Cloudflare auth (API token or `wrangler login`)
- **No code changes needed**: App is fully client-side with localStorage, no API routes — static export works perfectly

## 2026-05-15
### Added: Browser Notification System
- **NotificationService** (`src/components/NotificationService.tsx`): Silent background component that checks notification conditions on page load — daily check-in reminders, goal deadline alerts (within 3 days or overdue), and an exported `checkStreakMilestone()` function for habit streak celebrations (7, 14, 30, 60, 90 days)
- **NotificationSettings** (`src/components/NotificationSettings.tsx`): Toggle panel with switches for each notification type, time picker for daily reminder, permission status indicator, and lazy permission request
- **Storage helpers** (`src/lib/storage.ts`): `loadNotificationSettings`, `saveNotificationSettings`, `getNotifiedGoals`, `markGoalNotified`, `clearDailyNotifications` — tracks notification preferences and prevents duplicate alerts per day
- **NotificationSettings type** (`src/lib/types.ts`): `{ dailyReminder, dailyReminderTime, goalAlerts, streakAlerts }`
- **Dashboard integration**: Bell icon button in header opens/closes the notification settings panel
- **Layout integration**: NotificationService added to root layout for app-wide silent monitoring
- Uses browser's built-in Notification API — no external libraries

## 2026-05-16
### Added: Multiple Data Profiles
- **Profile type** (`src/lib/types.ts`): New `Profile { id, name, createdAt }` interface; added `profileId` field to `Habit`, `Goal`, `DailyLog`, `Skill` interfaces; updated `AppData` with `profiles[]` and `activeProfileId`
- **Profile storage** (`src/lib/storage.ts`): `createProfile`, `renameProfile`, `deleteProfile`, `setActiveProfile`, `getActiveProfile`, `loadProfileData` helpers; automatic migration from old format — existing data assigned to a default "Personal" profile
- **ProfileSelector** (`src/components/ProfileSelector.tsx`): Compact dropdown in dashboard header showing current profile with chevron; lists all profiles for quick switching; "Manage Profiles" sub-panel for create/rename/delete; delete requires 2+ profiles with confirmation dialog
- **Dashboard integration**: Profile badge shown when multiple profiles exist; ProfileSelector accessible from header alongside notification bell
- **Data isolation**: All pages (habits, goals, daily, skills, review, trends) filter data by active profile; new items get `profileId` from `activeProfileId`; persist functions merge profile data without affecting other profiles
- **Notification awareness**: NotificationService checks only the active profile's data for reminders and alerts
- Switching profiles instantly re-renders all UI with that profile's data

## 2026-05-17
### Added: Dashboard Quick Actions
- **Today's Habits Checklist** (`src/app/dashboard/page.tsx`): New Quick Actions section below stats cards — lists all daily-frequency habits from the active profile with checkboxes; checking/unchecking toggles completion in localStorage immediately; completed habits show strikethrough; shows "All done for today! 🔥" when all are done; links to /habits if none exist
- **Quick Daily Check-in Form**: Compact mood selector (😞😕😐🙂😄), energy selector (🪫😴😐⚡🔥), optional notes textarea, "Log Day"/"Update" button; pre-fills from existing today's log if one exists; shows green "✓ Saved!" success flash on submit
- Uses same bg-card/border-card-border styling as existing cards, fully theme-compatible
- No new dependencies; leverages existing storage helpers and types

## 2026-05-18
### Added: Settings Page
- **Settings page** (`/settings`): New dedicated page with 5 collapsible accordion sections:
  1. **Profile Management** — list profiles, inline rename, delete with confirmation, create new
  2. **Notifications** — embeds NotificationSettings directly (daily reminder, goal alerts, streak alerts, permission)
  3. **Appearance** — dark/light theme toggle (moved from TabNav)
  4. **Data** — export/import JSON backup with last backup date tracking
  5. **About** — app name, version, description
- **TabNav updates**: Added Settings tab with gear SVG icon, removed inline theme toggle button
- **Dashboard cleanup**: Removed notification bell, notification panel, profile selector, and data export/import — dashboard now focuses on quick actions and daily stats
- **NotificationSettings**: Made `onClose` prop optional for flexible usage in both Settings page and other contexts

## 2026-05-19
### Added: Calendar View Page
- **Calendar page** (`/calendar`): Monthly calendar grid (Sun-Sat) with full month navigation
- **Habit dots**: Each completed habit on a given day shows as a colored dot using the habit's color
- **Mood & energy**: Daily log emoji indicators (😞😕😐🙂😄 for mood, 🪫😴😐⚡🔥 for energy) appear on days with logs
- **Goal indicator**: Small indicator dot for days with goal activity (milestone completions or target dates)
- **Today highlight**: Current day has a blue ring border; other-month days are dimmed/grayed
- **Day detail panel**: Click any day to see a side panel with full breakdown — habits with completion toggles, daily log (mood/energy/notes), goals with milestone status, and skill sessions with duration
- **Month navigation**: Left/right arrows to browse months, "Today" button to jump back
- **Legend**: Compact legend explaining each indicator type
- **TabNav update**: Added "Calendar" tab with calendar SVG icon between Daily and Skills
- Pure CSS/Tailwind, no external dependencies; theme-compatible via CSS variable classes

## Future Ideas
- ~~Deploy to a free host (Vercel, Cloudflare Pages, Netlify)~~ (configured 2026-05-14, pending auth)
- ~~PWA: Add to home screen prompt~~ (done 2026-05-13)
- ~~Milestone notifications/reminders~~ (done 2026-05-15)
- ~~Multiple data profiles~~ (done 2026-05-16)
- ~~Dashboard Quick Actions~~ (done 2026-05-17)
- ~~Settings page with organized preferences~~ (done 2026-05-18)
- ~~Calendar view page~~ (done 2026-05-19)