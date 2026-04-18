import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getPool } from '../db/client';

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const qs = event.queryStringParameters ?? {};

  const db = await getPool();

  if (method === 'GET' && path === '/localities') {
    const { rows } = await db.query('SELECT * FROM localities ORDER BY name');
    return json(200, rows);
  }

  if (method === 'GET' && path === '/categories') {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    return json(200, rows);
  }

  if (method === 'GET' && path === '/feed') {
    const { locality, categories, limit = '50', offset = '0' } = qs;
    const params: unknown[] = [parseInt(limit), parseInt(offset)];
    let where = 'WHERE 1=1';
    if (locality) {
      params.push(locality);
      where += ` AND fi.locality_id = $${params.length}`;
    }
    if (categories) {
      params.push(categories.split(','));
      where += ` AND fi.categories && $${params.length}::text[]`;
    }
    const { rows } = await db.query(
      `SELECT fi.* FROM feed_items fi ${where}
       ORDER BY fi.published_at DESC LIMIT $1 OFFSET $2`,
      params,
    );
    return json(200, rows);
  }

  if (method === 'GET' && path.startsWith('/feed/')) {
    const id = path.split('/')[2];
    const { rows } = await db.query('SELECT * FROM feed_items WHERE id = $1', [id]);
    if (!rows.length) return json(404, { error: 'Not found' });
    return json(200, rows[0]);
  }

  if (method === 'GET' && path.startsWith('/clips/')) {
    const id = path.split('/')[2];
    const { rows } = await db.query('SELECT * FROM clips WHERE id = $1', [id]);
    if (!rows.length) return json(404, { error: 'Not found' });
    const clip = rows[0];
    const cdnUrl = `https://${process.env.CLIPS_CDN_DOMAIN}/${clip.s3_key}`;
    return json(200, { ...clip, playback_url: cdnUrl });
  }

  if (method === 'POST' && path === '/users/preferences') {
    // TODO: write preferences to users table once auth is wired up
    return json(200, { message: 'preferences saved (stub)' });
  }

  return json(404, { error: 'Unknown route' });
};
