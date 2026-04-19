'use client';
import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { FeedItem, api, Comment } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { AUTH_CHANGED_EVENT, getStoredUser, startLogin, AuthUser } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import VideoPlayer from './VideoPlayer';
import { ArrowLeft, Circle, CheckCircle, Bookmark, ExternalLink, ChevronUp, ChevronDown, RefreshCw, Volume2 } from './Icons';

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
  const publishedClips = clips.filter(c => c.status === 'published');

  // Derive YouTube embed URL for immediate playback: use video record's embed_url,
  // or fall back to extracting the video ID from the feed item's source_url.
  const ytIdMatch = item.source_url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ?? item.source_url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const immediateEmbedUrl = statusData?.embed_url ?? (ytIdMatch ? `https://www.youtube.com/embed/${ytIdMatch[1]}` : null);

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
      {/* Immediate YouTube embed — autoplays muted when the article is opened */}
      {immediateEmbedUrl && publishedClips.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <iframe
            key={immediateEmbedUrl}
            className="yt-embed"
            src={`${immediateEmbedUrl}${immediateEmbedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&playsinline=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

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
      {publishedClips.map(clip => (
        <div key={clip.id} style={{ marginBottom: 24 }}>
          <VideoPlayer clip={clip} autoplay />
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
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [speaking, setSpeaking] = useState(false);
  const ttsSupported = typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  // For text articles: fetch full article content
  const isVideo = item?.type === 'video';
  const { data: articleData, isLoading: articleLoading } = useSWR(
    item && !isVideo ? `article:${item.id}` : null,
    () => api.article(item!.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  useEffect(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [item?.id, ttsSupported]);

  useEffect(() => {
    if (!ttsSupported) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;
      const preferred = [
        /google\s+us\s+english/i,
        /samantha/i,
        /victoria/i,
        /ava/i,
        /allison/i,
        /daniel/i,
      ];
      const byName = preferred
        .map(rx => voices.find(v => rx.test(v.name)))
        .find(Boolean);

      const en = voices.find(v => (v.lang ?? '').toLowerCase().startsWith('en'));
      setTtsVoice(byName ?? en ?? voices[0] ?? null);
    };
    pick();
    synth.onvoiceschanged = pick;
    return () => {
      if (synth.onvoiceschanged === pick) synth.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  useEffect(() => {
    if (item && !readIds.has(item.id)) markRead(item.id);
  }, [item?.id]);

  if (!item) return null;

  const isRead = readIds.has(item.id);
  const isSaved = savedIds.has(item.id);
  const date = item.published_at ?? item.created_at;
  const articleText = articleData?.text ?? '';
  const ttsText = [item.title, item.summary ?? '', articleText].filter(Boolean).join('\n\n');

  function toggleReadAloud() {
    if (!ttsSupported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(ttsText);
    if (ttsVoice) utter.voice = ttsVoice;
    utter.rate = 1.02;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
  const articleEmbedUrl = articleData?.embed_url ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--reader-bg)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--reader-bg)', zIndex: 1, flexShrink: 0,
      }}>
        <button onClick={() => { stopReading(); onClose?.(); }} style={{ ...toolBtn, display: 'flex', alignItems: 'center', gap: 5 }}>
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
        {!isVideo && (
          <button
            onClick={toggleReadAloud}
            disabled={!ttsSupported || (!articleLoading && !ttsText)}
            style={{
              ...toolBtn,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: speaking ? 'var(--accent)' : 'var(--text-muted)',
              opacity: !ttsSupported ? 0.5 : 1,
            }}
          >
            <Volume2 size={14} /> {speaking ? 'Stop' : 'Listen'}
          </button>
        )}
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

        {isVideo ? (
          <VideoSection item={item} />
        ) : (
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

            {!articleLoading && !articleText && articleEmbedUrl && (
              <div style={{ border: '1px solid #222', borderRadius: 8, overflow: 'hidden', height: 720, background: '#0b0b0b' }}>
                <iframe
                  src={articleEmbedUrl}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  title="Embedded document"
                />
              </div>
            )}

            {!articleLoading && !articleText && !articleEmbedUrl && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Could not load article content.{' '}
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  Read on source site <ExternalLink size={11} />
                </a>
              </p>
            )}
          </div>
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
