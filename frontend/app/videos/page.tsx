'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems } from '@/hooks/useFeed';

export default function VideosPage() {
  const { data, isLoading } = useFeedItems({ type: 'video' });
  return <FeedLayout title="Video Clips" items={data?.items ?? []} loading={isLoading} />;
}
