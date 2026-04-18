import { createHash } from 'crypto';
import Parser from 'rss-parser';
import type { Pool, PoolClient } from 'pg';
import type { SourceRow } from './types';

const FETCH_TIMEOUT_MS = 30_000;
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
    ],
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractThumbnail(item: any): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url;
  if (item.mediaThumbnail?.$.url) return item.mediaThumbnail.$.url;
  if (item.mediaContent?.$.url && item.mediaContent.$.medium !== 'audio' && item.mediaContent.$.medium !== 'video') return item.mediaContent.$.url;
  const html = item['content:encoded'] || item.content || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'FronteraIngest/0.1' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      ?? html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function externalIdForItem(guid: string | undefined, link: string): string {
  if (guid && guid.trim()) return guid.trim();
  return createHash('sha256').update(link).digest('hex');
}

function jurisdictionLabel(row: SourceRow): string {
  if (row.county) {
    return `${row.locality_name}, ${row.county} County (${row.region})`;
  }
  return `${row.locality_name} (${row.region})`;
}

export async function fetchRssXml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'FronteraIngest/0.1' },
    });
    if (!res.ok) {
      throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function ingestRssForSource(client: PoolClient, source: SourceRow, xml: string): Promise<number> {
  const feed = await parser.parseString(xml);
  const items = feed.items ?? [];
  let inserted = 0;

  for (const item of items) {
    const link = item.link?.trim();
    if (!link) continue;

    const extId = externalIdForItem(
      typeof item.guid === 'string' ? item.guid : item.guid ? String(item.guid) : undefined,
      link,
    );
    const title = item.title?.trim() || link;
    const summary = (item.contentSnippet || item.summary || '').trim() || null;
    let publishedAt: Date | null = null;
    if (item.pubDate) {
      const d = new Date(item.pubDate);
      if (!Number.isNaN(d.getTime())) publishedAt = d;
    }

    // Skip if a story with the same title already exists (cross-source dedup)
    const existing = await client.query(
      `SELECT 1 FROM feed_items WHERE lower(left(title, 80)) = lower(left($1, 80)) LIMIT 1`,
      [title],
    );
    if ((existing.rowCount ?? 0) > 0) continue;

    const ins = await client.query<{ id: string }>(
      `INSERT INTO source_items (source_id, external_id, raw_url, raw_title)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_id, external_id) DO NOTHING
       RETURNING id`,
      [source.id, extId, link, title],
    );

    if (ins.rowCount === 0) continue;

    let thumbnailUrl = extractThumbnail(item);
    // Fall back to OG image scrape if no thumbnail in feed
    if (!thumbnailUrl) {
      thumbnailUrl = await fetchOgImage(link);
    }
    await client.query(
      `INSERT INTO feed_items (locality_id, source_id, type, title, summary, categories, jurisdiction, source_url, published_at, thumbnail_url)
       VALUES ($1, $2, 'text', $3, $4, $5::text[], $6, $7, $8, $9)`,
      [
        source.locality_id,
        source.id,
        title,
        summary,
        [] as string[],
        jurisdictionLabel(source),
        link,
        publishedAt,
        thumbnailUrl,
      ],
    );
    inserted += 1;
  }

  return inserted;
}

export async function ingestRssSource(pool: Pool, source: SourceRow, xml: string): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const n = await ingestRssForSource(client, source, xml);
    await client.query(`UPDATE sources SET last_fetched = now() WHERE id = $1`, [source.id]);
    await client.query('COMMIT');
    return n;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
