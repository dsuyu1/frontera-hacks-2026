import type { Pool } from 'pg';
import type { SourceRow } from './types';

const YOUTUBE_RSS = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const THUMB = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const EMBED = (id: string) => `https://www.youtube.com/embed/${id}`;
const WATCH = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export function parseYouTubeRss(xml: string): Array<{ videoId: string; title: string; description: string; published: string }> {
  const items: Array<{ videoId: string; title: string; description: string; published: string }> = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const videoId = (/<yt:videoId>([^<]+)<\/yt:videoId>/.exec(block) ?? [])[1];
    const title = (/<title>([^<]+)<\/title>/.exec(block) ?? [])[1];
    const published = (/<published>([^<]+)<\/published>/.exec(block) ?? [])[1];
    const description = (/<media:description>([\s\S]*?)<\/media:description>/.exec(block) ?? [])[1] ?? '';
    if (videoId && title) {
      items.push({ videoId, title: decodeEntities(title), description: description.trim().slice(0, 500), published: published ?? '' });
    }
  }
  return items;
}

export function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export async function ingestYouTubeSource(pool: Pool, source: SourceRow): Promise<{ inserted: number; videoIds: string[] }> {
  const config = source.config as Record<string, string>;
  const channelId = config?.channel_id;
  if (!channelId) return { inserted: 0, videoIds: [] };

  const res = await fetch(YOUTUBE_RSS + channelId, {
    headers: { 'User-Agent': 'FronteraIngest/0.1' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`YouTube RSS ${res.status}: ${res.statusText}`);
  const xml = await res.text();
  const entries = parseYouTubeRss(xml);

  const client = await pool.connect();
  const inserted: string[] = [];

  try {
    await client.query('BEGIN');

    for (const entry of entries.slice(0, 5)) {
      const extId = entry.videoId;

      const dup = await client.query(
        'SELECT id FROM source_items WHERE source_id = $1 AND external_id = $2',
        [source.id, extId],
      );
      if (dup.rowCount! > 0) continue;

      await client.query(
        `INSERT INTO source_items (source_id, external_id, raw_url, raw_title)
         VALUES ($1, $2, $3, $4)`,
        [source.id, extId, WATCH(extId), entry.title],
      );

      const fi = await client.query<{ id: string }>(
        `INSERT INTO feed_items (locality_id, source_id, type, title, summary, categories, jurisdiction, source_url, published_at, thumbnail_url)
         VALUES ($1, $2, 'video', $3, $4, $5::text[], $6, $7, $8, $9)
         RETURNING id`,
        [
          source.locality_id, source.id,
          entry.title, entry.description || null,
          [], `${source.locality_name} (${source.region})`,
          WATCH(extId),
          entry.published ? new Date(entry.published) : null,
          THUMB(extId),
        ],
      );

      const feedItemId = fi.rows[0].id;

      const vid = await client.query<{ id: string }>(
        `INSERT INTO videos (feed_item_id, source_url, embed_url, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id`,
        [feedItemId, WATCH(extId), EMBED(extId)],
      );

      inserted.push(vid.rows[0].id);
    }

    await client.query('UPDATE sources SET last_fetched = now() WHERE id = $1', [source.id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { inserted: inserted.length, videoIds: inserted };
}
