'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AuthModal from '@/components/AuthModal';
import { ChevronRight, Star } from '@/components/Icons';
import { AUTH_CHANGED_EVENT, getStoredUser, type AuthUser } from '@/lib/auth';
import { SOURCES_CHANGED_EVENT, getFavoriteSources, getKnownSources, isFavoriteSource, toggleFavoriteSource } from '@/lib/sources';

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [favorites, setFavorites] = useState<string[]>(() => getFavoriteSources());
  const [known, setKnown] = useState<string[]>(() => getKnownSources());
  const [query, setQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--main-bg)', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{
          padding: '34px 28px 16px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--main-bg)', zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open sidebar"
              style={{
                padding: '5px 8px', background: 'none', border: '1px solid var(--border)',
                borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: 15, lineHeight: 1, flexShrink: 0, transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.borderColor = 'var(--text-muted)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.borderColor = 'var(--border)'; }}
            >
              <ChevronRight size={16} />
            </button>
          )}
          <div style={{ fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Follow Sources
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px', maxWidth: 720 }}>
          {!user ? (
            <div style={{ color: 'var(--text-primary)' }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Sign in to follow sources and personalize your feed.
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '10px 20px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                Sign in / Create account
              </button>

              {known.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    Available sources
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {known.map(domain => (
                      <div
                        key={domain}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderTop: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{domain}</div>
                        <button
                          onClick={() => setShowAuthModal(true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                            border: 'none', cursor: 'pointer', padding: 0,
                            color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
                          }}
                        >
                          <Star size={14} /> Follow
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-primary)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                Signed in as {user.username}
              </div>

              {favorites.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Followed sources</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {favorites.map(domain => (
                      <div
                        key={domain}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderTop: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{domain}</div>
                        <button
                          onClick={() => toggleFavoriteSource(domain)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                            border: 'none', cursor: 'pointer', padding: 0,
                            color: 'var(--accent)', fontSize: 12, fontWeight: 700,
                          }}
                        >
                          <Star size={14} filled /> Following
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>All sources</div>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search sources…"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--text-primary)', fontSize: 13, marginBottom: 12,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              {known.length > 0 ? (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {known
                    .filter(d => d.toLowerCase().includes(query.trim().toLowerCase()))
                    .map(domain => {
                      const followed = isFavoriteSource(domain);
                      return (
                        <div
                          key={domain}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px', borderTop: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{domain}</div>
                          <button
                            onClick={() => toggleFavoriteSource(domain)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                              border: 'none', cursor: 'pointer', padding: 0,
                              color: followed ? 'var(--accent)' : 'var(--text-muted)',
                              fontSize: 12, fontWeight: 700,
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
          )}
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
