const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://wn6j71l493.execute-api.us-east-1.amazonaws.com';
const CDN_BASE = 'https://d25yrx00pth40q.cloudfront.net';

export interface Locality { id: string; region: string; county: string; city: string; name: string }
export interface Category { id: string; slug: string; name: string }
export interface Clip {
  id: string; s3_key: string; title: string; summary: string;
  start_time_s: number; end_time_s: number; categories: string[];
  playback_url?: string;
}
export interface FeedItem {
  id: string; locality_id: string; locality_name: string; city: string;
  type: 'text' | 'video'; title: string; summary: string | null;
  categories: string[]; jurisdiction: string; source_url: string;
  published_at: string; created_at: string;
  clip?: Clip | null;
}

export function clipUrl(s3Key: string) {
  return `${CDN_BASE}/${s3Key}`;
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  localities: () => get<Locality[]>('/localities'),
  categories: () => get<Category[]>('/categories'),
  feed: (params?: { localities?: string; categories?: string; type?: string; limit?: string; offset?: string }) =>
    get<{ items: FeedItem[]; limit: number; offset: number }>('/feed', params as Record<string, string>),
  feedItem: (id: string) => get<FeedItem>(`/feed/${id}`),
  clip: (id: string) => get<Clip>(`/clips/${id}`),
};
