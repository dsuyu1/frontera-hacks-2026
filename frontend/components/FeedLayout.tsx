'use client';
import { useState, useEffect } from 'react';
import { FeedItem } from '@/lib/api';
import Sidebar from './Sidebar';
import ArticleCard from './ArticleCard';
import Reader from './Reader';
import MobileTabs from './MobileTabs';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
}

export default function FeedLayout({ title, items, loading }: Props) {
  const [selected, setSelected] = useState<FeedItem | null>(null);

  // Keyboard nav
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
      <Sidebar />

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Page header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--main-bg)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
        }}>
          <h1 style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px',
          }}>
            {title}
          </h1>
          {!loading && items.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {items.length} articles
            </span>
          )}

          {/* Mark all read button */}
          {!loading && items.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>j/k to navigate · Esc to close</span>
            </div>
          )}
        </div>

        {/* Feed body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

          {/* Article list — single column, max-width centered */}
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

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 1,
              maxWidth: 1200,
              margin: '0 auto',
            }}>
              {items.map(item => (
                <ArticleCard
                  key={item.id}
                  item={item}
                  selected={selected?.id === item.id}
                  onSelect={() => setSelected(item)}
                />
              ))}
            </div>
          </div>

          {/* Slide-in reader panel */}
          <div
            style={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0,
              width: '100%',
              maxWidth: 'var(--reader-width)',
              background: 'var(--reader-bg)',
              borderLeft: '1px solid var(--border)',
              transform: selected ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 20,
              overflowY: 'auto',
              boxShadow: selected ? '-12px 0 40px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            <Reader item={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabs />
    </div>
  );
}
