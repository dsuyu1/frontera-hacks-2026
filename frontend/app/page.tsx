'use client';
import Link from 'next/link';

/* shadcn/ui zinc-dark tokens (mirroring globals.css) */
const C = {
  bg:          '#09090b',   /* zinc-950 */
  surface:     '#18181b',   /* zinc-900 */
  surfaceHigh: '#1c1c1f',   /* zinc-900+ */
  border:      '#27272a',   /* zinc-800 */
  borderHigh:  '#3f3f46',   /* zinc-700 */
  textPrimary: '#fafafa',   /* zinc-50  */
  textSub:     '#a1a1aa',   /* zinc-400 */
  textMuted:   '#71717a',   /* zinc-500 */
  accent:      '#2BB24C',
  accentHover: '#229a40',
  accentDim:   'rgba(43,178,76,0.12)',
  accentBorder:'rgba(43,178,76,0.25)',
  headerBg:    'rgba(9,9,11,0.88)',
  footerBg:    '#050507',
} as const;

function Btn({ href, variant = 'solid', children }: { href: string; variant?: 'solid' | 'outline'; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 22px', borderRadius: 8,
    fontSize: 14, fontWeight: 600, transition: 'all 0.15s', cursor: 'pointer',
    letterSpacing: '-0.01em',
  };
  const solid: React.CSSProperties = { background: C.accent, color: '#fff', border: 'none' };
  const outline: React.CSSProperties = { background: 'transparent', color: C.textSub, border: `1px solid ${C.border}` };

  return (
    <Link
      href={href}
      style={{ ...base, ...(variant === 'solid' ? solid : outline) }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        if (variant === 'solid') el.style.background = C.accentHover;
        else { el.style.borderColor = C.borderHigh; el.style.color = C.textPrimary; }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        if (variant === 'solid') el.style.background = C.accent;
        else { el.style.borderColor = C.border; el.style.color = C.textSub; }
      }}
    >
      {children}
    </Link>
  );
}

const FEATURES = [
  {
    icon: '☀',
    title: 'Daily Feed',
    desc: 'Every morning, a curated digest of local government news, press releases, and public announcements from across the RGV.',
    bullets: ['City council decisions', 'Public meeting summaries', 'Budget & ordinance updates'],
    cta: { href: '/today', label: 'Read Today →' },
    accent: true,
  },
  {
    icon: '▶',
    title: 'Video Coverage',
    desc: 'Watch clipped highlights from city council sessions, school board meetings, and public hearings — with AI-generated summaries.',
    bullets: ['Council meeting clips', 'AI summaries', 'Searchable transcripts'],
    cta: { href: '/videos', label: 'Watch Clips →' },
    accent: false,
  },
  {
    icon: '◉',
    title: 'City Feeds',
    desc: 'Filter news by city — Edinburg, McAllen, Mission, and more. Stay on top of what matters in your municipality.',
    bullets: ['Edinburg', 'McAllen', 'Mission'],
    cta: { href: '/all', label: 'Browse All →' },
    accent: false,
  },
] as const;

const FOOTER_LINKS = {
  Feed: [
    { href: '/today', label: 'Today' },
    { href: '/all', label: 'All Articles' },
    { href: '/videos', label: 'Videos' },
    { href: '/read-later', label: 'Saved' },
  ],
  Cities: ['Edinburg', 'McAllen', 'Mission'],
};

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: `1px solid ${C.border}`,
        background: C.headerBg, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: C.textPrimary, letterSpacing: '-0.5px' }}>frontera</span>
            <nav style={{ display: 'flex', gap: 2 }}>
              {[{ href: '/today', label: 'Today' }, { href: '/explore', label: 'Explore' }, { href: '/all', label: 'All' }].map(n => (
                <Link key={n.href} href={n.href} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 13, color: C.textMuted, transition: 'color 0.1s, background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textPrimary; (e.currentTarget as HTMLElement).style.background = C.surface; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <Btn href="/today">Open Feed →</Btn>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section style={{ maxWidth: 1152, margin: '0 auto', padding: '100px 32px 88px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 14px', marginBottom: 32,
          background: C.accentDim, border: `1px solid ${C.accentBorder}`,
          borderRadius: 20, fontSize: 11, fontWeight: 600,
          color: C.accent, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />
          Rio Grande Valley · Updated Daily
        </div>

        <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-2.5px', color: C.textPrimary, marginBottom: 22 }}>
          Stay ahead of<br />
          <span style={{ color: C.accent }}>local government</span>
        </h1>

        <p style={{ fontSize: 17, color: C.textSub, maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.65 }}>
          The fastest way to track meetings, decisions, and local news from Edinburg, McAllen, Mission, and across the Rio Grande Valley.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn href="/today">Read Today&apos;s Feed</Btn>
          <Btn href="/videos" variant="outline">Watch Meeting Clips</Btn>
        </div>
      </section>

      {/* ── City strip ─────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '14px 32px', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
        {['Edinburg', 'McAllen', 'Mission', 'Hidalgo County', 'RGV Metro'].map(city => (
          <span key={city} style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, letterSpacing: '0.04em' }}>{city}</span>
        ))}
      </div>

      {/* ── Feature tiles ──────────────────────────────────── */}
      <section style={{ maxWidth: 1152, margin: '0 auto', padding: '80px 32px' }}>
        <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 48 }}>
          What you can track
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '36px 32px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: f.accent ? C.accentDim : C.surfaceHigh,
                border: `1px solid ${f.accent ? C.accentBorder : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{f.icon}</div>

              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.3px' }}>{f.title}</h3>

              <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{f.desc}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
                {f.bullets.map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: C.textSub }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, flexShrink: 0, display: 'inline-block' }} />
                    {b}
                  </div>
                ))}
              </div>

              <Link
                href={f.cta.href}
                style={{
                  marginTop: 8, width: 'fit-content',
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  background: f.accent ? C.accent : 'transparent',
                  color: f.accent ? '#fff' : C.textSub,
                  border: f.accent ? 'none' : `1px solid ${C.border}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  if (f.accent) el.style.background = C.accentHover;
                  else { el.style.borderColor = C.borderHigh; el.style.color = C.textPrimary; }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  if (f.accent) el.style.background = C.accent;
                  else { el.style.borderColor = C.border; el.style.color = C.textSub; }
                }}
              >
                {f.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.footerBg, padding: '48px 32px 36px' }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: C.textPrimary, letterSpacing: '-0.4px' }}>frontera</span>
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>RGV Local Government Feed</p>
            <p style={{ fontSize: 11, color: C.border, marginTop: 3 }}>Updated daily · 3 AM UTC</p>
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Feed</p>
              {FOOTER_LINKS.Feed.map(item => (
                <div key={item.href} style={{ marginBottom: 10 }}>
                  <Link href={item.href} style={{ fontSize: 13, color: C.textMuted, transition: 'color 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSub; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}>
                    {item.label}
                  </Link>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Cities</p>
              {FOOTER_LINKS.Cities.map(city => (
                <p key={city} style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>{city}</p>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1152, margin: '28px auto 0', paddingTop: 20, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>© 2025 Frontera — Frontera Hacks</span>
          <span style={{ fontSize: 12, color: C.border }}>Built for the Rio Grande Valley</span>
        </div>
      </footer>
    </div>
  );
}
