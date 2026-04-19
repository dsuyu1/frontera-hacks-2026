'use client';
import { startLogin } from '@/lib/auth';

export default function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.72)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--reader-bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '32px 28px', width: 380,
        maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Sign in to CivicWatch
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Create a free account or sign in to follow sources, save articles, and personalize your feed.
          </div>
        </div>

        <button
          onClick={startLogin}
          style={{
            padding: '12px 0', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', width: '100%', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          Sign in / Create account
        </button>

        <button
          onClick={onClose}
          style={{
            padding: '10px 0', background: 'none', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
            cursor: 'pointer', width: '100%', transition: 'border-color 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--text-muted)'; el.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-muted)'; }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
