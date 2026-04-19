'use client';
import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { FeedItem, api, Comment } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { getStoredUser, startLogin, AuthUser } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import VideoPlayer from './VideoPlayer';

function renderSummary(text: string, sourceUrl: string) {
  // Replace trailing [...] or […] with a linked "read more"
  const cleaned = text.replace(/\s*\[\.{2,3}\]\s*$|\s*\[…\]\s*$/g, '');
  const hadTruncation = cleaned.length < text.length;
  return (
    <>
      {cleaned}
      {hadTruncation && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', marginLeft: 4 }}>
          … read more ↗
        </a>
      )}
    </>
  );
}

function CommentsSection({ item, user }: { item: FeedItem; user: AuthUser | null }) {
  const { data, mutate } = useSWR(`comments:${item.id}`, () => api.comments(item.id));
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting || !user) return;
    setSubmitting(true);
    try {
      await api.postComment(item.id, text.trim());
      setText('');
      await mutate();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(id: string) {
    await api.deleteComment(id);
    await mutate();
  }

  const comments = data?.comments ?? [];

  return (
    <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
        Discussion · {comments.length}
      </h3>

      {/* Comment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {comments.map(c => (
          <div key={c.id} style={{
            padding: '10px 14px',
            background: '#222',
            borderRadius: 6,
            border: '1px solid #2a2a2a',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
              }}>
                {c.username[0].toUpperCase()}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{c.username}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </span>
              {user?.sub === c.user_id && (
                <button onClick={() => deleteComment(c.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#444', fontSize: 11, padding: 0,
                }}>✕</button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet. Start the discussion.</p>
        )}
      </div>

      {/* Comment form */}
      {user ? (
        <form onSubmit={submit}>
          <textarea
            ref={textRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              background: '#222', border: '1px solid #333',
              borderRadius: 6, color: 'var(--text-primary)',
              fontSize: 13, lineHeight: 1.5, resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.target.style.borderColor = '#333'; }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Commenting as <strong style={{ color: 'var(--text-secondary)' }}>{user.username}</strong>
            </span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              style={{
                padding: '6px 16px', borderRadius: 4,
                background: text.trim() && !submitting ? 'var(--accent)' : '#333',
                color: text.trim() && !submitting ? '#fff' : '#666',
                border: 'none', cursor: text.trim() && !submitting ? 'pointer' : 'default',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={startLogin}
          style={{
            width: '100%', padding: '10px', borderRadius: 6,
            background: '#222', border: '1px dashed #444',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 13, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--accent)'); (e.currentTarget.style.color = 'var(--accent)'); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = '#444'); (e.currentTarget.style.color = 'var(--text-muted)'); }}
        >
          Sign in to join the discussion →
        </button>
      )}
    </div>
  );
}

export default function Reader({ item, onClose }: { item: FeedItem | null; onClose?: () => void }) {
  const { readIds, savedIds, markRead, markUnread, toggleSaved } = useFeedStore();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (item && !readIds.has(item.id)) markRead(item.id);
  }, [item?.id]);

  if (!item) return null;

  const isRead = readIds.has(item.id);
  const isSaved = savedIds.has(item.id);
  const date = item.published_at ?? item.created_at;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--reader-bg)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--reader-bg)', zIndex: 1, flexShrink: 0,
      }}>
        <button onClick={onClose} style={toolBtn}>← Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => isRead ? markUnread(item.id) : markRead(item.id)}
          style={{ ...toolBtn, color: isRead ? 'var(--accent)' : 'var(--text-muted)' }}>
          {isRead ? '● Read' : '○ Unread'}
        </button>
        <button onClick={() => toggleSaved(item.id)}
          style={{ ...toolBtn, color: isSaved ? '#f59e0b' : 'var(--text-muted)' }}>
          {isSaved ? '★' : '☆'}
        </button>
        {user ? (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '5px 8px', border: '1px solid #333', borderRadius: 4 }}>
            {user.username}
          </span>
        ) : (
          <button onClick={startLogin} style={{ ...toolBtn, color: 'var(--accent)' }}>Sign in</button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          {item.city}
          {date && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              · {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
          )}
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 16, letterSpacing: '-0.3px' }}>
          {item.title}
        </h1>

        {item.categories.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {item.categories.slice(0, 4).map(c => (
              <span key={c} style={{ padding: '2px 8px', borderRadius: 3, background: '#2a2a2a', color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>
                {c.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {item.thumbnail_url && item.type === 'text' && (
          <img src={item.thumbnail_url} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 20, objectFit: 'cover', maxHeight: 240 }} />
        )}

        {item.clip && <VideoPlayer clip={item.clip} />}

        {item.summary && (
          <p style={{ fontSize: 15, color: '#b0b0b0', lineHeight: 1.75, marginBottom: 24 }}>
            {renderSummary(item.summary, item.source_url)}
          </p>
        )}

        <CommentsSection item={item} user={user} />
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  padding: '5px 10px', background: 'none', border: '1px solid #333',
  borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)',
  transition: 'color 0.1s, border-color 0.1s',
};
