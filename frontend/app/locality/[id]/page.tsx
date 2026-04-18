'use client';
import { use } from 'react';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems, useLocalities } from '@/hooks/useFeed';

export default function LocalityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: localities } = useLocalities();
  const { data, isLoading } = useFeedItems({ localityIds: [id] });

  const locality = localities?.find((l) => l.id === id);
  return (
    <FeedLayout
      title={locality?.name ?? 'Locality Feed'}
      items={data?.items ?? []}
      loading={isLoading}
    />
  );
}
