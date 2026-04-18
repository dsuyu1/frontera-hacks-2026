'use client';
import { useState, useEffect } from 'react';
import { FeedItem } from '@/lib/api';
import Sidebar from './Sidebar';
import ArticleRow from './ArticleRow';
import Reader from './Reader';
import MobileTabs from './MobileTabs';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
}

export default function FeedLayout({ title, items, loading }: Props) {
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
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

      {/* Article list pane */}
      <div
        className="article-list-pane"
        style={{
          width: 'var(--article-list-width)',
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: 'var(--main-bg)',
        }}
      >
        {/* Pane header */}
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', flex: 1, letterSpacing: '-0.2px' }}>
            {title}
          </h1>
          {!loading && items.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.length}</span>
          )}
          <button
            onClick={() => setShowUnreadOnly(v => !v)}
            style={{
              padding: '3px 8px',
              background: showUnreadOnly ? 'var(--accent-dim)' : 'none',
              border: `1px solid ${showUnreadOnly ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 3,
              fontSize: 11,
              color: showUnreadOnly ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: showUnreadOnly ? 600 : 400,
              transition: 'all 0.1s',
            }}
          >
            Unread
          </button>
        </div>

        {/* Article list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 30, marginBottom: 12, opacity: 0.25 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Nothing here yet</div>
              <div style={{ fontSize: 12 }}>Check back after 3 AM UTC.</div>
            </div>
          )}
          {items.map(item => (
            <ArticleRow
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={() => setSelected(selected?.id === item.id ? null : item)}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        {items.length > 0 && (
          <div style={{
            padding: '6px 16px',
            borderTop: '1px solid var(--border)',
            fontSize: 10,
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}>
            j / k to navigate · Esc to close
          </div>
        )}
      </div>

      {/* Reader pane */}
      <div style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', background: 'var(--reader-bg)' }}>
        {selected ? (
          <Reader item={selected} onClose={() => setSelected(null)} />
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 40, opacity: 0.12, marginBottom: 16 }}>⊡</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Select an article</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>or press <kbd style={{ padding: '1px 5px', background: '#2a2a2a', borderRadius: 3, border: '1px solid #3a3a3a', fontSize: 11 }}>j</kbd> to start</div>
          </div>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabs />
    </div>
  );
}
