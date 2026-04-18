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
  const showImg = item.thumbnail_url && !imgFailed;

  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? '#242424' : 'var(--card-bg)',
        border: `1px solid ${selected ? '#3b82f6' : 'var(--border)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
        opacity: isRead && !selected ? 0.65 : 1,
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--card-hover)';
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--card-bg)';
      }}
    >
      {/* Thumbnail */}
      {showImg ? (
        <div style={{ height: 200, overflow: 'hidden', background: '#111', position: 'relative', flexShrink: 0 }}>
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
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff',
              }}>▶</div>
            </div>
          )}
          {!isRead && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              width: 9, height: 9, borderRadius: '50%', background: '#3b82f6',
            }} />
          )}
        </div>
      ) : (
        <div style={{
          height: 80, background: '#141414',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#333', position: 'relative', flexShrink: 0,
        }}>
          {item.type === 'video' ? '▶' : '○'}
          {!isRead && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              width: 9, height: 9, borderRadius: '50%', background: '#3b82f6',
            }} />
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tags row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 9px', borderRadius: 5, fontSize: 12, fontWeight: 600,
            background: '#1f1f1f', color: '#a1a1aa',
          }}>
            {item.city}
          </span>
          {item.type === 'video' && (
            <span style={{
              padding: '3px 9px', borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: '#1a1f2e', color: '#3b82f6',
            }}>
              VIDEO
            </span>
          )}
          {item.clip && (
            <span style={{
              padding: '3px 9px', borderRadius: 5, fontSize: 12,
              background: '#1a2e1a', color: '#4ade80',
            }}>
              ✓ Clip
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 17, fontWeight: 700, color: '#e4e4e7',
          lineHeight: 1.4, marginBottom: 10, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {item.title}
        </h3>

        {/* Summary */}
        {item.summary && (
          <p style={{
            fontSize: 14, color: '#71717a', lineHeight: 1.55, marginBottom: 12,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {item.summary}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span style={{ fontSize: 12, color: '#3f3f46' }}>
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
          </span>
          <span style={{ fontSize: 12, color: '#3f3f46' }}>
            {item.categories[0]?.replace(/-/g, ' ') ?? ''}
          </span>
        </div>
      </div>
    </div>
  );
}
