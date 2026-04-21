'use client';
import { FeedItem, api } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import useSWR from 'swr';
import { PlayCircle } from './Icons';

export function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export default function ArticleCard({ item, selected, onSelect, style }: {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
  style?: React.CSSProperties;
}) {
  const { readIds } = useFeedStore();
  const isRead = readIds.has(item.id);
  const date = item.published_at ?? item.created_at;
  const [storedFailed, setStoredFailed] = useState(false);
  const [ogFailed, setOgFailed] = useState(false);

  const isVideo = item.type === 'video';

  const needsOgFetch = !item.thumbnail_url || storedFailed;
  const { data: ogData } = useSWR(
    needsOgFetch && !isVideo ? `og:${item.source_url}` : null,
    () => api.og(item.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  const { data: articleData } = useSWR(
    selected && !isVideo && !item.summary ? `card-article:${item.id}` : null,
    () => api.article(item.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  const thumbUrl = (() => {
    if (!storedFailed && item.thumbnail_url) return item.thumbnail_url;
    if (!ogFailed && ogData?.imageUrl) return ogData.imageUrl;
    return null;
  })();

  const domain = sourceDomain(item.source_url);
  const categories = (item.categories ?? []).slice(0, 4);

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        background: selected ? 'var(--row-selected)' : 'var(--row-bg)',
        opacity: isRead && !selected ? 0.45 : 1,
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.1s',
        position: 'relative',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
        borderRadius: 6,
        overflow: 'hidden',
        ...style,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-hover)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--row-bg)'; }}
    >
      {/* Thumbnail — no badge overlays */}
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
          <div style={{
            width: '100%', height: '100%',
            background: isVideo ? '#0f1623' : 'var(--surface, #18181b)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {isVideo ? (
              <PlayCircle size={44} color="rgba(255,255,255,0.5)" strokeWidth={1.25} />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.04em', textTransform: 'uppercase' }}>No image</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ padding: '10px 14px 14px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{item.city}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
          </span>
          {isVideo && (
            <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, marginLeft: 2 }}>VIDEO</span>
          )}
          {item.clip && (
            <span style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.7, fontWeight: 600 }}>CLIP</span>
          )}
        </div>

        <h3 style={{
          fontSize: 14, fontWeight: isRead ? 400 : 600,
          color: isRead ? 'var(--text-secondary)' : 'var(--text-primary)',
          lineHeight: 1.4, marginBottom: 6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {item.title}
        </h3>

        {item.summary && (
          <p style={{
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            marginBottom: 8,
          } as React.CSSProperties}>
            {item.summary}
          </p>
        )}

        {!item.summary && articleData?.text && (
          <p style={{
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            marginBottom: 8,
          } as React.CSSProperties}>
            {articleData.text.split('\n\n')[0] ?? ''}
          </p>
        )}

        {categories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, rowGap: 8, marginBottom: 10 }}>
            {categories.map(c => (
              <span
                key={c}
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#111',
                  border: '1px solid #222',
                  letterSpacing: '0.02em',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {domain && (
          <span style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.02em' }}>{domain}</span>
        )}
      </div>
    </div>
  );
}
