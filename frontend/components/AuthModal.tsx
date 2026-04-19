'use client';
import { useEffect } from 'react';
import { startLogin, startSignup } from '@/lib/auth';
import { useFocusTrap } from '@/hooks/useFocusTrap';

const LABEL_ID = 'auth-modal-title';

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const containerRef = useFocusTrap(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.8)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={LABEL_ID}
        style={{
          background: '#111113', border: '1px solid var(--border)',
          borderRadius: 14, padding: '32px 28px', width: 380,
          maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: 18,
          opacity: 1,
        }}
      >
        <div>
          <h2 id={LABEL_ID} style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, margin: 0 }}>
            Sign in to Frontera
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 8 }}>
            Create a free account or sign in to follow sources, save articles, and personalize your feed.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={startSignup}
            style={{
              padding: '12px 0', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', width: '100%', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            Create account
          </button>

          <button
            onClick={startLogin}
            style={{
              padding: '11px 0', background: 'none', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', width: '100%', transition: 'border-color 0.1s, color 0.1s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--text-muted)'; el.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-secondary)'; }}
          >
            Sign in
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '8px 0', background: 'none', color: 'var(--text-muted)',
            border: 'none', borderRadius: 8, fontSize: 12,
            cursor: 'pointer', width: '100%',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
