'use client';
import { useEffect } from 'react';
import { FeedItem, Clip } from '@/lib/api';
import { useFeedStore } from '@/lib/store';
import VideoPlayer from './VideoPlayer';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  item: FeedItem | null;
  onClose?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'city-council': 'City Council', 'planning-zoning': 'Planning & Zoning', 'infrastructure': 'Infrastructure',
  'public-safety': 'Public Safety', 'budget-taxes': 'Budget & Taxes', 'economic-development': 'Economic Development',
  'education': 'Education', 'transportation': 'Transportation', 'utilities-water': 'Utilities & Water',
  'business': 'Business', 'environment': 'Environment', 'health': 'Health', 'politics-elections': 'Politics',
};

export default function Reader({ item, onClose }: Props) {
  const { readIds, savedIds, markRead, markUnread, toggleSaved } = useFeedStore();

  // Auto-mark as read when opened
  useEffect(() => {
    if (item && !readIds.has(item.id)) markRead(item.id);
  }, [item?.id]);

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center px-8">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">Select an article to read</p>
        <p className="text-xs text-gray-400">Use <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs">j</kbd> / <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs">k</kbd> to navigate</p>
      </div>
    );
  }

  const isRead = readIds.has(item.id);
  const isSaved = savedIds.has(item.id);
  const clip = item.clip as Clip | null | undefined;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Reader toolbar */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 lg:hidden">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => isRead ? markUnread(item.id) : markRead(item.id)}
            title={isRead ? 'Mark unread (m)' : 'Mark read (m)'}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors ${
              isRead ? 'text-gray-500 hover:bg-gray-100' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={isRead ? 'none' : 'currentColor'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
            </svg>
            {isRead ? 'Read' : 'Unread'}
          </button>

          <button
            onClick={() => toggleSaved(item.id)}
            title={isSaved ? 'Unsave (s)' : 'Save for later (s)'}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors ${
              isSaved ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaved ? 'Saved' : 'Save'}
          </button>

          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Original
          </a>
        </div>
      </div>

      {/* Article content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto w-full">
        {/* Category tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">{item.city}</span>
          {item.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
          ))}
          {item.type === 'video' && (
            <span className="text-xs px-2 py-1 bg-rose-50 text-rose-600 rounded-full font-medium">Video</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{item.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <span>{item.jurisdiction ?? item.city}</span>
          <span>·</span>
          <span>{item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true }) : 'Unknown date'}</span>
          <span>·</span>
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors truncate max-w-[200px]">
            {new URL(item.source_url).hostname}
          </a>
        </div>

        {/* Video player */}
        {clip && (
          <div className="mb-6">
            <VideoPlayer clip={clip} />
          </div>
        )}

        {/* Summary */}
        {item.summary && (
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
            <p>{item.summary}</p>
          </div>
        )}

        {!item.summary && !clip && (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500 mb-2">Content pending processing</p>
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600 underline"
            >
              View original source →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
