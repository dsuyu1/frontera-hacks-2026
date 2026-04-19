'use client';

import { useEffect, useRef, useState } from 'react';
import { startLogin, startSignup } from '@/lib/auth';
import { User } from './Icons';

export default function AccountMenu({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          padding: compact ? 8 : '8px 10px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <User size={16} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 240,
            border: '1px solid var(--border)',
            borderRadius: 12,
            background: 'var(--reader-bg)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
            padding: 10,
            zIndex: 100,
          }}
        >
          <button
            role="menuitem"
            onClick={() => { setOpen(false); startLogin(); }}
            style={{
              width: '100%',
              padding: '10px 10px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              textAlign: 'left',
            }}
          >
            Log in
          </button>

          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Don’t have an account?
            <button
              role="menuitem"
              onClick={() => { setOpen(false); startSignup(); }}
              style={{
                marginLeft: 6,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Sign up here.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
