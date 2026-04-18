'use client';
import { useState, useEffect, useCallback } from 'react';
import { FeedItem } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import Sidebar from './Sidebar';
import ArticleList from './ArticleList';
import Reader from './Reader';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
}

export default function FeedLayout({ title, items, loading }: Props) {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'reader'>('list');
  const { readIds, markRead, markUnread, toggleSaved } = useFeedStore();

  const filteredItems = filterUnread ? items.filter((i) => !readIds.has(i.id)) : items;

  const selectItem = useCallback((item: FeedItem) => {
    setSelectedItem(item);
    setSelectedIndex(filteredItems.findIndex((i) => i.id === item.id));
    setMobileView('reader');
  }, [filteredItems]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'j') {
        e.preventDefault();
        const next = Math.min(selectedIndex + 1, filteredItems.length - 1);
        setSelectedIndex(next);
        selectItem(filteredItems[next]);
      }
      if (e.key === 'k') {
        e.preventDefault();
        const prev = Math.max(selectedIndex - 1, 0);
        setSelectedIndex(prev);
        selectItem(filteredItems[prev]);
      }
      if ((e.key === 'o' || e.key === 'Enter') && selectedItem) {
        window.open(selectedItem.source_url, '_blank');
      }
      if (e.key === 'm' && selectedItem) {
        readIds.has(selectedItem.id) ? markUnread(selectedItem.id) : markRead(selectedItem.id);
      }
      if (e.key === 's' && selectedItem) {
        toggleSaved(selectedItem.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, selectedItem, filteredItems, readIds]);

  return (
    <div className="flex h-full">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Article list — hidden on mobile when reader is open */}
      <div className={`${mobileView === 'reader' ? 'hidden lg:flex' : 'flex'} h-full`}>
        <ArticleList
          title={title}
          items={filteredItems}
          loading={loading}
          selectedId={selectedItem?.id ?? null}
          onSelect={selectItem}
          filterUnread={filterUnread}
          onToggleUnread={() => setFilterUnread((f) => !f)}
        />
      </div>

      {/* Reader pane */}
      <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} flex-1 h-full overflow-hidden`}>
        <Reader
          item={selectedItem}
          onClose={() => setMobileView('list')}
        />
      </div>
    </div>
  );
}
