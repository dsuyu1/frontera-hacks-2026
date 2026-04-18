'use client';
import { useTrending } from '@/hooks/useFeed';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  'public-safety': '#ef4444',
  'infrastructure': '#f59e0b',
  'education': '#22c55e',
  'economic-development': '#3b82f6',
  'health': '#ec4899',
  'politics-elections': '#8b5cf6',
  'environment': '#14b8a6',
};

export default function ExploreTab() {
  const { data, isLoading, error } = useTrending();

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
        Analyzing trending topics…
      </div>
    );
  }

  if (error || !data?.topics?.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13 }}>
        No trending data available yet.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7', marginBottom: 4 }}>Trending in RGV</h2>
      <p style={{ fontSize: 13, color: '#52525b', marginBottom: 24 }}>
        AI-identified civic topics from this week's coverage
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {data.topics.map((topic, i) => {
          const color = CATEGORY_COLORS[topic.category] ?? '#71717a';
          return (
            <div key={i} style={{
              background: 'var(--card-bg)', borderRadius: 10,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              {/* Topic header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e4e4e7' }}>{topic.topic}</div>
                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{topic.description}</div>
                </div>
                <span style={{
                  marginLeft: 'auto', padding: '2px 8px', borderRadius: 4,
                  background: '#1e1e2e', color, fontSize: 11, fontWeight: 600, flexShrink: 0,
                }}>
                  {topic.category.replace(/-/g, ' ')}
                </span>
              </div>

              {/* Related articles */}
              {topic.articles.length > 0 && (
                <div>
                  {topic.articles.map((a, j) => (
                    <a key={j} href={a.source_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', gap: 12, padding: '12px 20px',
                        borderBottom: j < topic.articles.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {a.thumbnail_url && (
                        <img src={a.thumbnail_url} alt="" style={{
                          width: 60, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: '#222',
                        }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500, lineHeight: 1.35 }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: '#52525b', marginTop: 3 }}>
                          {a.city} · {a.published_at ? formatDistanceToNow(new Date(a.published_at), { addSuffix: true }) : ''}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
