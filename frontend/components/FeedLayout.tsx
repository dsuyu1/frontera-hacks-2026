'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FeedItem } from '@/lib/api';
import Sidebar from './Sidebar';
import { sourceDomain } from './ArticleCard';
import ArticleRow from './ArticleRow';
import Reader from './Reader';
import AiSidePanel from './AiSidePanel';
import MobileTabs from './MobileTabs';
import { AUTH_CHANGED_EVENT, getStoredUser, startLogin, AuthUser } from '@/lib/auth';
import { ChevronRight } from './Icons';
import { setKnownSourcesFromItems } from '@/lib/sources';
import AccountMenu from './AccountMenu';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
  subtitle?: string;
  headerAction?: React.ReactNode;
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

export default function FeedLayout({ title, items, loading, subtitle, headerAction }: Props) {
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [collapsedHeader, setCollapsedHeader] = useState(false);

  const groups = useMemo(() => groupBySource(items), [items]);

  useEffect(() => {
    setKnownSourcesFromItems(items);
  }, [items]);

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

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => setCollapsedHeader(el.scrollTop > 56);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--main-bg)', overflow: 'hidden' }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      {/* Main column */}
      <main id="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Page header */}
        <div style={{
          padding: collapsedHeader ? '14px 20px' : '34px 20px 16px',
          borderBottom: collapsedHeader ? '1px solid var(--border)' : 'none',
          background: 'var(--main-bg)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 5,
          transition: 'padding 0.18s ease, border-color 0.18s ease',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
                aria-label="Open sidebar"
                style={{
                  padding: '5px 8px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)',
                  fontSize: 15, lineHeight: 1, flexShrink: 0,
                  transition: 'color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.borderColor = 'var(--text-muted)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.borderColor = 'var(--border)'; }}
              >
                Open
              </button>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: collapsedHeader ? 14 : 30,
                  fontWeight: collapsedHeader ? 700 : 850 as any,
                  color: 'var(--text-primary)',
                  letterSpacing: collapsedHeader ? '-0.2px' : '-0.6px',
                  lineHeight: collapsedHeader ? 1.2 : 1.05,
                  textAlign: 'left',
                  transition: 'font-size 0.18s ease, letter-spacing 0.18s ease',
                  whiteSpace: collapsedHeader ? 'nowrap' : 'normal',
                  overflow: collapsedHeader ? 'hidden' : 'visible',
                  textOverflow: collapsedHeader ? 'ellipsis' : 'clip',
                  margin: 0,
                }}
              >
                {title}
              </h1>
              {!collapsedHeader && subtitle && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                  {subtitle}
                </div>
              )}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {headerAction}
              {!user && <AccountMenu />}
            </div>
          </div>
        </div>

        {/* Feed body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div
            ref={bodyRef}
            className="feed-main-body"
            style={{
              height: '100%',
              overflowY: 'auto',
              transition: 'filter 0.2s, opacity 0.2s',
              filter: selected ? 'brightness(0.4)' : 'none',
            }}
          >
            <div aria-live="polite" aria-atomic="true">
              {loading && (
                <div style={{ padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Loading…
                </div>
              )}
            </div>

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

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '22px 20px 56px' }}>
              {groups.map(({ domain, items: groupItems }) => (
                <div key={domain} style={{ marginBottom: 28 }}>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    marginBottom: 12,
                  }}>
                    {domain}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)' }}>
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
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabs />
    </div>
  );
}
