'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FeedItem } from '@/lib/api';
import { api } from '@/lib/api';

function Button({ href, variant, children }: { href: string; variant: 'primary' | 'ghost'; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  };

  const styles: Record<typeof variant, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff', border: '1px solid rgba(0,0,0,0)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  };

  return (
    <Link
      href={href}
      style={{ ...base, ...styles[variant] }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (variant === 'primary') el.style.background = 'var(--accent-hover)';
        else {
          el.style.borderColor = 'rgba(255,255,255,0.22)';
          el.style.color = 'var(--text-primary)';
          el.style.background = 'rgba(255,255,255,0.03)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (variant === 'primary') el.style.background = 'var(--accent)';
        else {
          el.style.borderColor = 'var(--border)';
          el.style.color = 'var(--text-secondary)';
          el.style.background = 'transparent';
        }
      }}
    >
      {children}
    </Link>
  );
}

function SidebarPreview() {
  const nav = [
    { label: 'Today', active: true },
    { label: 'All', active: false },
    { label: 'Saved', active: false },
    { label: 'Follow Sources', active: false },
  ];


  return (
    <div
      style={{
        width: 270,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 520,
      }}
    >
      <div style={{ padding: '18px 16px 14px' }}>
        <div style={{ fontWeight: 850 as any, fontSize: 20, letterSpacing: '-0.6px', color: 'var(--accent)', fontFamily: 'var(--font-headings)' }}>CivicWatch</div>
        <div style={{ marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>RGV government feed</div>
      </div>

      <div style={{ padding: '6px 0 10px' }}>
        {nav.map((n) => (
          <div
            key={n.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              fontSize: 13,
              color: n.active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: n.active ? 'var(--sidebar-active-bg)' : 'transparent',
              borderLeft: `3px solid ${n.active ? 'var(--accent)' : 'transparent'}`,
            }}
          >
            <span style={{ width: 18, opacity: n.active ? 1 : 0.55 }}>●</span>
            <span style={{ fontWeight: n.active ? 800 : 500 }}>{n.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--sidebar-border)', padding: '12px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Feeds
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your sources</div>
      </div>
    </div>
  );
}

function ListPreview() {
  type Row = { id?: string; title: string; source: string; meta: string; active: boolean; snippet: string };
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.feed({ limit: 12 }),
      api.feed({ type: 'video', limit: 12 }),
    ]).then(([text, video]) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged = [...(text.items ?? []), ...(video.items ?? [])]
        .filter((it) => {
          if (seen.has(it.id)) return false;
          seen.add(it.id);
          return true;
        })
        .sort((a, b) => {
          const da = new Date(a.published_at ?? a.created_at).getTime();
          const db = new Date(b.published_at ?? b.created_at).getTime();
          return db - da;
        })
        .slice(0, 8);
      setItems(merged);
      setSelectedIdx(0);
    }).catch(() => {
      if (!cancelled) setItems([]);
    });
    return () => { cancelled = true; };
  }, []);

  const fallback: Row[] = useMemo(() => ([
    { title: 'City Commission approves road contract', source: 'mcallentx.new.swagit.com', meta: 'recent', active: true, snippet: 'Key decisions, timeline, and relevant context—summarized fast.' },
    { title: 'Agenda posted: Planning & Zoning', source: 'edinburgtx.new.swagit.com', meta: 'recent', active: false, snippet: 'What’s being voted on and what to watch.' },
    { title: 'Special meeting: Budget amendment', source: 'hidalgocountytx.new.swagit.com', meta: 'recent', active: false, snippet: 'Summary of changes and implications.' },
    { title: 'Commission meeting highlights (video)', source: 'cameroncountytx.new.swagit.com', meta: 'recent', active: false, snippet: 'Watch the key moments without the full replay.' },
  ]), []);

  const derived: Row[] = items && items.length
    ? items.map((it, idx): Row => {
      const url = new URL(it.source_url);
      const host = url.hostname.replace(/^www\./, '');
      const date = new Date(it.published_at ?? it.created_at);
      const meta = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return {
        id: it.id,
        title: it.title,
        source: host,
        meta,
        active: idx === selectedIdx,
        snippet: it.summary ?? (it.type === 'video' ? 'Meeting video from an official archive.' : 'Headline summary from an official source.'),
      };
    })
    : fallback;

  return (
    <div style={{ flex: 1, minWidth: 340, borderRight: '1px solid var(--border)', background: 'var(--main-bg)' }}>
      <div style={{
        padding: '22px 20px 14px',
        background: 'var(--main-bg)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 850 as any, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.05, fontFamily: 'var(--font-headings)' }}>
              Today
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              The insights you need to keep ahead
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.15)',
          color: 'var(--text-muted)', fontSize: 12,
          marginBottom: 10,
        }}>
          <span style={{ opacity: 0.6 }}>⌕</span>
          Search sources, topics, and meetings…
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {derived.map((r) => (
          <div
            key={(r.id ?? r.title) + ':' + r.source}
            style={{
              display: 'flex',
              gap: 14,
              padding: '16px 0',
              background: r.active ? 'var(--row-selected)' : 'transparent',
              borderBottom: '1px solid var(--border)',
              borderLeft: `2px solid ${r.active ? 'var(--accent)' : '2px solid transparent'}`,
              transition: 'background 0.25s, border-color 0.25s',
            }}
          >
            <div style={{
              width: 104,
              height: 64,
              borderRadius: 8,
              background: 'var(--sidebar-hover-bg)',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.06)',
            }} />

            <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{r.source}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.meta}</span>
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1.35,
                  marginTop: 6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                {r.title}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  marginTop: 6,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                {r.snippet}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReaderPreview({ title, source }: { title: string; source: string }) {
  return (
    <div style={{ width: 460, background: 'var(--reader-bg)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--reader-bg)', zIndex: 1, flexShrink: 0,
      }}>
        <div style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          Back
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }} />
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{source}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Just now</div>
        </div>
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, letterSpacing: '-0.4px', lineHeight: 1.2, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>Summary</div>
        <div style={{ marginTop: 6, padding: '12px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            The commission approved a contract for road resurfacing near Nolana Ave. The project scope includes drainage improvements and a two‑phase timeline.
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Cost', 'Timeline', 'Who voted', 'Public comment'].map((t) => (
              <span key={t} style={{ fontSize: 11, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 999, padding: '5px 10px' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Watch clips</div>
        <div style={{ marginTop: 8, borderRadius: 12, border: '1px solid var(--border)', background: '#000', height: 118 }} />

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160, borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Why it matters</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Quick context so you can keep reading.
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 160, borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next steps</div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Upcoming meetings and agenda items.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveReaderCarousel({ items, selectedIdx }: { items: Array<{ title: string; source: string }>; selectedIdx: number }) {
  const current = items[selectedIdx] ?? items[0];
  return (
    <div style={{ position: 'relative' }}>
      <div
        key={`${current?.title}`}
      >
        <ReaderPreview title={current?.title ?? 'Loading…'} source={current?.source ?? ''} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [liveItems, setLiveItems] = useState<Array<{ title: string; source: string }> | null>(null);
  const idx = 0;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.feed({ limit: 10 }),
      api.feed({ type: 'video', limit: 10 }),
    ]).then(([text, video]) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged = [...(text.items ?? []), ...(video.items ?? [])]
        .filter((it) => {
          if (seen.has(it.id)) return false;
          seen.add(it.id);
          return true;
        })
        .sort((a, b) => {
          const da = new Date(a.published_at ?? a.created_at).getTime();
          const db = new Date(b.published_at ?? b.created_at).getTime();
          return db - da;
        })
        .slice(0, 6)
        .map((it) => {
          const host = new URL(it.source_url).hostname.replace(/^www\./, '');
          return { title: it.title, source: host };
        });
      setLiveItems(merged);
    }).catch(() => {
      if (!cancelled) setLiveItems([]);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--main-bg)', color: 'var(--text-primary)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: '1px solid var(--border)',
          background: 'rgba(15,15,18,0.82)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 900, letterSpacing: '-0.6px', fontSize: 15, fontFamily: 'var(--font-headings)' }}>CivicWatch</div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Feedly‑style local government reader</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/today" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Skip →</Link>
            <Button href="/today" variant="primary">Open Feed</Button>
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 18px 56px' }}>
        <div style={{ minHeight: 'calc(100vh - 66px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 980, textAlign: 'center' }}>
            <h1 style={{ marginTop: 0, fontSize: 'clamp(30px, 4vw, 46px)', letterSpacing: '-1.2px', lineHeight: 1.08, fontWeight: 950 as any }}>
              A calm, Feedly‑style view
              <br />
              of local government
            </h1>
            <p style={{ marginTop: 14, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
              Scan headlines, open a reader, and catch meeting clips—without hunting across dozens of government sites.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18, justifyContent: 'center' }}>
              <Button href="/today" variant="primary">Read Today</Button>
              <Button href="/explore" variant="ghost">Explore</Button>
            </div>

            <div
              style={{
                marginTop: 26,
                border: '1px solid var(--border)',
                borderRadius: 16,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)',
                boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 520 }}>
                <SidebarPreview />
                <ListPreview />
                <LiveReaderCarousel
                  items={liveItems?.length ? liveItems : [{ title: 'City Commission approves road contract', source: 'mcallentx.new.swagit.com' }]}
                  selectedIdx={idx}
                />
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, color: 'var(--text-muted)', fontSize: 12 }}>
              <div>Keyboard friendly · Read state · Saved · Follow sources</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
