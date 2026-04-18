'use client';
import { useState, useEffect } from 'react';
import { FeedItem } from '@/lib/api';
import Sidebar from './Sidebar';
import ArticleCard from './ArticleCard';
import Reader from './Reader';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
}

export default function FeedLayout({ title, items, loading }: Props) {
  const [selected, setSelected] = useState<FeedItem | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') setSelected(null);
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Page header */}
        <div style={{
          padding: '28px 36px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--main-bg)',
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e4e4e7', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {title}
          </h1>
          {!loading && items.length > 0 && (
            <p style={{ fontSize: 14, color: '#52525b', marginTop: 6 }}>
              {items.length} {items.length === 1 ? 'story' : 'stories'}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Card grid */}
          <div style={{
            height: '100%', overflowY: 'auto',
            padding: '32px 36px',
            transition: 'filter 0.2s',
            filter: selected ? 'brightness(0.5)' : 'none',
          }}>
            {loading && (
              <div style={{ color: '#52525b', fontSize: 16 }}>Loading…</div>
            )}

            {!loading && items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#3f3f46' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#52525b' }}>Nothing here yet</div>
                <div style={{ fontSize: 15, marginTop: 8 }}>Check back after the next daily update at 3 AM UTC.</div>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 20,
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
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 680,
              background: 'var(--reader-bg)',
              borderLeft: '1px solid var(--border)',
              transform: selected ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 10,
              overflowY: 'auto',
              boxShadow: selected ? '-8px 0 40px rgba(0,0,0,0.6)' : 'none',
            }}
          >
            <Reader item={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      </div>
    </div>
  );
}
