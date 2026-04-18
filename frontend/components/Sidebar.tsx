'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LOCALITIES = [
  { id: '06252ca8-e5ad-4037-8068-b5b6d1097c55', name: 'Edinburg' },
  { id: 'fb553439-a5b8-437a-9f8f-f8e56ff47843', name: 'McAllen' },
  { id: '210f6afb-eaf1-48e5-ab8a-38c624a6fb47', name: 'Mission' },
];

const NAV_TOP = [
  { href: '/today', icon: '☀', label: 'Today' },
  { href: '/all', icon: '≡', label: 'All' },
  { href: '/read-later', icon: '⊡', label: 'Saved for Later' },
  { href: '/recently-read', icon: '◷', label: 'Read History' },
  { href: '/videos', icon: '▶', label: 'Videos' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [feedsOpen, setFeedsOpen] = useState(true);

  return (
    <aside
      className="sidebar-desktop"
      style={{
        width: 'var(--sidebar-width)',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px' }}>
        <div style={{
          fontWeight: 700,
          fontSize: 22,
          color: 'var(--accent)',
          letterSpacing: '-0.5px',
          fontFamily: 'Georgia, serif',
        }}>
          frontera
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.02em' }}>
          RGV Local Government
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {NAV_TOP.map(n => {
          const active = pathname === n.href || (n.href === '/today' && pathname === '/');
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 18px',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 13, opacity: active ? 1 : 0.6, flexShrink: 0 }}>
                {n.icon}
              </span>
              {n.label}
            </Link>
          );
        })}

        {/* Feeds section */}
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setFeedsOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 18px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span>Feeds</span>
            <span style={{ fontSize: 9 }}>{feedsOpen ? '▾' : '▸'}</span>
          </button>

          {feedsOpen && LOCALITIES.map(loc => {
            const active = pathname === `/locality/${loc.id}`;
            return (
              <Link
                key={loc.id}
                href={`/locality/${loc.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 18px 7px 28px',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: active ? 'var(--accent)' : 'var(--text-muted)',
                  flexShrink: 0,
                }} />
                {loc.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--sidebar-border)', fontSize: 11, color: 'var(--text-muted)' }}>
        Updates daily · 3 AM UTC
      </div>
    </aside>
  );
}
