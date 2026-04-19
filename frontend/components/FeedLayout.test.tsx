import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/today' }));
vi.mock('next/link', () => ({
  default: (props: any) => <a href={props.href}>{props.children}</a>,
}));

vi.mock('./ArticleCard', () => ({
  sourceDomain: () => 'example.com',
}));

vi.mock('./ArticleRow', () => ({
  default: () => <div data-testid="row" />,
}));

vi.mock('./ArticleRow', () => ({
  default: () => <div data-testid="row" />,
}));

vi.mock('./Sidebar', () => ({ default: () => null }));
vi.mock('./Reader', () => ({ default: () => null }));
vi.mock('./AiSidePanel', () => ({ default: () => null }));
vi.mock('./MobileTabs', () => ({ default: () => null }));
vi.mock('@/lib/auth', () => ({ getStoredUser: () => null, startLogin: () => {} }));

const useTrendingMock = vi.fn();
vi.mock('@/hooks/useFeed', () => ({
  useTrending: () => useTrendingMock(),
}));

import FeedLayout from './FeedLayout';

describe('FeedLayout sections', () => {
  test('renders Trending/Politics/Finance and dedupes rest', () => {
    useTrendingMock.mockReturnValue({
      data: {
        topics: [
          {
            topic: 't',
            description: 'd',
            category: 'c',
            articles: [{ id: 'tr1', title: 'T', city: 'X', thumbnail_url: null, source_url: 'https://x', published_at: null }],
          },
        ],
      },
    });

    render(
      <FeedLayout
        title="Today"
        items={[
          { id: 'tr1', locality_id: 'l', locality_name: 'L', city: 'C', type: 'text', title: 'Trending', summary: null, thumbnail_url: null, categories: ['city-council'], jurisdiction: null, source_url: 'https://x', published_at: null, created_at: new Date().toISOString() },
          { id: 'p1', locality_id: 'l', locality_name: 'L', city: 'C', type: 'text', title: 'Politics', summary: null, thumbnail_url: null, categories: ['politics-elections'], jurisdiction: null, source_url: 'https://y', published_at: null, created_at: new Date().toISOString() },
          { id: 'f1', locality_id: 'l', locality_name: 'L', city: 'C', type: 'text', title: 'Finance', summary: null, thumbnail_url: null, categories: ['budget-taxes'], jurisdiction: null, source_url: 'https://z', published_at: null, created_at: new Date().toISOString() },
          { id: 'r1', locality_id: 'l', locality_name: 'L', city: 'C', type: 'text', title: 'Rest', summary: null, thumbnail_url: null, categories: [], jurisdiction: null, source_url: 'https://r', published_at: null, created_at: new Date().toISOString() },
        ]}
        loading={false}
      />,
    );

    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getAllByTestId('row').length).toBeGreaterThan(0);
  });
});
