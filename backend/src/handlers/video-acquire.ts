import { execSync } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { withClient } from '../lib/db';

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;
const YTDLP = '/opt/bin/yt-dlp';
const TMP = '/tmp/captions';

interface Event { video_id: string }

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query(
      'SELECT * FROM videos WHERE id = $1', [video_id],
    );
    if (!video) throw new Error(`Video not found: ${video_id}`);
    if (video.status !== 'pending') return { video_id, skipped: true, status: video.status };

    const videoUrl = video.source_url;
    const dir = `${TMP}/${video_id}`;
    mkdirSync(dir, { recursive: true });

    console.log(`Downloading captions for ${videoUrl}`);

    try {
      execSync(
        `${YTDLP} --write-auto-sub --skip-download --sub-format vtt --sub-langs en ` +
        `--js-runtimes node --no-warnings -o "${dir}/caption" "${videoUrl}" 2>&1`,
        { timeout: 60_000, encoding: 'utf8' },
      );
    } catch (err) {
      // Some videos have no auto-captions; store empty and continue
      console.warn(`Caption download failed for ${video_id}:`, err);
      const emptyCaption = 'WEBVTT\n\n';
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: `captions/${video_id}/auto.vtt`,
        Body: emptyCaption,
        ContentType: 'text/vtt',
      }));
      await db.query(
        "UPDATE videos SET caption_s3_key = $1, status = 'transcribed' WHERE id = $2",
        [`captions/${video_id}/auto.vtt`, video_id],
      );
      return { video_id, status: 'transcribed', has_captions: false };
    }

    // Find the downloaded VTT file
    const files = readdirSync(dir);
    const vttFile = files.find(f => f.endsWith('.vtt'));

    let vttContent: string;
    if (vttFile) {
      vttContent = readFileSync(`${dir}/${vttFile}`, 'utf8');
    } else {
      vttContent = 'WEBVTT\n\n';
    }

    const s3Key = `captions/${video_id}/auto.vtt`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: s3Key,
      Body: vttContent,
      ContentType: 'text/vtt',
    }));

    await db.query(
      "UPDATE videos SET caption_s3_key = $1, status = 'transcribed' WHERE id = $2",
      [s3Key, video_id],
    );

    rmSync(dir, { recursive: true, force: true });

    return { video_id, caption_s3_key: s3Key, status: 'transcribed', has_captions: !!vttFile };
  });
};
