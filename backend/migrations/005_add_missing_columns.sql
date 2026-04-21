-- Add columns present in application code but missing from the initial schema.
-- All use IF NOT EXISTS so re-running is safe.

-- feed_items: thumbnail image URL (used by both RSS and YouTube ingest)
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- videos: S3 key for the downloaded caption/VTT file (written by video-acquire)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS caption_s3_key TEXT;

-- videos: YouTube embed URL (written by YouTube ingest, read by segment handler)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_url TEXT;

-- transcripts: Transcribe job name (needed for polling job status)
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS job_name TEXT;

-- clips: YouTube embed URL with timestamp params (written by segment, served to VideoPlayer)
ALTER TABLE clips ADD COLUMN IF NOT EXISTS embed_url TEXT;

-- clips: status index (improves publish and api queries filtering by status)
CREATE INDEX IF NOT EXISTS clips_status_idx ON clips (video_id, status);
