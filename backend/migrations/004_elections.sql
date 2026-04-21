CREATE TABLE election_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE election_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES election_sources(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  next_election_date DATE,
  early_voting_start DATE,
  early_voting_end DATE,
  raw_excerpt TEXT,
  UNIQUE (source_id)
);

INSERT INTO election_sources (slug, name, url) VALUES
  ('hidalgocounty', 'Hidalgo County Elections', 'https://www.hidalgocounty.us/3473/May-2-2026-Local-Entities-Elections'),
  ('cameroncounty', 'Cameron County Elections', 'https://www.cameroncountytx.gov/elections/'),
  ('starrcounty', 'Starr County Elections', 'https://www.co.starr.tx.us/page/starr.Elections'),
  ('willacycounty', 'Willacy County Elections', 'https://www.co.willacy.tx.us/page/willacy.Elections');

