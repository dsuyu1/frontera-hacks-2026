'use client';
import { useState, useEffect, useCallback } from 'react';
import { FeedItem } from '@/lib/api';
import Sidebar from './Sidebar';
import ArticleList from './ArticleList';
import Reader from './Reader';
import ExploreTab from './ExploreTab';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
}

export default function FeedLayout({ title, items, loading }: Props) {
  const [tab, setTab] = useState<'me' | 'explore'>('me');
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'reader'>('list');

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const idx = selected ? items.findIndex(i => i.id === selected.id) : -1;
      if (e.key === 'j') setSelected(items[Math.min(idx + 1, items.length - 1)] ?? null);
      if (e.key === 'k') setSelected(idx > 0 ? items[idx - 1] : items[0]);
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, selected]);

  const tabBtn = (t: 'me' | 'explore', label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: '6px 18px', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: tab === t ? 600 : 400,
        color: tab === t ? '#e4e4e7' : '#52525b',
        borderBottom: `2px solid ${tab === t ? '#3b82f6' : 'transparent'}`,
        transition: 'all 0.15s', marginBottom: -1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--main-bg)' }}>
      {/* Sidebar — hidden on mobile when reading */}
      <div style={{ display: mobileView === 'reader' ? 'none' : 'flex' } as React.CSSProperties}
        className="sidebar-wrapper">
        <Sidebar />
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, padding: '0 20px',
          borderBottom: '1px solid var(--border)', background: 'var(--main-bg)',
          flexShrink: 0,
        }}>
          {tabBtn('me', 'Me')}
          {tabBtn('explore', 'Explore')}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: '#3f3f46' }}>{title}</span>
          <div style={{ width: 16 }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {tab === 'explore' ? (
            <ExploreTab />
          ) : (
            <>
              {/* Article list */}
              <div style={{ display: mobileView === 'reader' ? 'none' : 'block' } as React.CSSProperties}>
                <ArticleList
                  title={title}
                  items={items}
                  loading={loading}
                  selectedId={selected?.id ?? null}
                  onSelect={item => { setSelected(item); setMobileView('reader'); }}
                />
              </div>

              {/* Reader */}
              <Reader
                item={selected}
                onClose={() => { setSelected(null); setMobileView('list'); }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
