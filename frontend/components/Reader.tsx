'use client';
import { useEffect } from 'react';
import { FeedItem } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import VideoPlayer from './VideoPlayer';

export default function Reader({ item, onClose }: { item: FeedItem | null; onClose?: () => void }) {
  const { readIds, savedIds, markRead, markUnread, toggleSaved } = useFeedStore();

  useEffect(() => {
    if (item && !readIds.has(item.id)) markRead(item.id);
  }, [item?.id]);

  if (!item) return null;

  const isRead = readIds.has(item.id);
  const isSaved = savedIds.has(item.id);
  const date = item.published_at ?? item.created_at;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--reader-bg)',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--reader-bg)',
        zIndex: 1,
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={toolBtn}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => isRead ? markUnread(item.id) : markRead(item.id)}
          style={{ ...toolBtn, color: isRead ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {isRead ? '● Read' : '○ Unread'}
        </button>
        <button
          onClick={() => toggleSaved(item.id)}
          style={{ ...toolBtn, color: isSaved ? '#f59e0b' : 'var(--text-muted)' }}
        >
          {isSaved ? '★' : '☆'}
        </button>
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...toolBtn, color: 'var(--text-muted)' }}
        >
          ↗ Source
        </a>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 32px',
      }}>
        {/* Source + time */}
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          {item.city}
          {date && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              · {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          marginBottom: 16,
          letterSpacing: '-0.3px',
        }}>
          {item.title}
        </h1>

        {/* Categories */}
        {item.categories.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {item.categories.slice(0, 4).map(c => (
              <span key={c} style={{
                padding: '2px 8px',
                borderRadius: 3,
                background: '#2a2a2a',
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 500,
              }}>
                {c.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Thumbnail for text articles */}
        {item.thumbnail_url && item.type === 'text' && (
          <img
            src={item.thumbnail_url}
            alt=""
            style={{
              width: '100%',
              borderRadius: 6,
              marginBottom: 20,
              objectFit: 'cover',
              maxHeight: 240,
            }}
          />
        )}

        {/* Video clip */}
        {item.clip && <VideoPlayer clip={item.clip} />}

        {/* Summary */}
        {item.summary && (
          <p style={{
            fontSize: 15,
            color: '#b0b0b0',
            lineHeight: 1.75,
            marginBottom: 24,
          }}>
            {item.summary}
          </p>
        )}

        {/* Read full article link */}
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            borderRadius: 5,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          Read full article ↗
        </a>
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  padding: '5px 10px',
  background: 'none',
  border: '1px solid #333',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--text-muted)',
  transition: 'color 0.1s, border-color 0.1s',
};
