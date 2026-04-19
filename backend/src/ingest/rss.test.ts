import { describe, expect, it, vi } from 'vitest';
import { extractThumbnail, fetchOgImage, ingestRssForSource, jurisdictionLabel } from './rss';
import type { SourceRow } from './types';

describe('extractThumbnail', () => {
  it('uses enclosure image url', () => {
    expect(extractThumbnail({ enclosure: { url: 'https://img/x.jpg', type: 'image/jpeg' } })).toBe('https://img/x.jpg');
  });

  it('uses media:thumbnail url', () => {
    expect(extractThumbnail({ mediaThumbnail: { $: { url: 'https://img/t.jpg' } } })).toBe('https://img/t.jpg');
  });

  it('uses media:content url when not audio/video', () => {
    expect(extractThumbnail({ mediaContent: { $: { url: 'https://img/c.jpg', medium: 'image' } } })).toBe('https://img/c.jpg');
  });

  it('extracts first <img src> from HTML content', () => {
    expect(extractThumbnail({ content: '<p>hi</p><img src="https://img/h.png" />' })).toBe('https://img/h.png');
  });
});

describe('fetchOgImage', () => {
  it('extracts og:image', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => '<html><head><meta property="og:image" content="https://img/og.png" /></head></html>',
    })) as unknown as typeof fetch;

    const prevFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      await expect(fetchOgImage('https://example.com')).resolves.toBe('https://img/og.png');
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});

describe('ingestRssForSource', () => {
  const source: SourceRow = {
    id: 's1',
    locality_id: 'loc1',
    type: 'rss',
    url: 'https://example.com/rss',
    config: {},
    locality_name: 'Austin',
    city: 'Austin',
    county: 'Travis',
    region: 'TX',
  };

  it('inserts new feed_items and uses OG image fallback when needed', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <title>Test</title>
          <item>
            <title>Hello</title>
            <link>https://example.com/a</link>
            <guid>g1</guid>
            <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            <description>Desc</description>
            <content:encoded><![CDATA[<p>No image here</p>]]></content:encoded>
          </item>
        </channel>
      </rss>`;

    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => '<meta property="og:image" content="https://img/og.png">',
    })) as unknown as typeof fetch;

    const prevFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params });

        if (sql.includes('SELECT 1 FROM feed_items')) return { rowCount: 0, rows: [] };
        if (sql.includes('INSERT INTO source_items')) return { rowCount: 1, rows: [{ id: 'si1' }] };
        if (sql.includes('INSERT INTO feed_items')) return { rowCount: 1, rows: [] };

        return { rowCount: 0, rows: [] };
      }),
    };

    try {
      await expect(ingestRssForSource(client as any, source, xml)).resolves.toBe(1);
    } finally {
      globalThis.fetch = prevFetch;
    }

    const feedInsert = queries.find((q) => q.sql.includes('INSERT INTO feed_items'))!;
    expect(feedInsert.params?.[5]).toBe(jurisdictionLabel(source));
    expect(feedInsert.params?.[8]).toBe('https://img/og.png');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips insert when dedup query finds an existing title', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0"><channel>
        <title>Test</title>
        <item>
          <title>Dup</title>
          <link>https://example.com/dup</link>
        </item>
      </channel></rss>`;

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT 1 FROM feed_items')) return { rowCount: 1, rows: [{}] };
        return { rowCount: 0, rows: [] };
      }),
    };

    await expect(ingestRssForSource(client as any, source, xml)).resolves.toBe(0);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
