'use client';
import { FeedItem, api } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import useSWR from 'swr';

export default function ArticleRow({ item, selected, onSelect }: {
  item: FeedItem; selected: boolean; onSelect: () => void;
}) {
  const { readIds } = useFeedStore();
  const isRead = readIds.has(item.id);
  const date = item.published_at ?? item.created_at;
  const [storedFailed, setStoredFailed] = useState(false);

  const isVideo = item.type === 'video';
  const needsOgFetch = (!item.thumbnail_url || storedFailed) && !isVideo;
  const { data: ogData } = useSWR(
    needsOgFetch ? `og:${item.source_url}` : null,
    () => api.og(item.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  const thumbUrl = (!storedFailed && item.thumbnail_url) ? item.thumbnail_url : (ogData?.imageUrl ?? null);

  return (
    <div onClick={onSelect} style={{
      display: 'flex', gap: 12, padding: '12px 14px', cursor: 'pointer',
      background: selected ? 'var(--row-selected)' : 'transparent',
      borderBottom: '1px solid var(--border)',
      borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
      transition: 'background 0.1s',
      opacity: isRead && !selected ? 0.45 : 1,
    }}>
      {/* Thumbnail */}
      {thumbUrl ? (
        <img src={thumbUrl} alt="" onError={() => setStoredFailed(true)} style={{
          width: 72, height: 48, objectFit: 'cover', borderRadius: 4,
          flexShrink: 0, background: 'var(--surface, #18181b)',
        }} />
      ) : (
        <div style={{
          width: 72, height: 48, borderRadius: 4, flexShrink: 0,
          background: isVideo ? '#0f1623' : '#18181b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isVideo ? (
            <span style={{ fontSize: 14, color: '#3f3f46' }}>▶</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.city}</span>
          {isVideo && (
            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#0f1623', color: '#3b82f6' }}>
              VIDEO
            </span>
          )}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.4, marginBottom: 4,
        } as React.CSSProperties}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
        </div>
      </div>
    </div>
  );
}
