'use client';
import { FeedItem } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export default function ArticleCard({ item, selected, onSelect }: {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { readIds } = useFeedStore();
  const isRead = readIds.has(item.id);
  const date = item.published_at ?? item.created_at;
  const [imgFailed, setImgFailed] = useState(false);
  const showThumb = item.thumbnail_url && !imgFailed;

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 20px',
        background: selected ? 'var(--row-selected)' : 'var(--row-bg)',
        borderBottom: '1px solid #2a2a2a',
        cursor: 'pointer',
        transition: 'background 0.1s',
        position: 'relative',
        minHeight: 72,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = selected ? 'var(--row-selected)' : 'var(--row-bg)'; }}
    >
      {/* Unread indicator */}
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: isRead ? 'transparent' : 'var(--accent)',
        flexShrink: 0,
        marginTop: 6,
        border: isRead ? '1.5px solid #444' : 'none',
      }} />

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Source + time row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {item.city}
          </span>
          {item.type === 'video' && (
            <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, letterSpacing: '0.04em' }}>
              · VIDEO
            </span>
          )}
          {item.clip && (
            <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7 }}>
              · CLIP
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 14,
          fontWeight: isRead ? 400 : 600,
          color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
          lineHeight: 1.4,
          marginBottom: 4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {item.title}
        </h3>

        {/* Snippet */}
        {item.summary && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {item.summary}
          </p>
        )}
      </div>

      {/* Thumbnail */}
      {showThumb ? (
        <div style={{
          width: 80,
          height: 60,
          borderRadius: 4,
          overflow: 'hidden',
          flexShrink: 0,
          background: '#111',
          position: 'relative',
        }}>
          <img
            src={item.thumbnail_url!}
            alt=""
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {item.type === 'video' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
            }}>
              <span style={{ fontSize: 14, color: '#fff' }}>▶</span>
            </div>
          )}
        </div>
      ) : item.type === 'video' ? (
        <div style={{
          width: 80, height: 60, borderRadius: 4, flexShrink: 0,
          background: '#1e1e1e', border: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#444', fontSize: 18,
        }}>
          ▶
        </div>
      ) : null}
    </div>
  );
}
