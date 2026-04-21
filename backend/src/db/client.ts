import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool } from 'pg';

let pool: Pool | undefined;

function createPoolFromEnv(): Pool {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new Pool({ connectionString: url });
  }
  throw new Error('DATABASE_URL or DB_SECRET_ARN must be set');
}

export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    pool = createPoolFromEnv();
    return pool;
  }

  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DATABASE_URL or DB_SECRET_ARN must be set');
  }

  const sm = new SecretsManagerClient({});
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const { username, password, host, port, dbname } = JSON.parse(secret.SecretString!);

  pool = new Pool({
    user: username,
    password,
    host,
    port,
    database: dbname,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}
