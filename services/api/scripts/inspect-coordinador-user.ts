/**
 * Consulta estado real de coordinador@simpleserenatas.app (local).
 * Uso: pnpm exec tsx scripts/inspect-coordinador-user.ts
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

const EMAIL = 'coordinador@simpleserenatas.app';

async function main() {
  const sql = postgres(url);
  try {
    const rows = await sql<
      {
        user_id: string;
        email: string;
        role: string | null;
        profile_id: string | null;
        subscription_plan: string | null;
        subscription_status: string | null;
        subscription_ends_at: Date | null;
        subscription_started_at: Date | null;
      }[]
    >`
      SELECT
        u.id AS user_id,
        u.email,
        u.role,
        p.id AS profile_id,
        p.subscription_plan,
        p.subscription_status,
        p.subscription_ends_at,
        p.subscription_started_at
      FROM users u
      LEFT JOIN serenata_coordinator_profiles p ON p.user_id = u.id
      WHERE u.email = ${EMAIL}
    `;

    if (rows.length === 0) {
      console.log(`No existe usuario con email ${EMAIL}`);
      return;
    }

    const r = rows[0];
    console.log(JSON.stringify(r, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
