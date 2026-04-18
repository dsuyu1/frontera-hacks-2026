import { withClient } from '../lib/db';

interface Event { video_id: string }

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: pendingClips } = await db.query(
      "SELECT * FROM clips WHERE video_id = $1 AND status = 'pending'",
      [video_id],
    );

    if (pendingClips.length === 0) return { video_id, clipped: 0 };

    for (const clip of pendingClips) {
      // For YouTube-sourced videos, embed_url is already set by segment step.
      // Just mark the clip as ready (no ffmpeg clipping needed).
      await db.query(
        "UPDATE clips SET status = 'ready' WHERE id = $1",
        [clip.id],
      );
    }

    return { video_id, clipped: pendingClips.length };
  });
};
