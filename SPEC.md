# 变强 (How to Level Up) — Specification

## Overview

A personal self-improvement tracking app that helps users build habits, set goals, log daily progress, and track skill development. Designed to be minimalist, motivational, and locally-first.

## Tech Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **Data Persistence:** localStorage with a JSON-based store
- **Deployment:** Static export / PWA-capable

**Rationale:** Next.js provides a fast, modern React framework with excellent developer experience. Tailwind enables rapid UI development. localStorage keeps things simple with no backend dependency. The app can be installed as a PWA on mobile devices for a native-like experience.

## Core Features

### 1. Habit Tracking
- Create/edit/delete habits (name, frequency, icon/color)
- Daily check-off for each habit
- Streak tracking (current streak, best streak)
- Weekly/monthly completion rate

### 2. Goal Setting
- Create goals with title, description, target date
- Break goals into milestones
- Track progress percentage
- Mark goals as complete/archived

### 3. Daily Check-ins
- Daily log entry (mood, energy, notes)
- Quick reflection prompt
- Timestamp-based history

### 4. Skill Progress
- Define skills to track (e.g., "Programming", "Fitness")
- Log practice sessions with duration
- Track total hours invested
- Skill level progression (beginner → advanced)

## Data Model

```typescript
interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  color: string;
  createdAt: string;
  completions: Record<string, boolean>; // date -> completed
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  milestones: Milestone[];
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

interface DailyLog {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

interface Skill {
  id: string;
  name: string;
  color: string;
  sessions: SkillSession[];
  createdAt: string;
}

interface SkillSession {
  id: string;
  date: string;
  durationMinutes: number;
  notes: string;
}
```

## UI/UX Concept

- **Layout:** Bottom tab navigation (mobile-first)
- **Tabs:** Habits | Goals | Daily | Skills
- **Theme:** Clean, dark-mode friendly, with accent colors for gamification
- **Motivational elements:** Streaks, progress bars, level indicators
- **Typography:** Clear hierarchy, readable at a glance

## Pages

1. **Habits** — Grid/list of habits with today's check-off status
2. **Goals** — Card-based list with progress indicators
3. **Daily** — Today's check-in form + history
4. **Skills** — Skill cards with total hours and recent sessions
