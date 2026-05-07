/**
 * Alinea serenata_musician_profiles con 0041 si la tabla legacy no tenía is_active.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
for (const name of ['.env.local', '.env']) {
  const p = path.join(apiRoot, name);
  if (existsSync(p)) {
    process.loadEnvFile?.(p);
    break;
  }
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    await sql`
      ALTER TABLE serenata_musician_profiles
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS musician_profiles_active_idx
      ON serenata_musician_profiles(is_active)
    `;
    console.log('serenata_musician_profiles.is_active + índice: OK');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
