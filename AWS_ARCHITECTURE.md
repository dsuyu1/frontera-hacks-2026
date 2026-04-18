# AWS Architecture (Serverless-First) — RGV Local Gov Feed + Auto-Clipped Video

## Goals
- Run a daily batch pipeline that ingests public sources (direct MP4 streams and YouTube), generates transcripts, selects key segments (1 per 30 minutes), clips video, and publishes a locality/category-filtered feed.
- Keep operations lightweight (managed services, minimal servers).

## High-Level Components
- **Web app + API**
  - Option A (fastest): `Next.js` on Vercel + API routes calling AWS.
  - Option B (AWS-only): `Amplify Hosting` for Next.js + `API Gateway` + `Lambda` for backend.
- **Auth (optional for MVP)**: `Amazon Cognito` (User Pool).
- **Metadata DB**: `Amazon RDS (Postgres)`.
- **Object storage**: `Amazon S3` for:
  - raw fetched documents
  - raw video files (when needed)
  - transcript JSON
  - generated clips
- **CDN**: `CloudFront` in front of the clips bucket.
- **Orchestration**: `EventBridge` (daily schedule) → `Step Functions` (pipeline state machine).
- **Compute for jobs**
  - `Lambda` for lightweight steps (fetch RSS/pages, parse metadata, enqueue work).
  - `ECS Fargate` for heavy/long-running steps (YouTube download, ffmpeg clipping, large video fetch/processing).
- **Transcription**: `Amazon Transcribe` (timestamped output).
- **LLM for segmentation/summaries**: `Amazon Bedrock` (primary) or external LLM API.
- **Observability**: `CloudWatch Logs`, `CloudWatch Metrics`, `X-Ray` (optional).

## Daily Batch Pipeline
### Trigger
- `EventBridge` rule triggers once daily (e.g., 03:00 local).

### Orchestration
- `Step Functions` runs a single “daily batch” workflow.

### Workflow Stages
1. **Ingest Sources** (Lambda)
   - For each configured source connector (city/county websites, meeting portals, YouTube channels, RSS):
     - Discover new items since last run.
     - Write/update `SourceItem` + `FeedItem` records in Postgres.
     - Persist raw HTML/JSON snapshots to S3 (optional but useful).

2. **Video Acquisition** (branch)
   - **Direct MP4/stream fetch**
     - If the source provides a stable downloadable URL, proceed to transcription.
     - If downloading is required (no reliable byte-range or Transcribe needs file), run an **ECS Fargate** task to download to S3.
   - **YouTube**
     - Run an **ECS Fargate** task to download video/audio to S3 (using `yt-dlp` inside the container).
     - Store the original YouTube URL for attribution and deep-linking.

3. **Transcription** (Step Functions + Transcribe)
   - Start `Amazon Transcribe` job (prefer audio-only if extracted).
   - Poll for completion.
   - Store transcript JSON in S3.
   - Persist normalized transcript (utterances/words with timestamps) to Postgres (or keep in S3 and cache key fields in DB).

4. **Segment Selection (1 clip per 30 minutes)** (Lambda)
   - Determine the meeting duration.
   - Divide into contiguous 30-minute windows.
   - For each window:
     - Send transcript slice to LLM (Bedrock) + heuristics to choose best segment.
     - Output `start_time`, `end_time`, `title`, `summary`, `categories`.
   - Apply padding (e.g., -3s/+5s) and clamp to [0, duration].

5. **Clip Generation** (ECS Fargate)
   - For each selected segment:
     - Run `ffmpeg` to cut the clip from the source video.
     - Output H.264/AAC MP4 optimized for streaming.
     - Upload to S3 clips bucket.
   - Optional later: burn-in captions or provide WebVTT sidecar.

6. **Publish** (Lambda)
   - Create/Update DB rows for `Clip` and feed entries.
   - Mark items ready for the feed.

## Data Storage Layout (S3)
- `s3://<bucket>/raw/sources/<source_id>/<date>/...` (optional snapshots)
- `s3://<bucket>/raw/video/<video_id>/original.*`
- `s3://<bucket>/transcripts/<video_id>/transcribe.json`
- `s3://<bucket>/clips/<video_id>/<clip_id>.mp4`
- `s3://<bucket>/clips/<video_id>/<clip_id>.vtt` (optional)

## Database (RDS Postgres) — Minimal Tables
- `localities` (region/county/city)
- `categories`
- `sources` (connector configs)
- `source_items` (discovered raw items)
- `videos` (meeting video metadata)
- `transcripts` (pointers + key fields)
- `clips` (start/end, title/summary, s3 key, categories)
- `feed_items` (user-facing items)

## API Surface (Example)
- `GET /localities`
- `GET /categories`
- `GET /feed?locality=...&categories=...`
- `GET /clips/:id` (returns CloudFront URL + metadata)

## Security / IAM
- Use least-privilege IAM roles per component:
  - Lambda role: read connector configs, write DB, read/write specific S3 prefixes, start Transcribe jobs.
  - Fargate task role: read source video from S3 or remote URL, write clip outputs to S3.
  - Step Functions role: invoke Lambdas, run ECS tasks, start/poll Transcribe.
- S3:
  - private buckets; CloudFront uses Origin Access Control (OAC).
  - signed URLs (optional) if clips should be gated behind auth.

## Cost/Scaling Notes
- **Transcribe** is typically the main variable cost driver; control by limiting meeting sources, audio extraction, and batching.
- **Fargate + ffmpeg** cost depends on clip volume and source video size; clip only what’s needed.
- Prefer storing **clips** long-term; optionally expire raw originals after a retention period.

## YouTube + Direct Fetch Notes
- YouTube downloads are handled in container tasks (Fargate) due to:
  - longer runtime than Lambda
  - additional binaries (`yt-dlp`, ffmpeg)
- Direct fetch can start in Lambda for discovery/metadata, then switch to Fargate when file handling is required.

## Future Enhancements
- Per-agenda-item clips (beyond 1/30-minute rule).
- Better dedupe across sources and jurisdictions.
- Captioning and multilingual summaries.
- Search (OpenSearch / vector search) and alerting.
