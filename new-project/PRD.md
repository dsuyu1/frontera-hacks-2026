# PRD — Local Government News Feed + Auto-Clipped Video Summaries (MVP)

## 1) Overview
Build a “Feedly for local government” app that aggregates public information relevant to a user’s locality and produces a daily feed. For long-form public meeting videos, the app generates short, high-signal clips so users can catch up quickly.

**Initial launch region (MVP):** Rio Grande Valley (RGV), Texas — all counties and all incorporated cities within the RGV.

## 2) Goals
- Provide a daily, locality-scoped feed of important local-government updates.
- Turn long public meeting videos into short, watchable clips that cover the most important topics.
- Allow users to filter the feed by categories (topics) and/or exclude categories.

## 3) Non-Goals (MVP)
- Real-time processing during meetings (batch only).
- Full personalization beyond user-selected categories and chosen locality.
- Editorial human curation.
- Comprehensive coverage of every RGV jurisdiction on day one.

## 4) Target Users
- Residents who want quick awareness of local decisions and developments.
- Local journalists / advocates who want a daily digest.
- Small-business owners tracking permits, development, and incoming companies.

## 5) User Experience (MVP)
### 5.1 Onboarding
- User selects:
  - Location: city / county / region (RGV).
  - Categories of interest (multi-select).

### 5.2 Feed
- Feed shows items scoped to selected location and selected categories.
- Each item includes: title, category tags, jurisdiction, date/time, source, summary.
- If the item has video: user can open and watch the generated clip.

### 5.3 Video Clip Viewing
- Player displays:
  - The clipped segment.
  - Title and short summary.
  - Link to the original full video at the relevant timestamp (if available).
  - Transcript excerpt for the clipped segment (optional in MVP, but preferred).

## 6) Source Scope (Public Only)
MVP supports ingesting from public sources relevant to local government, including:
- Public meeting video sources (e.g., official YouTube channels; publicly accessible hosting platforms).
- Government web pages: agendas, minutes, notices, press releases.
- Public-facing planning/zoning/permits and development notices where accessible.
- Public news sources that provide open access.

**Note:** Source connectors should be extensible so more jurisdictions and platforms can be added incrementally.

## 7) Content Categories (MVP)
Users can filter their feed using categories; categories can be included and/or excluded.

Initial category set (editable):
- Politics & Elections
- City Council / Commission
- Planning & Zoning
- Building & Infrastructure Projects
- Public Safety
- Education
- Transportation
- Utilities & Water
- Economic Development
- Business Openings / Relocations
- Environment
- Budget & Taxes
- Health

## 8) Key Functional Requirements
### 8.1 Locality Model
- The system supports a locality hierarchy:
  - Region (RGV) → county → city (and potentially other jurisdictions).
- Feed queries support locality scoping and optionally multiple selected localities.
- RGV locality coverage (MVP):
  - Counties: all RGV counties.
  - Cities: all incorporated cities within the RGV counties.
  - The locality dataset must be generated from an authoritative public dataset (e.g., US Census TIGER/Line for county and place boundaries) and be refreshable.

### 8.2 Ingestion (Public Sources)
- System discovers and ingests new items daily.
- For each source item:
  - Capture canonical metadata: title, date/time, jurisdiction, source URL, category tags.
  - Store raw content where appropriate (HTML/text) for downstream extraction.

### 8.3 Daily Batch Pipeline
- A scheduled batch runs daily to:
  - Fetch new content from configured sources.
  - Process and publish new feed items.
  - (If video) run transcription + segmentation + clipping.

### 8.4 Video Processing
For each qualifying meeting video:
- Generate a transcript with timestamps.
- Segment into clips with the rule:
  - **1 clip per every 30 minutes of meeting video time**.
  - Example: 2-hour meeting → 4 clips.
- Each clip should represent the “most important” segment in its 30-minute window.
- Clip generation should:
  - Be timestamp-accurate.
  - Include configurable padding (e.g., a few seconds) to avoid abrupt cuts.
- Store and serve clips efficiently (streaming-friendly format).

### 8.5 Topic/Importance Detection
- Within each 30-minute block, identify the most important segment using:
  - Transcript analysis (LLM + heuristics).
  - Signals such as agenda headings (if available), named entities, budget/ordinance/rezoning keywords, public comment spikes.
- Output:
  - Segment start/end timestamps.
  - Clip title.
  - Short summary.
  - Category tags.

### 8.6 Category Filtering
- Feed items and clips are tagged with one or more categories.
- Users can:
  - Select categories they want to see.
  - Optionally exclude categories.
- Filtering applies to both text-only items and video-derived items.

### 8.7 Source Attribution & Traceability
- Every feed item must include:
  - Source URL.
  - Jurisdiction.
  - Date/time.
- Video items must include:
  - Original video link (and deep link to timestamp if possible).

## 9) Data Model (MVP)
Minimum entities:
- User
- Locality (region/county/city)
- Category
- Source (connector configuration)
- FeedItem
  - `type`: text | video
  - `locality_id`, `jurisdiction`, `published_at`
  - `title`, `summary`, `categories[]`, `source_url`
- VideoAsset
  - original video URL, duration, storage references
- Transcript
  - timestamped transcript (format depends on ASR provider)
- Clip
  - `video_asset_id`, `start_time`, `end_time`, `clip_url`, `title`, `summary`, `categories[]`

## 10) APIs (MVP)
- `GET /localities` — list supported RGV localities.
- `GET /categories` — list categories.
- `POST /users/preferences` — set locality + category filters.
- `GET /feed?locality=...&categories=...` — fetch feed items.
- `GET /feed/:id` — fetch item details.
- `GET /clips/:id` — clip metadata + playback URL.

## 11) Operational Requirements
- Batch scheduler runs daily (time configurable).
- Background job system for:
  - ingest
  - transcribe
  - segment
  - clip
  - publish
- Observability:
  - job status tracking
  - failure retries with backoff
  - basic metrics (items ingested/day, clips generated/day, processing time)

## 12) Quality Requirements
### 12.1 Clip Quality
- Clips should be understandable without needing the full meeting.
- Titles must be specific (e.g., “Rezoning vote for X development” vs “Discussion”).
- Summaries should be brief and factual.

### 12.2 Relevance & Noise
- Minimize low-signal clips (e.g., procedural votes) unless they are consequential.
- Avoid duplicative feed items from multiple sources for the same event (basic dedupe).

## 13) Privacy & Compliance
- Only public sources are ingested.
- No sensitive personal data is intentionally collected.
- Respect robots.txt / terms where applicable (connectors should be configurable per source).

## 14) MVP Acceptance Criteria
- User can select an RGV locality + categories and see a daily feed.
- At least one meeting-video source is ingested for the RGV MVP.
- For each ingested meeting video, the system produces **1 clip per 30 minutes** of video.
- Each clip has a title + summary + category tags and plays successfully.
- Each feed item links back to the original public source.

## 15) Open Questions
- Which authoritative dataset will define “RGV counties” for this product (common definitions differ; confirm county list used for inclusion)?
- What minimum set of sources should define “good coverage” for MVP?
- Which ASR and LLM providers will be used initially (cost/latency constraints)?
- Should clips be hard-capped in length (e.g., 45–120 seconds) even if the “important” segment runs longer?
