import { describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
vi.mock('../lib/db', () => ({
  withClient: async (fn: (db: { query: typeof queryMock }) => unknown) => fn({ query: queryMock }),
}));

import { handler } from './api';

describe('GET /sources/domains', () => {
  it('returns unique hostnames', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { url: 'https://example.com/a' },
        { url: 'https://Example.com/b' },
        { url: 'https://news.example.org' },
        { url: 'not a url' },
      ],
    });

    const res = await handler({
      requestContext: { http: { method: 'GET', path: '/sources/domains' } },
      rawPath: '/sources/domains',
    } as any);

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as { domains: string[] };
    expect(body.domains).toEqual(['example.com', 'news.example.org']);
  });
});

