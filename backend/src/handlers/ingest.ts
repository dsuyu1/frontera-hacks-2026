import type { Handler } from 'aws-lambda';
import { runIngest } from '../ingest/runIngest';

export const handler: Handler = async () => {
  const result = await runIngest();
  console.log(JSON.stringify({ ok: true, ...result }));
  return result;
};
