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

    if (key.startsWith('article:')) {
      return {
        data: { text: 'First paragraph with enough content to be displayed properly in the reader view.\n\nSecond paragraph with enough content to verify paragraph splitting.' },
        isLoading: false,
      };
    }

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
  test('uses Web Speech API to read the article aloud', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    (globalThis as any).speechSynthesis = {
      speak,
      cancel,
      getVoices: () => [{ name: 'Google US English', lang: 'en-US' }],
      onvoiceschanged: null,
    };
    (globalThis as any).SpeechSynthesisUtterance = function (text: string) {
      this.text = text;
      this.onend = null;
      this.onerror = null;
    };

    const { getByRole } = render(
      <Reader
        item={{
          id: 'item-2',
          locality_id: 'loc',
          locality_name: 'Loc',
          city: 'Edinburg',
          type: 'text',
          title: 'Article Title',
          summary: 'Summary',
          thumbnail_url: null,
          categories: [],
          jurisdiction: null,
          source_url: 'https://example.com',
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }}
      />,
    );

    cancel.mockClear();

    const listen = getByRole('button', { name: 'Listen' });
    listen.click();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    const utter = speak.mock.calls[0][0] as { text: string };
    expect(utter.text).toContain('Article Title');
    expect(utter.text).toContain('First paragraph with enough content');
  });

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
    expect(screen.getAllByText(/First paragraph with enough content/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Second paragraph with enough content/i).length).toBeGreaterThan(0);
  });
});
