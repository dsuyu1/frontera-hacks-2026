'use client';
import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { FeedItem, api, Comment } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { getStoredUser, startLogin, AuthUser } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import VideoPlayer from './VideoPlayer';
import { ArrowLeft, Circle, CheckCircle, Bookmark, ExternalLink, Sparkles, ChevronUp, ChevronDown, RefreshCw } from './Icons';

// ── helpers ──────────────────────────────────────────────────────────────────

function renderSummary(text: string, sourceUrl: string) {
  const cleaned = text.replace(/\s*\[\.{2,3}\]\s*$|\s*\[…\]\s*$/g, '');
  const hadTruncation = cleaned.length < text.length;
  return (
    <>
      {cleaned}
      {hadTruncation && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', marginLeft: 4 }}>
          … read more
        </a>
      )}
    </>
  );
}

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  transcribed: 'Transcribed',
  segmented: 'Segmented',
  published: 'Published',
};

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  transcribed: '#3b82f6',
  segmented: '#8b5cf6',
  published: 'var(--accent)',
};

// ── Comments ─────────────────────────────────────────────────────────────────

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
    } finally { setSubmitting(false); }
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {comments.map(c => (
          <div key={c.id} style={{ padding: '10px 14px', background: '#222', borderRadius: 6, border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent-dim)', border: '1px solid var(--accent)',
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
                <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: 11, padding: 0 }}>✕</button>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet. Start the discussion.</p>
        )}
      </div>

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
              fontFamily: 'inherit', outline: 'none',
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

// ── Ask AI panel ─────────────────────────────────────────────────────────────

function AskAIPanel({ item, contextText }: { item: FeedItem; contextText: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isVideo = item.type === 'video';

  const suggestedQuestions = isVideo ? [
    'What decisions were made at this meeting?',
    'Who spoke and what did they say?',
    'How does this affect residents?',
  ] : [
    'What is the main point of this article?',
    'Who is affected by this?',
    'What are the key facts?',
  ];

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    setError('');
    try {
      const data = await api.ask(question.trim(), item.title, item.summary, contextText);
      setAnswer(data.answer);
    } catch {
      setError('Could not get a response. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, width: '100%',
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 6,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          flexShrink: 0,
        }}><Sparkles size={14} color="#fff" strokeWidth={0} /></span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ask AI
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
          · {isVideo ? 'Ask about this meeting' : 'Ask about this article'}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          <form onSubmit={ask} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={isVideo ? 'What happened at this meeting?' : 'What would you like to know?'}
              style={{
                flex: 1, padding: '9px 12px',
                background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 6, color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
              onBlur={e => { e.target.style.borderColor = '#333'; }}
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              style={{
                padding: '9px 16px', borderRadius: 6,
                background: question.trim() && !loading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#222',
                color: question.trim() && !loading ? '#fff' : '#555',
                border: 'none', cursor: question.trim() && !loading ? 'pointer' : 'default',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              {loading ? '…' : 'Ask'}
            </button>
          </form>

          {answer && (
            <div style={{
              padding: '14px 16px', borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 4,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  flexShrink: 0, marginTop: 2,
                }}><Sparkles size={11} color="#fff" strokeWidth={0} /></span>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
                  {answer}
                </p>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 8 }}>{error}</p>}

          {!answer && !loading && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestedQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  style={{
                    padding: '5px 10px', borderRadius: 20,
                    background: '#222', border: '1px solid #333',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: 11, transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget.style.borderColor = '#6366f1'); (e.currentTarget.style.color = '#a5b4fc'); }}
                  onMouseLeave={e => { (e.currentTarget.style.borderColor = '#333'); (e.currentTarget.style.color = 'var(--text-muted)'); }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Video pipeline status + transcript section ────────────────────────────────

function VideoSection({ item }: { item: FeedItem }) {
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');

  const { data: statusData, mutate: mutateStatus } = useSWR(
    `video-status:${item.id}`,
    () => api.videoStatus(item.id),
    { revalidateOnFocus: false, refreshInterval: (data) => {
      const s = data?.status;
      if (!s || s === 'published') return 0;
      return 15000; // poll every 15s while processing
    }},
  );

  const { data: transcriptData, isLoading: transcriptLoading } = useSWR(
    statusData?.status ? `transcript:${item.id}` : null,
    () => api.transcript(item.id),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const status = statusData?.status;
  const transcriptText = transcriptData?.text ?? '';
  const clips = statusData?.clips ?? [];

  async function triggerPipeline() {
    setRunning(true);
    setRunError('');
    try {
      await api.pipelineRun(item.id);
      await mutateStatus();
    } catch {
      setRunError('Could not start pipeline. Check your setup.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      {/* Pipeline status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 8,
        background: '#1a1a1a', border: '1px solid #2a2a2a',
        marginBottom: 20,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: status ? (PIPELINE_STATUS_COLORS[status] ?? 'var(--text-muted)') : '#3f3f46',
        }}>
          {status ? (PIPELINE_STATUS_LABELS[status] ?? status) : 'Not processed'}
        </span>

        {status && status !== 'published' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            · processing{status === 'pending' ? ' queued' : '…'}
          </span>
        )}

        {(!status || status === 'pending') && (
          <>
            <button
              onClick={triggerPipeline}
              disabled={running}
              style={{
                marginLeft: 'auto',
                padding: '4px 12px', borderRadius: 4,
                background: running ? '#333' : 'var(--accent)',
                color: running ? '#666' : '#fff',
                border: 'none', cursor: running ? 'default' : 'pointer',
                fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {running ? '…' : <RefreshCw size={11} />} {running ? 'Starting…' : 'Process Now'}
              </span>
            </button>
            {runError && <span style={{ fontSize: 11, color: '#ef4444' }}>{runError}</span>}
          </>
        )}
      </div>

      {/* Clips (YouTube embeds) */}
      {clips.filter(c => c.status === 'published').map(clip => (
        <div key={clip.id} style={{ marginBottom: 24 }}>
          <VideoPlayer clip={clip} />
          {clip.title && (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>{clip.title}</p>
          )}
          {clip.summary && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>{clip.summary}</p>
          )}
        </div>
      ))}

      {/* Clips still in pipeline */}
      {clips.filter(c => c.status !== 'published').length > 0 && (
        <div style={{ padding: '12px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          {clips.filter(c => c.status !== 'published').length} clip{clips.filter(c => c.status !== 'published').length > 1 ? 's' : ''} processing…
        </div>
      )}

      {/* Transcript */}
      {(transcriptLoading || transcriptText) && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Transcript
          </div>

          {transcriptLoading && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading transcript…</p>
          )}

          {!transcriptLoading && transcriptText && (
            <TranscriptView text={transcriptText} />
          )}
        </div>
      )}

      {/* Ask AI — uses transcript as context */}
      <AskAIPanel item={item} contextText={transcriptText} />
    </>
  );
}

function TranscriptView({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LENGTH = 600;
  const isLong = text.length > PREVIEW_LENGTH;
  const display = expanded || !isLong ? text : text.slice(0, PREVIEW_LENGTH) + '…';

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 8,
      background: '#111', border: '1px solid #222',
      marginBottom: 8,
    }}>
      <p style={{
        fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75,
        margin: 0, whiteSpace: 'pre-wrap',
      }}>
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            marginTop: 10, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--accent)', fontSize: 12,
            padding: 0,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show full transcript</>}
          </span>
        </button>
      )}
    </div>
  );
}

// ── Main Reader ───────────────────────────────────────────────────────────────

export default function Reader({ item, onClose }: { item: FeedItem | null; onClose?: () => void }) {
  const { readIds, savedIds, markRead, markUnread, toggleSaved } = useFeedStore();
  const [user] = useState<AuthUser | null>(() => getStoredUser());

  // For text articles: fetch full article content
  const isVideo = item?.type === 'video';
  const { data: articleData, isLoading: articleLoading } = useSWR(
    item && !isVideo ? `article:${item.id}` : null,
    () => api.article(item!.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  useEffect(() => {
    if (item && !readIds.has(item.id)) markRead(item.id);
  }, [item?.id]);

  if (!item) return null;

  const isRead = readIds.has(item.id);
  const isSaved = savedIds.has(item.id);
  const date = item.published_at ?? item.created_at;
  const articleText = articleData?.text ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--reader-bg)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--reader-bg)', zIndex: 1, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ ...toolBtn, display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => isRead ? markUnread(item.id) : markRead(item.id)}
          style={{ ...toolBtn, display: 'flex', alignItems: 'center', gap: 5, color: isRead ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {isRead ? <CheckCircle size={14} /> : <Circle size={14} />}
          {isRead ? 'Read' : 'Unread'}
        </button>
        <button
          onClick={() => toggleSaved(item.id)}
          style={{ ...toolBtn, display: 'flex', alignItems: 'center', color: isSaved ? '#f59e0b' : 'var(--text-muted)' }}
        >
          <Bookmark size={14} filled={isSaved} />
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

        {/* City + date */}
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          {item.city}
          {date && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              · {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 16, letterSpacing: '-0.3px' }}>
          {item.title}
        </h1>

        {/* Summary block with source link */}
        {item.summary && (
          <div style={{
            padding: '14px 16px', borderRadius: 8,
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Summary
              </span>
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                View source <ExternalLink size={11} />
              </a>
            </div>
            <p style={{ fontSize: 14, color: '#b0b0b0', lineHeight: 1.7, margin: 0 }}>
              {renderSummary(item.summary, item.source_url)}
            </p>
          </div>
        )}

        {/* Thumbnail (text articles) */}
        {item.thumbnail_url && !isVideo && (
          <img src={item.thumbnail_url} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 20, objectFit: 'cover', maxHeight: 240 }} />
        )}

        {/* ── VIDEO SECTION ── */}
        {isVideo && <VideoSection item={item} />}

        {/* ── TEXT ARTICLE SECTION ── */}
        {!isVideo && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  Full Article
                </span>
                {!item.summary && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    View source <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {articleLoading && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Fetching article…</p>
              )}

              {!articleLoading && articleText && (
                <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.8 }}>
                  {articleText.split('\n\n').map((para, i) =>
                    para.trim() ? <p key={i} style={{ marginBottom: 16 }}>{para.trim()}</p> : null
                  )}
                </div>
              )}

              {!articleLoading && !articleText && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Could not load article content.{' '}
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    Read on source site <ExternalLink size={11} />
                  </a>
                </p>
              )}
            </div>

            {/* Ask AI for text articles */}
            <AskAIPanel item={item} contextText={articleText} />
          </>
        )}

        {/* Comments */}
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
