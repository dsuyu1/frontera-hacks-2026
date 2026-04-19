'use client';
import FeedLayout from '@/components/FeedLayout';
import { useExploreFeedItems } from '@/hooks/useFeed';

export default function ExplorePage() {
  const { data, isLoading } = useExploreFeedItems({ limit: 100 });
  return <FeedLayout title="Explore" subtitle="News from across the wider region" items={data?.items ?? []} loading={isLoading} />;
}
