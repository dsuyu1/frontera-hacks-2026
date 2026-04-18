import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, TranscriptionJobStatus, MediaFormat } from '@aws-sdk/client-transcribe';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';

const transcribe = new TranscribeClient({});
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

interface Event { video_id: string; action?: 'start' | 'check' }

export const handler = async (event: Event) => {
  const { video_id, action = 'start' } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query('SELECT * FROM videos WHERE id = $1', [video_id]);
    if (!video) throw new Error(`Video not found: ${video_id}`);

    if (action === 'start') {
      if (video.status === 'transcribed') return { video_id, status: 'completed' };

      const jobName = `frontera-${video_id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
      const ext = video.s3_key.split('.').pop() as MediaFormat;

      await transcribe.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        Media: { MediaFileUri: `s3://${BUCKET}/${video.s3_key}` },
        MediaFormat: (ext === 'mp3' ? 'mp3' : 'mp4') as MediaFormat,
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
    if (!transcript) throw new Error(`No transcript record for video ${video_id}`);

    const { TranscriptionJob } = await transcribe.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: transcript.job_name }),
    );

    const jobStatus = TranscriptionJob?.TranscriptionJobStatus;

    if (jobStatus === TranscriptionJobStatus.COMPLETED) {
      await db.query(
        "UPDATE transcripts SET status = 'completed', done_at = now() WHERE video_id = $1",
        [video_id],
      );
      await db.query("UPDATE videos SET status = 'transcribed' WHERE id = $1", [video_id]);
      return { video_id, status: 'completed', s3_key: transcript.s3_key };
    }

    if (jobStatus === TranscriptionJobStatus.FAILED) {
      await db.query("UPDATE transcripts SET status = 'failed' WHERE video_id = $1", [video_id]);
      throw new Error(`Transcription failed for ${video_id}: ${TranscriptionJob?.FailureReason}`);
    }

    // IN_PROGRESS — signal Step Functions to wait and retry
    return { video_id, status: 'in_progress', wait: true };
  });
};
