'use client';
import FeedLayout from '@/components/FeedLayout';
import { useFeedItems, useLocalities } from '@/hooks/useFeed';

export default function LocalityClient({ id }: { id: string }) {
  const { data: localities } = useLocalities();
  const { data, isLoading } = useFeedItems({ localityIds: [id] });
  const locality = localities?.find((l) => l.id === id);
  return (
    <FeedLayout title={locality?.name ?? 'Locality Feed'} items={data?.items ?? []} loading={isLoading} />
  );
}
