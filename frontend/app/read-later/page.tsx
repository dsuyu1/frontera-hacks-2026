'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';
import { useFeedStore } from '@/lib/store';

export default function ReadLaterPage() {
  const { data, isLoading } = useFeedItems();
  const { savedIds } = useFeedStore();
  const saved = (data?.items ?? []).filter((item) => savedIds.has(item.id));
  return <FeedLayout title="Saved" items={saved} loading={isLoading} />;
}
