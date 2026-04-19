import { describe, expect, test, vi } from 'vitest';

const useExploreFeedItemsMock = vi.fn();
vi.mock('@/hooks/useFeed', () => ({
  useExploreFeedItems: (opts?: { type?: string; limit?: number }) => useExploreFeedItemsMock(opts),
}));

const feedLayoutMock = vi.fn();
vi.mock('@/components/FeedLayout', () => ({
  default: (props: { title: string; items: unknown[]; loading?: boolean }) => {
    feedLayoutMock(props);
    return null;
  },
}));

import { render } from '@testing-library/react';
import ExplorePage from './page';

describe('ExplorePage', () => {
  test('requests unfiltered feed items', () => {
    useExploreFeedItemsMock.mockReturnValue({
      data: { items: [{ id: '1' }] },
      isLoading: false,
    });

    render(<ExplorePage />);

    expect(useExploreFeedItemsMock).toHaveBeenCalledWith({ limit: 100 });
    expect(feedLayoutMock).toHaveBeenCalledTimes(1);
    const props = feedLayoutMock.mock.calls[0][0] as { title: string };
    expect(props.title).toBe('Explore');
  });
});

