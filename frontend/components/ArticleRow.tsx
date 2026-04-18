'use client';
import { FeedItem } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export default function ArticleRow({ item, selected, onSelect }: {
  item: FeedItem; selected: boolean; onSelect: () => void;
}) {
  const { readIds } = useFeedStore();
  const isRead = readIds.has(item.id);
  const date = item.published_at ?? item.created_at;

  return (
    <div onClick={onSelect} style={{
      display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer',
      background: selected ? '#1f1f1f' : 'transparent',
      borderBottom: '1px solid var(--border)',
      borderLeft: selected ? '2px solid #3b82f6' : '2px solid transparent',
      transition: 'background 0.1s',
      opacity: isRead && !selected ? 0.55 : 1,
    }}>
      {/* Thumbnail */}
      {item.thumbnail_url ? (
        <img src={item.thumbnail_url} alt="" style={{
          width: 72, height: 48, objectFit: 'cover', borderRadius: 4,
          flexShrink: 0, background: '#222',
        }} />
      ) : (
        <div style={{
          width: 72, height: 48, borderRadius: 4, flexShrink: 0,
          background: item.type === 'video' ? '#1a1f2e' : '#1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: '#333',
        }}>
          {item.type === 'video' ? '▶' : ''}
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#52525b' }}>{item.city}</span>
          {item.type === 'video' && (
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#1a1f2e', color: '#3b82f6' }}>
              VIDEO
            </span>
          )}
          {!isRead && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
          )}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500, color: '#e4e4e7',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.4, marginBottom: 4,
        }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: '#52525b' }}>
          {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
        </div>
      </div>
    </div>
  );
}
