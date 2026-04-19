'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';

export function useSupportSources(p: { q?: string; region?: string; city?: string }) {
  const key = `supportSources:${p.q ?? ''}:${p.region ?? ''}:${p.city ?? ''}`;
  return useSWR(key, () => api.supportSources(p), { revalidateOnFocus: false });
}
