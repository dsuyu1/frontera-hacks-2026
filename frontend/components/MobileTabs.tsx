'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, List, Bookmark, Clock, Zap } from './Icons';

type Tab = { href: string; Icon: React.ComponentType<{ size?: number }>; label: string };
const TABS: Tab[] = [
  { href: '/today', Icon: Sun, label: 'Today' },
  { href: '/explore', Icon: Zap, label: 'Explore' },
  { href: '/all', Icon: List, label: 'All' },
  { href: '/read-later', Icon: Bookmark, label: 'Saved' },
  { href: '/recently-read', Icon: Clock, label: 'History' },
];

export default function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="mobile-tabs">
      {TABS.map(t => {
        const active = pathname === t.href || (t.href === '/today' && pathname === '/');
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`mobile-tab-btn${active ? ' active' : ''}`}
          >
            <span className="mobile-tab-icon"><t.Icon size={20} /></span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
