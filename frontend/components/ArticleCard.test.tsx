import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArticleCard, { sourceDomain } from './ArticleCard';

vi.mock('@/lib/store', () => ({
  useFeedStore: () => ({ readIds: new Set<string>() }),
}));

vi.mock('swr', () => ({
  default: (key: string | null) => {
    if (typeof key === 'string' && key.startsWith('card-article:')) {
      return { data: { text: 'This is the full article text preview that should appear when summary is missing and the card is selected.' } };
    }
    return { data: undefined };
  },
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      og: vi.fn(async () => ({ imageUrl: null })),
    },
  };
});

describe('sourceDomain', () => {
  it('strips www prefix', () => {
    expect(sourceDomain('https://www.example.com/a')).toBe('example.com');
  });

  it('returns empty string for invalid urls', () => {
    expect(sourceDomain('not-a-url')).toBe('');
  });
});

describe('ArticleCard', () => {
  it('renders title, city, and domain', () => {
    render(
      <ArticleCard
        item={{
          id: '1',
          locality_id: 'loc',
          locality_name: 'Edinburg',
          city: 'Edinburg',
          type: 'text',
          title: 'Test Title',
          summary: 'Hello',
          thumbnail_url: 'https://img/x.jpg',
          categories: [],
          jurisdiction: null,
          source_url: 'https://www.rgvnews.com/story',
          published_at: null,
          created_at: new Date().toISOString(),
        }}
        selected={false}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Edinburg')).toBeInTheDocument();
    expect(screen.getByText('rgvnews.com')).toBeInTheDocument();
  });

  it('renders full-article preview when selected and summary missing', () => {
    render(
      <ArticleCard
        item={{
          id: '2',
          locality_id: 'loc',
          locality_name: 'Edinburg',
          city: 'Edinburg',
          type: 'text',
          title: 'No Summary',
          summary: null,
          thumbnail_url: null,
          categories: [],
          jurisdiction: null,
          source_url: 'https://example.com/story',
          published_at: null,
          created_at: new Date().toISOString(),
        }}
        selected={true}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText(/full article text preview/i)).toBeInTheDocument();
  });
});
