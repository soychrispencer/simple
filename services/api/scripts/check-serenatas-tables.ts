/**
 * Verifica tablas clave de SimpleSerenatas.
 * Uso: pnpm exec tsx scripts/check-serenatas-tables.ts
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
    const [{ n }] = await sql<{ n: string }[]>`
      SELECT count(*)::text AS n FROM drizzle.__drizzle_migrations
    `;
    console.log(`Migraciones registradas: ${n}`);

    const tables = ['serenatas', 'serenata_musician_lineup', 'serenata_groups', 'serenata_assignments'];
    for (const t of tables) {
      const [row] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ${t}
        ) AS exists
      `;
      console.log(`${t}: ${row.exists ? 'OK' : 'FALTA'}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
