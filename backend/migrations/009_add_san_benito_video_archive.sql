-- San Benito (Cameron County) Swagit video archive

INSERT INTO localities (region, county, city, name)
VALUES ('RGV', 'Cameron', 'San Benito', 'San Benito')
ON CONFLICT DO NOTHING;

INSERT INTO sources (locality_id, type, url, config, active)
SELECT l.id,
       'swagit',
       'https://sanbenitotx.new.swagit.com/views/322/commission-meetings',
       jsonb_build_object('label', 'City of San Benito - Commission Meetings (Swagit)'),
       TRUE
FROM localities l
WHERE l.city = 'San Benito'
  AND NOT EXISTS (
    SELECT 1 FROM sources s
    WHERE s.locality_id = l.id AND s.url = 'https://sanbenitotx.new.swagit.com/views/322/commission-meetings'
  );
