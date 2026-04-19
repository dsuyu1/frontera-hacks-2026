'use client';
import { Clip } from '@/lib/api';
import { ExternalLink } from './Icons';

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({ clip, autoplay }: { clip: Clip; autoplay?: boolean }) {
  const embedUrl = clip.embed_url;
  if (!embedUrl && !clip.s3_key && !clip.playback_url) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        Video processing…
      </div>
    );
  }

  const autoPlay = autoplay ?? false;
  const iframeSrc = embedUrl
    ? (() => {
      const url = new URL(embedUrl);
      if (autoPlay) {
        url.searchParams.set('autoplay', '1');
        url.searchParams.set('mute', '1');
        url.searchParams.set('playsinline', '1');
      }
      return url.toString();
    })()
    : null;

  return (
    <div style={{ marginBottom: 20 }}>
      {embedUrl ? (
        <iframe
          className="yt-embed"
          src={iframeSrc ?? embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : clip.playback_url ? (
        <video controls preload="metadata" autoPlay={autoPlay} muted={autoPlay} style={{ width: '100%', borderRadius: 8, background: '#000' }}>
          <source src={clip.playback_url} />
        </video>
      ) : null}

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#52525b' }}>
          {fmt(clip.start_time_s)} – {fmt(clip.end_time_s)}
        </span>
        {embedUrl && (
          <a
            href={embedUrl.replace('/embed/', '/watch?v=').replace('?start=', '&t=')}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Watch on YouTube <ExternalLink size={12} color="#3b82f6" />
          </a>
        )}
      </div>
    </div>
  );
}
