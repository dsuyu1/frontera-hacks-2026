import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, TranscriptionJobStatus, MediaFormat } from '@aws-sdk/client-transcribe';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';

const transcribe = new TranscribeClient({});
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

interface Event { video_id: string; action?: 'start' | 'check' }

// Convert AWS Transcribe JSON to a readable text blob and save as plain text
async function saveTranscriptAsText(videoId: string, s3Key: string): Promise<string> {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const raw = await obj.Body!.transformToString();
  const json = JSON.parse(raw);

  const items: { start: string; end: string; text: string }[] = [];
  let sentence = '';
  let sentStart = '';
  let sentEnd = '';

  for (const item of json.results?.items ?? []) {
    if (item.type === 'punctuation') {
      sentence += item.alternatives[0]?.content ?? '';
      continue;
    }
    const word = item.alternatives[0]?.content ?? '';
    if (!sentence) sentStart = item.start_time;
    sentence += (sentence ? ' ' : '') + word;
    sentEnd = item.end_time;

    // Break at ~15 words to create paragraph-like blocks
    if (sentence.split(' ').length >= 15) {
      items.push({ start: sentStart, end: sentEnd, text: sentence });
      sentence = '';
    }
  }
  if (sentence) items.push({ start: sentStart, end: sentEnd, text: sentence });

  const textContent = items.map(i => i.text).join(' ');
  const vttContent = 'WEBVTT\n\n' + items.map((item, i) =>
    `${i + 1}\n${formatVttTime(parseFloat(item.start))} --> ${formatVttTime(parseFloat(item.end))}\n${item.text}`
  ).join('\n\n');

  const vttKey = `captions/${videoId}/auto.vtt`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: vttKey,
    Body: vttContent,
    ContentType: 'text/vtt',
  }));

  return vttKey;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(6, '0')}`;
}

export const handler = async (event: Event) => {
  const { video_id, action = 'start' } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query('SELECT * FROM videos WHERE id = $1', [video_id]);
    if (!video) throw new Error(`Video not found: ${video_id}`);

    if (action === 'start') {
      // YouTube captions already downloaded by video-acquire — skip AWS Transcribe
      if (video.status === 'transcribed' || video.caption_s3_key) {
        return { video_id, status: 'completed' };
      }

      // No s3_key means video file wasn't downloaded — can't transcribe
      if (!video.s3_key) {
        console.warn(`Video ${video_id} has no s3_key, skipping transcription`);
        await db.query("UPDATE videos SET status = 'transcribed' WHERE id = $1", [video_id]);
        return { video_id, status: 'completed' };
      }

      const jobName = `frontera-${video_id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
      const ext = (video.s3_key.split('.').pop() ?? 'mp4') as MediaFormat;

      await transcribe.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        Media: { MediaFileUri: `s3://${BUCKET}/${video.s3_key}` },
        MediaFormat: (['mp3', 'mp4', 'wav', 'flac', 'ogg', 'amr', 'webm'].includes(ext) ? ext : 'mp4') as MediaFormat,
        LanguageCode: 'en-US',
        OutputBucketName: BUCKET,
        OutputKey: `transcripts/${video_id}/transcribe.json`,
        Settings: { ShowSpeakerLabels: true, MaxSpeakerLabels: 10 },
      }));

      await db.query(
        `INSERT INTO transcripts (video_id, s3_key, job_name, status, started_at)
         VALUES ($1, $2, $3, 'in_progress', now())
         ON CONFLICT DO NOTHING`,
        [video_id, `transcripts/${video_id}/transcribe.json`, jobName],
      );

      return { video_id, job_name: jobName, status: 'started' };
    }

    // action === 'check'
    const { rows: [transcript] } = await db.query('SELECT * FROM transcripts WHERE video_id = $1', [video_id]);
    if (!transcript) {
      // No transcript job — treat as already done (edge case)
      return { video_id, status: 'completed' };
    }

    const { TranscriptionJob } = await transcribe.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: transcript.job_name }),
    );

    const jobStatus = TranscriptionJob?.TranscriptionJobStatus;

    if (jobStatus === TranscriptionJobStatus.COMPLETED) {
      // Convert Transcribe JSON → VTT and update caption_s3_key
      const vttKey = await saveTranscriptAsText(video_id, transcript.s3_key);

      await db.query(
        "UPDATE transcripts SET status = 'completed', done_at = now() WHERE video_id = $1",
        [video_id],
      );
      await db.query(
        "UPDATE videos SET status = 'transcribed', caption_s3_key = $1 WHERE id = $2",
        [vttKey, video_id],
      );
      return { video_id, status: 'completed', s3_key: transcript.s3_key };
    }

    if (jobStatus === TranscriptionJobStatus.FAILED) {
      await db.query("UPDATE transcripts SET status = 'failed' WHERE video_id = $1", [video_id]);
      // Don't throw — fall through to segment with empty captions
      await db.query("UPDATE videos SET status = 'transcribed' WHERE id = $1", [video_id]);
      return { video_id, status: 'completed' };
    }

    return { video_id, status: 'in_progress', wait: true };
  });
};
