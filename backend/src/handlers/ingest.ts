import type { Handler } from 'aws-lambda';
import { runIngest } from '../ingest/runIngest';
import { getPool } from '../db/client';

export const handler: Handler = async () => {
  const result = await runIngest();

  // Collect any videos that still need processing after ingest
  const pool = await getPool();
  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM videos WHERE status = 'pending' ORDER BY id",
  );
  const videos_queued = rows.map((r) => r.id);

  const output = { ...result, videos_queued };
  console.log(JSON.stringify({ ok: true, ...output }));
  return output;
};
