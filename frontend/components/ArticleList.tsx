'use client';
import { FeedItem } from '@/lib/api';
import ArticleRow from './ArticleRow';

interface Props {
  title: string;
  items: FeedItem[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (item: FeedItem) => void;
  filterUnread?: boolean;
  onToggleUnread?: () => void;
}

export default function ArticleList({ title, items, loading, selectedId, onSelect, filterUnread, onToggleUnread }: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-400 animate-pulse">Loading feed...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200 h-full">
      {/* List header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{items.length} items</span>
          {onToggleUnread && (
            <button
              onClick={onToggleUnread}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                filterUnread ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Unread
            </button>
          )}
        </div>
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No articles yet</p>
            <p className="text-xs text-gray-400">The daily pipeline runs at 3 AM. Check back tomorrow or trigger a manual run.</p>
          </div>
        ) : (
          items.map((item) => (
            <ArticleRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={() => onSelect(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}
