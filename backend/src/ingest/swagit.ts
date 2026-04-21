import type { Pool, PoolClient } from 'pg';
import type { SourceRow } from './types';

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseDateFromTitle(title: string): Date | null {
  const m = title.match(/\b([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})\b/);
  if (!m) return null;
  const date = new Date(`${m[1]} ${m[2]} ${m[3]}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`swagit fetch ${res.status}: ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function parseVideoIdsFromListing(html: string): Array<{ id: string; label: string | null }> {
  const out: Array<{ id: string; label: string | null }> = [];
  const seen = new Set<string>();

  const rx = /<a[^>]+href="\/videos\/(\d+)"[^>]*>([^<]{1,200})<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const label = decodeEntities(m[2]);
    out.push({ id, label: label || null });
  }

  return out;
}

function extractEmbedUrl(html: string): string | null {
  // og:video:url is the canonical video stream/embed URL
  const ogVideoUrl =
    /<meta[^>]+property=["']og:video:url["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:url["']/i.exec(html)?.[1];
  if (ogVideoUrl) return ogVideoUrl;

  const ogVideo =
    /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i.exec(html)?.[1];
  if (ogVideo) return ogVideo;

  // Some Granicus pages embed the player in an iframe
  const iframeSrc = /<iframe[^>]+src=["']([^"']*(?:player|media|granicus|swagit)[^"']*)/i.exec(html)?.[1];
  if (iframeSrc) return iframeSrc;

  return null;
}

async function upsertVideoFromSwagit(client: PoolClient, source: SourceRow, videoId: string): Promise<boolean> {
  const dup = await client.query(
    'SELECT id FROM source_items WHERE source_id = $1 AND external_id = $2',
    [source.id, videoId],
  );
  if (dup.rowCount && dup.rowCount > 0) return false;

  const videoUrl = new URL(`/videos/${videoId}`, source.url).toString();

  const pageHtml = await fetchHtml(videoUrl);
  const ogTitle = (/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(pageHtml) ?? [])[1];
  const pageTitle = (/<title>([^<]+)<\/title>/i.exec(pageHtml) ?? [])[1];
  const title = decodeEntities(ogTitle || pageTitle || `Meeting ${videoId}`);
  const publishedAt = parseDateFromTitle(title);

  // Try to extract a real embeddable URL from the page; don't store the page URL itself
  const embedUrl = extractEmbedUrl(pageHtml);

  await client.query(
    `INSERT INTO source_items (source_id, external_id, raw_url, raw_title)
     VALUES ($1, $2, $3, $4)`,
    [source.id, videoId, videoUrl, title],
  );

  const fi = await client.query<{ id: string }>(
    `INSERT INTO feed_items (locality_id, source_id, type, title, summary, categories, jurisdiction, source_url, published_at, thumbnail_url)
     VALUES ($1, $2, 'video', $3, NULL, $4::text[], $5, $6, $7, NULL)
     RETURNING id`,
    [
      source.locality_id,
      source.id,
      title,
      [] as string[],
      `${source.locality_name} (${source.region})`,
      videoUrl,
      publishedAt,
    ],
  );

  const feedItemId = fi.rows[0].id;

  await client.query(
    `INSERT INTO videos (feed_item_id, source_url, embed_url, status)
     VALUES ($1, $2, $3, 'published')`,
    [feedItemId, videoUrl, embedUrl],
  );

  return true;
}

export async function ingestSwagitSource(pool: Pool, source: SourceRow): Promise<number> {
  const listingHtml = await fetchHtml(source.url);
  const items = parseVideoIdsFromListing(listingHtml).slice(0, 10);

  if (!items.length) return 0;

  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');
    for (const item of items) {
      const didInsert = await upsertVideoFromSwagit(client, source, item.id);
      if (didInsert) inserted += 1;
    }
    await client.query('UPDATE sources SET last_fetched = now() WHERE id = $1', [source.id]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return inserted;
}
