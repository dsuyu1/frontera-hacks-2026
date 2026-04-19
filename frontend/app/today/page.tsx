'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';

const CUTOFF = new Date(Date.now() - 48 * 60 * 60 * 1000);

export default function TodayPage() {
  const { data: textData, isLoading: textLoading } = useFeedItems({ limit: 100 });
  const { data: videoData, isLoading: videoLoading } = useFeedItems({ type: 'video', limit: 100 });

  const textItems = (textData?.items ?? []).filter(item => {
    const d = new Date(item.published_at ?? item.created_at);
    return d >= CUTOFF;
  });

  const videoItems = (videoData?.items ?? []).filter(item => {
    const d = new Date(item.published_at ?? item.created_at);
    return d >= CUTOFF;
  });

  // Merge and deduplicate by id, interleaving videos with text articles
  const seen = new Set<string>();
  const merged = [...textItems, ...videoItems]
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.published_at ?? a.created_at).getTime();
      const db = new Date(b.published_at ?? b.created_at).getTime();
      return db - da;
    });

  return <FeedLayout title="Today" items={merged} loading={textLoading && videoLoading} />;
}
