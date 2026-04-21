-- Expand coverage: more RGV localities, more RSS feeds, YouTube channel stubs.

-- ── Additional localities ────────────────────────────────────────────────────
INSERT INTO localities (region, county, city, name) VALUES
  ('RGV', 'Hidalgo', 'Pharr',          'Pharr'),
  ('RGV', 'Hidalgo', 'Weslaco',        'Weslaco'),
  ('RGV', 'Hidalgo', 'San Juan',       'San Juan'),
  ('RGV', 'Hidalgo', 'Alamo',          'Alamo'),
  ('RGV', 'Hidalgo', 'Hidalgo County', 'Hidalgo County'),
  ('RGV', 'Cameron', 'Brownsville',    'Brownsville'),
  ('RGV', 'Cameron', 'Harlingen',      'Harlingen')
ON CONFLICT DO NOTHING;

-- ── The Monitor — McAllen's daily newspaper ──────────────────────────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', 'https://www.themonitor.com/feed/',
       jsonb_build_object('label', 'The Monitor'), TRUE
FROM localities l WHERE l.city = 'McAllen';

-- ── Rio Grande Guardian — RGV border / government news ──────────────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', 'https://riograndeguardian.com/feed/',
       jsonb_build_object('label', 'Rio Grande Guardian'), TRUE
FROM localities l WHERE l.city IN ('Edinburg', 'McAllen', 'Mission', 'Hidalgo County');

-- ── Texas Tribune — statewide coverage with strong RGV presence ─────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', 'https://www.texastribune.org/feed/',
       jsonb_build_object('label', 'Texas Tribune'), TRUE
FROM localities l WHERE l.city IN ('Edinburg', 'Hidalgo County');

-- ── Valley Morning Star — Harlingen / Lower RGV ─────────────────────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', 'https://www.valleymorningstar.com/feed/',
       jsonb_build_object('label', 'Valley Morning Star'), TRUE
FROM localities l WHERE l.city = 'Harlingen';

-- ── Brownsville Herald ───────────────────────────────────────────────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', 'https://www.brownsvilleherald.com/feed/',
       jsonb_build_object('label', 'Brownsville Herald'), TRUE
FROM localities l WHERE l.city = 'Brownsville';

-- ── Extra Hidalgo County official feeds ─────────────────────────────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', feed.url, jsonb_build_object('label', feed.label), TRUE
FROM localities l
CROSS JOIN (VALUES
  ('https://www.hidalgocounty.us/RSSFeed.aspx?ModID=1&CID=All-0',
   'Hidalgo County - All Departments'),
  ('https://www.hidalgocounty.us/RSSFeed.aspx?ModID=63&CID=Budget-Finance-2',
   'Hidalgo County - Budget & Finance'),
  ('https://www.hidalgocounty.us/RSSFeed.aspx?ModID=63&CID=Road-Bridge-5',
   'Hidalgo County - Road & Bridge')
) AS feed(url, label)
WHERE l.city = 'Hidalgo County';

-- ── ValleyCentral / KVEO-TV 23 extended to new localities ───────────────────
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'rss', 'https://www.valleycentral.com/feed/',
       jsonb_build_object('label', 'ValleyCentral - RGV News'), TRUE
FROM localities l
WHERE l.city IN ('Pharr', 'Weslaco', 'Brownsville', 'Harlingen', 'Hidalgo County');

-- ── YouTube channel sources (channel IDs verified via web search April 2026) ──
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id, 'youtube_channel',
       'https://www.youtube.com/channel/' || src.channel_id,
       jsonb_build_object('label', src.label, 'channel_id', src.channel_id),
       TRUE
FROM localities l
JOIN (VALUES
  -- Government / city council channels
  ('McAllen',        'UCJtB7XWSwft6zsvVe599Igw', 'City of McAllen - Council Meetings'),
  ('Edinburg',       'UCS4M_3z2O5g5pg6mxG9KDdQ', 'City of Edinburg - Council Meetings'),
  ('Mission',        'UCha07JnlG0muI97kb9u0Iig', 'City of Mission - Council Meetings'),
  ('Hidalgo County', 'UC6TaYtcc4hbJPaXt6SHmyyQ', 'Hidalgo County - Commissioner Court'),
  ('Brownsville',    'UCaRKXG6tf2ZAHUBXwUVED0Q', 'City of Brownsville - Commission Meetings'),
  -- Local TV news channels
  ('McAllen',        'UCNdIF2yfzHtRyfKI6mPWf3A', 'KVEO NBC 23 - ValleyCentral News'),
  ('Harlingen',      'UCYzSBNey7F3Uwf9Vkg7cK5w', 'CBS 4 News Rio Grande Valley'),
  ('Edinburg',       'UCoDyBtyP-3WC6z56EMMnj6A', 'KRGV Channel 5 News RGV')
) AS src(city, channel_id, label) ON l.city = src.city;
