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

## Future Ideas
- Deploy to a free host (Vercel, Cloudflare Pages, Netlify)
- PWA: Add to home screen prompt
- Weekly review page
- Milestone notifications/reminders
- Dark/light theme toggle
- Multiple data profiles
