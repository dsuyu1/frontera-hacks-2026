'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LOCALITIES = [
  { id: '06252ca8-e5ad-4037-8068-b5b6d1097c55', name: 'City of Edinburg', color: '#22c55e' },
  { id: 'fb553439-a5b8-437a-9f8f-f8e56ff47843', name: 'City of McAllen', color: '#3b82f6' },
  { id: '210f6afb-eaf1-48e5-ab8a-38c624a6fb47', name: 'City of Mission', color: '#f59e0b' },
];

const NAV = [
  { href: '/today', icon: '⌂', label: 'Today' },
  { href: '/all', icon: '≡', label: 'All Articles' },
  { href: '/read-later', icon: '⊡', label: 'Read Later' },
  { href: '/recently-read', icon: '◷', label: 'Recently Read' },
  { href: '/videos', icon: '▶', label: 'Video Clips' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [favOpen, setFavOpen] = useState(true);

  const navStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px',
    borderRadius: 6, color: active ? '#e4e4e7' : '#71717a',
    background: active ? '#1f1f1f' : 'transparent',
    fontSize: 13, fontWeight: active ? 500 : 400,
    transition: 'background 0.1s, color 0.1s',
  });

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0, overflowY: 'auto',
    }}>
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#e4e4e7', letterSpacing: '-0.4px' }}>Frontera</div>
        <div style={{ fontSize: 11, color: '#3f3f46', marginTop: 1 }}>RGV Local Government</div>
      </div>

      <nav style={{ padding: '8px', flex: 1 }}>
        {NAV.map(n => {
          const active = pathname === n.href || (n.href === '/today' && pathname === '/');
          return (
            <Link key={n.href} href={n.href} style={navStyle(active)}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0, opacity: 0.8 }}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}

        <div style={{ marginTop: 20 }}>
          <button onClick={() => setFavOpen(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', background: 'none', border: 'none', cursor: 'pointer',
            color: '#3f3f46', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', textAlign: 'left',
          }}>
            <span>{favOpen ? '▾' : '▸'}</span> Favorites
          </button>

          {favOpen && LOCALITIES.map(loc => {
            const active = pathname === `/locality/${loc.id}`;
            return (
              <Link key={loc.id} href={`/locality/${loc.id}`} style={{
                ...navStyle(active), paddingLeft: 32,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: loc.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12 }}>{loc.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--sidebar-border)', fontSize: 11, color: '#3f3f46' }}>
        Updates daily · 3 AM UTC
      </div>
    </aside>
  );
}
