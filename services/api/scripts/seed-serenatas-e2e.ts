#!/usr/bin/env tsx
/**
 * Seed mínimo para E2E Serenatas: usuario demo + dueño + grupo marketplace activo.
 * Sin secretos reales; usar solo en local/staging.
 *
 *   SERENATAS_E2E_EMAIL=demo@serenatas.local SERENATAS_E2E_PASSWORD=demo-e2e-2026 pnpm --filter=@simple/api run db:seed:serenatas-e2e
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import {
    serenataOwners,
    serenataClients,
    serenataGroupServices,
    serenataMusicians,
    serenataProviderGroupMembers,
    serenataProviderGroups,
    serenatas,
    users,
} from '../src/db/schema.js';

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
const DEMO_EMAIL = process.env.SERENATAS_E2E_EMAIL ?? 'demo@serenatas.local';
const DEMO_PASSWORD = process.env.SERENATAS_E2E_PASSWORD ?? 'demo-e2e-2026';
const CLIENT_EMAIL = process.env.SERENATAS_E2E_CLIENT_EMAIL ?? 'cliente-e2e@serenatas.local';
const DEMO_SLUG = 'grupo-e2e-demo';
const PENDING_RECIPIENT = 'Destinatario E2E';

if (!DATABASE_URL) {
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

async function ensureUser(
    db: ReturnType<typeof drizzle>,
    email: string,
    name: string,
    passwordHash: string,
) {
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
        [user] = await db.insert(users).values({
            email,
            name,
            passwordHash,
            role: 'user',
            status: 'verified',
            // Serenatas no es valor válido en users_primary_vertical_check (0041); NULL = acceso vía serenata_owners.
            primaryVertical: null,
        }).returning();
        console.log(`  Usuario creado: ${email}`);
    } else {
        await db.update(users).set({ passwordHash, status: 'verified', updatedAt: new Date() }).where(eq(users.id, user.id));
    }
    return user;
}

async function main() {
    const client = postgres(DATABASE_URL!, { max: 1 });
    const db = drizzle(client, { schema });
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const clientPasswordHash = await bcrypt.hash('cliente-e2e-pass', 10);

    const user = await ensureUser(db, DEMO_EMAIL, 'Demo E2E Serenatas', passwordHash);
    const clientUser = await ensureUser(db, CLIENT_EMAIL, 'Cliente E2E', clientPasswordHash);

    let ownerProfile = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, user.id) });
    if (!ownerProfile) {
        [ownerProfile] = await db.insert(serenataOwners).values({
            userId: user.id,
            bio: 'Dueño demo E2E',
            comuna: 'Santiago',
            region: 'Región Metropolitana',
            workingComunas: ['Santiago', 'Providencia'],
            subscriptionStatus: 'active',
            subscriptionPrice: 0,
            trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
        }).returning();
    }

    let group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.slug, DEMO_SLUG),
    });
    if (!group) {
        [group] = await db.insert(serenataProviderGroups).values({
            ownerUserId: user.id,
            ownerId: ownerProfile.id,
            name: 'Grupo E2E Demo',
            slug: DEMO_SLUG,
            description: 'Grupo de prueba para Playwright',
            region: 'Región Metropolitana',
            comunaBase: 'Santiago',
            serviceComunas: ['Santiago', 'Providencia'],
            status: 'active',
            isVerified: true,
            slaHours: 24,
            bookingMode: 'manual',
            bufferMinutes: 0,
        }).returning();
        console.log(`  Grupo marketplace: /panel/grupo/${DEMO_SLUG}`);
    }

    let service = await db.query.serenataGroupServices.findFirst({
        where: eq(serenataGroupServices.providerGroupId, group.id),
    });
    if (!service) {
        [service] = await db.insert(serenataGroupServices).values({
            providerGroupId: group.id,
            name: 'Serenata estándar E2E',
            musiciansCount: 3,
            durationMinutes: 45,
            price: 120000,
            isActive: true,
        }).returning();
    }

    const musicianSpecs = [
        { email: 'musico-e2e-1@serenatas.local', name: 'Músico E2E 1', instrument: 'Guitarra' },
        { email: 'musico-e2e-2@serenatas.local', name: 'Músico E2E 2', instrument: 'Voz' },
        { email: 'musico-e2e-3@serenatas.local', name: 'Músico E2E 3', instrument: 'Trompeta' },
    ] as const;
    const musicianIds: string[] = [];
    for (const spec of musicianSpecs) {
        const musicianUser = await ensureUser(db, spec.email, spec.name, passwordHash);
        let musician = await db.query.serenataMusicians.findFirst({ where: eq(serenataMusicians.userId, musicianUser.id) });
        if (!musician) {
            [musician] = await db.insert(serenataMusicians).values({
                userId: musicianUser.id,
                instrument: spec.instrument,
                comuna: 'Santiago',
                region: 'Región Metropolitana',
                isAvailable: true,
                availableNow: true,
            }).returning();
        }
        musicianIds.push(musician.id);
        const existingMember = await db.query.serenataProviderGroupMembers.findFirst({
            where: eq(serenataProviderGroupMembers.musicianId, musician.id),
        });
        if (!existingMember) {
            await db.insert(serenataProviderGroupMembers).values({
                providerGroupId: group.id,
                musicianId: musician.id,
                status: 'active',
                role: 'musician',
                instruments: [spec.instrument],
            });
        }
    }

    let serenataClient = await db.query.serenataClients.findFirst({ where: eq(serenataClients.userId, clientUser.id) });
    if (!serenataClient) {
        [serenataClient] = await db.insert(serenataClients).values({
            userId: clientUser.id,
            phone: '+56900000001',
            comuna: 'Santiago',
            region: 'Región Metropolitana',
        }).returning();
    }

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 14);
    eventDate.setHours(20, 0, 0, 0);

    const fixturePayload = {
        clientId: serenataClient.id,
        ownerId: ownerProfile.id,
        providerGroupId: group.id,
        selectedServiceId: service.id,
        recipientName: PENDING_RECIPIENT,
        clientPhone: '+56900000001',
        address: 'Av. Providencia 1234, Santiago',
        comuna: 'Santiago',
        region: 'Región Metropolitana',
        eventDate,
        eventTime: '20:00',
        duration: service.durationMinutes,
        price: service.price,
        source: 'platform_lead' as const,
        status: 'pending' as const,
        paymentStatus: 'not_required' as const,
        groupId: null,
    };

    const existingFixture = await db.query.serenatas.findFirst({
        where: eq(serenatas.recipientName, PENDING_RECIPIENT),
    });
    if (!existingFixture) {
        await db.insert(serenatas).values(fixturePayload);
        console.log(`  Solicitud pending E2E: ${PENDING_RECIPIENT}`);
    } else if (existingFixture.status !== 'pending' || existingFixture.groupId) {
        await db.update(serenatas).set(fixturePayload).where(eq(serenatas.id, existingFixture.id));
        console.log(`  Solicitud E2E reseteada a pending: ${PENDING_RECIPIENT}`);
    }

    console.log('\nCredenciales E2E (local):');
    console.log(`  SERENATAS_E2E_EMAIL=${DEMO_EMAIL}`);
    console.log(`  SERENATAS_E2E_PASSWORD=${DEMO_PASSWORD}`);
    await client.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
