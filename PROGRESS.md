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

## 2026-05-21
### Added: Accessibility Improvements to Dashboard Mood/Energy Selectors
- **Mood selector** (`src/app/dashboard/page.tsx`): Added ARIA labels with descriptive text (e.g., "Mood 3 of 5 - neutral"), `role="radio"` semantics with `aria-checked`, `role="radiogroup"` container with `aria-label`
- **Energy selector**: Same accessibility treatment as mood — `role="radiogroup"` with "Energy level" label, each button has "Energy N of 5" label with descriptive text
- **Keyboard navigation**: Arrow Left/Right keys cycle through options, visible `focus:ring-2` indicators for keyboard focus
- `npm run lint` — 0 errors, `npm run build` — success

## 2026-05-20
### Fixed: ESLint React Hooks Errors
- **ThemeProvider** (`src/components/ThemeProvider.tsx`): Moved `localStorage.getItem('theme')` into lazy `useState` initializer — removed `setState` from useEffect, now only handles DOM class toggle
- **NotificationSettings** (`src/components/NotificationSettings.tsx`): Moved `Notification.permission` read into lazy `useState` initializer — removed redundant `useEffect` entirely
- **Dashboard page** (`src/app/dashboard/page.tsx`): Removed redundant `useEffect` that called `setState(loadData())` — replaced with direct initialization from `loadProfileData`
- **Settings page** (`src/app/settings/page.tsx`): Moved `localStorage.getItem(LAST_BACKUP_KEY)` into lazy `useState` initializer — removed redundant `useEffect`
- **Calendar page** (`src/app/calendar/page.tsx`): Wrapped `now` and `todayKey` in `useMemo` to fix React Compiler memoization
- Result: `npm run lint` — 0 errors, `npm run build` — success

## 2026-05-22
### Added: Day-of-Week Habit Scheduling
- **`Habit.scheduledDays`** (`src/lib/types.ts`): New optional `scheduledDays?: number[]` field on the `Habit` interface — array of day indices (0=Sun through 6=Sat). Backward compatible with existing habits (default to all days).
- **Habits page** (`src/app/habits/page.tsx`): Added frequency selector (Daily/Weekly) and a 7-button day-of-week picker (S M T W T F S) to both the create and edit forms. Daily habit defaults to all 7 days selected; Weekly defaults to a single day. Habit list now displays scheduled day abbreviations (e.g., "M/W/F") instead of just "weekly".
- **Dashboard** (`src/app/dashboard/page.tsx`): "Today's Daily Habits" checklist and Habits Summary card now filter to only habits whose `scheditedDays` includes today's day-of-week. Existing habits without `scheduledDays` default to all days (fully backward compatible).
- **Habit Trends** (`src/app/habits/trends/page.tsx`): Heatmap, weekly bar chart, and 30-day breakdown all respect `scheduledDays` — only count completions against scheduled days, giving accurate completion rates for part-week habits.
- `npm run build` and `npm run lint` both pass.

## 2026-05-23
### Added: Floating Quick-Add Button + Habit Streaks Page
- **QuickAddFAB** (`src/components/QuickAddFAB.tsx`): Floating action button (bottom-right, above tab nav) with '+' icon that transforms to '×' when open. Opens a quick-add menu with three options:
  - **Log Habit**: Compact habit selector with checkboxes for today's scheduled habits, toggles completions in localStorage immediately
  - **Quick Daily Check-in**: Inline mood (😞😕😐🙂😄) and energy (🪫😴😐⚡🔥) pickers, saves/updates daily log with green "✓ Saved!" feedback
  - **Add Skill Session**: Skill dropdown + minutes input, saves session to selected skill with success feedback
- FAB hidden on `/settings` page; backdrop click dismisses all panels
- **Layout integration** (`src/app/layout.tsx`): QuickAddFAB added to root layout inside ThemeProvider
- **Habit Streaks page** (`/habits/streaks`): New route showing streak analytics for all habits:
  - Current streak (consecutive days/weeks completed) and longest streak per habit
  - 30-day mini sparkline bar chart (pure CSS, no libraries) showing daily completion history
  - Color-coded streak status: green for active, orange for at-risk (1 day missed), gray for broken
  - Streak milestone badges: 🔥 at 7 days, 🔥🔥 at 14, 💪 at 30, ⭐ at 60, 👑 at 90
  - Milestone legend card at bottom
- **Habits page** (`src/app/habits/page.tsx`): Added "Streaks" link in header alongside existing "Trends" link
- `npm run lint` — 0 errors, `npm run build` — success (14 static pages including `/habits/streaks`)

## 2026-05-24
### Added: Achievements System
- **Achievement type** (`src/lib/types.ts`): `Achievement { id, title, description, icon, unlockedAt, category }` interface
- **Achievement definitions** (`src/lib/achievements.ts`): 19 achievement definitions across 6 categories:
  - Habits: `first_habit`, `all_daily_habits`, `perfect_week`
  - Goals: `first_goal`, `goal_complete`
  - Daily: `daily_checkin_3`, `daily_checkin_7`, `early_bird`, `night_owl`
  - Skills: `first_skill`, `skill_hour`, `skill_day`
  - Streaks: `week_streak`, `month_streak`, `streak_60`, `streak_90`
  - Milestones: `first_milestone`, `profile_switcher`, `data_backup`
- **Achievement service** (`src/lib/achievements.ts`): `checkAchievements()` compares profile data against all conditions; `persistAchievements()` saves newly unlocked ones; `getAllAchievementsWithStatus()` returns full list with unlock status
- **useAchievementCheck hook** (`src/lib/useAchievementCheck.ts`): Trigger achievement checks after habit toggles, form submissions, and daily log saves
- **Achievements page** (`/achievements`): Grid layout with locked (grayscale + 🔒) and unlocked cards, category filter tabs, progress bar, and new-unlock banner animation
- **TabNav update**: Added "Achievements" tab with trophy SVG icon (between Goals and Daily)
- **Integration points**: Dashboard, habits page, goals page, daily page, and skills page all call achievement checks after mutations
- **ESLint fix**: Fixed `setState-in-effect` error by using lazy `useState` initializer and `setTimeout` for deferred state updates in the achievements page
- `npm run lint` — 0 errors, `npm run build` — 15 static pages including `/achievements`

## 2026-05-25
### Added: Habit Templates + Goal Categories
- **Habit Templates** (`src/app/habits/page.tsx`): "Browse templates..." toggle reveals 6 template groups (Morning Routine, Fitness, Learning, Health, Productivity, Mindfulness) with 5 pre-built habits each. One-click add with success feedback; already-added habits shown as disabled with checkmark. Templates include sensible day-of-week scheduling (e.g., workouts on MWF, weekly review on Sunday).
- **Goal Categories** (`src/app/goals/page.tsx`, `src/lib/types.ts`): New optional `category` field on `Goal` type with 6 categories: Career, Health, Learning, Personal, Financial, Creative. Color-coded category badges on goal cards. Category selector in both create form and expanded edit view. Category filter bar to show goals by category. Fully backward compatible — existing goals without a category display normally.
- `npm run lint` — 0 errors, `npm run build` — success (15 static pages)

## Future Ideas
- ~~Deploy to a free host (Vercel, Cloudflare Pages, Netlify)~~ (configured 2026-05-14, pending auth)
- ~~PWA: Add to home screen prompt~~ (done 2026-05-13)
- ~~Milestone notifications/reminders~~ (done 2026-05-15)
- ~~Multiple data profiles~~ (done 2026-05-16)
- ~~Dashboard Quick Actions~~ (done 2026-05-17)
- ~~Settings page with organized preferences~~ (done 2026-05-18)
- ~~Calendar view page~~ (done 2026-05-19)
- ~~Day-of-week habit scheduling~~ (done 2026-05-22)