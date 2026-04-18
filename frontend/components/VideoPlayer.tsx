'use client';
import { Clip } from '@/lib/api';

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({ clip }: { clip: Clip }) {
  const embedUrl = clip.embed_url ?? (clip.s3_key ? null : null);
  if (!embedUrl && !clip.s3_key) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#52525b', fontSize: 13 }}>
        Video processing…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {embedUrl ? (
        <iframe
          className="yt-embed"
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : clip.playback_url ? (
        <video controls preload="metadata" style={{ width: '100%', borderRadius: 8, background: '#000' }}>
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
            style={{ fontSize: 12, color: '#3b82f6' }}
          >
            Watch on YouTube ↗
          </a>
        )}
      </div>
    </div>
  );
}
