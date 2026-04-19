const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://wn6j71l493.execute-api.us-east-1.amazonaws.com';

export interface Locality { id: string; region: string; county: string | null; city: string; name: string }
export interface Category { id: string; slug: string; name: string }
export interface Clip {
  id: string;
  s3_key: string | null;
  embed_url: string | null;
  title: string;
  summary: string | null;
  start_time_s: number;
  end_time_s: number;
  categories: string[];
  playback_url?: string | null;
  status?: string;
}
export interface FeedItem {
  id: string;
  locality_id: string;
  locality_name: string;
  city: string;
  type: 'text' | 'video';
  title: string;
  summary: string | null;
  thumbnail_url: string | null;
  categories: string[];
  jurisdiction: string | null;
  source_url: string;
  published_at: string | null;
  created_at: string;
  clip?: Clip | null;
}
export interface TrendingTopic {
  topic: string;
  description: string;
  category: string;
  articles: Array<{ id: string; title: string; city: string; thumbnail_url: string | null; source_url: string; published_at: string | null }>;
}

export interface Comment {
  id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
}

function authHeaders(): Record<string, string> {
  try {
    const raw = typeof window !== 'undefined' && localStorage.getItem('frontera_auth');
    if (!raw) return {};
    const { idToken } = JSON.parse(raw);
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  } catch { return {}; }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  await fetch(API_BASE + path, { method: 'DELETE', headers: authHeaders() });
}

export const api = {
  localities: () => get<Locality[]>('/localities'),
  categories: () => get<Category[]>('/categories'),
  feed: (p: { localities?: string[]; categories?: string[]; type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (p.localities?.length) qs.set('localities', p.localities.join(','));
    if (p.categories?.length) qs.set('categories', p.categories.join(','));
    if (p.type) qs.set('type', p.type);
    if (p.limit) qs.set('limit', String(p.limit));
    if (p.offset) qs.set('offset', String(p.offset));
    const q = qs.toString();
    return get<{ items: FeedItem[]; limit: number; offset: number }>(`/feed${q ? '?' + q : ''}`);
  },
  feedItem: (id: string) => get<FeedItem>(`/feed/${id}`),
  trending: () => get<{ topics: TrendingTopic[] }>('/trending'),
  og: (url: string) => get<{ imageUrl: string | null }>(`/og?url=${encodeURIComponent(url)}`),
  comments: (itemId: string) => get<{ comments: Comment[] }>(`/comments?item_id=${itemId}`),
  postComment: (itemId: string, text: string) => post<Comment>('/comments', { item_id: itemId, text }),
  deleteComment: (commentId: string) => del(`/comments/${commentId}`),
  article: (url: string) => get<{ text: string }>(`/article?url=${encodeURIComponent(url)}`),
  ask: (question: string, articleTitle: string, summary: string | null, articleText: string) =>
    post<{ answer: string }>('/ask', { question, articleTitle, summary, articleText }),
  transcript: (itemId: string) => get<{ text: string; status: string | null }>(`/transcript?item_id=${itemId}`),
  videoStatus: (itemId: string) => get<{ video_id: string; status: string | null; clips: Clip[] }>(`/video-status?item_id=${itemId}`),
  pipelineRun: (itemId: string) => post<{ started: boolean; video_id: string }>('/pipeline/run', { item_id: itemId }),
};
