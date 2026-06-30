import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

const apiRootDir = path.resolve(__dirname);
for (const candidate of [path.join(apiRootDir, '.env'), path.join(apiRootDir, '.env.local')]) {
  try {
    if (existsSync(candidate)) {
      process.loadEnvFile?.(candidate);
    }
  } catch {
    // Allow explicit env vars to win in CI/production.
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
