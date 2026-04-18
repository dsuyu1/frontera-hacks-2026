'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';

export default function TodayPage() {
  const { data, isLoading } = useFeedItems({ limit: 100 });
  // Show last 48 hours so the page is never empty
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const items = (data?.items ?? []).filter(item => {
    const d = new Date(item.published_at ?? item.created_at);
    return d >= cutoff;
  });
  return <FeedLayout title="Today" items={items} loading={isLoading} />;
}
