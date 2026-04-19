'use client';

import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT, getStoredUser, startLogin, type AuthUser } from '@/lib/auth';
import { SOURCES_CHANGED_EVENT, getFavoriteSources, getKnownSources, isFavoriteSource, toggleFavoriteSource } from '@/lib/sources';
import { Star } from '@/components/Icons';

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteSources());
  const [known, setKnown] = useState<string[]>(() => getKnownSources());
  const [query, setQuery] = useState('');

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = () => {
      setFavorites(getFavoriteSources());
      setKnown(getKnownSources());
    };
    window.addEventListener(SOURCES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SOURCES_CHANGED_EVENT, sync);
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 28, maxWidth: 760, margin: '0 auto', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Profile</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
          Sign in to follow sources and see them here.
        </div>
        <button
          onClick={startLogin}
          style={{
            padding: '10px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 760, margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Profile</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>
        Signed in as {user.username}
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Followed sources</div>
      {favorites.length ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {favorites.map((domain) => (
            <div
              key={domain}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>{domain}</div>
              <button
                onClick={() => toggleFavoriteSource(domain)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Star size={14} filled /> Following
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          You haven’t followed any sources yet. Use the star on an article.
        </div>
      )}

      <div style={{ marginTop: 26, fontSize: 14, fontWeight: 800, marginBottom: 10 }}>All sources</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sources…"
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontSize: 13,
          marginBottom: 12,
          outline: 'none',
        }}
      />
      {known.length ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {known
            .filter((d) => d.toLowerCase().includes(query.trim().toLowerCase()))
            .map((domain) => {
              const followed = isFavoriteSource(domain);
              return (
                <div
                  key={domain}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{domain}</div>
                  <button
                    onClick={() => toggleFavoriteSource(domain)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: followed ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                    aria-label={followed ? 'Unfollow source' : 'Follow source'}
                  >
                    <Star size={14} filled={followed} /> {followed ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          No sources found yet. Browse a feed first.
        </div>
      )}
    </div>
  );
}
