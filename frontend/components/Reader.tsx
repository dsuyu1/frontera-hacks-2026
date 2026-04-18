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

  if (!item) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#3f3f46', fontSize: 13, background: 'var(--reader-bg)',
      }}>
        Select an article to read
      </div>
    );
  }

  const isRead = readIds.has(item.id);
  const isSaved = savedIds.has(item.id);
  const date = item.published_at ?? item.created_at;

  return (
    <div style={{
      flex: 1, background: 'var(--reader-bg)', overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0,
        background: 'var(--reader-bg)', zIndex: 1,
      }}>
        {onClose && (
          <button onClick={onClose} style={btnStyle}>← Back</button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => isRead ? markUnread(item.id) : markRead(item.id)} style={{
          ...btnStyle, color: isRead ? '#3b82f6' : '#71717a',
        }}>
          {isRead ? '◉ Read' : '○ Unread'}
        </button>
        <button onClick={() => toggleSaved(item.id)} style={{
          ...btnStyle, color: isSaved ? '#f59e0b' : '#71717a',
        }}>
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
        <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle, color: '#71717a' }}>
          ↗ Source
        </a>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={tagStyle('#1a2e1a', '#4ade80')}>{item.city}</span>
          {item.type === 'video' && <span style={tagStyle('#1a1f2e', '#3b82f6')}>VIDEO</span>}
          {item.categories.slice(0, 3).map(c => (
            <span key={c} style={tagStyle('#1e1e2e', '#818cf8')}>{c.replace(/-/g, ' ')}</span>
          ))}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e4e4e7', lineHeight: 1.35, marginBottom: 10 }}>
          {item.title}
        </h1>

        {/* Meta */}
        <div style={{ fontSize: 12, color: '#52525b', marginBottom: 20 }}>
          {item.jurisdiction ?? item.city}
          {date && ` · ${formatDistanceToNow(new Date(date), { addSuffix: true })}`}
        </div>

        {/* Thumbnail (for text articles without video) */}
        {item.thumbnail_url && item.type === 'text' && (
          <img src={item.thumbnail_url} alt="" style={{
            width: '100%', borderRadius: 8, marginBottom: 20, objectFit: 'cover', maxHeight: 280,
          }} />
        )}

        {/* Video clip */}
        {item.clip && <VideoPlayer clip={item.clip} />}

        {/* Summary */}
        {item.summary && (
          <p style={{ fontSize: 15, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 20 }}>
            {item.summary}
          </p>
        )}

        {!item.summary && !item.clip && (
          <div style={{ padding: '20px 0' }}>
            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
              style={{ color: '#3b82f6', fontSize: 14 }}>
              Read full article ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '5px 10px', background: 'none', border: '1px solid var(--border)',
  borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#71717a',
  transition: 'color 0.1s, border-color 0.1s',
};

function tagStyle(bg: string, color: string): React.CSSProperties {
  return { padding: '2px 8px', borderRadius: 4, background: bg, color, fontSize: 11, fontWeight: 500 };
}
