#!/usr/bin/env tsx
/**
 * Limpia perfiles cliente duplicados en cuentas de operación (dueño o músico).
 *
 * Política: una cuenta no debe tener serenata_clients si ya tiene serenata_owners o serenata_musicians.
 *
 * Uso (desde services/api o raíz del monorepo):
 *   pnpm --filter @simple/api run db:cleanup:serenatas-dual-clients
 *   pnpm --filter @simple/api run db:cleanup:serenatas-dual-clients -- --apply
 *   pnpm --filter @simple/api run db:cleanup:serenatas-dual-clients -- --apply --email=cliente@simpleserenatas.app
 *
 * Por defecto es dry-run (solo lista). Con --apply borra serenata_clients elegibles.
 * No borra si el perfil cliente tiene serenatas vinculadas (revisión manual).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import { serenataClients, serenataMusicians, serenataOwners, serenatas, users } from '../src/db/schema.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const candidate of [path.resolve(scriptDir, '../.env'), path.resolve(scriptDir, '../.env.local')]) {
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
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const emailArg = args.find((arg) => arg.startsWith('--email='));
const emailFilter = emailArg ? emailArg.slice('--email='.length).trim().toLowerCase() : null;

if (!DATABASE_URL) {
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

type DualRow = {
    userId: string;
    email: string;
    name: string | null;
    clientId: string;
    hasOwner: boolean;
    hasMusician: boolean;
    serenataCount: number;
};

async function main() {
    const client = postgres(DATABASE_URL!, { max: 1 });
    const db = drizzle(client, { schema });

    const rows = await db
        .select({
            userId: users.id,
            email: users.email,
            name: users.name,
            clientId: serenataClients.id,
            ownerId: serenataOwners.id,
            musicianId: serenataMusicians.id,
        })
        .from(serenataClients)
        .innerJoin(users, eq(users.id, serenataClients.userId))
        .leftJoin(serenataOwners, eq(serenataOwners.userId, users.id))
        .leftJoin(serenataMusicians, eq(serenataMusicians.userId, users.id))
        .where(
            sql`${serenataOwners.id} IS NOT NULL OR ${serenataMusicians.id} IS NOT NULL`,
        );

    const dualAccounts: DualRow[] = [];
    for (const row of rows) {
        if (emailFilter && row.email.toLowerCase() !== emailFilter) continue;
        const hasOwner = Boolean(row.ownerId);
        const hasMusician = Boolean(row.musicianId);
        if (!hasOwner && !hasMusician) continue;

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(serenatas)
            .where(eq(serenatas.clientId, row.clientId));

        dualAccounts.push({
            userId: row.userId,
            email: row.email,
            name: row.name,
            clientId: row.clientId,
            hasOwner,
            hasMusician,
            serenataCount: Number(count) || 0,
        });
    }

    if (dualAccounts.length === 0) {
        console.log(emailFilter
            ? `No hay perfiles cliente duplicados para ${emailFilter}.`
            : 'No hay perfiles cliente duplicados en cuentas de dueño/músico.');
        await client.end();
        return;
    }

    const removable = dualAccounts.filter((row) => row.serenataCount === 0);
    const blocked = dualAccounts.filter((row) => row.serenataCount > 0);

    console.log(`\nCuentas con perfil cliente + operación: ${dualAccounts.length}`);
    for (const row of dualAccounts) {
        const roles = [
            row.hasOwner ? 'dueño' : null,
            row.hasMusician ? 'músico' : null,
            'cliente (duplicado)',
        ].filter(Boolean).join(', ');
        const action = row.serenataCount === 0 ? 'eliminar cliente' : 'omitir (tiene serenatas)';
        console.log(`  - ${row.email} · ${roles} · ${row.serenataCount} serenata(s) → ${action}`);
    }

    if (blocked.length > 0) {
        console.log(`\n${blocked.length} cuenta(s) con serenatas como cliente requieren revisión manual.`);
    }

    if (!apply) {
        console.log(`\nDry-run. Para borrar ${removable.length} perfil(es) cliente sin serenatas:`);
        console.log('  pnpm --filter @simple/api run db:cleanup:serenatas-dual-clients -- --apply');
        await client.end();
        return;
    }

    if (removable.length === 0) {
        console.log('\nNada que borrar (todas las cuentas tienen serenatas vinculadas al perfil cliente).');
        await client.end();
        return;
    }

    const ids = removable.map((row) => row.clientId);
    const deleted = await db
        .delete(serenataClients)
        .where(inArray(serenataClients.id, ids))
        .returning({ id: serenataClients.id });

    console.log(`\nEliminados ${deleted.length} perfil(es) serenata_clients:`);
    for (const row of removable) {
        console.log(`  ✓ ${row.email}`);
    }

    await client.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
