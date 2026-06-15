# 变强 — Progress Log

## 2026-06-15
### Added: CSV Data Export
- **CSV export utility** (`src/lib/csv-export.ts`): Four export functions for converting app data to CSV files:
  - `exportHabitsCsv()`: Matrix of habits x dates — columns for each date, values are "done", "skipped", or empty; includes category, frequency, and scheduled days
  - `exportSkillsCsv()`: Per-skill rows with total hours, level, and individual session breakdowns (date, minutes, notes)
  - `exportDailyLogsCsv()`: Date, mood (1-5), energy (1-5), and notes for each daily log entry
  - `exportFocusSessionsCsv()`: Date, skill, duration, rating, and notes for each focus session
- **Settings page** (`src/app/settings/page.tsx`): Four CSV export buttons in a 2x2 grid added to the Data section below existing JSON backup — one button per data type (Habits, Skills, Daily Logs, Focus Sessions)
- Proper CSV escaping for fields containing commas, quotes, or newlines
- Profile-aware: exports only active profile's data (except focus sessions which are global)
- `npm run lint` — 0 errors, `npm run build` — success (20 static pages)

## 2026-06-14
### Added: Habit Skip/Delay Feature
- **skippedDates field** (`src/lib/types.ts`): New optional `skippedDates?: string[]` on `Habit` interface — array of YYYY-MM-DD dates when habit was skipped
- **Storage helpers** (`src/lib/storage.ts`): `skipHabit()`, `unskipHabit()`, `isHabitSkipped()` helpers for skip management
- **Habits page** (`src/app/habits/page.tsx`): Added skip button (>> icon) next to each habit; skipped habits show dimmed strikethrough with gray "skipped" badge; unskip restores normal state
- **Habits streaks** (`src/app/habits/streaks/page.tsx`): Streak logic treats skipped days as neutral — they do NOT break streaks, only missed scheduled days do
- **Habits trends** (`src/app/habits/trends/page.tsx`): Heatmap shows skipped days in gray; completion rate calculations treat skipped dates as neutral (neither completion nor miss)
- **Calendar** (`src/app/calendar/page.tsx`): Day detail panel shows skipped habits with "—" indicator instead of checkmark
- **QuickAddFAB** (`src/components/QuickAddFAB.tsx`): "Log Habit" panel has skip button per habit
- `npm run lint` — 0 errors, `npm run build` — success

## 2026-06-12
### Added: Daily Morning Intention System
- **DailyIntention type** (`src/lib/types.ts`): `{ text: string (max 120), emoji?: string, createdAt: string, label?: string (max 30) }` interface with `dailyIntentions` field on `AppData`
- **Storage helpers** (`src/lib/storage.ts`): `loadDailyIntention()`, `saveDailyIntention()`, `clearDailyIntention()`, `loadAllDailyIntentions()` — keyed by YYYY-MM-DD per profile
- **IntentionSetter component** (`src/components/IntentionSetter.tsx`): Compact card with inline edit form — 15-emoji picker, 120-char text input with live counter, optional 30-char label input, Save/Cancel/Clear buttons
- **Dashboard integration** (`src/app/dashboard/page.tsx`): IntentionSetter card placed above the streak section; loads and displays today's intention on mount
- **Insights integration** (`src/app/insights/page.tsx`): "Daily Intentions" card showing days this week with intentions set, consecutive-day streak count, and most recent intention preview
- `npm run lint` — 0 errors, `npm run build` — 19 static pages

## 2026-06-11
### Fixed: CommandPalette Build Failure + Lint Warnings
- **Duplicate `useState`** (`src/components/CommandPalette.tsx`): Line 19-20 had `const [open, setOpen] = useState(false)` declared twice — removed the duplicate causing the build to fail
- **Unused `idx` variable** (same file): Removed unused `idx` parameter from `.map((cmd, idx) => {...})` — ESLint `@typescript-eslint/no-unused-vars`
- **Missing `setOpen` deps**: Added `setOpen` to `useEffect` and `useCallback` deps arrays — ESLint `react-hooks/exhaustive-deps`
- `npm run lint` — 0 errors, 0 warnings (was 3 warnings)
- `npm run build` — 19 static pages, clean compile

## 2026-06-09
### Added: Focus Session Review/Rating System
- **Rating field** (`src/lib/types.ts`): `FocusSession.rating?: number` (1-5) added to type
- **Session note field** (`src/lib/types.ts`): `FocusSession.sessionNote?: string` for post-session reflection
- **updateFocusSession()** (`src/lib/storage.ts`): New helper to update session fields by ID
- **Session Review Panel** (`src/app/focus/page.tsx`): After non-pomodoro timer completes, a review panel appears with 5-star rating selector (hover preview), optional notes textarea (280 chars max), "Save & Close" and "Skip" buttons; session auto-saved on completion, updated with rating/note on save
- **Session History**: Each session now shows amber star rating and truncated note preview (if available)
- **Skills Trends** (`src/app/skills/trends/page.tsx`): 30-day breakdown shows average rating per skill as amber stars with tooltip
- **Insights** (`src/app/insights/page.tsx`): New "Focus Quality" card showing total sessions, average rating, and best rated session
- `npm run lint` — 0 errors, `npm run build` — 19 static pages

## 2026-06-08
### Added: Skill Categories System
- **SkillCategory type** (`src/lib/types.ts`): `SkillCategory = 'health' | 'fitness' | 'learning' | 'work' | 'creative' | 'mindfulness'` with `SKILL_CATEGORY_CONFIG` constant (6 categories with colors and emoji icons matching habit categories pattern)
- **Skills page** (`src/app/skills/page.tsx`): Added category dropdown in create/edit forms, category filter bar above list, and color-coded category badge with emoji on each skill card
- **Skills Trends page** (`src/app/skills/trends/page.tsx`): Added category filter buttons alongside the skill selector
- **Focus page** (`src/app/focus/page.tsx`): Shows category emoji badge next to skill names in selector and session history
- **Review page** (`src/app/review/page.tsx`): Added category filter buttons in Skills Practice section with category icon badges
- **QuickAddFAB** (`src/components/QuickAddFAB.tsx`): Shows category emoji icon next to skill names in skill dropdown when adding a quick session
- `npm run lint` — 0 errors, `npm run build` — 19 static pages

## 2026-06-07
### Added: Weekly Planning / Intentions Page
- **WeeklyPlan type** (`src/lib/types.ts`): `{ intention: string, priorities: string[], createdAt: string, updatedAt: string }` interface
- **weeklyPlans storage** (`src/lib/storage.ts`): `loadWeeklyPlan()`, `saveWeeklyPlan()` helpers keyed by profileId and week (YYYY-WW format)
- **Weekly page** (`/weekly`): New page with week navigation, intention textarea (280 chars max), up to 3 priority inputs, week overview panel showing habits scheduled, goals due, and days left in week
- **TabNav update**: Added "Weekly" tab between Calendar and Review tabs
- **Theme-compatible**: Uses CSS variable classes (bg-card, border-card-border, text-foreground, text-fg-secondary)
- **Profile-aware**: Weekly plans are stored per profile and persist across sessions

## 2026-06-06
### Added: Habit Completion Notes
- **habitNotes** (`src/lib/types.ts`): New `habitNotes?: Record<string, Record<string, string>>` field on `AppData` — outer key is habitId, inner key is date string, value is the note (max 140 chars)
- **Storage helpers** (`src/lib/storage.ts`): `loadHabitNotes()`, `saveHabitNote()`, `removeHabitNote()` helpers for note CRUD
- **Habits page** (`src/app/habits/page.tsx`): When completing a habit, an inline text input appears below the row with "Add a note..." placeholder; auto-saves on blur or Enter, dismisses on Escape; shows 📝 indicator next to habits that have a note for today (click to edit); on uncomplete the note is removed
- **Streaks page** (`src/app/habits/streaks/page.tsx`): 30-day sparkline bars show a small blue dot on days that have notes; native tooltip on hover displays date and note text
- **Calendar page** (`src/app/calendar/page.tsx`): Day detail panel shows 📝 + note text next to completed habits that have notes
- **Backward compatible**: Existing `completions: Record<string, boolean>` data is untouched — notes stored separately in `habitNotes` field
- `npm run lint` — 0 errors, `npm run build` — 18 static pages

## 2026-06-04
### Added: Skill Progression System (Levels + XP)
- **SkillLevel type** (`src/lib/types.ts`): `SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'`
- **SKILL_LEVELS constant**: 5 tiers with hour thresholds (0h, 10h, 30h, 60h, 120h) and associated colors
- **getSkillLevel() function** (`src/lib/types.ts`): Computes level, label, color, XP percentage, total hours, and next level hours from total practice minutes
- **Level badge on skill cards**: Colored pill showing current level (gray/blue/purple/orange/pink per tier)
- **XP progress bar**: Thin bar on each skill card showing progress toward the next level
- `npm run lint` — 0 errors, `npm run build` — 17 static pages

## 2026-06-03
### Added: Focus Session History + Pomodoro Mode + Fullscreen + Sounds
- **FocusSession type** (`src/lib/types.ts`): `{ id, skillId, skillName, skillColor, date, durationMinutes, note }`
- **Focus session storage** (`src/lib/storage.ts`): `loadFocusSessions()`, `saveFocusSession()`, `clearFocusSessions()` via `focusSessions` localStorage key
- **Session History panel** (`src/app/focus/page.tsx`): Collapsible panel below timer showing last 10 sessions — skill color dot, name, duration, relative time; "Clear History" with confirmation
- **Pomodoro Mode**: Toggle switch enabling auto-cycling between work sessions (selected duration) and breaks (5min, 15min long break after every 4th); phase indicator badge showing "Work" vs "Break" and count (e.g., "2/4"); stores preference in localStorage
- **Full-Screen Focus Mode**: Expand button triggers `requestFullscreen()` during active timer; shows large circular ring, skill name, elapsed/remaining time; ESC or "Exit Full Screen" exits; QuickAddFAB hides during fullscreen
- **Sound Notifications**: Web Audio API tones — ascending tone for work session done, gentle chime for break done; mute toggle on focus page and in NotificationSettings
- **NotificationSettings**: Added "Focus Timer Sound" toggle for enable/disable
- `npm run lint` — 0 errors, `npm run build` — 18 static pages

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

## 2026-05-27
### Added: Achievement Progress Card on Dashboard
- **Achievement card** (`src/app/dashboard/page.tsx`): New card between Skills Practice and bottom nav showing:
  - Progress bar: X / 19 unlocked
  - Recent unlock: icon, title, and "unlocked [time ago]" for most recently earned achievement
  - Near-miss hint: "So close: [achievement]" shown when any locked achievement is ≥80% toward its condition
  - "View All" link to `/achievements`
- Uses same `bg-card border-card-border` styling as other dashboard cards; fully theme-compatible
- `npm run lint` — 0 errors, `npm run build` — success (16 static pages)

## 2026-05-26
### Added: Skills Trends Page
- **Skills Trends page** (`/skills/trends`): New page accessible via "Trends" link in skills page header
- **12-week heatmap**: GitHub-style contribution grid colored by daily practice minutes (emerald green scale)
- **Weekly bar chart**: 8-week bar chart showing total practice minutes per week, pure CSS/Tailwind
- **30-day breakdown**: Per-skill progress bars sorted by most practiced — skill name, color dot, total minutes, and proportional bar
- **Summary stats**: Total practice hours this week, this month, and average per day
- **Skill filter**: Dropdown to view trends for all skills or a single skill
- **Navigation**: "Trends" link in skills page header with chart SVG icon (parallel to habits page pattern)
- `npm run lint` — 0 errors, `npm run build` — success (16 static pages including `/skills/trends`)

## 2026-05-29
### Added: Smart Reminder System with Habit Completion Learning
- **Reminder Learning Engine** (`src/lib/reminders.ts`): Tracks completion timestamps per habit, computes optimal reminder time from 14-day history (requires 5+ completions to have a recommendation), falls back to configured daily reminder time otherwise. `recordHabitCompletion()`, `getOptimalReminderTime()`, `getHabitCompletionPattern()`, `clearPatternData()`.
- **HabitReminders component** (`src/components/HabitReminders.tsx`): Per-habit bell icon popover with "Use smart time" toggle (default ON), custom time picker (when smart time is OFF), and "Mute reminders" option. Persists settings per habit in localStorage.
- **SmartNotificationService** (`src/components/SmartNotificationService.tsx`): Silent background component that fires notifications at learned optimal times for today's scheduled habits within a 30-minute window. Respects per-habit mute/custom settings. Added to root layout alongside existing NotificationService.
- **Habits page**: Bell icon per habit card for reminder settings; records completion hour on habit toggle.
- **Dashboard quick habits**: Records completion hour on quick habit toggle.
- **QuickAddFAB**: Records completion hour on habit log in the FAB menu.
- **NotificationSettings**: Added "Smart Reminders" section showing learned optimal times per habit with explanation.
- `npm run lint` — 0 errors, `npm run build` — success (16 static pages)

## 2026-05-30
### Added: Search & Filter + Insights Dashboard
- **Habits page** (`src/app/habits/page.tsx`): Debounced search input (150ms) filters habits by name in real-time. Shows "No habits match your search" when nothing matches. All existing functionality preserved.
- **Goals page** (`src/app/goals/page.tsx`): Debounced search input (150ms) filters goals by title and description. Works alongside existing category/archive filters. Shows "No goals match your search" when nothing matches.
- **Insights page** (`/insights`): New weekly insights dashboard with card-based layout:
  - Week-over-week habit completion rate comparison with delta
  - Habit leaderboard: top 3 daily habits by completion rate with mini progress bars
  - Most consistent habit: On Fire 🔥 (≥80%), Steady ⚡ (≥60%), Building 🏗️ (<60%)
  - Skill of the week: most practiced skill with total minutes and color dot
  - Mood & energy snapshots: average with emoji + numeric display
  - Achievements unlocked this week with icon and "unlocked X days ago"
  - Goals milestone progress: goals with milestones completed this week
- **TabNav**: Added "Insights" tab with lightbulb SVG icon between Skills and Review
- `npm run lint` — 0 errors, `npm run build` — success (17 static pages including /insights)

## 2026-06-01
### Added: Habit Categories
- **HabitCategory type** (`src/lib/types.ts`): New `HabitCategory` type — `'health' | 'fitness' | 'learning' | 'work' | 'personal' | 'mindfulness'`
- **Category field on Habit** (`src/lib/types.ts`): Added optional `category?: HabitCategory` field to `Habit` interface
- **Category selector** (`src/app/habits/page.tsx`): Category dropdown in both create form and edit mode
- **Category filter bar**: Horizontal filter bar above habit list to view all or filter by category
- **Category badge**: Color-coded badge with icon + label on each habit card for quick scanning
- **Template auto-assignment**: Habits added from templates automatically get the category matching their template group (e.g., Fitness templates → fitness, Learning templates → learning)
- 6 categories: Health (red), Fitness (orange), Learning (blue), Work (purple), Personal (teal), Mindfulness (pink)
- `npm run lint` — 0 errors, `npm run build` — success (17 static pages)

## 2026-06-02
### Added: Focus/Timer Page
- **Focus page** (`/focus`): New page accessible via "Focus" tab in bottom nav between Daily and Calendar
- **Circular countdown ring**: SVG-based progress ring that depletes as the timer runs, showing remaining time in large text
- **Skill selection**: Dropdown to choose which skill to practice during the session (reads from existing skills)
- **Duration presets**: Quick-select buttons for 15, 25, 45, 60 minute timers
- **Custom duration**: Input field to enter any number of minutes
- **Timer controls**: Play (start), Pause, and Reset buttons with visual state changes
- **Auto-logging**: On timer completion, session is automatically saved to the selected skill via existing `saveData()` pattern — includes duration and note "Focus session completed"
- **Session summary**: Shows total minutes practiced and session count after completion; dismissable to reset
- Uses same `bg-card border-card-border` styling as other pages, fully theme-compatible via CSS variables
- TabNav: Added "Focus" tab with clock SVG icon between Daily and Calendar tabs
- `npm run lint` — 0 errors, `npm run build` — success (18 static pages including /focus)

## Future Ideas
- ~~PWA: Add to home screen prompt~~ (done 2026-05-13)
- ~~Milestone notifications/reminders~~ (done 2026-05-15)
- ~~Multiple data profiles~~ (done 2026-05-16)
- ~~Dashboard Quick Actions~~ (done 2026-05-17)
- ~~Settings page with organized preferences~~ (done 2026-05-18)
- ~~Calendar view page~~ (done 2026-05-19)
- ~~Day-of-week habit scheduling~~ (done 2026-05-22)
- ~~Smart Reminder System~~ (done 2026-05-29)