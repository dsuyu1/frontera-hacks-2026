'use client';
import useSWR from 'swr';
import { api, FeedItem, Locality, Category } from '@/lib/api';
import { useFeedStore } from '@/lib/store';

const fetcher = (fn: () => Promise<unknown>) => fn();

export function useLocalities() {
  return useSWR('localities', () => api.localities());
}

export function useCategories() {
  return useSWR('categories', () => api.categories());
}

export function useFeedItems(opts?: { localityIds?: string[]; type?: string }) {
  const { selectedLocalities, selectedCategories } = useFeedStore();
  const localities = opts?.localityIds ?? selectedLocalities;
  const key = `feed:${localities.join(',')}:${selectedCategories.join(',')}:${opts?.type ?? ''}`;
  return useSWR(key, () =>
    api.feed({
      localities: localities.length ? localities.join(',') : undefined,
      categories: selectedCategories.length ? selectedCategories.join(',') : undefined,
      type: opts?.type,
      limit: '100',
    }),
  );
}
