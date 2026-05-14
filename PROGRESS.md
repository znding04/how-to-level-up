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

## Future Ideas
- ~~Deploy to a free host (Vercel, Cloudflare Pages, Netlify)~~ (configured 2026-05-14, pending auth)
- ~~PWA: Add to home screen prompt~~ (done 2026-05-13)
- Milestone notifications/reminders
- Multiple data profiles
