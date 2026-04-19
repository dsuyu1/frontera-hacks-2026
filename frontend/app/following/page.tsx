'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFollowingFeedItems } from '@/hooks/useFeed';

export default function FollowingPage() {
  const { data, isLoading } = useFollowingFeedItems();
  return (
    <FeedLayout
      title="Following"
      subtitle="Articles from sources you follow"
      items={data?.items ?? []}
      loading={isLoading}
    />
  );
}
