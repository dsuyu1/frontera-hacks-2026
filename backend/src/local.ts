/**
 * Local one-shot ingest. Set DATABASE_URL for Postgres, or DB_SECRET_ARN (+ AWS credentials).
 *
 *   DATABASE_URL=postgres://... npx ts-node src/local.ts
 */
import { runIngest } from './ingest/runIngest';

runIngest()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (r.errors.length) {
      console.error('Ingest completed with errors:', r.errors);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
