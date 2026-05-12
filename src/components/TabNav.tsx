'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

const tabs = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/habits', label: 'Habits', icon: '🔄' },
  { href: '/goals', label: 'Goals', icon: '🎯' },
  { href: '/daily', label: 'Daily', icon: '📝' },
  { href: '/skills', label: 'Skills', icon: '⚡' },
  { href: '/review', label: 'Review', icon: '📊' },
];

export default function TabNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-nav-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                active
                  ? 'text-blue-400'
                  : 'text-fg-secondary hover:text-foreground'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-fg-secondary hover:text-foreground"
          aria-label="Toggle theme"
        >
          <span className="text-xl">
            {theme === 'dark' ? (
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
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </span>
          <span className="text-xs font-medium">Theme</span>
        </button>
      </div>
    </nav>
  );
}
