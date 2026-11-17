#!/usr/bin/env tsx
/**
 * Fixture local para comprobar que perfiles músico y proveedor conviven bajo un acceso.
 * Rechaza bases remotas y no contacta servicios externos.
 *
 *   pnpm --filter @simple/api run db:seed:serenatas-dual-profile-e2e
 *   pnpm --filter @simple/api run db:clean:serenatas-dual-profile-e2e
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import {
    accountInvitations,
    accountUsers,
    accountVerticalSettings,
    accounts,
    serenataGroupInvites,
    serenataGroupMembers,
    serenataMusicians,
    serenataOwners,
    serenataProviderGroupMemberInvites,
    serenataProviderGroupMembers,
    serenataProviderGroups,
    serenatas,
    subscriptions,
    userPlatformAccess,
    users,
} from '../src/db/schema.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV !== 'production') {
    for (const candidate of [path.resolve(scriptDir, '../.env'), path.resolve(scriptDir, '../.env.local')]) {
        if (!existsSync(candidate)) continue;
        for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0) continue;
            const key = trimmed.slice(0, separatorIndex).trim();
            if (key && !process.env[key]) process.env[key] = trimmed.slice(separatorIndex + 1).trim();
        }
    }
}

const DATABASE_URL = process.env.DATABASE_URL;
const FIXTURE_EMAIL = 'simple-serenatas-dual-profile@simple-e2e.local';
const FIXTURE_NAME = 'E2E SimpleSerenatas Dual Profile';
const FIXTURE_ORIGIN = 'simple-serenatas-dual-profile-e2e';
const FIXTURE_PASSWORD = process.env.SERENATAS_DUAL_PROFILE_E2E_PASSWORD ?? 'simple-serenatas-dual-profile-local-only';
const OWNER_BIO = 'Fixture local SimpleSerenatas dual profile provider.';
const MUSICIAN_BIO = 'Fixture local SimpleSerenatas dual profile musician.';

function assertLocalDatabaseUrl(value: string | undefined): string {
    if (!value) throw new Error('DATABASE_URL no está configurada.');
    if (process.env.NODE_ENV === 'production') throw new Error('Este seed está deshabilitado con NODE_ENV=production.');
    const parsed = new URL(value);
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname)) {
        throw new Error('Este seed solo puede ejecutarse contra PostgreSQL en loopback.');
    }
    return value;
}

async function seed(db: ReturnType<typeof drizzle<typeof schema>>) {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, FIXTURE_EMAIL) });
    if (existingUser && (existingUser.name !== FIXTURE_NAME || existingUser.signupOrigin !== FIXTURE_ORIGIN)) {
        throw new Error('El correo reservado para la fixture existe con otros datos; no se modificó.');
    }

    const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);
    const [user] = existingUser
        ? await db.update(users).set({
            passwordHash,
            role: 'user',
            status: 'verified',
            primaryVertical: null,
            updatedAt: new Date(),
        }).where(eq(users.id, existingUser.id)).returning()
        : await db.insert(users).values({
            email: FIXTURE_EMAIL,
            name: FIXTURE_NAME,
            passwordHash,
            role: 'user',
            status: 'verified',
            primaryVertical: null,
            signupOrigin: FIXTURE_ORIGIN,
        }).returning();

    const existingOwner = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
    if (existingOwner && existingOwner.bio !== OWNER_BIO) {
        throw new Error('El perfil proveedor de la fixture contiene datos ajenos; no se modificó.');
    }
    if (!existingOwner) {
        await db.insert(serenataOwners).values({
            userId: user.id,
            bio: OWNER_BIO,
            subscriptionStatus: 'active',
            subscriptionPrice: 0,
            commissionRateBps: 700,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
    }

    const existingMusician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) });
    if (existingMusician && existingMusician.bio !== MUSICIAN_BIO) {
        throw new Error('El perfil músico de la fixture contiene datos ajenos; no se modificó.');
    }
    if (!existingMusician) {
        await db.insert(serenataMusicians).values({
            userId: user.id,
            bio: MUSICIAN_BIO,
            instrument: 'Guitarra',
            commissionRateBps: 300,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
    }

    console.log('Fixture local lista para SimpleSerenatas: un acceso con perfil proveedor y músico.');
    console.log(`Correo de prueba: ${FIXTURE_EMAIL}`);
    console.log('Para cambiar la clave de fixture, define SERENATAS_DUAL_PROFILE_E2E_PASSWORD antes de ejecutar el seed.');
}

async function clean(db: ReturnType<typeof drizzle<typeof schema>>) {
    const user = await db.query.users.findFirst({ where: eq(users.email, FIXTURE_EMAIL) });
    if (!user) {
        console.log('No hay fixture local para limpiar.');
        return;
    }
    if (user.name !== FIXTURE_NAME || user.signupOrigin !== FIXTURE_ORIGIN) {
        throw new Error('La identidad con el correo reservado ya no coincide con la fixture; se conservó.');
    }

    const [owner, musician] = await Promise.all([
        db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) }),
        db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, user.id) }),
    ]);
    if ((owner && owner.bio !== OWNER_BIO) || (musician && musician.bio !== MUSICIAN_BIO)) {
        throw new Error('Uno de los perfiles dejó de ser una fixture; no se limpió.');
    }

    const personalAccounts = await db.select({ id: accounts.id, isPersonal: accounts.isPersonal })
        .from(accounts)
        .where(eq(accounts.ownerUserId, user.id));
    if (personalAccounts.some((account) => !account.isPersonal) || personalAccounts.length > 1) {
        throw new Error('La identidad tiene espacios adicionales; se conservó para no borrar información.');
    }
    const accountIds = personalAccounts.map((account) => account.id);
    const [accountMembers, accountPendingInvitations, accountSettings, platformAccesses] = await Promise.all([
        accountIds.length ? db.select().from(accountUsers).where(inArray(accountUsers.accountId, accountIds)) : Promise.resolve([]),
        accountIds.length ? db.select().from(accountInvitations).where(inArray(accountInvitations.accountId, accountIds)) : Promise.resolve([]),
        accountIds.length ? db.select().from(accountVerticalSettings).where(inArray(accountVerticalSettings.accountId, accountIds)) : Promise.resolve([]),
        db.select().from(userPlatformAccess).where(eq(userPlatformAccess.userId, user.id)),
    ]);
    if (accountMembers.some((membership) => membership.userId !== user.id || membership.role !== 'owner')
        || accountPendingInvitations.length > 0
        || accountSettings.length > 0
        || platformAccesses.length > 1) {
        throw new Error('La identidad tiene vínculos de equipo o producto; se conservó para no borrar información.');
    }

    const dependentRecords = await Promise.all([
        db.query.serenataProviderGroups.findFirst({ where: eq(serenataProviderGroups.ownerUserId, user.id) }),
        owner ? db.query.serenatas.findFirst({ where: eq(serenatas.ownerId, owner.id) }) : Promise.resolve(undefined),
        musician ? db.query.serenataProviderGroupMembers.findFirst({ where: eq(serenataProviderGroupMembers.musicianId, musician.id) }) : Promise.resolve(undefined),
        musician ? db.query.serenataGroupMembers.findFirst({ where: eq(serenataGroupMembers.musicianId, musician.id) }) : Promise.resolve(undefined),
        musician ? db.query.serenataGroupInvites.findFirst({ where: eq(serenataGroupInvites.musicianId, musician.id) }) : Promise.resolve(undefined),
        musician ? db.query.serenataProviderGroupMemberInvites.findFirst({ where: eq(serenataProviderGroupMemberInvites.musicianId, musician.id) }) : Promise.resolve(undefined),
        db.query.subscriptions.findFirst({ where: and(eq(subscriptions.userId, user.id), eq(subscriptions.vertical, 'serenatas')) }),
    ]);
    if (dependentRecords.some(Boolean)) {
        throw new Error('La fixture tiene datos vinculados; no se eliminó para conservarlos.');
    }

    await db.transaction(async (tx) => {
        await tx.delete(serenataOwners).where(eq(serenataOwners.userId, user.id));
        await tx.delete(serenataMusicians).where(eq(serenataMusicians.userId, user.id));
        if (accountIds.length) {
            await tx.delete(accountUsers).where(inArray(accountUsers.accountId, accountIds));
            await tx.delete(accounts).where(inArray(accounts.id, accountIds));
        }
        await tx.delete(userPlatformAccess).where(eq(userPlatformAccess.userId, user.id));
        await tx.delete(users).where(and(eq(users.id, user.id), eq(users.signupOrigin, FIXTURE_ORIGIN)));
    });
    console.log('Fixture local eliminada: los perfiles y la identidad sintéticos ya no existen.');
}

async function inspectUserReferences(client: ReturnType<typeof postgres>, userId: string) {
    const foreignKeys = await client`
        SELECT child_namespace.nspname AS schema_name,
               child_table.relname AS table_name,
               child_column.attname AS column_name
        FROM pg_constraint AS foreign_key
        JOIN pg_class AS child_table ON child_table.oid = foreign_key.conrelid
        JOIN pg_namespace AS child_namespace ON child_namespace.oid = child_table.relnamespace
        JOIN pg_attribute AS child_column
          ON child_column.attrelid = child_table.oid
         AND child_column.attnum = ANY(foreign_key.conkey)
        WHERE foreign_key.contype = 'f'
          AND foreign_key.confrelid = 'public.users'::regclass
          AND child_namespace.nspname = 'public'
        ORDER BY child_table.relname, child_column.attname
    `;
    const references: Array<{ table: string; column: string; count: number }> = [];
    for (const foreignKey of foreignKeys) {
        const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
        const tableName = `${quoteIdentifier(foreignKey.schema_name)}.${quoteIdentifier(foreignKey.table_name)}`;
        const columnName = quoteIdentifier(foreignKey.column_name);
        const rows = await client.unsafe(
            `SELECT count(*)::int AS count FROM ${tableName} WHERE ${columnName} = $1`,
            [userId],
        ) as Array<{ count: number | string }>;
        const count = Number(rows[0]?.count ?? 0);
        if (count > 0) references.push({
            table: foreignKey.table_name,
            column: foreignKey.column_name,
            count,
        });
    }
    return references;
}

async function main() {
    const mode = process.argv.includes('--inspect')
        ? 'inspect'
        : process.argv.includes('--clean')
            ? 'clean'
            : process.argv.includes('--seed')
                ? 'seed'
                : null;
    if (!mode) throw new Error('Indica --seed, --clean o --inspect.');
    const client = postgres(assertLocalDatabaseUrl(DATABASE_URL), { max: 1 });
    const db = drizzle(client, { schema });
    try {
        if (mode === 'seed') await seed(db);
        else if (mode === 'clean') await clean(db);
        else {
            const user = await db.query.users.findFirst({ where: eq(users.email, FIXTURE_EMAIL) });
            if (!user) console.log('No hay fixture local para inspeccionar.');
            else {
                const [personalAccounts, platformAccesses] = await Promise.all([
                    db.select({ id: accounts.id, name: accounts.name, isPersonal: accounts.isPersonal }).from(accounts).where(eq(accounts.ownerUserId, user.id)),
                    db.select({ app: userPlatformAccess.app, origin: userPlatformAccess.origin }).from(userPlatformAccess).where(eq(userPlatformAccess.userId, user.id)),
                ]);
                console.log(JSON.stringify({
                    references: await inspectUserReferences(client, user.id),
                    personalAccounts,
                    platformAccesses,
                }));
            }
        }
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'No se pudo preparar la fixture local.');
    process.exitCode = 1;
});
