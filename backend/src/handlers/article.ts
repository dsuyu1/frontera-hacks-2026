/**
 * Standalone article-fetch Lambda — NOT attached to the VPC.
 * Handles GET /article?url=... and GET /og?url=...
 * No database access needed; runs outside the private subnet so it can
 * reach external URLs without a NAT Gateway.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { buildArticleResponse } from './articleResponse';

function json(status: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }
  if (v === 6) {
    const norm = ip.toLowerCase();
    if (norm === '::1') return true;
    if (norm.startsWith('fc') || norm.startsWith('fd')) return true;
    if (norm.startsWith('fe80:')) return true;
    return false;
  }
  return true;
}

async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
  const host = url.hostname;
  if (host === 'localhost') throw new Error('blocked host');
  if (isIP(host) && isPrivateIp(host)) throw new Error('blocked host');
  const { address } = await lookup(host);
  if (isPrivateIp(address)) throw new Error('blocked host');
  return url;
}

async function fetchSafe(rawUrl: string, init: RequestInit, maxRedirects = 3): Promise<Response> {
  let current = await assertSafeExternalUrl(rawUrl);
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(current.href, { ...init, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      const next = new URL(location, current);
      current = await assertSafeExternalUrl(next.href);
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
}

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const qs = event.queryStringParameters ?? {};

  if (method === 'OPTIONS') return json(204, {});

  const targetUrl = qs.url;
  if (!targetUrl) return json(400, { error: 'url required' });

  // GET /article — fetch and extract full article text
  if (method === 'GET' && path === '/article') {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetchSafe(targetUrl, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      if (!res.ok) return json(200, { text: '', content_type: null, embed_url: null });
      const payload = await buildArticleResponse(res, targetUrl);
      return json(200, payload);
    } catch (err) {
      console.error('Article fetch error:', err);
      return json(200, { text: '', content_type: null, embed_url: null });
    }
  }

  // GET /og — resolve OG image for a URL
  if (method === 'GET' && path === '/og') {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8_000);
      const res = await fetchSafe(targetUrl, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': BROWSER_UA,
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
      if (imageUrl && !imageUrl.startsWith('http')) {
        const base = new URL(targetUrl);
        imageUrl = new URL(imageUrl, base.origin).href;
      }
      return json(200, { imageUrl });
    } catch {
      return json(200, { imageUrl: null });
    }
  }

  return json(404, { error: 'Not found' });
};
