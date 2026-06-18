import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

for (const file of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1).trim();
    }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
}

async function main() {
    const sql = postgres(databaseUrl, { max: 1 });
    const cols = await sql<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'instagram_accounts'
          AND column_name LIKE 'facebook_%'
        ORDER BY column_name
    `;
    console.log(cols.map((row) => row.column_name).join(', ') || '(ninguna)');
    await sql.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
