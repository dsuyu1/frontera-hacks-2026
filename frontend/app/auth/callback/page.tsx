'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleCallback } from '@/lib/auth';
import { Suspense } from 'react';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) { setStatus('error'); return; }

    handleCallback(code, state).then(user => {
      if (user) {
        router.replace('/today');
      } else {
        setStatus('error');
      }
    });
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#191919', color: '#e0e0e0', flexDirection: 'column', gap: 12,
    }}>
      {status === 'loading' ? (
        <>
          <div style={{ fontSize: 24, color: '#f97316' }}>frontera</div>
          <div style={{ fontSize: 14, color: '#666' }}>Signing you in…</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14, color: '#ef4444' }}>Sign-in failed. Please try again.</div>
          <a href="/today" style={{ color: '#f97316', fontSize: 13 }}>← Go back</a>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
