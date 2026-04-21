import { describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: async () => ({ address: '93.184.216.34' }),
}));

import { handler, parseDuckDuckGoHtml } from './article';

describe('parseDuckDuckGoHtml', () => {
  it('extracts title, url, and snippet from duckduckgo html', () => {
    const html = `
      <div class="result">
        <a class="result__a" href="https://example.org/volunteer">Example &amp; Org</a>
        <a class="result__snippet">Help your community &amp; neighbors.</a>
      </div>
    `;

    expect(parseDuckDuckGoHtml(html)).toEqual([
      {
        title: 'Example & Org',
        url: 'https://example.org/volunteer',
        snippet: 'Help your community & neighbors.',
      },
    ]);
  });
});

describe('GET /support/sources', () => {
  it('returns normalized sources', async () => {
    const html = `
      <div class="result">
        <a class="result__a" href="https://www.hope.example.org/donate">Hope</a>
        <a class="result__snippet">Donate or volunteer.</a>
      </div>
    `;

    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));

    const res = await handler({
      requestContext: { http: { method: 'GET', path: '/support/sources' } },
      rawPath: '/support/sources',
      queryStringParameters: { region: 'RGV', city: 'Edinburg' },
      headers: {},
    } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as { sources: Array<{ title: string; url: string; domain: string; snippet: string | null }> };
    expect(body.sources[0]).toEqual({
      title: 'Hope',
      url: 'https://www.hope.example.org/donate',
      domain: 'hope.example.org',
      snippet: 'Donate or volunteer.',
    });
  });
});
