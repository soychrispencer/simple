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
  const rows = await sql<{ t: string }[]>`
    SELECT table_name AS t FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'serenata%'
    ORDER BY table_name
  `;
  rows.forEach((r) => console.log(r.t));
  await sql.end();
}

main();
