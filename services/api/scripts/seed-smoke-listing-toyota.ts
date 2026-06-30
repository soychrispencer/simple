#!/usr/bin/env tsx
/**
 * Seed opcional: un listing autos activo marca Toyota para smoke `SMOKE_LISTING_BRAND=toyota`.
 *
 *   pnpm --filter=@simple/api exec tsx scripts/seed-smoke-listing-toyota.ts
 *
 * Idempotente: no inserta si ya existe un activo autos con raw_data.brand = toyota.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, '..');

for (const candidate of [path.join(apiRoot, '.env'), path.join(apiRoot, '.env.local')]) {
    if (!existsSync(candidate)) continue;
    for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const i = trimmed.indexOf('=');
        if (i <= 0) continue;
        const key = trimmed.slice(0, i).trim();
        if (!key || process.env[key]) continue;
        process.env[key] = trimmed.slice(i + 1).trim();
    }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

const BRAND = (process.env.SMOKE_LISTING_BRAND ?? 'toyota').trim().toLowerCase() || 'toyota';

async function main() {
    const sql = postgres(DATABASE_URL!, { max: 1 });
    try {
        const [{ count }] = await sql<{ count: string }[]>`
            SELECT COUNT(*)::text AS count
            FROM listings
            WHERE vertical = 'autos'
              AND status = 'active'
              AND LOWER(COALESCE(raw_data->>'brand', raw_data->'basic'->>'brand', '')) = ${BRAND}
        `;
        if (Number(count) > 0) {
            console.info(`Ya hay ${count} listing(s) activos con brand=${BRAND}; nada que insertar.`);
            return;
        }

        const [{ id: ownerId }] = await sql<{ id: string }[]>`
            SELECT id FROM users WHERE status = 'active' ORDER BY created_at ASC NULLS LAST LIMIT 1
        `;
        if (!ownerId) {
            console.error('No hay usuarios activos; crea un usuario antes del seed.');
            process.exit(1);
        }

        const listingId = randomUUID();
        const hrefSlug = `smoke-${BRAND}-${listingId.slice(0, 8)}`;
        const title = `Toyota Corolla demo smoke (${BRAND})`;
        const rawData = {
            brand: BRAND,
            basic: { brand: BRAND, model: 'corolla', year: 2020 },
            commercial: { price: 12_500_000 },
        };

        await sql`
            INSERT INTO listings (
                id, owner_id, vertical, status, title, href_slug, raw_data, location_data, created_at, updated_at
            ) VALUES (
                ${listingId},
                ${ownerId},
                'autos',
                'active',
                ${title},
                ${hrefSlug},
                ${sql.json(rawData as Record<string, unknown>)},
                ${sql.json({ region: 'Metropolitana', commune: 'Santiago' })},
                NOW(),
                NOW()
            )
        `;

        console.info(`Insertado listing smoke: id=${listingId} href=/${hrefSlug} brand=${BRAND}`);
        console.info('Validar: pnpm --filter=@simple/api run smoke:marketplace');
    } finally {
        await sql.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
