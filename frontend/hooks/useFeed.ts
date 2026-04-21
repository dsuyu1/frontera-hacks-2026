'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useFeedStore } from '@/lib/store';

export function useLocalities() {
  return useSWR('localities', () => api.localities());
}

export function useCategories() {
  return useSWR('categories', () => api.categories());
}

export function useFeedItems(opts?: { localityIds?: string[]; type?: string; limit?: number }) {
  const { selectedLocalities, selectedCategories } = useFeedStore();
  const localities = opts?.localityIds ?? selectedLocalities;
  const key = `feed:${localities.join(',')}:${selectedCategories.join(',')}:${opts?.type ?? ''}`;
  return useSWR(key, () =>
    api.feed({
      localities: localities.length ? localities : undefined,
      categories: selectedCategories.length ? selectedCategories : undefined,
      type: opts?.type,
      limit: opts?.limit ?? 100,
    }),
  );
}

export function useTrending() {
  return useSWR('trending', () => api.trending(), { refreshInterval: 300_000 });
}

export function useFollowingFeedItems(opts?: { limit?: number }) {
  return useSWR('feed:following', () =>
    api.feed({ following: true, limit: opts?.limit ?? 100 }),
    { dedupingInterval: 60_000 },
  );
}

export function useExploreFeedItems(opts?: { type?: string; limit?: number }) {
  const key = `explore:${opts?.type ?? ''}`;
  return useSWR(key, () =>
    api.feed({
      type: opts?.type,
      limit: opts?.limit ?? 100,
    }),
  );
}
