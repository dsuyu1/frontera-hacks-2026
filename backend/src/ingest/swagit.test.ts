import { describe, expect, it, vi } from 'vitest';
import { ingestSwagitSource } from './swagit';
import type { SourceRow } from './types';

describe('ingestSwagitSource', () => {
  const source: SourceRow = {
    id: 's1',
    locality_id: 'loc1',
    type: 'swagit',
    url: 'https://example.new.swagit.com/views/default/',
    config: {},
    locality_name: 'Example',
    city: 'Example',
    county: null,
    region: 'RGV',
  };

  it('ingests listing items and creates video feed items', async () => {
    const listingHtml = `
      <html><body>
        <a href="/videos/381320">Apr 07, 2026 Commissioner&#39;s Court</a>
        <a href="/videos/381321">Apr 08, 2026 Commissioner&#39;s Court</a>
      </body></html>
    `;

    const videoPageHtml = (title: string) => `
      <html><head>
        <meta property="og:title" content="${title}" />
        <title>${title}</title>
      </head></html>
    `;

    const fetchMock = vi.fn(async (url: string) => {
      if (url === source.url) {
        return { ok: true, text: async () => listingHtml };
      }
      if (url === 'https://example.new.swagit.com/videos/381320') {
        return { ok: true, text: async () => videoPageHtml("Apr 07, 2026 Commissioner's Court - Example") };
      }
      if (url === 'https://example.new.swagit.com/videos/381321') {
        return { ok: true, text: async () => videoPageHtml("Apr 08, 2026 Commissioner's Court - Example") };
      }
      return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
    }) as unknown as typeof fetch;

    const prevFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const queries: Array<{ sql: string; params?: unknown[] }> = [];

    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        queries.push({ sql, params });

        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rowCount: 0, rows: [] };
        }

        if (sql.includes('SELECT id FROM source_items')) return { rowCount: 0, rows: [] };

        if (sql.includes('INSERT INTO source_items')) return { rowCount: 1, rows: [{ id: 'si1' }] };

        if (sql.includes('INSERT INTO feed_items') && sql.includes('RETURNING id')) {
          return { rowCount: 1, rows: [{ id: 'fi1' }] };
        }

        if (sql.includes('INSERT INTO videos')) return { rowCount: 1, rows: [{ id: 'v1' }] };

        if (sql.includes('UPDATE sources SET last_fetched')) return { rowCount: 1, rows: [] };

        return { rowCount: 0, rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn(async () => client),
    };

    try {
      await expect(ingestSwagitSource(pool as any, source)).resolves.toBe(2);
    } finally {
      globalThis.fetch = prevFetch;
    }

    const feedInserts = queries.filter(q => q.sql.includes('INSERT INTO feed_items'));
    expect(feedInserts).toHaveLength(2);

    const first = feedInserts[0].params ?? [];
    expect(first[0]).toBe(source.locality_id);
    expect(first[1]).toBe(source.id);
    expect(String(first[2])).toContain('Apr 07, 2026');
    expect(first[5]).toBe('https://example.new.swagit.com/videos/381320');
    expect(first[6]).toBeInstanceOf(Date);
  });

  it('skips video ids that already exist for the source', async () => {
    const listingHtml = `<a href="/videos/381320">Apr 07, 2026 Commissioner&#39;s Court</a>`;

    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => listingHtml })) as unknown as typeof fetch;

    const prevFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT id FROM source_items')) return { rowCount: 1, rows: [{ id: 'si-existing' }] };
        return { rowCount: 0, rows: [] };
      }),
      release: vi.fn(),
    };

    const pool = {
      connect: vi.fn(async () => client),
    };

    try {
      await expect(ingestSwagitSource(pool as any, source)).resolves.toBe(0);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
