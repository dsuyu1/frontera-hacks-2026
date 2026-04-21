'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';

export default function AllPage() {
  const { data, isLoading } = useFeedItems();
  return <FeedLayout title="All Articles" items={data?.items ?? []} loading={isLoading} />;
}
