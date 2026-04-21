import { Suspense } from 'react';
import FeedClient from './FeedClient';

export default function FeedFolderPage() {
  return (
    <Suspense>
      <FeedClient />
    </Suspense>
  );
}
