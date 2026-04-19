CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      TEXT PRIMARY KEY,
  display_name TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_followed_sources (
  user_id    TEXT NOT NULL,
  domain     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, domain)
);
