import type { Handler } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { runIngest } from '../ingest/runIngest';
import { getPool } from '../db/client';
import { fetchRssXml, backfillThumbnails } from '../ingest/rss';

const sfn = new SFNClient({});

async function startPipelineForVideo(videoId: string): Promise<void> {
  const smArn = process.env.PIPELINE_SM_ARN;
  if (!smArn) return;
  try {
    await sfn.send(new StartExecutionCommand({
      stateMachineArn: smArn,
      name: `video-${videoId}-${Date.now()}`,
      input: JSON.stringify({ video_id: videoId }),
    }));
  } catch (err) {
    console.error(`Failed to start pipeline for video ${videoId}:`, err);
  }
}

export const handler: Handler = async (event: { backfill?: boolean } = {}) => {
  if (event?.backfill) {
    const pool = await getPool();
    const { rows: sources } = await pool.query(
      `SELECT s.id, s.locality_id, s.type, s.url, s.config,
              l.name AS locality_name, l.city, l.county, l.region
       FROM sources s JOIN localities l ON l.id = s.locality_id
       WHERE s.active = true AND s.type = 'rss'`,
    );
    let total = 0;
    for (const source of sources) {
      try {
        const xml = await fetchRssXml(source.url);
        const n = await backfillThumbnails(pool, source, xml);
        total += n;
        console.log(`backfill: ${source.url} → ${n} updated`);
      } catch (err) {
        console.error(`backfill error for ${source.url}:`, err);
      }
    }
    console.log(JSON.stringify({ ok: true, backfilled: total }));
    return { backfilled: total };
  }

  const result = await runIngest();

  // Collect pending videos and trigger Step Functions pipeline for each
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM videos WHERE status = 'pending' ORDER BY id",
  );
  const videos_queued = rows.map((r) => r.id);

  // Kick off pipeline executions in parallel (fire-and-forget per video)
  await Promise.allSettled(videos_queued.map(startPipelineForVideo));

  const output = { ...result, videos_queued, pipelines_started: videos_queued.length };
  console.log(JSON.stringify({ ok: true, ...output }));
  return output;
};
