import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import postgres from 'postgres';

const tag = process.argv[2];
if (!tag) {
  console.error('Uso: pnpm exec tsx scripts/run-single-migration-file.ts <tag_sin_sql>');
  console.error('Ej: ... 0041_serenatas_coordinators');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
for (const name of ['.env.local', '.env']) {
  const p = path.join(apiRoot, name);
  if (existsSync(p)) {
    process.loadEnvFile?.(p);
    break;
  }
}

function migrationHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function main() {
  const filePath = path.join(apiRoot, 'drizzle', `${tag}.sql`);
  const body = readFileSync(filePath, 'utf8');
  const hash = migrationHash(body);

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    await sql.unsafe(body);
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${Date.now()})
    `;
    console.log(`OK ${tag} hash=${hash.slice(0, 12)}…`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
