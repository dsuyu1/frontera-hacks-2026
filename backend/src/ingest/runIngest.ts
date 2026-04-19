import type { Pool } from 'pg';
import { getPool } from '../db/client';
import { fetchRssXml, ingestRssSource } from './rss';
import { putRawRssSnapshot } from './s3RawSnapshot';
import { ingestYouTubeSource } from './youtube';
import { ingestSwagitSource } from './swagit';
import { refreshElectionSnapshots } from './elections';
import type { IngestResult, SourceRow } from './types';

async function loadActiveSources(pool: Pool): Promise<SourceRow[]> {
  const { rows } = await pool.query<SourceRow>(
    `SELECT s.id, s.locality_id, s.type, s.url, s.config,
            l.name AS locality_name, l.city, l.county, l.region
     FROM sources s
     INNER JOIN localities l ON l.id = s.locality_id
     WHERE s.active = true
     ORDER BY l.city, s.url`,
  );
  return rows;
}

export async function runIngest(pool?: Pool): Promise<IngestResult> {
  const p = pool ?? (await getPool());
  const sources = await loadActiveSources(p);
  const errors: string[] = [];
  let itemsInserted = 0;
  const newVideoIds: string[] = [];

  for (const source of sources) {
    try {
      if (source.type === 'rss') {
        const xml = await fetchRssXml(source.url);
        await putRawRssSnapshot(source.id, xml);
        const n = await ingestRssSource(p, source, xml);
        itemsInserted += n;
      } else if (source.type === 'youtube_channel') {
        const { inserted, videoIds } = await ingestYouTubeSource(p, source);
        itemsInserted += inserted;
        newVideoIds.push(...videoIds);
      } else if (source.type === 'swagit') {
        const n = await ingestSwagitSource(p, source);
        itemsInserted += n;
      } else {
        errors.push(`skipped unsupported source type "${source.type}" (${source.id})`);
      }
    } catch (err) {
      errors.push(`source ${source.id} (${source.type}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    await refreshElectionSnapshots(p);
  } catch (err) {
    errors.push(`elections: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    sourcesProcessed: sources.length,
    itemsInserted,
    errors,
    videos_queued: newVideoIds,
  };
}
