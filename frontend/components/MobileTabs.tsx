'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/today', icon: '☀', label: 'Today' },
  { href: '/all', icon: '≡', label: 'All' },
  { href: '/read-later', icon: '⊡', label: 'Saved' },
  { href: '/recently-read', icon: '◷', label: 'History' },
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
            <span className="mobile-tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
