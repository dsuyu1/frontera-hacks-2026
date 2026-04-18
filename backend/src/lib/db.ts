import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool, PoolClient } from 'pg';

let pool: Pool | undefined;

export async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const sm = new SecretsManagerClient({});
  const { SecretString } = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN! }));
  const { username, password, host, port, dbname } = JSON.parse(SecretString!);
  pool = new Pool({ user: username, password, host, port: Number(port), database: dbname, ssl: { rejectUnauthorized: false }, max: 5 });
  return pool;
}

export async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const db = await getPool();
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
