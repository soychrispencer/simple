/**
 * Alinea serenata_subscriptions con 0041 cuando la tabla era legacy sin external_*.
 * Uso: pnpm exec tsx scripts/repair-serenata-subscriptions-columns.ts
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
      ALTER TABLE "serenata_subscriptions"
        ADD COLUMN IF NOT EXISTS "external_subscription_id" varchar(255);
      ALTER TABLE "serenata_subscriptions"
        ADD COLUMN IF NOT EXISTS "external_customer_id" varchar(255);
    `);
    console.log('OK: columnas external_* en serenata_subscriptions');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
