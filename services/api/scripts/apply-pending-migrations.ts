/**
 * Aplica migraciones SQL pendientes según el orden del journal.
 * Índice inicial = COUNT(*) en drizzle.__drizzle_migrations (sin comparar hashes).
 *
 * Uso: pnpm exec tsx scripts/apply-pending-migrations.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
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

function migrationHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function main() {
  const journalPath = path.join(apiRoot, 'drizzle', 'meta', '_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ idx: number; tag: string }>;
  };

  const sql = postgres(url);
  try {
    const [{ count }] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations
    `;
    let startIdx = Number.parseInt(count, 10);
    if (!Number.isFinite(startIdx)) startIdx = 0;

    console.log(`Migraciones ya registradas: ${startIdx}. Journal tiene ${journal.entries.length} entradas.`);

    let appliedNow = 0;
    for (let i = startIdx; i < journal.entries.length; i++) {
      const entry = journal.entries[i];
      const filePath = path.join(apiRoot, 'drizzle', `${entry.tag}.sql`);
      if (!existsSync(filePath)) {
        console.warn(`Saltando índice ${i} ${entry.tag}: no existe el archivo`);
        continue;
      }

      const body = readFileSync(filePath, 'utf8');
      const hash = migrationHash(body);

      console.log(`[${i + 1}/${journal.entries.length}] Aplicando ${entry.tag}…`);

      await sql.unsafe(body);

      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${hash}, ${Date.now()})
      `;

      appliedNow += 1;
      console.log(`  OK`);
    }

    console.log(`Hecho. Migraciones nuevas aplicadas en esta corrida: ${appliedNow}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
