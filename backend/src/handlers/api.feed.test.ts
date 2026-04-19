import { describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
vi.mock('../lib/db', () => ({
  withClient: async (fn: (db: { query: typeof queryMock }) => unknown) => fn({ query: queryMock }),
}));

import { handler } from './api';

describe('GET /feed', () => {
  it('filters by type=video when requested', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: '1',
          type: 'video',
          title: 'Video Item',
          locality_id: 'loc',
          locality_name: 'Loc',
          city: 'Edinburg',
          summary: null,
          thumbnail_url: null,
          categories: [],
          jurisdiction: null,
          source_url: 'https://example.com',
          published_at: null,
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await handler({
      requestContext: { http: { method: 'GET', path: '/feed' } },
      queryStringParameters: { type: 'video', limit: '10', offset: '0' },
    } as any);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('fi.type = $3');
    expect(params).toEqual([10, 0, 'video']);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as { items: Array<{ type: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].type).toBe('video');
  });
});

