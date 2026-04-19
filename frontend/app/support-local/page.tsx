'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import Sidebar from '@/components/Sidebar';
import { ExternalLink } from '@/components/Icons';
import { useSupportSources } from '@/hooks/useSupportLocal';
import { api, type SupportSource } from '@/lib/api';

function SupportCard({ s }: { s: SupportSource }) {
  const [imgFailed, setImgFailed] = useState(false);

  const { data: ogData } = useSWR(
    `support-og:${s.url}`,
    () => api.og(s.url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  const thumbUrl = !imgFailed && ogData?.imageUrl ? ogData.imageUrl : null;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.domain)}&sz=64`;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--reader-bg)', overflow: 'hidden' }}>
      {/* Thumbnail strip */}
      <div style={{ height: 120, background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={faviconUrl}
              alt=""
              width={32}
              height={32}
              style={{ opacity: 0.5, imageRendering: 'crisp-edges' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 3 }}>
            {s.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.domain}</div>
          {s.snippet && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {s.snippet}
            </div>
          )}
        </div>
        <Link
          href={s.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 11px', borderRadius: 10, border: '1px solid var(--border)',
            color: 'var(--text-secondary)', textDecoration: 'none',
            fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <ExternalLink size={14} />
          Visit
        </Link>
      </div>
    </div>
  );
}

export default function SupportLocalPage() {
  const articleBaseConfigured = !!process.env.NEXT_PUBLIC_ARTICLE_URL;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('Rio Grande Valley');
  const [city, setCity] = useState('');

  const params = useMemo(() => ({
    q: q.trim() || undefined,
    region: region.trim() || undefined,
    city: city.trim() || undefined,
  }), [q, region, city]);

  const { data, isLoading, error, mutate } = useSupportSources(params);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--main-bg)', overflow: 'hidden' }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

      <main id="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '34px 20px 16px', background: 'var(--main-bg)', flexShrink: 0 }}>
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 850 as any, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.05, margin: 0 }}>
                Support Local
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                Find nonprofits, volunteer opportunities, mutual aid, and local help.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City (optional)"
                style={{
                  flex: '1 1 180px',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--reader-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <input
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="Region"
                style={{
                  flex: '1 1 220px',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--reader-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Keywords (optional)"
                style={{
                  flex: '2 1 280px',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--reader-bg)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <button
                onClick={() => mutate()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 20px 56px' }}>
            {!articleBaseConfigured && (
              <div style={{
                padding: '14px 14px',
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                marginBottom: 12,
              }}>
                This page requires `NEXT_PUBLIC_ARTICLE_URL` to be set in your deployment environment.
              </div>
            )}

            {error && (
              <div style={{ padding: '18px 16px', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)' }}>
                Search failed. Try again with fewer keywords.
              </div>
            )}

            {isLoading && (
              <div style={{ padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Searching…
              </div>
            )}

            {!isLoading && (data?.sources?.length ?? 0) === 0 && !error && (
              <div style={{ padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No results yet. Try searching for a city or a cause.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {(data?.sources ?? []).map((s) => (
                <SupportCard key={s.url} s={s} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
