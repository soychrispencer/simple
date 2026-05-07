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

const table = process.argv[2] ?? 'serenata_musicians';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  console.log(`${table}:\n` + rows.map((r) => r.column_name).join('\n'));
  await sql.end();
}

main();
