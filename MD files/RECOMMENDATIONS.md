# Recommendations (MVP+)

## Goal
Improve feed ranking based on what a user actually engages with (clicks, watch time), while respecting locality scope and category filters.

## Inputs (Implicit Feedback)
Track events:
- `impression` (item shown)
- `open` (click/tap into item)
- `watch_time_ms`
- `completion_ratio` (0–1)
- `save` / `share`
- `hide` / `not_interested`

Store: `user_id`, `item_id`, `timestamp`, `locality_id`, `categories[]`, and optionally `clip_id`.

## Candidate Set
- Filter first by:
  - user-selected locality scope
  - included/excluded categories
  - recency window (e.g., last N days)

## Baseline Ranker (simple + effective)
Maintain per-user rolling weights:
- `category_weight[category]`
- `entity_weight[entity]` (optional; entities extracted from items)

Update rule (example):
- On `open`: `category_weight[c] += 1`
- On watch: `category_weight[c] += 2 * completion_ratio`
- On `hide`: `category_weight[c] -= 2`

Scoring (example):
- `score(item) = 0.5*category_match + 0.2*entity_match + 0.3*recency_boost`

## Bedrock-Enhanced Ranker (recommended)
### 1) Content understanding
Use Bedrock LLM to extract consistent:
- categories
- entities (people/orgs/places)
- topics (e.g., rezoning, bond, developer, road project)

### 2) Embeddings
Use `Titan Embeddings` to generate vectors for:
- **Item embedding**: `title + summary + transcript highlights`
- **User profile embedding**: rolling average (or EMA) of embeddings from items the user opened/watched/saved

### 3) Ranking
Combine similarity + business rules:
- `score = 0.6*cosine(user_embedding, item_embedding) + 0.3*category_match + 0.1*recency_boost`
- Add exploration: small % of diverse items for learning.

## Storage
- Enable `pgvector` on RDS Postgres (`CREATE EXTENSION vector`).
- Add `embedding vector(1536)` column to `feed_items` and `user_profiles` (Titan Embeddings V2 outputs 1536 dims).
- `user_profiles` table: `profile_embedding`, `category_weights` (JSONB), `updated_at`.
- `user_events` table: append-only — `user_id`, `item_id`, `event_type`, `value`, `timestamp`.
- Scale path: migrate to `Amazon OpenSearch Serverless` (vector engine) when RDS vector search becomes a bottleneck (typically >1M items).

## Notes
- Always keep locality/category filtering as a hard constraint (ranking only within the allowed set).
- Start with baseline ranker, then add embeddings once you have enough interaction data.
