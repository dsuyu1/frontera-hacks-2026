import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3: S3Client | undefined;

function getS3(): S3Client {
  if (!s3) s3 = new S3Client({});
  return s3;
}

/** Optional: store raw RSS XML for debugging / reprocessing. */
export async function putRawRssSnapshot(sourceId: string, xml: string): Promise<void> {
  const bucket = process.env.RAW_BUCKET;
  if (!bucket) return;

  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10);
  const key = `raw/sources/${sourceId}/${dateStr}/ingest-${Date.now()}.xml`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(xml, 'utf8'),
      ContentType: 'application/rss+xml',
    }),
  );
}
