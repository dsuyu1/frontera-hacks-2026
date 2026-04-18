import { execSync } from 'child_process';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, createReadStream, mkdirSync, rmSync } from 'fs';
import { pipeline } from 'stream/promises';
import { withClient } from '../lib/db';

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;
const FFMPEG = '/opt/bin/ffmpeg';
const TMP = '/tmp/clip';

interface Event { video_id: string }

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: pendingClips } = await db.query(
      "SELECT c.*, v.s3_key as video_s3_key FROM clips c JOIN videos v ON v.id = c.video_id WHERE c.video_id = $1 AND c.status = 'pending'",
      [video_id],
    );

    if (pendingClips.length === 0) return { video_id, clipped: 0 };

    mkdirSync(`${TMP}/${video_id}`, { recursive: true });

    // Download the source audio once
    const srcKey = pendingClips[0].video_s3_key;
    const ext = srcKey.split('.').pop();
    const localSrc = `${TMP}/${video_id}/source.${ext}`;

    const srcObj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: srcKey }));
    await pipeline(srcObj.Body as NodeJS.ReadableStream, createWriteStream(localSrc));

    let clipped = 0;
    for (const clip of pendingClips) {
      try {
        const paddedStart = Math.max(0, clip.start_time_s - 3);
        const duration = clip.end_time_s - paddedStart + 5;
        const clipFile = `${TMP}/${video_id}/clip-${clip.id}.mp4`;
        const s3Key = `clips/${video_id}/${clip.id}.mp4`;

        // Cut and re-encode to H.264/AAC streaming-friendly MP4
        execSync(
          `${FFMPEG} -y -ss ${paddedStart} -i "${localSrc}" -t ${duration} ` +
          `-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${clipFile}" 2>/dev/null`,
          { timeout: 300_000 },
        );

        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: s3Key,
          Body: createReadStream(clipFile),
          ContentType: 'video/mp4',
        }));

        await db.query(
          "UPDATE clips SET s3_key = $1, status = 'ready' WHERE id = $2",
          [s3Key, clip.id],
        );
        clipped++;
      } catch (err) {
        console.error(`Failed to clip ${clip.id}:`, err);
        await db.query("UPDATE clips SET status = 'failed' WHERE id = $1", [clip.id]);
      }
    }

    rmSync(`${TMP}/${video_id}`, { recursive: true, force: true });

    return { video_id, clipped };
  });
};
