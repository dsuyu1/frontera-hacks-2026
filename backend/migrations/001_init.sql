-- Frontera MVP schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE localities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region     TEXT NOT NULL,          -- e.g. 'RGV'
  county     TEXT,                   -- e.g. 'Hidalgo'
  city       TEXT NOT NULL,          -- e.g. 'Edinburg'
  name       TEXT NOT NULL,          -- display name
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id  UUID REFERENCES localities(id),
  type         TEXT NOT NULL,   -- 'youtube' | 'rss' | 'webpage'
  url          TEXT NOT NULL,
  config       JSONB DEFAULT '{}',
  active       BOOLEAN DEFAULT TRUE,
  last_fetched TIMESTAMPTZ
);

CREATE TABLE source_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   UUID REFERENCES sources(id),
  external_id TEXT,
  raw_url     TEXT NOT NULL,
  raw_title   TEXT,
  fetched_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE feed_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_id  UUID REFERENCES localities(id),
  source_id    UUID REFERENCES sources(id),
  type         TEXT NOT NULL,   -- 'text' | 'video'
  title        TEXT NOT NULL,
  summary      TEXT,
  categories   TEXT[] DEFAULT '{}',
  jurisdiction TEXT,
  source_url   TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON feed_items (locality_id, published_at DESC);
CREATE INDEX ON feed_items USING GIN (categories);

CREATE TABLE videos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID REFERENCES feed_items(id),
  source_url   TEXT NOT NULL,   -- original YouTube / MP4 URL
  duration_s   INT,
  s3_key       TEXT,            -- raw/video/<id>/original.*
  status       TEXT DEFAULT 'pending'  -- pending | downloaded | transcribed | clipped
);

CREATE TABLE transcripts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID REFERENCES videos(id),
  s3_key     TEXT NOT NULL,    -- transcripts/<video_id>/transcribe.json
  status     TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  done_at    TIMESTAMPTZ
);

CREATE TABLE clips (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID REFERENCES videos(id),
  start_time_s NUMERIC NOT NULL,
  end_time_s   NUMERIC NOT NULL,
  title        TEXT NOT NULL,
  summary      TEXT,
  categories   TEXT[] DEFAULT '{}',
  s3_key       TEXT,           -- clips/<video_id>/<clip_id>.mp4
  status       TEXT DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Seed localities (MVP)
INSERT INTO localities (region, county, city, name) VALUES
  ('RGV', 'Hidalgo', 'Edinburg', 'Edinburg'),
  ('RGV', 'Hidalgo', 'McAllen',  'McAllen'),
  ('RGV', 'Hidalgo', 'Mission',  'Mission');

-- Seed categories (MVP)
INSERT INTO categories (slug, name) VALUES
  ('politics-elections',       'Politics & Elections'),
  ('city-council',             'City Council / Commission'),
  ('planning-zoning',          'Planning & Zoning'),
  ('infrastructure',           'Building & Infrastructure Projects'),
  ('public-safety',            'Public Safety'),
  ('education',                'Education'),
  ('transportation',           'Transportation'),
  ('utilities-water',          'Utilities & Water'),
  ('economic-development',     'Economic Development'),
  ('business',                 'Business Openings / Relocations'),
  ('environment',              'Environment'),
  ('budget-taxes',             'Budget & Taxes'),
  ('health',                   'Health');
