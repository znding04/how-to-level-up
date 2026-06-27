'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/dashboard', label: 'Home' },
  { href: '/notes', label: 'Notes' },
  { href: '/habits', label: 'Habits' },
  { href: '/goals', label: 'Goals' },
  { href: '/yearly', label: 'Yearly' },
  { href: '/achievements', label: 'Awards' },
  { href: '/challenges', label: 'Challenges' },
  { href: '/daily', label: 'Daily' },
  { href: '/body', label: 'Body' },
  { href: '/books', label: 'Books' },
  { href: '/hydration', label: 'Water' },
  { href: '/focus', label: 'Focus' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/skills', label: 'Skills' },
  { href: '/insights', label: 'Insights' },
  { href: '/journal', label: 'Journal' },
  { href: '/weekly', label: 'Weekly' },
  { href: '/review', label: 'Review' },
  { href: '/settings', label: 'Settings' },
];

function TabIcon({ href }: { href: string }) {
  const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (href) {
    case '/dashboard':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case '/notes':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
    case '/habits':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
    case '/yearly':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case '/goals':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
    case '/achievements':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
    case '/challenges':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12 15l-2 5l2-2l2 2l-2-5z" /><path d="M9.5 7.5L12 10l2.5-2.5" /><path d="M12 2v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M19.07 4.93l-2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M19.07 19.07l-2.83-2.83" /></svg>;
    case '/daily':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
    case '/calendar':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case '/skills':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case '/focus':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
    case '/body':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M6 3h12l-1.5 9H7.5L6 3z" /><path d="M4.5 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M19.5 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M9 21h6" /><path d="M12 15v6" /></svg>;
    case '/hydration':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>;
    case '/books':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
    case '/insights':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></svg>;
    case '/journal':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="12" y1="6" x2="12" y2="14" /><line x1="8" y1="10" x2="16" y2="10" /></svg>;
    case '/weekly':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
    case '/review':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
    case '/settings':
      return <svg xmlns="http://www.w3.org/2000/svg" {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    default:
      return null;
  }
}

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-nav-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                active
                  ? 'text-blue-400'
                  : 'text-fg-secondary hover:text-foreground'
              }`}
            >
              <TabIcon href={tab.href} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
