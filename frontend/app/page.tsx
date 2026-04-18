'use client';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#111213',
      color: '#e0e0e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid #2a2a2a',
        background: 'rgba(17,18,19,0.92)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 32px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#f97316', letterSpacing: '-0.5px', fontFamily: 'Georgia, serif' }}>
                frontera
              </span>
            </div>
            <nav style={{ display: 'flex', gap: 4 }}>
              {[
                { href: '/today', label: 'Today' },
                { href: '/all', label: 'All Articles' },
                { href: '/videos', label: 'Videos' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 14,
                    color: '#aaa',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#e0e0e0';
                    (e.currentTarget as HTMLElement).style.background = '#1e1e1e';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = '#aaa';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/today"
            style={{
              padding: '9px 20px',
              background: '#f97316',
              color: '#fff',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ea6c0a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f97316'; }}
          >
            Open Feed →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '96px 32px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 14px',
          background: 'rgba(249,115,22,0.1)',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 20,
          fontSize: 12,
          color: '#f97316',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
          Rio Grande Valley · Updated Daily
        </div>
        <h1 style={{
          fontSize: 'clamp(40px, 6vw, 68px)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-2px',
          color: '#f0f0f0',
          marginBottom: 24,
        }}>
          Stay ahead of<br />
          <span style={{ color: '#f97316' }}>local government</span>
        </h1>
        <p style={{
          fontSize: 18,
          color: '#888',
          maxWidth: 540,
          margin: '0 auto 40px',
          lineHeight: 1.6,
        }}>
          The fastest way to track meetings, decisions, and local news from Edinburg, McAllen, Mission, and across the Rio Grande Valley.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/today"
            style={{
              padding: '12px 28px',
              background: '#f97316',
              color: '#fff',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ea6c0a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f97316'; }}
          >
            Read Today's Feed
          </Link>
          <Link
            href="/videos"
            style={{
              padding: '12px 28px',
              background: 'transparent',
              color: '#ccc',
              border: '1px solid #333',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#555';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#333';
              (e.currentTarget as HTMLElement).style.color = '#ccc';
            }}
          >
            Watch Meeting Clips
          </Link>
        </div>
      </section>

      {/* City strip */}
      <div style={{
        borderTop: '1px solid #1e1e1e',
        borderBottom: '1px solid #1e1e1e',
        background: '#141516',
        padding: '18px 32px',
        display: 'flex',
        justifyContent: 'center',
        gap: 48,
        flexWrap: 'wrap',
      }}>
        {['Edinburg', 'McAllen', 'Mission', 'Hidalgo County', 'RGV Metro'].map(city => (
          <span key={city} style={{ fontSize: 13, color: '#555', fontWeight: 500, letterSpacing: '0.04em' }}>
            {city}
          </span>
        ))}
      </div>

      {/* Feature tiles */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#555',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 48,
        }}>
          What you can track
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Tile 1 — Daily Feed */}
          <div style={{
            background: '#1a1b1d',
            border: '1px solid #252627',
            borderRadius: 16,
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(249,115,22,0.12)',
              border: '1px solid rgba(249,115,22,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>☀</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>Daily Feed</h3>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7 }}>
              Every morning, a curated digest of local government news, press releases, and public announcements from across the RGV.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {['City council decisions', 'Public meeting summaries', 'Budget & ordinance updates'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#aaa' }}>
                  <span style={{ color: '#f97316', fontSize: 12 }}>✓</span> {item}
                </div>
              ))}
            </div>
            <Link
              href="/today"
              style={{
                marginTop: 12,
                display: 'inline-block',
                padding: '9px 20px',
                background: '#f97316',
                color: '#fff',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              Read Today →
            </Link>
          </div>

          {/* Tile 2 — Video Clips */}
          <div style={{
            background: '#1a1208',
            border: '1px solid #2a1e0a',
            borderRadius: 16,
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>▶</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fde8cc' }}>Video Coverage</h3>
            <p style={{ fontSize: 14, color: '#8a6a3a', lineHeight: 1.7 }}>
              Watch clipped highlights from city council sessions, school board meetings, and public hearings — with AI-generated summaries.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {['Council meeting clips', 'AI summaries', 'Searchable transcripts'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#8a5a2a' }}>
                  <span style={{ color: '#f97316', fontSize: 12 }}>✓</span> {item}
                </div>
              ))}
            </div>
            <Link
              href="/videos"
              style={{
                marginTop: 12,
                display: 'inline-block',
                padding: '9px 20px',
                background: 'rgba(249,115,22,0.15)',
                color: '#f97316',
                border: '1px solid rgba(249,115,22,0.3)',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              Watch Clips →
            </Link>
          </div>

          {/* Tile 3 — City Feeds */}
          <div style={{
            background: '#1a1b1d',
            border: '1px solid #252627',
            borderRadius: 16,
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#1e1e1e',
              border: '1px solid #2e2e2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>◉</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>City Feeds</h3>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7 }}>
              Filter news by city — Edinburg, McAllen, Mission, and more. Stay on top of what matters in your municipality.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {['Edinburg', 'McAllen', 'Mission'].map(city => (
                <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#aaa' }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#f97316', display: 'inline-block', flexShrink: 0,
                  }} />
                  {city}
                </div>
              ))}
            </div>
            <Link
              href="/all"
              style={{
                marginTop: 12,
                display: 'inline-block',
                padding: '9px 20px',
                background: 'transparent',
                color: '#aaa',
                border: '1px solid #2e2e2e',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              Browse All →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1e1e1e',
        background: '#0d0e0f',
        padding: '48px 32px',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 32,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#f97316', fontFamily: 'Georgia, serif', marginBottom: 8 }}>
              frontera
            </div>
            <div style={{ fontSize: 13, color: '#444' }}>RGV Local Government Feed</div>
            <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>Updated daily · 3 AM UTC</div>
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Feed</div>
              {[
                { href: '/today', label: 'Today' },
                { href: '/all', label: 'All Articles' },
                { href: '/videos', label: 'Videos' },
                { href: '/read-later', label: 'Saved' },
              ].map(item => (
                <div key={item.href} style={{ marginBottom: 10 }}>
                  <Link href={item.href} style={{ fontSize: 13, color: '#555', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#aaa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#555'; }}
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Cities</div>
              {['Edinburg', 'McAllen', 'Mission'].map(city => (
                <div key={city} style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{city}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{
          maxWidth: 1200,
          margin: '32px auto 0',
          paddingTop: 24,
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <span style={{ fontSize: 12, color: '#333' }}>© 2025 Frontera — Frontera Hacks</span>
          <span style={{ fontSize: 12, color: '#2a2a2a' }}>Built for the Rio Grande Valley</span>
        </div>
      </footer>
    </div>
  );
}
