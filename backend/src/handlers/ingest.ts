import type { Handler } from 'aws-lambda';
import { runIngest } from '../ingest/runIngest';

/**
 * Scheduled via EventBridge. Fetches active RSS sources and inserts new feed items.
 */
export const handler: Handler = async () => {
  const result = await runIngest();
  console.log(JSON.stringify({ ok: true, ...result }));
  return result;
};
