import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { withClient } from '../lib/db';

function json(status: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const qs = event.queryStringParameters ?? {};

  if (method === 'OPTIONS') return json(204, {});

  try {
    return await withClient(async (db) => {

      // GET /localities
      if (method === 'GET' && path === '/localities') {
        const { rows } = await db.query('SELECT * FROM localities ORDER BY name');
        return json(200, rows);
      }

      // GET /categories
      if (method === 'GET' && path === '/categories') {
        const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
        return json(200, rows);
      }

      // GET /feed
      if (method === 'GET' && path === '/feed') {
        const limit = Math.min(100, parseInt(qs.limit ?? '50'));
        const offset = parseInt(qs.offset ?? '0');
        const params: unknown[] = [limit, offset];
        const conditions: string[] = [];

        if (qs.locality) {
          params.push(qs.locality);
          conditions.push(`fi.locality_id = $${params.length}`);
        }
        if (qs.localities) {
          params.push(qs.localities.split(','));
          conditions.push(`fi.locality_id = ANY($${params.length}::uuid[])`);
        }
        if (qs.categories) {
          params.push(qs.categories.split(','));
          conditions.push(`fi.categories && $${params.length}::text[]`);
        }
        if (qs.type) {
          params.push(qs.type);
          conditions.push(`fi.type = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const { rows } = await db.query(
          `SELECT fi.*, l.name as locality_name, l.city,
                  (SELECT json_build_object('id', c.id, 's3_key', c.s3_key, 'title', c.title, 'summary', c.summary, 'start_time_s', c.start_time_s, 'end_time_s', c.end_time_s, 'categories', c.categories)
                   FROM clips c JOIN videos v ON v.id = c.video_id AND v.feed_item_id = fi.id
                   WHERE c.status = 'published' ORDER BY c.created_at ASC LIMIT 1) as clip
           FROM feed_items fi
           JOIN localities l ON l.id = fi.locality_id
           ${where}
           ORDER BY fi.published_at DESC NULLS LAST, fi.created_at DESC
           LIMIT $1 OFFSET $2`,
          params,
        );
        return json(200, { items: rows, limit, offset });
      }

      // GET /feed/:id
      if (method === 'GET' && path.startsWith('/feed/')) {
        const id = path.split('/')[2];
        const { rows: [item] } = await db.query(
          `SELECT fi.*, l.name as locality_name,
                  json_agg(json_build_object('id', c.id, 's3_key', c.s3_key, 'title', c.title, 'summary', c.summary, 'start_time_s', c.start_time_s, 'end_time_s', c.end_time_s)) FILTER (WHERE c.id IS NOT NULL) as clips
           FROM feed_items fi
           JOIN localities l ON l.id = fi.locality_id
           LEFT JOIN videos v ON v.feed_item_id = fi.id
           LEFT JOIN clips c ON c.video_id = v.id AND c.status = 'published'
           WHERE fi.id = $1
           GROUP BY fi.id, l.name`,
          [id],
        );
        if (!item) return json(404, { error: 'Not found' });
        return json(200, item);
      }

      // GET /clips/:id
      if (method === 'GET' && path.startsWith('/clips/')) {
        const id = path.split('/')[2];
        const { rows: [clip] } = await db.query('SELECT * FROM clips WHERE id = $1', [id]);
        if (!clip) return json(404, { error: 'Not found' });
        const cdnDomain = process.env.CLIPS_CDN_DOMAIN;
        return json(200, {
          ...clip,
          playback_url: clip.s3_key ? `https://${cdnDomain}/${clip.s3_key}` : null,
        });
      }

      // POST /users/preferences
      if (method === 'POST' && path === '/users/preferences') {
        const body = JSON.parse(event.body ?? '{}');
        const { locality_ids = [], included_categories = [], excluded_categories = [] } = body;
        return json(200, { saved: true, locality_ids, included_categories, excluded_categories });
      }

      // GET /stats (for debugging)
      if (method === 'GET' && path === '/stats') {
        const { rows: [stats] } = await db.query(`
          SELECT
            (SELECT count(*) FROM localities) as localities,
            (SELECT count(*) FROM categories) as categories,
            (SELECT count(*) FROM sources) as sources,
            (SELECT count(*) FROM feed_items) as feed_items,
            (SELECT count(*) FROM videos) as videos,
            (SELECT count(*) FROM clips WHERE status = 'published') as published_clips
        `);
        return json(200, stats);
      }

      return json(404, { error: 'Unknown route' });
    });
  } catch (err) {
    console.error('API error:', err);
    return json(500, { error: 'Internal server error' });
  }
};
