'use client';
import useSWR from 'swr';
import { FeedItem, api } from '@/lib/api';
import AskAIPanel from './AskAIPanel';

export default function AiSidePanel({ item }: { item: FeedItem }) {
  const isVideo = item.type === 'video';

  const { data: articleData } = useSWR(
    !isVideo ? `article:${item.id}` : null,
    () => api.article(item.source_url),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  const { data: transcriptData } = useSWR(
    isVideo ? `transcript:${item.id}` : null,
    () => api.transcript(item.id),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const contextText = isVideo ? (transcriptData?.text ?? '') : (articleData?.text ?? '');

  return <AskAIPanel item={item} contextText={contextText} />;
}
