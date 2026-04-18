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

  const isVideo = item.type === 'video';
  const thumbUrl = item.thumbnail_url && !imgFailed ? item.thumbnail_url : null;
  const hasMedia = thumbUrl || isVideo;

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        background: selected ? 'var(--row-selected)' : 'var(--row-bg)',
        borderBottom: '1px solid #2a2a2a',
        cursor: 'pointer',
        transition: 'background 0.1s',
        position: 'relative',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-bg)'; }}
    >
      {/* Media thumbnail — always shown */}
      <div style={{
        width: '100%',
        height: 160,
        background: '#111',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: isVideo ? '#1a1f2e' : '#1e1e1e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isVideo
              ? <span style={{ fontSize: 32, opacity: 0.2 }}>▶</span>
              : <span style={{ fontSize: 28, opacity: 0.15 }}>📰</span>
            }
          </div>
        )}

        {/* Play button overlay for videos */}
        {isVideo && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{ fontSize: 14, color: '#fff', marginLeft: 2 }}>▶</span>
            </div>
          </div>
        )}

        {/* Badges */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          display: 'flex', gap: 4,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: '#fff', background: 'var(--accent)',
            padding: '2px 6px', borderRadius: 3,
          }}>
            {item.city}
          </span>
          {isVideo && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              color: '#fff', background: '#3b82f6',
              padding: '2px 6px', borderRadius: 3,
            }}>
              VIDEO
            </span>
          )}
        </div>

        {/* Unread dot */}
        {!isRead && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)',
          }} />
        )}
      </div>

      {/* Text content */}
      <div style={{ padding: '10px 14px 12px', flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
          </span>
          {item.clip && (
            <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7, fontWeight: 600 }}>
              · CLIP
            </span>
          )}
        </div>

        <h3 style={{
          fontSize: 14,
          fontWeight: isRead ? 400 : 600,
          color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
          lineHeight: 1.4,
          marginBottom: 5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } as React.CSSProperties}>
          {item.title}
        </h3>

        {item.summary && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {item.summary}
          </p>
        )}
      </div>
    </div>
  );
}
