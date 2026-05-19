/**
 * Aplica solo el CHECK de primary_vertical de 0041 cuando el esquema
 * Serenatas activo (0042+) ya existe — evita DROP TABLE destructivos.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
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

const TAG = '0041_remove_discontinued_vertical';

function migrationHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

async function main() {
    const filePath = path.join(apiRoot, 'drizzle', `${TAG}.sql`);
    const body = readFileSync(filePath, 'utf8');
    const hash = migrationHash(body);

    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
        const [{ hasSerenatas }] = await sql<{ hasSerenatas: boolean }[]>`
            SELECT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'users_primary_vertical_check'
                  AND pg_get_constraintdef(oid) LIKE '%serenatas%'
            ) AS "hasSerenatas"
        `;

        if (!hasSerenatas) {
            console.info('CHECK ya sin serenatas; solo registrar hash si falta.');
        } else {
            await sql.unsafe(`
                UPDATE "users"
                SET "primary_vertical" = NULL
                WHERE "primary_vertical" = 'serenatas';

                ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_primary_vertical_check";
                ALTER TABLE "users"
                ADD CONSTRAINT "users_primary_vertical_check"
                CHECK ("primary_vertical" IS NULL OR "primary_vertical" IN ('autos','propiedades','agenda'));
            `);
            console.info('CHECK primary_vertical actualizado (sin DROP TABLE).');
        }

        const applied = await sql<{ hash: string }[]>`
            SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
        `;
        if (applied.length > 0) {
            console.info(`Hash ${TAG} ya registrado.`);
            return;
        }

        await sql`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
        `;
        console.info(`Hash registrado: ${TAG} (${hash.slice(0, 12)}…)`);
    } finally {
        await sql.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
