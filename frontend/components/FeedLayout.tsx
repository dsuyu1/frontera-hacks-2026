'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FeedItem } from '@/lib/api';
import Sidebar from './Sidebar';
import { sourceDomain } from './ArticleCard';
import ArticleRow from './ArticleRow';
import Reader from './Reader';
import AiSidePanel from './AiSidePanel';
import MobileTabs from './MobileTabs';
import { getStoredUser, startLogin, AuthUser } from '@/lib/auth';
import { ChevronRight } from './Icons';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
  subtitle?: string;
}

function groupBySource(items: FeedItem[]): { domain: string; items: FeedItem[] }[] {
  const map = new Map<string, FeedItem[]>();
  for (const item of items) {
    const domain = sourceDomain(item.source_url) || 'Unknown';
    if (!map.has(domain)) map.set(domain, []);
    map.get(domain)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, items]) => ({ domain, items }));
}

export default function FeedLayout({ title, items, loading, subtitle }: Props) {
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const groups = useMemo(() => groupBySource(items), [items]);

  // Keyboard nav (flat item list for j/k)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') { setSelected(null); return; }
      if (!selected) return;
      const idx = items.findIndex(i => i.id === selected.id);
      if (e.key === 'j') setSelected(items[Math.min(idx + 1, items.length - 1)]);
      if (e.key === 'k' && idx > 0) setSelected(items[idx - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, selected]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--main-bg)', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Page header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--main-bg)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
              style={{
                padding: '5px 8px', background: 'none', border: '1px solid var(--border)',
                borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: 15, lineHeight: 1, flexShrink: 0,
                transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.borderColor = 'var(--text-muted)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.borderColor = 'var(--border)'; }}
            >
              <ChevronRight size={16} />
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -2 }}>
                {subtitle}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              {(
                [
                  { href: '/today', label: 'Today' },
                  { href: '/explore', label: 'Explore' },
                ] as const
              ).map(t => {
                const active = pathname === t.href || (t.href === '/today' && pathname === '/');
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    style={{
                      padding: '6px 2px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                      textDecoration: 'none',
                      borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                      transition: 'all 0.12s',
                    }}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </div>
          {!loading && items.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {items.length} articles
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            {!user && (
              <button
                onClick={startLogin}
                style={{
                  padding: '6px 14px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Feed body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div
            className="feed-main-body"
            style={{
              height: '100%',
              overflowY: 'auto',
              transition: 'filter 0.2s, opacity 0.2s',
              filter: selected ? 'brightness(0.4)' : 'none',
            }}
          >
            {loading && (
              <div style={{ padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                Loading…
              </div>
            )}

            {!loading && items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.3 }}>📭</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Nothing here yet
                </div>
                <div style={{ fontSize: 13 }}>
                  Check back after the next daily update at 3 AM UTC.
                </div>
              </div>
            )}

            <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 48px' }}>
              {groups.map(({ domain, items: groupItems }) => (
                <div key={domain} style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 10,
                  }}>
                    {domain}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    {groupItems.map(item => (
                      <ArticleRow
                        key={item.id}
                        item={item}
                        selected={selected?.id === item.id}
                        onSelect={() => setSelected(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Slide-in reader panel */}
          <div
            style={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0,
              width: '100%',
              maxWidth: 'calc(var(--reader-width) + 420px)',
              background: 'var(--reader-bg)',
              borderLeft: '1px solid var(--border)',
              transform: selected ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 20,
              overflow: 'hidden',
              boxShadow: selected ? '-12px 0 40px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {selected && (
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--border)' }}>
                  <Reader item={selected} onClose={() => setSelected(null)} />
                </div>
                <div style={{ width: 420, flexShrink: 0, padding: 16, overflowY: 'auto' }}>
                  <AiSidePanel item={selected} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabs />
    </div>
  );
}
