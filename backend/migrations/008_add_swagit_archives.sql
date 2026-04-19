-- Add additional Swagit/Granicus video archives for RGV jurisdictions

INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'swagit',
       src.url,
       jsonb_build_object('label', src.label),
       TRUE
FROM localities l
JOIN (VALUES
  ('McAllen',        'https://mcallentx.new.swagit.com/', 'City of McAllen - Video Archive (Swagit)'),
  ('Edinburg',       'https://edinburgtx.new.swagit.com/', 'City of Edinburg - Video Archive (Swagit)'),
  ('Harlingen',      'https://harlingentx.new.swagit.com/views/690/', 'City of Harlingen - Video Archive (Swagit)'),
  ('Hidalgo County', 'https://hidalgocountytx.new.swagit.com/views/163', 'Hidalgo County - Video Archive (Swagit)')
) AS src(city, url, label) ON src.city = l.city
WHERE NOT EXISTS (
  SELECT 1 FROM sources s WHERE s.locality_id = l.id AND s.url = src.url
);
