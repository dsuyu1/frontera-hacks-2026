import { describe, expect, test, vi } from 'vitest';

const useFeedItemsMock = vi.fn();
vi.mock('@/hooks/useFeed', () => ({
  useFeedItems: (opts?: { localityIds?: string[]; type?: string; limit?: number }) => useFeedItemsMock(opts),
}));

const feedLayoutMock = vi.fn();
vi.mock('@/components/FeedLayout', () => ({
  default: (props: { title: string; items: unknown[]; loading?: boolean }) => {
    feedLayoutMock(props);
    return null;
  },
}));

import { render } from '@testing-library/react';
import TodayPage from './page';

describe('TodayPage', () => {
  test('requests both text and video feed items', () => {
    useFeedItemsMock.mockImplementation((opts?: { type?: string }) => {
      if (opts?.type === 'video') {
        return {
          data: {
            items: [
              {
                id: 'v1',
                locality_id: 'loc',
                locality_name: 'Loc',
                city: 'Edinburg',
                type: 'video',
                title: 'Video',
                summary: null,
                thumbnail_url: null,
                categories: [],
                jurisdiction: null,
                source_url: 'https://example.com',
                published_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
              },
            ],
          },
          isLoading: false,
        };
      }
      return {
        data: {
          items: [
            {
              id: 't1',
              locality_id: 'loc',
              locality_name: 'Loc',
              city: 'Edinburg',
              type: 'text',
              title: 'Text',
              summary: null,
              thumbnail_url: null,
              categories: [],
              jurisdiction: null,
              source_url: 'https://example.com',
              published_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
        },
        isLoading: false,
      };
    });

    render(<TodayPage />);

    expect(useFeedItemsMock).toHaveBeenCalledTimes(2);
    expect(useFeedItemsMock).toHaveBeenCalledWith({ limit: 100 });
    expect(useFeedItemsMock).toHaveBeenCalledWith({ type: 'video', limit: 100 });

    expect(feedLayoutMock).toHaveBeenCalledTimes(1);
    const props = feedLayoutMock.mock.calls[0][0] as { title: string; items: Array<{ id: string }> };
    expect(props.title).toBe('Today');
    expect(props.items.map(i => i.id).sort()).toEqual(['t1', 'v1']);
  });
});
