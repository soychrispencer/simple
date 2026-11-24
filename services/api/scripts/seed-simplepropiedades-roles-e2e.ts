#!/usr/bin/env tsx
/**
 * Fixtures locales para comprobar el panel por segmento y permiso.
 * Se niega a ejecutarse contra hosts que no sean loopback.
 *
 *   pnpm --filter @simple/api run db:seed:propiedades-roles-e2e
 *   pnpm --filter @simple/api run db:clean:propiedades-roles-e2e
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { and, eq, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import { accountInvitations, accountUsers, accountVerticalSettings, accounts, agendaProfessionalProfiles, publicProfiles, userPlatformAccess, users } from '../src/db/schema.js';

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
const FIXTURE_PASSWORD = process.env.SIMPLE_ROLES_E2E_PASSWORD ?? 'simple-roles-local-e2e-only';
const COMPANY_NAME = 'Simple E2E Inmobiliaria';
const SCALE_MEMBER_COUNT = 51;
const SCALE_INVITATION_COUNT = 51;
const FIXTURES = [
    { key: 'individual', email: 'simplepropiedades-individual@simple-e2e.local', name: 'E2E Particular', kind: 'individual', subtype: 'owner' },
    { key: 'independent', email: 'simplepropiedades-independent@simple-e2e.local', name: 'E2E Corredor', kind: 'independent', subtype: 'broker' },
    { key: 'owner', email: 'simplepropiedades-owner@simple-e2e.local', name: 'E2E Dueño Inmobiliaria', kind: 'individual', subtype: 'owner' },
    { key: 'admin', email: 'simplepropiedades-admin@simple-e2e.local', name: 'E2E Administrador', kind: 'individual', subtype: 'owner' },
    { key: 'agent', email: 'simplepropiedades-agent@simple-e2e.local', name: 'E2E Agente', kind: 'individual', subtype: 'owner' },
] as const;

function assertLocalDatabaseUrl(value: string | undefined): string {
    if (!value) throw new Error('DATABASE_URL no está configurada.');
    if (process.env.NODE_ENV === 'production') throw new Error('Este seed está deshabilitado con NODE_ENV=production.');
    const parsed = new URL(value);
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname)) {
        throw new Error('Este seed solo puede ejecutarse contra PostgreSQL en loopback.');
    }
    return value;
}

async function ensureUser(db: ReturnType<typeof drizzle<typeof schema>>, fixture: { email: string; name: string }, passwordHash: string) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, fixture.email) });
    if (existing) {
        const [updated] = await db.update(users).set({
            name: fixture.name,
            passwordHash,
            role: 'user',
            status: 'verified',
            primaryVertical: 'propiedades',
            updatedAt: new Date(),
        }).where(eq(users.id, existing.id)).returning();
        return updated;
    }

    const [created] = await db.insert(users).values({
        email: fixture.email,
        name: fixture.name,
        passwordHash,
        role: 'user',
        status: 'verified',
        primaryVertical: 'propiedades',
    }).returning();
    return created;
}

async function ensureAccount(
    db: ReturnType<typeof drizzle<typeof schema>>,
    input: { ownerUserId: string; name: string; isPersonal: boolean },
) {
    const existing = await db.query.accounts.findFirst({
        where: and(
            eq(accounts.ownerUserId, input.ownerUserId),
            eq(accounts.name, input.name),
            eq(accounts.isPersonal, input.isPersonal),
        ),
    });
    if (existing) return existing;
    const [created] = await db.insert(accounts).values({
        name: input.name,
        type: 'general',
        ownerUserId: input.ownerUserId,
        isPersonal: input.isPersonal,
    }).returning();
    return created;
}

async function ensureMembership(
    db: ReturnType<typeof drizzle<typeof schema>>,
    input: { accountId: string; userId: string; role: 'owner' | 'admin' | 'agent'; isDefault: boolean; createdAt?: Date },
) {
    const existing = await db.query.accountUsers.findFirst({
        where: and(eq(accountUsers.accountId, input.accountId), eq(accountUsers.userId, input.userId)),
    });
    if (existing) {
        await db.update(accountUsers).set({
            role: input.role,
            isDefault: input.isDefault,
            ...(input.createdAt ? { createdAt: input.createdAt } : {}),
            updatedAt: new Date(),
        }).where(eq(accountUsers.id, existing.id));
        return;
    }
    await db.insert(accountUsers).values(input);
}

function scaleMemberEmail(index: number) {
    return `simplepropiedades-scale-member-${String(index).padStart(3, '0')}@simple-e2e.local`;
}

function scaleInvitationEmail(index: number) {
    return `simplepropiedades-scale-invite-${String(index).padStart(3, '0')}@simple-e2e.local`;
}

async function setActivity(
    db: ReturnType<typeof drizzle<typeof schema>>,
    accountId: string,
    accountKind: 'individual' | 'independent' | 'company',
    operatorSubtype: string,
) {
    const now = new Date();
    await db.insert(accountVerticalSettings).values({
        accountId,
        vertical: 'propiedades',
        accountKind,
        operatorSubtype,
        onboardingCompletedAt: now,
    }).onConflictDoUpdate({
        target: [accountVerticalSettings.accountId, accountVerticalSettings.vertical],
        set: { accountKind, operatorSubtype, operatorSubtypeCustom: null, onboardingCompletedAt: now, updatedAt: now },
    });
}

async function seed(db: ReturnType<typeof drizzle<typeof schema>>) {
    const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);
    const fixtureUsers = new Map<string, Awaited<ReturnType<typeof ensureUser>>>();
    for (const fixture of FIXTURES) fixtureUsers.set(fixture.key, await ensureUser(db, fixture, passwordHash));

    const now = new Date();
    for (const fixture of FIXTURES) {
        const user = fixtureUsers.get(fixture.key)!;
        const personalAccount = await ensureAccount(db, {
            ownerUserId: user.id,
            name: `${fixture.name} · Cuenta personal`,
            isPersonal: true,
        });
        await db.update(accountUsers).set({ isDefault: false, updatedAt: now }).where(eq(accountUsers.userId, user.id));
        await ensureMembership(db, {
            accountId: personalAccount.id,
            userId: user.id,
            role: 'owner',
            isDefault: fixture.key === 'individual' || fixture.key === 'independent',
        });
        await setActivity(db, personalAccount.id, fixture.kind, fixture.subtype);
    }

    const owner = fixtureUsers.get('owner')!;
    const company = await ensureAccount(db, { ownerUserId: owner.id, name: COMPANY_NAME, isPersonal: false });
    await setActivity(db, company.id, 'company', 'real_estate_agency');

    for (const [key, role] of [['owner', 'owner'], ['admin', 'admin'], ['agent', 'agent']] as const) {
        const user = fixtureUsers.get(key)!;
        await ensureMembership(db, {
            accountId: company.id,
            userId: user.id,
            role,
            isDefault: true,
        });
    }

    console.log(`Seed local listo: ${FIXTURES.length} identidades de prueba y 1 empresa compartida (${COMPANY_NAME}).`);
    console.log(`Contraseña local común: ${FIXTURE_PASSWORD}`);
    for (const fixture of FIXTURES) console.log(`  ${fixture.key}: ${fixture.email}`);
}

async function seedScale(db: ReturnType<typeof drizzle<typeof schema>>) {
    const ownerFixture = FIXTURES.find((fixture) => fixture.key === 'owner')!;
    const owner = await db.query.users.findFirst({ where: eq(users.email, ownerFixture.email) });
    if (!owner) throw new Error('Primero crea las identidades base con --seed-scale.');
    const company = await db.query.accounts.findFirst({
        where: and(eq(accounts.name, COMPANY_NAME), eq(accounts.isPersonal, false), eq(accounts.ownerUserId, owner.id)),
    });
    if (!company) throw new Error('Primero crea la empresa base con --seed-scale.');

    const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);
    const firstMembershipDate = new Date('2020-01-01T00:00:00.000Z');
    for (let index = 1; index <= SCALE_MEMBER_COUNT; index += 1) {
        const name = `E2E Integrante ${String(index).padStart(3, '0')}`;
        const email = scaleMemberEmail(index);
        const user = await ensureUser(db, { email, name }, passwordHash);
        const personalAccount = await ensureAccount(db, {
            ownerUserId: user.id,
            name: `${name} · Cuenta personal`,
            isPersonal: true,
        });
        await ensureMembership(db, {
            accountId: personalAccount.id,
            userId: user.id,
            role: 'owner',
            isDefault: true,
        });
        await ensureMembership(db, {
            accountId: company.id,
            userId: user.id,
            role: 'agent',
            isDefault: false,
            createdAt: new Date(firstMembershipDate.getTime() + index * 60_000),
        });
    }

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const firstInvitationDate = new Date('2026-01-01T00:00:00.000Z');
    for (let index = 1; index <= SCALE_INVITATION_COUNT; index += 1) {
        const email = scaleInvitationEmail(index);
        const tokenHash = createHash('sha256').update(`simplepropiedades-team-scale:${email}`).digest('hex');
        const existing = await db.query.accountInvitations.findFirst({ where: eq(accountInvitations.tokenHash, tokenHash) });
        const values = {
            accountId: company.id,
            vertical: 'propiedades',
            email,
            role: 'agent',
            tokenHash,
            invitedByUserId: owner.id,
            expiresAt,
            acceptedAt: null,
            revokedAt: null,
            createdAt: new Date(firstInvitationDate.getTime() + index * 60_000),
        };
        if (existing) await db.update(accountInvitations).set(values).where(eq(accountInvitations.id, existing.id));
        else await db.insert(accountInvitations).values(values);
    }

    console.log(`Escala local lista: ${SCALE_MEMBER_COUNT} integrantes y ${SCALE_INVITATION_COUNT} invitaciones sintéticas en ${COMPANY_NAME}.`);
}

async function cleanScale(db: ReturnType<typeof drizzle<typeof schema>>) {
    const emails = Array.from({ length: SCALE_MEMBER_COUNT }, (_, index) => scaleMemberEmail(index + 1));
    const invitationEmails = Array.from({ length: SCALE_INVITATION_COUNT }, (_, index) => scaleInvitationEmail(index + 1));
    const fixtureUsers = await db.select({ id: users.id }).from(users).where(inArray(users.email, emails));
    const userIds = fixtureUsers.map((user) => user.id);
    const fixtureAccounts = userIds.length
        ? await db.select({ id: accounts.id }).from(accounts).where(and(inArray(accounts.ownerUserId, userIds), eq(accounts.isPersonal, true)))
        : [];
    const accountIds = fixtureAccounts.map((account) => account.id);
    const owner = await db.query.users.findFirst({ where: eq(users.email, FIXTURES.find((fixture) => fixture.key === 'owner')!.email) });
    const company = owner ? await db.query.accounts.findFirst({
        where: and(eq(accounts.name, COMPANY_NAME), eq(accounts.isPersonal, false), eq(accounts.ownerUserId, owner.id)),
    }) : null;

    await db.transaction(async (tx) => {
        if (company) {
            await tx.delete(accountInvitations).where(and(
                eq(accountInvitations.accountId, company.id),
                inArray(accountInvitations.email, invitationEmails),
            ));
        }
        if (userIds.length || accountIds.length) {
            const membershipClauses = [
                userIds.length ? inArray(accountUsers.userId, userIds) : undefined,
                accountIds.length ? inArray(accountUsers.accountId, accountIds) : undefined,
            ].filter((clause) => clause !== undefined);
            await tx.delete(accountUsers).where(or(...membershipClauses));
        }
        if (accountIds.length) await tx.delete(accounts).where(inArray(accounts.id, accountIds));
        if (userIds.length) await tx.delete(userPlatformAccess).where(inArray(userPlatformAccess.userId, userIds));
        if (userIds.length) await tx.delete(users).where(inArray(users.id, userIds));
    });
    console.log(`Limpieza de escala local lista: ${userIds.length} integrantes y ${invitationEmails.length} invitaciones retiradas.`);
}

async function clean(db: ReturnType<typeof drizzle<typeof schema>>) {
    const emails = [
        ...FIXTURES.map((fixture) => fixture.email),
        ...Array.from({ length: SCALE_MEMBER_COUNT }, (_, index) => scaleMemberEmail(index + 1)),
    ];
    const fixtureUsers = await db.select({ id: users.id }).from(users).where(inArray(users.email, emails));
    const userIds = fixtureUsers.map((user) => user.id);
    const fixtureAccounts = userIds.length
        ? await db.select({ id: accounts.id }).from(accounts).where(or(
            inArray(accounts.ownerUserId, userIds),
            and(eq(accounts.name, COMPANY_NAME), eq(accounts.isPersonal, false)),
        ))
        : [];
    const accountIds = fixtureAccounts.map((account) => account.id);
    await db.transaction(async (tx) => {
        if (accountIds.length) await tx.delete(accountInvitations).where(inArray(accountInvitations.accountId, accountIds));
        if (userIds.length || accountIds.length) {
            const profileClauses = [
                userIds.length ? inArray(publicProfiles.userId, userIds) : undefined,
                accountIds.length ? inArray(publicProfiles.accountId, accountIds) : undefined,
            ].filter((clause) => clause !== undefined);
            await tx.delete(publicProfiles).where(or(...profileClauses));
            const agendaProfileClauses = [
                userIds.length ? inArray(agendaProfessionalProfiles.userId, userIds) : undefined,
                accountIds.length ? inArray(agendaProfessionalProfiles.accountId, accountIds) : undefined,
            ].filter((clause) => clause !== undefined);
            await tx.delete(agendaProfessionalProfiles).where(or(...agendaProfileClauses));
        }
        if (userIds.length || accountIds.length) {
            const membershipClauses = [
                userIds.length ? inArray(accountUsers.userId, userIds) : undefined,
                accountIds.length ? inArray(accountUsers.accountId, accountIds) : undefined,
            ].filter((clause) => clause !== undefined);
            await tx.delete(accountUsers).where(or(...membershipClauses));
        }
        if (accountIds.length) await tx.delete(accounts).where(inArray(accounts.id, accountIds));
        if (userIds.length) await tx.delete(userPlatformAccess).where(inArray(userPlatformAccess.userId, userIds));
        if (userIds.length) await tx.delete(users).where(inArray(users.id, userIds));
    });
    console.log(`Limpieza local lista: ${userIds.length} identidades y ${accountIds.length} espacios de prueba retirados.`);
}

async function main() {
    const mode = process.argv.includes('--clean-scale')
        ? 'clean-scale'
        : process.argv.includes('--seed-scale')
            ? 'seed-scale'
            : process.argv.includes('--clean')
                ? 'clean'
                : process.argv.includes('--seed')
                    ? 'seed'
                    : null;
    if (!mode) throw new Error('Indica --seed, --seed-scale, --clean-scale o --clean.');
    const client = postgres(assertLocalDatabaseUrl(DATABASE_URL), { max: 1 });
    const db = drizzle(client, { schema });
    try {
        if (mode === 'seed') await seed(db);
        else if (mode === 'seed-scale') {
            await seed(db);
            await seedScale(db);
        } else if (mode === 'clean-scale') await cleanScale(db);
        else await clean(db);
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    let databaseError = error as { code?: string; constraint_name?: string; table_name?: string; cause?: unknown };
    for (let depth = 0; depth < 4 && databaseError.cause; depth += 1) {
        databaseError = databaseError.cause as typeof databaseError;
    }
    if (databaseError.code || databaseError.constraint_name || databaseError.table_name) {
        console.error('No se pudo preparar o limpiar el seed local por un error de base de datos.');
        console.error(JSON.stringify({
            code: databaseError.code,
            constraint: databaseError.constraint_name,
            table: databaseError.table_name,
        }));
    } else {
        console.error(error instanceof Error ? error.message : 'No se pudo preparar el seed local.');
    }
    process.exitCode = 1;
});
