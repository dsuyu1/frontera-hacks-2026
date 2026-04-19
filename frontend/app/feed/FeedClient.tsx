'use client';

import { useSearchParams } from 'next/navigation';
import FolderFeedClient from './FolderFeedClient';

export default function FeedClient() {
  const params = useSearchParams();
  const folderId = params.get('folderId');

  if (!folderId) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Feed not found.
      </div>
    );
  }

  return <FolderFeedClient folderId={folderId} />;
}
