import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '@simple/logger';
import { env, isProduction } from '../env.js';
import * as schema from './schema';

const databaseUrl = env.DATABASE_URL?.trim();
const ignoreDrizzleBootstrapNotice = (notice: { code?: string }) => {
  if (notice.code === '42P06' || notice.code === '42P07') return;
  logger.warn('PostgreSQL notice', { notice });
};

if (!databaseUrl && !env.PGPASSWORD && isProduction) {
    throw new Error('DATABASE_URL or PGPASSWORD is required in production');
}

const client = databaseUrl
  ? postgres(databaseUrl, { onnotice: ignoreDrizzleBootstrapNotice })
  : postgres({
      host: env.PGHOST ?? 'localhost',
      port: env.PGPORT ?? 5432,
      database: env.PGDATABASE ?? 'simplev2',
      username: env.PGUSER ?? 'postgres',
      password: env.PGPASSWORD ?? 'password',
      onnotice: ignoreDrizzleBootstrapNotice,
    });

// Create the drizzle instance
export const db = drizzle(client, { schema });

// Export types
export type * from './schema';
