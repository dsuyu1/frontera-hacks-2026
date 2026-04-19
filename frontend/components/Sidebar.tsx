'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT, getStoredUser, startLogin, logout, AuthUser } from '@/lib/auth';
import { Sun, List, Bookmark, Clock, ChevronLeft, ChevronRight, ChevronDown, LogIn } from './Icons';

const LOCALITIES = [
  { id: '06252ca8-e5ad-4037-8068-b5b6d1097c55', name: 'Edinburg' },
  { id: 'fb553439-a5b8-437a-9f8f-f8e56ff47843', name: 'McAllen' },
  { id: '210f6afb-eaf1-48e5-ab8a-38c624a6fb47', name: 'Mission' },
];

type NavItem = { href: string; Icon: React.ComponentType<{ size?: number; color?: string }>; label: string };
const NAV_TOP: NavItem[] = [
  { href: '/today', Icon: Sun, label: 'Today' },
  { href: '/all', Icon: List, label: 'All' },
  { href: '/read-later', Icon: Bookmark, label: 'Saved' },
  { href: '/recently-read', Icon: Clock, label: 'History' },
];

export default function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [feedsOpen, setFeedsOpen] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  return (
    <aside
      className="sidebar-desktop"
      style={{
        width: open ? 'var(--sidebar-width)' : 0,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: open ? '1px solid var(--sidebar-border)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ padding: '14px 14px 10px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button
          onClick={onToggle}
          title="Collapse sidebar"
          style={{
            padding: '6px 8px', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 6,
            lineHeight: 1, flexShrink: 0,
            transition: 'color 0.1s, background 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
          {NAV_TOP.map(n => {
            const active = pathname === n.href || (n.href === '/today' && pathname === '/');
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  fontSize: 14, fontWeight: active ? 650 : 450,
                  borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 0.1s', whiteSpace: 'nowrap',
                }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
                <span style={{ width: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: active ? 1 : 0.65, flexShrink: 0 }}>
                  <n.Icon size={20} />
                </span>
                {n.label}
              </Link>
            );
          })}

        {/* Feeds section */}
          <div style={{ marginTop: 22 }}>
            <button
              onClick={() => setFeedsOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
            <span style={{ whiteSpace: 'nowrap' }}>Feeds</span>
            {feedsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

            {feedsOpen && LOCALITIES.map(loc => {
              const active = pathname === `/locality/${loc.id}`;
              return (
                <Link
                  key={loc.id}
                  href={`/locality/${loc.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 20px 9px 34px',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                    fontSize: 14, fontWeight: active ? 650 : 450,
                    borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.1s', whiteSpace: 'nowrap',
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
        <div style={{ borderTop: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
        {user ? (
          <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
            }}>
               {user.username?.[0]?.toUpperCase() ?? '?'}
             </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
            </div>
            <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: 0, whiteSpace: 'nowrap' }}>
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={startLogin}
            style={{
              width: '100%', padding: '12px 20px', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--accent)', fontSize: 14, fontWeight: 700, transition: 'background 0.1s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'var(--sidebar-hover-bg)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'none'); }}
          >
            <LogIn size={16} /> Sign in
          </button>
        )}
        <div style={{ padding: '6px 20px 12px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Updates daily · 3 AM UTC
        </div>
      </div>
    </aside>
  );
}
