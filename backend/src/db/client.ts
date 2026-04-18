import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool } from 'pg';

let pool: Pool | undefined;

export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const sm = new SecretsManagerClient({});
  const secret = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN! }),
  );
  const { username, password, host, port, dbname } = JSON.parse(secret.SecretString!);

  pool = new Pool({ user: username, password, host, port, database: dbname, ssl: { rejectUnauthorized: false } });
  return pool;
}
