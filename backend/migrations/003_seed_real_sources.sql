-- Remove placeholder GitHub node feeds from migration 002
DELETE FROM sources
WHERE url = 'https://github.com/nodejs/node/releases.atom';

-- ValleyCentral (KVEO-TV 23) — active RGV news covering all three cities
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'rss',
       'https://www.valleycentral.com/feed/',
       jsonb_build_object('label', 'ValleyCentral - RGV News'),
       TRUE
FROM localities l
WHERE l.city IN ('Edinburg', 'McAllen', 'Mission');

-- Hidalgo County official feeds (Edinburg is the county seat)
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'rss',
       feed.url,
       jsonb_build_object('label', feed.label),
       TRUE
FROM localities l
CROSS JOIN (VALUES
  ('https://www.hidalgocounty.us/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml',    'Hidalgo County - News Flash'),
  ('https://www.hidalgocounty.us/RSSFeed.aspx?ModID=63&CID=Public-Notice-4',     'Hidalgo County - Public Notices'),
  ('https://www.hidalgocounty.us/RSSFeed.aspx?ModID=63&CID=HCHHHSPublic-Health-Alerts-3', 'Hidalgo County - Health Alerts')
) AS feed(url, label)
WHERE l.city = 'Edinburg';
