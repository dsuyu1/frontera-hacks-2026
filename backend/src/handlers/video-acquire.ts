import { execSync } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, statSync, mkdirSync, rmSync } from 'fs';
import { withClient } from '../lib/db';

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;
const YTDLP = '/opt/bin/yt-dlp';
const TMP = '/tmp/video-acquire';

interface Event { video_id: string }

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query(
      'SELECT * FROM videos WHERE id = $1', [video_id],
    );
    if (!video) throw new Error(`Video not found: ${video_id}`);
    if (video.status === 'downloaded') return { video_id, skipped: true };

    mkdirSync(`${TMP}/${video_id}`, { recursive: true });
    const outPath = `${TMP}/${video_id}/original.mp4`;

    console.log(`Downloading ${video.source_url}`);

    // Download audio only (much smaller; sufficient for transcription + clipping audio)
    execSync(
      `${YTDLP} -x --audio-format mp3 -o "${TMP}/${video_id}/original.%(ext)s" --no-warnings "${video.source_url}"`,
      { timeout: 600_000 },
    );

    // Find the downloaded file
    const files = execSync(`ls ${TMP}/${video_id}/`, { encoding: 'utf8' }).trim().split('\n');
    const audioFile = files.find((f) => f.match(/\.(mp3|m4a|webm|opus)$/));
    if (!audioFile) throw new Error('No audio file found after download');

    const localPath = `${TMP}/${video_id}/${audioFile}`;
    const ext = audioFile.split('.').pop()!;
    const s3Key = `raw/video/${video_id}/original.${ext}`;

    // Get duration via yt-dlp metadata
    const metaJson = execSync(
      `${YTDLP} --dump-json --no-download --no-warnings "${video.source_url}" 2>/dev/null`,
      { encoding: 'utf8', timeout: 30_000 },
    );
    const meta = JSON.parse(metaJson);
    const durationS = Math.round(meta.duration ?? 0);

    console.log(`Uploading to S3: ${s3Key} (${statSync(localPath).size} bytes)`);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: s3Key,
      Body: createReadStream(localPath),
      ContentType: `audio/${ext}`,
    }));

    await db.query(
      "UPDATE videos SET s3_key = $1, duration_s = $2, status = 'downloaded' WHERE id = $3",
      [s3Key, durationS, video_id],
    );

    rmSync(`${TMP}/${video_id}`, { recursive: true, force: true });

    return { video_id, s3_key: s3Key, duration_s: durationS };
  });
};
