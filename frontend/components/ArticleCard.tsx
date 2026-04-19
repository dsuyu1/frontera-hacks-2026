'use client';
import { FeedItem, api } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import useSWR from 'swr';

function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export default function ArticleCard({ item, selected, onSelect }: {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { readIds } = useFeedStore();
  const isRead = readIds.has(item.id);
  const date = item.published_at ?? item.created_at;
  const [storedFailed, setStoredFailed] = useState(false);
  const [ogFailed, setOgFailed] = useState(false);

  const isVideo = item.type === 'video';

  // Only call /og when the stored thumbnail is absent or broken
  const needsOgFetch = !item.thumbnail_url || storedFailed;
  const { data: ogData } = useSWR(
    needsOgFetch && !isVideo ? `og:${item.source_url}` : null,
    () => api.og(item.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  const thumbUrl = (() => {
    if (!storedFailed && item.thumbnail_url) return item.thumbnail_url;
    if (!ogFailed && ogData?.imageUrl) return ogData.imageUrl;
    return null;
  })();

  const domain = sourceDomain(item.source_url);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        background: selected ? 'var(--row-selected)' : 'var(--row-bg)',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
        position: 'relative',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-bg)'; }}
    >
      {/* Thumbnail */}
      <div style={{ width: '100%', height: 160, background: 'var(--surface, #18181b)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            onError={() => {
              if (!storedFailed && item.thumbnail_url) setStoredFailed(true);
              else setOgFailed(true);
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          /* Blog-style placeholder: favicon + source domain */
          <div style={{
            width: '100%', height: '100%',
            background: isVideo ? '#0f1623' : 'var(--surface, #18181b)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {domain && !isVideo && (
              <>
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: 6, opacity: 0.5 }}
                  onError={e => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{domain}</span>
              </>
            )}
            {isVideo && (
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 16, color: '#fff', marginLeft: 3 }}>▶</span>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#fff', background: 'var(--accent)', padding: '2px 6px', borderRadius: 3 }}>
            {item.city}
          </span>
          {isVideo && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#3b82f6', padding: '2px 6px', borderRadius: 3 }}>
              VIDEO
            </span>
          )}
        </div>

        {/* Unread dot */}
        {!isRead && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)', boxShadow: '0 0 5px var(--accent)',
          }} />
        )}
      </div>

      {/* Text */}
      <div style={{ padding: '10px 14px 12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
          </span>
          {item.clip && (
            <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7, fontWeight: 600 }}>· CLIP</span>
          )}
        </div>

        <h3 style={{
          fontSize: 14, fontWeight: isRead ? 400 : 600,
          color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
          lineHeight: 1.4, marginBottom: 5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {item.title}
        </h3>

        {item.summary && (
          <p style={{
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {item.summary}
          </p>
        )}
      </div>
    </div>
  );
}
