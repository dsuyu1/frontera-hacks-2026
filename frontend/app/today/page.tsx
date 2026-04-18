'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';
import { useFeedStore } from '@/lib/store';
import { FeedItem } from '@/lib/api';

export default function TodayPage() {
  const { data, isLoading } = useFeedItems();
  const { readIds } = useFeedStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayItems: FeedItem[] = (data?.items ?? []).filter((item) => {
    if (!item.published_at && !item.created_at) return true;
    const d = new Date(item.published_at ?? item.created_at);
    return d >= today;
  });

  return <FeedLayout title="Today" items={todayItems} loading={isLoading} />;
}
