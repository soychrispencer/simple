import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl && !process.env.PGPASSWORD && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL or PGPASSWORD is required in production');
}

const client = databaseUrl
  ? postgres(databaseUrl)
  : postgres({
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5432),
      database: process.env.PGDATABASE ?? 'simplev2',
      username: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD ?? 'password',
    });

// Create the drizzle instance
export const db = drizzle(client, { schema });

// Export types
export type * from './schema';
