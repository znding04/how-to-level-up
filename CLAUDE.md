# 变强 (How to Level Up)

## Project Overview
Self-improvement tracking app built with Next.js 14, TypeScript, and Tailwind CSS.

## Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- localStorage for data persistence

## Project Structure
```
src/
  app/          - Next.js app router pages
    habits/     - Habit tracking
    goals/      - Goal setting and tracking
    daily/      - Daily check-in logs
    skills/     - Skill progress tracking
  components/   - Shared UI components
  lib/          - Utilities (types, storage)
```

## Conventions
- All pages are client components (use 'use client' directive)
- Data persisted via `src/lib/storage.ts` utilities
- Types defined in `src/lib/types.ts`
- Mobile-first, dark theme UI
- Use Tailwind utility classes, no custom CSS beyond globals

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
