import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

const videoPlayerPropsMock = vi.fn();
vi.mock('./VideoPlayer', () => ({
  default: (props: unknown) => {
    videoPlayerPropsMock(props);
    return <div data-testid="video-player" />;
  },
}));

vi.mock('@/lib/store', () => ({
  useFeedStore: () => ({
    readIds: new Set<string>(),
    savedIds: new Set<string>(),
    markRead: () => {},
    markUnread: () => {},
    toggleSaved: () => {},
    selectedLocalities: [],
    selectedCategories: [],
  }),
}));

vi.mock('@/lib/auth', () => ({
  getStoredUser: () => null,
  startLogin: () => {},
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => 'just now',
}));

vi.mock('swr', () => ({
  default: (key: string | null) => {
    if (!key) return { data: undefined, mutate: async () => {} };

    if (key.startsWith('video-status:')) {
      return {
        data: {
          video_id: 'vid',
          status: 'published',
          clips: [
            {
              id: 'clip-1',
              s3_key: null,
              embed_url: 'https://www.youtube.com/embed/abc123?start=10&end=70',
              title: 'Clip Title',
              summary: null,
              start_time_s: 10,
              end_time_s: 70,
              categories: [],
              status: 'published',
            },
          ],
        },
        mutate: async () => {},
      };
    }

    if (key.startsWith('transcript:')) {
      return { data: { text: 'hello', status: 'published' }, isLoading: false };
    }

    if (key.startsWith('comments:')) {
      return { data: { comments: [] }, mutate: async () => {} };
    }

    if (key.startsWith('article:')) {
      return {
        data: { text: 'First paragraph with enough content to be displayed properly in the reader view.\n\nSecond paragraph with enough content to verify paragraph splitting.' },
        isLoading: false,
      };
    }

    return { data: undefined, mutate: async () => {} };
  },
}));

import Reader from './Reader';

describe('Reader (video)', () => {
  test('renders published clips with autoplay enabled', () => {
    render(
      <Reader
        item={{
          id: 'item-1',
          locality_id: 'loc',
          locality_name: 'Loc',
          city: 'Edinburg',
          type: 'video',
          title: 'Video Item',
          summary: null,
          thumbnail_url: null,
          categories: [],
          jurisdiction: null,
          source_url: 'https://example.com',
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText('Video Item')).toBeInTheDocument();
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
    expect(videoPlayerPropsMock).toHaveBeenCalled();
    const props = videoPlayerPropsMock.mock.calls[0][0] as { autoplay?: boolean };
    expect(props.autoplay).toBe(true);
  });
});

describe('Reader (text)', () => {
  test('renders full article content split into paragraphs', () => {
    render(
      <Reader
        item={{
          id: 'item-2',
          locality_id: 'loc',
          locality_name: 'Loc',
          city: 'Edinburg',
          type: 'text',
          title: 'Text Item',
          summary: 'Summary',
          thumbnail_url: null,
          categories: [],
          jurisdiction: null,
          source_url: 'https://example.com/story',
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText('Text Item')).toBeInTheDocument();
    expect(screen.getByText(/First paragraph with enough content/i)).toBeInTheDocument();
    expect(screen.getByText(/Second paragraph with enough content/i)).toBeInTheDocument();
  });
});
