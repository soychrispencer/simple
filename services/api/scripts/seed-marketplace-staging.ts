#!/usr/bin/env tsx
/**
 * Seed de marketplace Serenatas para staging/local.
 *
 * Crea 1 grupo proveedor `active` vinculado a `serenata_owners` y 2 servicios de ejemplo (idempotente por slug).
 *
 * Ejecutar:
 *   pnpm --filter=@simple/api run db:seed:marketplace
 * Requiere DATABASE_URL y al menos un usuario en `users`.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import {
    serenataOwners,
    serenataGroupServices,
    serenataProviderGroups,
    users,
} from '../src/db/schema.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const candidate of [path.resolve(scriptDir, '../.env'), path.resolve(scriptDir, '../.env.local')]) {
    try {
        if (!existsSync(candidate)) continue;
        for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0) continue;
            const key = trimmed.slice(0, separatorIndex).trim();
            if (!key || process.env[key]) continue;
            process.env[key] = trimmed.slice(separatorIndex + 1).trim();
        }
    } catch {
        // ignore
    }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

const DEMO_SLUG = 'grupo-demo-staging';
const DEMO_GROUP_NAME = 'Grupo Demo Staging';

async function resolveDemoOwnerId(
    db: ReturnType<typeof drizzle<typeof schema>>,
    ownerUserId: string,
): Promise<string> {
    const existingOwner = await db.query.serenataOwners.findFirst({
        where: eq(serenataOwners.userId, ownerUserId),
    });
    if (existingOwner) return existingOwner.id;

    const [anyOwner] = await db.select({ id: serenataOwners.id }).from(serenataOwners).limit(1);
    if (anyOwner) {
        console.log(`  Dueño demo: reutilizando serenata_owners existente (${anyOwner.id})`);
        return anyOwner.id;
    }

    const [created] = await db.insert(serenataOwners).values({
        userId: ownerUserId,
        bio: 'Dueño de prueba (seed marketplace)',
        comuna: 'Santiago',
        region: 'Región Metropolitana',
        workingComunas: ['Santiago', 'Providencia', 'Las Condes'],
        subscriptionStatus: 'active',
        subscriptionPrice: 0,
        trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
    }).returning({ id: serenataOwners.id });
    console.log(`  Perfil dueño creado para el usuario (${created.id})`);
    return created.id;
}

async function main() {
    const client = postgres(DATABASE_URL!, { max: 1 });
    const db = drizzle(client, { schema });

    const [owner] = await db.select({ id: users.id }).from(users).limit(1);
    if (!owner) {
        console.error('No hay usuarios en la base. Crea uno antes de ejecutar el seed.');
        process.exit(1);
    }

    const ownerProfileId = await resolveDemoOwnerId(db, owner.id);

    const existing = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.slug, DEMO_SLUG),
    });

    let groupId = existing?.id;
    if (!existing) {
        const [inserted] = await db.insert(serenataProviderGroups).values({
            ownerUserId: owner.id,
            ownerId: ownerProfileId,
            name: DEMO_GROUP_NAME,
            slug: DEMO_SLUG,
            description: 'Grupo de ejemplo para probar el marketplace en staging.',
            region: 'Región Metropolitana',
            comunaBase: 'Santiago',
            serviceComunas: ['Santiago', 'Providencia', 'Las Condes'],
            status: 'active',
            isVerified: true,
        }).returning({ id: serenataProviderGroups.id });
        groupId = inserted.id;
        console.log(`Grupo creado: ${DEMO_SLUG} (${groupId}) · ownerId=${ownerProfileId}`);
    } else {
        await db.update(serenataProviderGroups).set({
            ownerId: ownerProfileId,
            status: 'active',
            updatedAt: new Date(),
        }).where(eq(serenataProviderGroups.id, existing.id));
        console.log(`Grupo existente actualizado (active + ownerId=${ownerProfileId}): ${DEMO_SLUG}`);
    }

    if (!groupId) {
        console.error('No se pudo resolver el id del grupo.');
        process.exit(1);
    }

    const serviceSeeds = [
        {
            name: 'Serenata clásica',
            description: 'Trio romántico · 45 min',
            musiciansCount: 3,
            durationMinutes: 45,
            price: 120000,
            eventType: 'romantica',
            sortOrder: 0,
        },
        {
            name: 'Serenata premium',
            description: 'Cuarteto + sorpresa · 60 min',
            musiciansCount: 4,
            durationMinutes: 60,
            price: 180000,
            eventType: 'premium',
            sortOrder: 1,
        },
    ] as const;

    for (const seed of serviceSeeds) {
        const found = await db.select({ id: serenataGroupServices.id })
            .from(serenataGroupServices)
            .where(and(
                eq(serenataGroupServices.providerGroupId, groupId),
                eq(serenataGroupServices.name, seed.name),
            ))
            .limit(1);

        if (found.length > 0) {
            console.log(`  Servicio ya existe: ${seed.name}`);
            continue;
        }

        await db.insert(serenataGroupServices).values({
            providerGroupId: groupId,
            ...seed,
            currency: 'CLP',
            isActive: true,
        });
        console.log(`  Servicio creado: ${seed.name}`);
    }

    await client.end();
    console.log('Seed marketplace completado.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
