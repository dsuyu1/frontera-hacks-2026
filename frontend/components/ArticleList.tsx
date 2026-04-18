'use client';
import { FeedItem } from '@/lib/api';
import ArticleRow from './ArticleRow';

export default function ArticleList({ title, items, loading, selectedId, onSelect }: {
  title: string;
  items: FeedItem[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (item: FeedItem) => void;
}) {
  return (
    <div style={{
      width: 300, flexShrink: 0, borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto',
      background: 'var(--main-bg)',
    }}>
      <div style={{
        padding: '14px 14px 10px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--main-bg)', zIndex: 1,
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#e4e4e7' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>
          {loading ? 'Loading…' : `${items.length} article${items.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {!loading && items.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#52525b', fontSize: 13 }}>
          No articles yet
        </div>
      )}

      {items.map(item => (
        <ArticleRow
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={() => onSelect(item)}
        />
      ))}
    </div>
  );
}
