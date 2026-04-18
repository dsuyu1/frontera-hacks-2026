import { execSync } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

interface Source {
  id: string;
  locality_id: string;
  type: string;
  url: string;
  config: Record<string, unknown>;
}

interface IngestResult {
  sources_processed: number;
  feed_items_created: number;
  videos_queued: string[];
}

export const handler = async (): Promise<IngestResult> => {
  return withClient(async (db) => {
    const { rows: sources } = await db.query<Source>(
      "SELECT * FROM sources WHERE active = true ORDER BY last_fetched ASC NULLS FIRST",
    );

    let feedItemsCreated = 0;
    const videosQueued: string[] = [];

    for (const source of sources) {
      try {
        if (source.type === 'youtube_channel') {
          const videoIds = await discoverYouTubeVideos(source);
          for (const vid of videoIds) {
            const feedItemId = await createVideoFeedItem(db, source, vid);
            if (feedItemId) {
              videosQueued.push(feedItemId);
              feedItemsCreated++;
            }
          }
        } else if (source.type === 'webpage') {
          const items = await scrapeWebpage(source);
          for (const item of items) {
            const created = await createTextFeedItem(db, source, item);
            if (created) feedItemsCreated++;
          }
        }

        await db.query('UPDATE sources SET last_fetched = now() WHERE id = $1', [source.id]);
      } catch (err) {
        console.error(`Failed to ingest source ${source.id} (${source.url}):`, err);
      }
    }

    return { sources_processed: sources.length, feed_items_created: feedItemsCreated, videos_queued: videosQueued };
  });
};

async function discoverYouTubeVideos(source: Source): Promise<Array<{ videoId: string; title: string; url: string; publishedAt: string }>> {
  const maxVideos = (source.config.max_videos as number) ?? 5;
  const ytdlp = '/opt/bin/yt-dlp';

  const output = execSync(
    `${ytdlp} --flat-playlist --print "%(id)s|||%(title)s|||%(upload_date)s" --no-warnings --playlist-end ${maxVideos} "${source.url}" 2>/dev/null`,
    { timeout: 60_000, encoding: 'utf8' },
  ).trim();

  return output.split('\n').filter(Boolean).map((line) => {
    const [videoId, title, uploadDate] = line.split('|||');
    const y = uploadDate.slice(0, 4), m = uploadDate.slice(4, 6), d = uploadDate.slice(6, 8);
    return { videoId, title, url: `https://www.youtube.com/watch?v=${videoId}`, publishedAt: `${y}-${m}-${d}` };
  });
}

async function createVideoFeedItem(db: PoolClient, source: Source, vid: { videoId: string; title: string; url: string; publishedAt: string }): Promise<string | null> {
  const { rows: existing } = await db.query(
    "SELECT id FROM source_items WHERE source_id = $1 AND external_id = $2",
    [source.id, vid.videoId],
  );
  if (existing.length > 0) return null;

  const { rows: [feedItem] } = await db.query(
    `INSERT INTO feed_items (locality_id, source_id, type, title, categories, jurisdiction, source_url, published_at)
     VALUES ($1, $2, 'video', $3, '{city-council}', (SELECT city FROM localities WHERE id = $1), $4, $5)
     RETURNING id`,
    [source.locality_id, source.id, vid.title, vid.url, vid.publishedAt],
  );

  const { rows: [video] } = await db.query(
    "INSERT INTO videos (feed_item_id, source_url, status) VALUES ($1, $2, 'pending') RETURNING id",
    [feedItem.id, vid.url],
  );

  await db.query(
    "INSERT INTO source_items (source_id, external_id, raw_url, raw_title) VALUES ($1, $2, $3, $4)",
    [source.id, vid.videoId, vid.url, vid.title],
  );

  // Save raw snapshot to S3
  const snapshot = JSON.stringify({ ...vid, locality_id: source.locality_id });
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `raw/sources/${source.id}/${new Date().toISOString().slice(0, 10)}/${vid.videoId}.json`,
    Body: snapshot,
    ContentType: 'application/json',
  }));

  return video.id;
}

interface ScrapedItem {
  title: string;
  url: string;
  publishedAt: string;
  snippet: string;
}

async function scrapeWebpage(source: Source): Promise<ScrapedItem[]> {
  const response = await fetch(source.url, {
    headers: { 'User-Agent': 'FronteraBot/1.0 (+https://frontera.app/bot)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return [];

  const html = await response.text();
  // Simple regex-based link extraction — look for agenda/minute PDF links
  const linkPattern = /<a[^>]+href="([^"]+(?:agenda|minute|notice|ordinance)[^"]*)"[^>]*>([^<]+)</gi;
  const items: ScrapedItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null && items.length < 20) {
    let href = match[1];
    const text = match[2].trim();
    if (!text || text.length < 5) continue;
    if (!href.startsWith('http')) href = new URL(href, source.url).href;
    items.push({ title: text, url: href, publishedAt: new Date().toISOString().slice(0, 10), snippet: '' });
  }

  return items;
}

async function createTextFeedItem(db: PoolClient, source: Source, item: ScrapedItem): Promise<boolean> {
  const { rows: existing } = await db.query(
    "SELECT id FROM feed_items WHERE source_id = $1 AND source_url = $2",
    [source.id, item.url],
  );
  if (existing.length > 0) return false;

  await db.query(
    `INSERT INTO feed_items (locality_id, source_id, type, title, summary, categories, jurisdiction, source_url, published_at)
     VALUES ($1, $2, 'text', $3, $4, '{city-council}', (SELECT city FROM localities WHERE id = $1), $5, $6)`,
    [source.locality_id, source.id, item.title, item.snippet || null, item.url, item.publishedAt],
  );
  return true;
}
