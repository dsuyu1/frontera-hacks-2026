import type { PoolClient } from 'pg';
import { getPool } from '../db/client';

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const db = await getPool();
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
