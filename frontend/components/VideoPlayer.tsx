'use client';
import { Clip, clipUrl } from '@/lib/api';

interface Props { clip: Clip }

function formatTime(s: number): string {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({ clip }: Props) {
  const url = clip.playback_url ?? (clip.s3_key ? clipUrl(clip.s3_key) : null);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-950">
      {url ? (
        <video
          controls
          preload="metadata"
          className="w-full aspect-video object-cover"
          src={url}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="w-full aspect-video flex items-center justify-center">
          <p className="text-gray-500 text-sm">Video processing...</p>
        </div>
      )}

      <div className="px-4 py-3 bg-gray-950 text-white">
        <p className="font-medium text-sm mb-0.5">{clip.title}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{formatTime(clip.start_time_s)} – {formatTime(clip.end_time_s)}</span>
          <span>·</span>
          <span>{Math.round(clip.end_time_s - clip.start_time_s)}s clip</span>
        </div>
        {clip.summary && <p className="text-xs text-gray-400 mt-1">{clip.summary}</p>}
      </div>
    </div>
  );
}
