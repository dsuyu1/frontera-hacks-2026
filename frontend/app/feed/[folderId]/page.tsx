import FolderFeedClient from '../FolderFeedClient';

export default async function FolderFeedPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  return <FolderFeedClient folderId={folderId} />;
}
