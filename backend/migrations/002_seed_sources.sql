-- Seed RSS sources for MVP localities (replace URLs with official city/county feeds when confirmed).

INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'rss',
       -- Stable public Atom feed for integration testing; TODO: swap per city for real .gov / meeting-portal RSS.
       'https://github.com/nodejs/node/releases.atom',
       '{}'::jsonb,
       TRUE
FROM localities l
WHERE l.city IN ('Edinburg', 'McAllen', 'Mission');
