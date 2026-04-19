'use client';
import { useEffect, useState } from 'react';
import { FeedItem, api } from '@/lib/api';
import { ChevronDown, ChevronUp, Sparkles } from './Icons';

export default function AskAIPanel({ item, contextText }: { item: FeedItem; contextText: string }) {
  const [open, setOpen] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isVideo = item.type === 'video';

  useEffect(() => {
    setQuestion('');
    setAnswer('');
    setError('');
    setLoading(false);
    setOpen(true);
  }, [item.id]);

  const suggestedQuestions = isVideo
    ? ['What decisions were made at this meeting?', 'Who spoke and what did they say?', 'How does this affect residents?']
    : ['What is the main point of this article?', 'Who is affected by this?', 'What are the key facts?'];

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

  const disabled = !contextText.trim();

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: '#0f0f0f', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 12px', width: '100%',
          borderBottom: open ? '1px solid var(--border)' : 'none',
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
        <div style={{ padding: 12 }}>
          <form onSubmit={ask} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={disabled ? 'Load content to ask questions' : (isVideo ? 'What happened at this meeting?' : 'What would you like to know?')}
              disabled={disabled}
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
              disabled={disabled || !question.trim() || loading}
              style={{
                padding: '9px 16px', borderRadius: 6,
                background: !disabled && question.trim() && !loading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#222',
                color: !disabled && question.trim() && !loading ? '#fff' : '#555',
                border: 'none', cursor: !disabled && question.trim() && !loading ? 'pointer' : 'default',
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
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {answer}
                </p>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 8 }}>{error}</p>}

          {!answer && !loading && !disabled && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestedQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  type="button"
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

