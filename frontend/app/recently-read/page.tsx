'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';
import { useFeedStore } from '@/lib/store';

export default function RecentlyReadPage() {
  const { data, isLoading } = useFeedItems();
  const { readIds } = useFeedStore();
  const read = (data?.items ?? []).filter(i => readIds.has(i.id));
  return <FeedLayout title="Recently Read" items={read} loading={isLoading} />;
}
