/**
 * Esquemas legacy sin columna phone en serenata_musician_profiles (falla 0047).
 * Uso: pnpm exec tsx scripts/repair-serenata-musician-profiles-phone.ts
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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no definida');
  process.exit(1);
}

async function main() {
  const sql = postgres(url);
  try {
    await sql.unsafe(`
      ALTER TABLE "serenata_musician_profiles"
        ADD COLUMN IF NOT EXISTS "phone" varchar(50);
    `);
    console.log('OK: phone en serenata_musician_profiles');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
