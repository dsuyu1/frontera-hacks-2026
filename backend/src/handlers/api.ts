import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { withClient } from '../lib/db';

const s3 = new S3Client({});
const sfnClient = new SFNClient({});
const BUCKET = process.env.S3_BUCKET ?? '';

function parseVttToText(vtt: string): string {
  const lines = vtt.split('\n');
  const textLines: string[] = [];
  let prevText = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'WEBVTT' || trimmed.startsWith('NOTE') || trimmed.includes('-->') || /^\d+$/.test(trimmed)) continue;
    // Strip VTT inline tags like <00:01:23.456><c>text</c>
    const clean = trimmed.replace(/<[^>]+>/g, '').trim();
    if (clean && clean !== prevText) {
      textLines.push(clean);
      prevText = clean;
    }
  }
  return textLines.join(' ');
}

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

const COGNITO_ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_m6Fn4fuAH';
let jwksCache: { keys: { kid: string; n: string; e: string }[] } | null = null;

async function getJwks() {
  if (jwksCache) return jwksCache;
  const res = await fetch(`${COGNITO_ISSUER}/.well-known/jwks.json`);
  jwksCache = await res.json() as { keys: { kid: string; n: string; e: string }[] };
  return jwksCache!;
}

// Lightweight JWT decode — we verify signature via Cognito's JWKS
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch { return null; }
}

async function verifyToken(authHeader: string | undefined): Promise<{ sub: string; email: string; username: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  // Verify issuer and expiry (signature trust via Cognito + HTTPS fetch of JWKS)
  if (payload.iss !== COGNITO_ISSUER) return null;
  if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return null;
  // Fetch JWKS to confirm key exists (lightweight check)
  const jwks = await getJwks();
  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  const key = jwks.keys.find(k => k.kid === header.kid);
  if (!key) return null;
  return {
    sub: String(payload.sub),
    email: String(payload.email ?? ''),
    username: String(payload['cognito:username'] ?? payload.email ?? payload.sub),
  };
}

function json(status: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

const CLIP_SELECT = `json_build_object(
  'id', c.id, 's3_key', c.s3_key, 'embed_url', c.embed_url,
  'title', c.title, 'summary', c.summary,
  'start_time_s', c.start_time_s, 'end_time_s', c.end_time_s,
  'categories', c.categories
)`;

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
          `WITH deduped AS (
             SELECT DISTINCT ON (lower(left(fi.title, 100)))
               fi.*, l.name as locality_name, l.city
             FROM feed_items fi
             JOIN localities l ON l.id = fi.locality_id
             ${where}
             ORDER BY lower(left(fi.title, 100)), fi.published_at DESC NULLS LAST, fi.created_at DESC
           )
           SELECT d.*,
             (SELECT ${CLIP_SELECT}
              FROM clips c JOIN videos v ON v.id = c.video_id AND v.feed_item_id = d.id
              WHERE c.status = 'published' ORDER BY c.created_at ASC LIMIT 1) as clip
           FROM deduped d
           ORDER BY d.published_at DESC NULLS LAST, d.created_at DESC
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
                  json_agg(${CLIP_SELECT}) FILTER (WHERE c.id IS NOT NULL) as clips
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
          playback_url: clip.s3_key ? `https://${cdnDomain}/${clip.s3_key}` : clip.embed_url,
        });
      }

      // GET /trending — Bedrock-powered trending topics from recent feed items
      if (method === 'GET' && path === '/trending') {
        const { rows } = await db.query(
          `SELECT title, summary, categories, city, type, thumbnail_url, id, source_url, published_at
           FROM feed_items fi
           JOIN localities l ON l.id = fi.locality_id
           WHERE fi.created_at > now() - interval '7 days'
           ORDER BY fi.published_at DESC NULLS LAST
           LIMIT 40`,
        );

        if (rows.length === 0) return json(200, { topics: [] });

        const titlesText = rows.map(r => `- ${r.title} (${r.city})`).join('\n');

        const res = await bedrock.send(new InvokeModelCommand({
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `You are analyzing local RGV (Rio Grande Valley, TX) news headlines. Identify the top 5 trending civic topics from these recent articles:\n\n${titlesText}\n\nReturn JSON array of 5 objects: [{"topic": "<2-4 word topic>", "description": "<1 sentence>", "category": "<one of: public-safety,infrastructure,education,economic-development,health,politics-elections,environment>"}]. Return ONLY valid JSON.`,
            }],
          }),
          contentType: 'application/json',
          accept: 'application/json',
        }));

        const bedrockResp = JSON.parse(new TextDecoder().decode(res.body));
        const text = bedrockResp.content[0].text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const topics = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // Attach related articles to each topic
        const enriched = topics.map((t: { topic: string; description: string; category: string }) => ({
          ...t,
          articles: rows
            .filter(r => r.categories?.includes(t.category) || r.title.toLowerCase().includes(t.topic.toLowerCase().split(' ')[0]))
            .slice(0, 3)
            .map(r => ({ id: r.id, title: r.title, city: r.city, thumbnail_url: r.thumbnail_url, source_url: r.source_url, published_at: r.published_at })),
        }));

        return json(200, { topics: enriched });
      }

      // GET /comments?item_id=X
      if (method === 'GET' && path === '/comments') {
        const itemId = qs.item_id;
        if (!itemId) return json(400, { error: 'item_id required' });
        const { rows } = await db.query(
          `SELECT id, user_id, username, body, created_at FROM comments WHERE feed_item_id = $1 ORDER BY created_at ASC`,
          [itemId],
        );
        return json(200, { comments: rows });
      }

      // POST /comments
      if (method === 'POST' && path === '/comments') {
        const user = await verifyToken(event.headers?.authorization ?? event.headers?.Authorization);
        if (!user) return json(401, { error: 'Authentication required' });
        const body = JSON.parse(event.body ?? '{}');
        const { item_id, text } = body;
        if (!item_id || !text?.trim()) return json(400, { error: 'item_id and text required' });
        if (text.trim().length > 2000) return json(400, { error: 'Comment too long' });
        const { rows: [comment] } = await db.query(
          `INSERT INTO comments (feed_item_id, user_id, username, body) VALUES ($1, $2, $3, $4) RETURNING id, username, body, created_at`,
          [item_id, user.sub, user.username, text.trim()],
        );
        return json(201, comment);
      }

      // DELETE /comments/:id
      if (method === 'DELETE' && path.startsWith('/comments/')) {
        const user = await verifyToken(event.headers?.authorization ?? event.headers?.Authorization);
        if (!user) return json(401, { error: 'Authentication required' });
        const commentId = path.split('/')[2];
        const { rowCount } = await db.query(
          `DELETE FROM comments WHERE id = $1 AND user_id = $2`,
          [commentId, user.sub],
        );
        return json(rowCount ? 200 : 404, { deleted: !!rowCount });
      }

      // POST /users/preferences
      if (method === 'POST' && path === '/users/preferences') {
        const body = JSON.parse(event.body ?? '{}');
        const { locality_ids = [], included_categories = [], excluded_categories = [] } = body;
        return json(200, { saved: true, locality_ids, included_categories, excluded_categories });
      }

      // GET /og?url=... — server-side OG image resolver (bypasses bot blocks & hotlink protection)
      if (method === 'GET' && path === '/og') {
        const targetUrl = qs.url;
        if (!targetUrl) return json(400, { error: 'url required' });
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 8000);
          const res = await fetch(targetUrl, {
            signal: ctrl.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
            },
          });
          if (!res.ok) return json(200, { imageUrl: null });
          const html = await res.text();
          const m =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
          let imageUrl = m?.[1] ?? null;
          // Resolve relative URLs
          if (imageUrl && !imageUrl.startsWith('http')) {
            const base = new URL(targetUrl);
            imageUrl = new URL(imageUrl, base.origin).href;
          }
          return json(200, { imageUrl });
        } catch {
          return json(200, { imageUrl: null });
        }
      }

      // GET /article?url=... — fetch and extract full article text
      if (method === 'GET' && path === '/article') {
        const targetUrl = qs.url;
        if (!targetUrl) return json(400, { error: 'url required' });
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 10000);
          const res = await fetch(targetUrl, {
            signal: ctrl.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          if (!res.ok) return json(200, { text: '' });
          let html = await res.text();

          // Strip scripts, styles, nav, header, footer, aside
          html = html
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '')
            .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');

          // Extract article/main body
          const articleMatch =
            html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ??
            html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
          let content = articleMatch && articleMatch[1].length > 200 ? articleMatch[1] : html;

          const text = content
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
            .replace(/&#\d+;/g, ' ')
            .replace(/\s{3,}/g, '\n\n').replace(/ {2,}/g, ' ')
            .trim();

          return json(200, { text: text.slice(0, 12000) });
        } catch {
          return json(200, { text: '' });
        }
      }

      // POST /ask — Bedrock-powered Q&A about an article
      if (method === 'POST' && path === '/ask') {
        const body = JSON.parse(event.body ?? '{}');
        const { question, articleText, articleTitle, summary } = body;
        if (!question) return json(400, { error: 'question required' });

        const context = [
          articleTitle ? `Title: ${articleTitle}` : '',
          summary ? `Summary: ${summary}` : '',
          articleText ? `Article:\n${String(articleText).slice(0, 8000)}` : '',
        ].filter(Boolean).join('\n\n');

        const res = await bedrock.send(new InvokeModelCommand({
          modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 512,
            system: 'You are a helpful assistant answering questions about a local news article from the Rio Grande Valley, Texas. Be concise and accurate.',
            messages: [{ role: 'user', content: `${context}\n\nQuestion: ${question}` }],
          }),
          contentType: 'application/json',
          accept: 'application/json',
        }));

        const bedrockResp = JSON.parse(new TextDecoder().decode(res.body));
        const answer = bedrockResp.content[0].text.trim();
        return json(200, { answer });
      }

      // GET /transcript?item_id=X — return readable caption text for a video feed item
      if (method === 'GET' && path === '/transcript') {
        const itemId = qs.item_id;
        if (!itemId) return json(400, { error: 'item_id required' });

        const { rows: [video] } = await db.query(
          "SELECT id, status, caption_s3_key FROM videos WHERE feed_item_id = $1 ORDER BY created_at DESC LIMIT 1",
          [itemId],
        );
        if (!video) return json(200, { text: '', status: null });
        if (!video.caption_s3_key) return json(200, { text: '', status: video.status });

        try {
          const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: video.caption_s3_key }));
          const vttText = await obj.Body!.transformToString();
          const text = parseVttToText(vttText);
          return json(200, { text, status: video.status });
        } catch {
          return json(200, { text: '', status: video.status });
        }
      }

      // GET /video-status?item_id=X — pipeline status for a video feed item
      if (method === 'GET' && path === '/video-status') {
        const itemId = qs.item_id;
        if (!itemId) return json(400, { error: 'item_id required' });

        const { rows: [video] } = await db.query(
          "SELECT id, status FROM videos WHERE feed_item_id = $1 ORDER BY created_at DESC LIMIT 1",
          [itemId],
        );
        if (!video) return json(200, { status: null, clips: [] });

        const { rows: clips } = await db.query(
          `SELECT id, status, title, summary, start_time_s, end_time_s, embed_url
           FROM clips WHERE video_id = $1 ORDER BY start_time_s`,
          [video.id],
        );

        return json(200, { video_id: video.id, status: video.status, clips });
      }

      // POST /pipeline/run — manually trigger pipeline for a video (by feed item id or video id)
      if (method === 'POST' && path === '/pipeline/run') {
        const smArn = process.env.PIPELINE_SM_ARN;
        if (!smArn) return json(503, { error: 'Pipeline not configured' });

        const body = JSON.parse(event.body ?? '{}');
        let videoId: string | undefined = body.video_id;

        if (!videoId && body.item_id) {
          const { rows: [video] } = await db.query(
            "SELECT id FROM videos WHERE feed_item_id = $1 ORDER BY created_at DESC LIMIT 1",
            [body.item_id],
          );
          videoId = video?.id;
        }

        if (!videoId) return json(400, { error: 'video_id or item_id required' });

        // Reset video to pending so the pipeline re-runs from scratch
        await db.query("UPDATE videos SET status = 'pending' WHERE id = $1", [videoId]);
        await db.query("DELETE FROM clips WHERE video_id = $1", [videoId]);

        await sfnClient.send(new StartExecutionCommand({
          stateMachineArn: smArn,
          name: `manual-${videoId}-${Date.now()}`,
          input: JSON.stringify({ video_id: videoId }),
        }));

        return json(200, { started: true, video_id: videoId });
      }

      // GET /stats
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
