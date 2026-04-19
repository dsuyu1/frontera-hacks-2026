/**
 * Standalone article-fetch Lambda — NOT attached to the VPC.
 * Handles GET /article?url=..., GET /og?url=..., POST /ask
 * No database access needed; runs outside the private subnet so it can
 * reach external URLs and Bedrock without a NAT Gateway.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { buildArticleResponse } from './articleResponse';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

function json(status: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
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

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseDuckDuckGoHtml(html: string): Array<{ title: string; url: string; snippet: string | null }> {
  const results: Array<{ title: string; url: string; snippet: string | null }> = [];
  const anchorRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const url = decodeHtmlEntities(match[1]);
    const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
    const title = decodeHtmlEntities(rawTitle);

    const after = html.slice(match.index, Math.min(html.length, match.index + 1800));
    const snippetMatch = after.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const snippetRaw = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const snippet = snippetRaw ? decodeHtmlEntities(snippetRaw).replace(/\s+/g, ' ').trim() : null;

    if (url && title) results.push({ title, url, snippet });
    if (results.length >= 12) break;
  }
  return results;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path;
  const qs = event.queryStringParameters ?? {};

  if (method === 'OPTIONS') return json(204, {});

  // POST /ask — Bedrock Q&A; no url param needed, handle before url guard
  if (method === 'POST' && path.endsWith('/ask')) {
    try {
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
    } catch (err) {
      console.error('Ask error:', err);
      const detail = err instanceof Error ? err.message : String(err);
      return json(500, { error: 'Ask failed', detail });
    }
  }

  // GET /support/sources — search DuckDuckGo for local nonprofits/volunteer opportunities
  if (method === 'GET' && path.endsWith('/support/sources')) {
    const q = (qs.q ?? '').trim();
    const region = (qs.region ?? '').trim();
    const city = (qs.city ?? '').trim();
    const base = [city, region].filter(Boolean).join(' ').trim() || 'Rio Grande Valley';
    const query = q || `${base} nonprofit volunteer opportunities humanitarian aid donate`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetchSafe(searchUrl, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'CivicWatchSupportLocal/0.1',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) return json(502, { error: 'search_failed', status: res.status });
      const html = await res.text();
      const found = parseDuckDuckGoHtml(html);
      const sources = found.map(r => {
        const u = new URL(r.url);
        return { title: r.title, url: r.url, domain: u.hostname.replace(/^www\./, ''), snippet: r.snippet };
      });
      return json(200, { sources });
    } catch (err) {
      console.error('Support sources error:', err);
      return json(502, { error: 'search_failed' });
    }
  }

  const targetUrl = qs.url;
  if (!targetUrl) return json(400, { error: 'url required' });

  // GET /article — fetch and extract full article text
  if (method === 'GET' && path.endsWith('/article')) {
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
  if (method === 'GET' && path.endsWith('/og')) {
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
