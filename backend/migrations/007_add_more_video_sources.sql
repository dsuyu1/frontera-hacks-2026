-- Add more official government video sources (YouTube + Swagit/Granicus archives)

-- Cameron County locality (for Commissioners Court Swagit archive)
INSERT INTO localities (region, county, city, name)
VALUES ('RGV', 'Cameron', 'Cameron County', 'Cameron County')
ON CONFLICT DO NOTHING;

-- Official city/county YouTube channels
WITH src(city, channel_id, label) AS (
  VALUES
    ('Pharr',       'UCFMj5UoRnvp1ZPMQMzb2q5A', 'City of Pharr - Commission Meetings'),
    ('Weslaco',     'UCUlli-W66g1cJpYvcLEFuig', 'City of Weslaco - Commission Meetings'),
    ('San Juan',    'UCfkfdJ75zkakmoKC4hfw0Jw', 'City of San Juan - Commission Meetings'),
    ('Alamo',       'UCA0Akq-kHpxqfuO33HuLy8g', 'City of Alamo - Commission Meetings'),
    ('Harlingen',   'UCn-DXucFiOV7sHe6CZJu6_w', 'City of Harlingen - Commission Meetings'),
    ('Brownsville', 'UCzFDVupMObHNFCqQQAvx-pw', 'City of Brownsville - Commission Meetings')
)
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'youtube_channel',
       'https://www.youtube.com/channel/' || src.channel_id,
       jsonb_build_object('label', src.label, 'channel_id', src.channel_id),
       TRUE
FROM localities l
JOIN src ON src.city = l.city
WHERE NOT EXISTS (
  SELECT 1 FROM sources s WHERE s.locality_id = l.id AND s.url = 'https://www.youtube.com/channel/' || src.channel_id
);

-- Swagit (Granicus) official video archive
INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'swagit',
       'https://cameroncountytx.new.swagit.com/views/default/',
       jsonb_build_object('label', 'Cameron County - Video Archive (Swagit)'),
       TRUE
FROM localities l
WHERE l.city = 'Cameron County'
  AND NOT EXISTS (
    SELECT 1 FROM sources s
    WHERE s.locality_id = l.id AND s.url = 'https://cameroncountytx.new.swagit.com/views/default/'
  );
