'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AuthModal from '@/components/AuthModal';
import { Star } from '@/components/Icons';
import { AUTH_CHANGED_EVENT, getStoredUser, type AuthUser } from '@/lib/auth';
import { SOURCES_CHANGED_EVENT, addKnownSources, getFavoriteSources, getKnownSources, isFavoriteSource, toggleFavoriteSource } from '@/lib/sources';
import { api } from '@/lib/api';

type Tab = 'account' | 'sources';

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tab = searchParams.get('tab');
    return tab === 'sources' ? 'sources' : 'account';
  });

  // account state
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // sources state
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
    const sync = () => { setFavorites(getFavoriteSources()); setKnown(getKnownSources()); };
    window.addEventListener(SOURCES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SOURCES_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(tab === 'sources' ? 'sources' : 'account');
  }, [searchParams]);

  useEffect(() => {
    api.sourcesDomains()
      .then(({ domains }) => addKnownSources(domains))
      .catch(() => {});
  }, []);

  // Load profile from backend when user logs in
  useEffect(() => {
    if (!user) { setDisplayName(''); return; }
    api.getProfile().then(p => setDisplayName(p.display_name ?? '')).catch(() => {});
  }, [user?.sub]);

  // Sync followed sources to backend when they change
  useEffect(() => {
    if (!user) return;
    api.syncFollowedSources(favorites).catch(() => {});
  }, [favorites, user?.sub]);

  function startEditing() {
    setNameInput(displayName);
    setNameError('');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  async function saveName() {
    if (savingName) return;
    setSavingName(true);
    setNameError('');
    try {
      const res = await api.updateProfile(nameInput.trim() || null);
      setDisplayName(res.display_name ?? '');
      setEditingName(false);
    } catch {
      setNameError('Failed to save. Try again.');
    } finally {
      setSavingName(false);
    }
  }

  const tabStyle = (t: Tab) => ({
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    background: activeTab === t ? 'var(--surface)' : 'none',
    color: activeTab === t ? 'var(--text-primary)' : 'var(--text-muted)',
    transition: 'color 0.1s, background 0.1s',
  } as const);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--main-bg)', overflow: 'hidden' }}>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{
          padding: '40px 28px 16px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--main-bg)', zIndex: 5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  padding: '5px 8px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15,
                  lineHeight: 1, flexShrink: 0,
                }}
              >
                Open
              </button>
            )}
            <h1 style={{ fontSize: 28, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
              Profile
            </h1>
          </div>
          {user && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={tabStyle('account')} onClick={() => setActiveTab('account')}>Account</button>
              <button style={tabStyle('sources')} onClick={() => setActiveTab('sources')}>Follow Sources</button>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '28px', maxWidth: 720 }}>
          {!user ? (
            <div style={{ color: 'var(--text-primary)' }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                Sign in to edit your profile and follow sources.
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '10px 20px', background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
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
                      <div key={domain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{domain}</div>
                        <button onClick={() => setShowAuthModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                          <Star size={14} /> Follow
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : activeTab === 'account' ? (
            <div>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {(displayName || user.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {displayName || user.username}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
                </div>
              </div>

              {/* Display name field */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Account details
                  </div>
                </div>

                {/* Display name row */}
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Display name</div>
                  {editingName ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        ref={nameInputRef}
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                        maxLength={80}
                        placeholder="Your name"
                        style={{
                          flex: 1, padding: '8px 10px', borderRadius: 8,
                          border: '1px solid var(--accent)', background: 'var(--reader-bg)',
                          color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                        }}
                      />
                      <button
                        onClick={saveName}
                        disabled={savingName}
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: 'none',
                          background: 'var(--accent)', color: '#fff',
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingName ? 0.6 : 1,
                        }}
                      >
                        {savingName ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, color: displayName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {displayName || 'Not set'}
                      </div>
                      <button
                        onClick={startEditing}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {nameError && <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 6 }}>{nameError}</div>}
                </div>

                {/* Email row (read-only) */}
                <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Email</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{user.email}</div>
                </div>

                {/* Username row (read-only) */}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Username</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{user.username}</div>
                </div>
              </div>
            </div>

          ) : (
            /* Sources tab */
            <div style={{ color: 'var(--text-primary)' }}>
              {favorites.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>Followed sources</h2>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    {favorites.map(domain => (
                      <div key={domain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{domain}</div>
                        <button
                          onClick={() => toggleFavoriteSource(domain)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}
                        >
                          <Star size={14} filled /> Following
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>All sources</h2>
              <label htmlFor="sources-search" className="sr-only">Search sources</label>
              <input
                id="sources-search"
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
                        <div key={domain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{domain}</div>
                          <button
                            onClick={() => toggleFavoriteSource(domain)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: followed ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}
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
