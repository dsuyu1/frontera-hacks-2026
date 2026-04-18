'use client';
import { FeedItem } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  item: FeedItem;
  selected: boolean;
  onSelect: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'city-council': 'City Council', 'planning-zoning': 'Zoning', 'infrastructure': 'Infrastructure',
  'public-safety': 'Safety', 'budget-taxes': 'Budget', 'economic-development': 'Economic Dev',
  'education': 'Education', 'transportation': 'Transport', 'utilities-water': 'Utilities',
  'business': 'Business', 'environment': 'Environment', 'health': 'Health', 'politics-elections': 'Politics',
};

export default function ArticleRow({ item, selected, onSelect }: Props) {
  const { readIds } = useFeedStore();
  const isRead = readIds.has(item.id);

  const timeAgo = item.published_at
    ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
    : '';

  const primaryCategory = item.categories?.[0];
  const categoryLabel = primaryCategory ? CATEGORY_LABELS[primaryCategory] ?? primaryCategory : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors group ${
        selected
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Unread dot */}
        <div className="mt-1.5 flex-shrink-0">
          {!isRead ? <div className="unread-dot" /> : <div className="w-1.5 h-1.5" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Source + time */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-gray-400 font-medium">{item.city}</span>
            {categoryLabel && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{categoryLabel}</span>
              </>
            )}
            {item.type === 'video' && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs bg-rose-100 text-rose-600 px-1 rounded font-medium">Video</span>
              </>
            )}
            <span className="text-gray-300 ml-auto">·</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
          </div>

          {/* Title */}
          <p className={`text-sm leading-snug line-clamp-2 ${isRead ? 'text-gray-500 font-normal' : 'text-gray-900 font-medium'}`}>
            {item.title}
          </p>

          {/* Snippet */}
          {item.summary && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.summary}</p>
          )}
        </div>
      </div>
    </button>
  );
}
