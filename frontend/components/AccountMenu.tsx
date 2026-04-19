'use client';

import { useState } from 'react';
import { User } from './Icons';
import AuthModal from './AuthModal';

export default function AccountMenu({ compact }: { compact?: boolean }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        aria-label="Sign in / Create account"
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

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
