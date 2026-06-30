#!/usr/bin/env tsx
/**
 * Crea 3 mariachis de vitrina para poblar el marketplace publico.
 *
 * Son visibles, pero sus slugs quedan bloqueados en la API
 * para no recibir compras ni solicitudes reales.
 *
 *   pnpm --filter=@simple/api run db:seed:serenatas-demo
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import {
    serenataGroupServices,
    serenataOwners,
    serenataProviderGroups,
    users,
} from '../src/db/schema.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const candidate of [path.resolve(scriptDir, '../.env'), path.resolve(scriptDir, '../.env.local')]) {
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
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL no esta configurada.');
    process.exit(1);
}

const DEMO_EMAIL = 'demo-serenatas-marketplace@simple.local';
const DEMO_OWNER_NAME = 'Demo Marketplace Serenatas';
const OLD_DEMO_SLUGS = [
    'demo-mariachi-los-reyes',
    'demo-mariachi-noche-de-mexico',
    'demo-mariachi-alma-ranchera',
];

const demoGroups = [
    {
        name: 'Mariachi Los Reyes',
        slug: 'mariachi-los-reyes-santiago',
        description: 'Mariachi tradicional para cumpleaños, aniversarios, pedidas de mano y celebraciones familiares.',
        region: 'Region Metropolitana',
        comunaBase: 'Santiago',
        serviceComunas: ['Santiago', 'Providencia', 'Nunoa', 'Las Condes', 'La Reina'],
        phone: '+56900000001',
        whatsapp: '+56900000001',
        logoUrl: 'https://images.pexels.com/photos/7772345/pexels-photo-7772345.jpeg?auto=compress&cs=tinysrgb&w=400',
        coverUrl: 'https://images.pexels.com/photos/7772345/pexels-photo-7772345.jpeg?auto=compress&cs=tinysrgb&w=1400',
        services: [
            {
                name: 'Serenata romantica',
                description: 'Formato clasico para sorpresa romantica.',
                musiciansCount: 5,
                durationMinutes: 45,
                price: 120000,
                promoPrice: 99000,
                eventType: 'romantica',
                songsIncluded: 8,
                sortOrder: 0,
            },
            {
                name: 'Cumpleanos mexicano',
                description: 'Show alegre con repertorio para celebraciones.',
                musiciansCount: 6,
                durationMinutes: 60,
                price: 150000,
                promoPrice: null,
                eventType: 'cumpleanos',
                songsIncluded: 10,
                sortOrder: 1,
            },
        ],
    },
    {
        name: 'Mariachi Noche de Mexico',
        slug: 'mariachi-noche-de-mexico',
        description: 'Grupo versatil para serenatas romanticas, sorpresas nocturnas y eventos con repertorio mexicano.',
        region: 'Region Metropolitana',
        comunaBase: 'Providencia',
        serviceComunas: ['Providencia', 'Las Condes', 'Vitacura', 'Lo Barnechea', 'Huechuraba'],
        phone: '+56900000002',
        whatsapp: '+56900000002',
        logoUrl: 'https://images.pexels.com/photos/4817587/pexels-photo-4817587.jpeg?auto=compress&cs=tinysrgb&w=400',
        coverUrl: 'https://images.pexels.com/photos/4817587/pexels-photo-4817587.jpeg?auto=compress&cs=tinysrgb&w=1400',
        services: [
            {
                name: 'Serenata premium',
                description: 'Mayor duracion y repertorio ampliado.',
                musiciansCount: 7,
                durationMinutes: 75,
                price: 220000,
                promoPrice: 189000,
                eventType: 'premium',
                songsIncluded: 12,
                sortOrder: 0,
            },
            {
                name: 'Sorpresa express',
                description: 'Set corto para saludos y detalles rapidos.',
                musiciansCount: 4,
                durationMinutes: 30,
                price: 85000,
                promoPrice: null,
                eventType: 'sorpresa',
                songsIncluded: 5,
                sortOrder: 1,
            },
        ],
    },
    {
        name: 'Mariachi Alma Ranchera',
        slug: 'mariachi-alma-ranchera',
        description: 'Mariachi para celebraciones familiares, aniversarios y eventos privados en la quinta region.',
        region: 'Valparaiso',
        comunaBase: 'Vina del Mar',
        serviceComunas: ['Vina del Mar', 'Valparaiso', 'Concon', 'Quilpue', 'Villa Alemana'],
        phone: '+56900000003',
        whatsapp: '+56900000003',
        logoUrl: 'https://images.pexels.com/photos/8639347/pexels-photo-8639347.jpeg?auto=compress&cs=tinysrgb&w=400',
        coverUrl: 'https://images.pexels.com/photos/8639347/pexels-photo-8639347.jpeg?auto=compress&cs=tinysrgb&w=1400',
        services: [
            {
                name: 'Serenata familiar',
                description: 'Canciones tradicionales para toda la familia.',
                musiciansCount: 5,
                durationMinutes: 45,
                price: 130000,
                promoPrice: null,
                eventType: 'familiar',
                songsIncluded: 8,
                sortOrder: 0,
            },
            {
                name: 'Show aniversario',
                description: 'Presentacion especial para aniversarios y fechas importantes.',
                musiciansCount: 6,
                durationMinutes: 60,
                price: 170000,
                promoPrice: 149000,
                eventType: 'aniversario',
                songsIncluded: 10,
                sortOrder: 1,
            },
        ],
    },
] as const;

async function ensureDemoUser(db: ReturnType<typeof drizzle<typeof schema>>) {
    let user = await db.query.users.findFirst({ where: eq(users.email, DEMO_EMAIL) });
    if (!user) {
        [user] = await db.insert(users).values({
            email: DEMO_EMAIL,
            name: DEMO_OWNER_NAME,
            role: 'user',
            status: 'verified',
            primaryVertical: null,
            signupApp: 'simpleserenatas',
            signupOrigin: 'marketplace-demo-seed',
        }).returning();
        console.log(`Usuario demo creado: ${DEMO_EMAIL}`);
    }
    return user;
}

async function ensureOwner(db: ReturnType<typeof drizzle<typeof schema>>, userId: string) {
    let owner = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId) });
    if (!owner) {
        [owner] = await db.insert(serenataOwners).values({
            userId,
            bio: 'Perfil demo para poblar el marketplace publico.',
            comuna: 'Santiago',
            region: 'Region Metropolitana',
            workingComunas: ['Santiago', 'Providencia', 'Las Condes', 'Vina del Mar'],
            subscriptionStatus: 'active',
            subscriptionPrice: 0,
            trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
        }).returning();
        console.log(`Perfil duenio demo creado: ${owner.id}`);
    }
    return owner;
}

async function main() {
    const client = postgres(DATABASE_URL!, { max: 1 });
    const db = drizzle(client, { schema });

    try {
        const user = await ensureDemoUser(db);
        const owner = await ensureOwner(db, user.id);

        for (const oldSlug of OLD_DEMO_SLUGS) {
            await db
                .update(serenataProviderGroups)
                .set({ status: 'paused', updatedAt: new Date() })
                .where(eq(serenataProviderGroups.slug, oldSlug));
        }

        for (const groupSeed of demoGroups) {
            let group = await db.query.serenataProviderGroups.findFirst({
                where: eq(serenataProviderGroups.slug, groupSeed.slug),
            });

            const groupValues = {
                ownerUserId: user.id,
                ownerId: owner.id,
                name: groupSeed.name,
                slug: groupSeed.slug,
                description: groupSeed.description,
                region: groupSeed.region,
                comunaBase: groupSeed.comunaBase,
                serviceComunas: [...groupSeed.serviceComunas],
                phone: groupSeed.phone,
                whatsapp: groupSeed.whatsapp,
                logoUrl: groupSeed.logoUrl,
                coverUrl: groupSeed.coverUrl,
                status: 'active',
                isVerified: true,
                slaHours: 24,
                bookingMode: 'manual',
                bufferMinutes: 15,
                requiresAdvancePayment: false,
                acceptsCash: false,
                acceptsTransfer: false,
                acceptsMp: false,
                acceptsPaymentLink: false,
                updatedAt: new Date(),
            };

            if (!group) {
                [group] = await db.insert(serenataProviderGroups).values(groupValues).returning();
                console.log(`Grupo demo creado: ${groupSeed.name}`);
            } else {
                [group] = await db
                    .update(serenataProviderGroups)
                    .set(groupValues)
                    .where(eq(serenataProviderGroups.id, group.id))
                    .returning();
                console.log(`Grupo demo actualizado: ${groupSeed.name}`);
            }

            for (const serviceSeed of groupSeed.services) {
                const existingService = await db.query.serenataGroupServices.findFirst({
                    where: and(
                        eq(serenataGroupServices.providerGroupId, group.id),
                        eq(serenataGroupServices.name, serviceSeed.name),
                    ),
                });

                const serviceValues = {
                    providerGroupId: group.id,
                    name: serviceSeed.name,
                    description: serviceSeed.description,
                    musiciansCount: serviceSeed.musiciansCount,
                    durationMinutes: serviceSeed.durationMinutes,
                    price: serviceSeed.price,
                    promoPrice: serviceSeed.promoPrice,
                    currency: 'CLP',
                    eventType: serviceSeed.eventType,
                    songsIncluded: serviceSeed.songsIncluded,
                    repertoirePolicy: 'any_active',
                    isActive: true,
                    sortOrder: serviceSeed.sortOrder,
                    updatedAt: new Date(),
                };

                if (existingService) {
                    await db
                        .update(serenataGroupServices)
                        .set(serviceValues)
                        .where(eq(serenataGroupServices.id, existingService.id));
                    console.log(`  Servicio actualizado: ${serviceSeed.name}`);
                } else {
                    await db.insert(serenataGroupServices).values(serviceValues);
                    console.log(`  Servicio creado: ${serviceSeed.name}`);
                }
            }
        }
    } finally {
        await client.end();
    }

    console.log('Seed demo de SimpleSerenatas completado.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
