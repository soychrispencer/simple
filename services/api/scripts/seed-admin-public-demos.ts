#!/usr/bin/env tsx
/**
 * Perfiles públicos de ejemplo para admin@simpleplataforma.app (local/staging).
 * Un demo publicado por vertical: Agenda, Autos, Propiedades, Serenatas.
 *
 *   pnpm --filter=@simple/api run db:seed:admin-demos
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import {
    accounts,
    accountUsers,
    agendaProfessionalProfiles,
    agendaServices,
    publicProfiles,
    serenataGroupServices,
    serenataOwners,
    serenataProviderGroups,
    users,
} from '../src/db/schema.js';
import { defaultTrialEndsAt } from '../src/modules/billing/trial-config.js';
import {
    createDefaultPublicProfileBusinessHours,
    createDefaultPublicProfileSocialLinks,
} from '../src/modules/public-profile/normalize.js';

const ADMIN_EMAIL = 'admin@simpleplataforma.app';

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
    console.error('DATABASE_URL no está configurada.');
    process.exit(1);
}

const IMAGES = {
    coverOffice: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1600',
    logoOffice: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=512',
    coverCar: 'https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=1600',
    logoCar: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=512',
    coverHome: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1600',
    logoHome: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=512',
    coverMariachi: 'https://images.pexels.com/photos/8639347/pexels-photo-8639347.jpeg?auto=compress&cs=tinysrgb&w=1600',
    logoMariachi: 'https://images.pexels.com/photos/7772345/pexels-photo-7772345.jpeg?auto=compress&cs=tinysrgb&w=512',
} as const;

async function ensurePrimaryAccount(
    db: ReturnType<typeof drizzle<typeof schema>>,
    userId: string,
    userName: string,
): Promise<string> {
    const existing = await db
        .select({ accountId: accountUsers.accountId })
        .from(accountUsers)
        .where(and(eq(accountUsers.userId, userId), eq(accountUsers.isDefault, true)))
        .limit(1);

    if (existing[0]?.accountId) return existing[0].accountId;

    const now = new Date();
    const [account] = await db.insert(accounts).values({
        name: userName,
        type: 'general',
        ownerUserId: userId,
        isPersonal: true,
        createdAt: now,
        updatedAt: now,
    }).returning({ id: accounts.id });

    await db.insert(accountUsers).values({
        accountId: account.id,
        userId,
        role: 'owner',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
    });

    return account.id;
}

async function upsertMarketplaceProfile(
    db: ReturnType<typeof drizzle<typeof schema>>,
    input: {
        userId: string;
        accountId: string;
        vertical: 'autos' | 'propiedades';
        slug: string;
        displayName: string;
        headline: string;
        bio: string;
        accountKind: 'individual' | 'independent' | 'company';
        operatorSubtype: string;
        city: string;
        region: string;
        coverImageUrl: string;
        avatarImageUrl: string;
        specialties: string[];
    },
) {
    const now = new Date();
    const payload = {
        accountId: input.accountId,
        slug: input.slug,
        isPublished: true,
        accountKind: input.accountKind,
        operatorSubtype: input.operatorSubtype,
        displayName: input.displayName,
        headline: input.headline,
        bio: input.bio,
        city: input.city,
        region: input.region,
        publicEmail: ADMIN_EMAIL,
        publicPhone: '+56 9 8765 4321',
        publicWhatsapp: '+56987654321',
        coverImageUrl: input.coverImageUrl,
        avatarImageUrl: input.avatarImageUrl,
        socialLinks: createDefaultPublicProfileSocialLinks(),
        businessHours: createDefaultPublicProfileBusinessHours(),
        specialties: input.specialties,
        updatedAt: now,
    };

    const existing = await db.query.publicProfiles.findFirst({
        where: and(eq(publicProfiles.userId, input.userId), eq(publicProfiles.vertical, input.vertical)),
    });

    if (existing) {
        await db.update(publicProfiles).set(payload).where(eq(publicProfiles.id, existing.id));
        console.log(`  ✅ Perfil ${input.vertical} actualizado → /perfil/${input.slug}`);
        return;
    }

    await db.insert(publicProfiles).values({
        userId: input.userId,
        vertical: input.vertical,
        createdAt: now,
        ...payload,
    });
    console.log(`  ✅ Perfil ${input.vertical} creado → /perfil/${input.slug}`);
}

async function upsertAgendaProfile(
    db: ReturnType<typeof drizzle<typeof schema>>,
    userId: string,
    accountId: string,
) {
    const now = new Date();
    const planExpiresAt = defaultTrialEndsAt(now);
    const slug = 'demo-plataforma-agenda';
    const payload = {
        accountId,
        slug,
        isPublished: true,
        displayName: 'Dra. Demo Plataforma',
        profession: 'Psicóloga clínica',
        headline: 'Ansiedad, autoestima y vínculos',
        bio: 'Perfil de ejemplo para revisar la tarjeta pública de SimpleAgenda. Consultas online y presenciales en Santiago.',
        avatarUrl: IMAGES.logoOffice,
        coverUrl: IMAGES.coverOffice,
        publicEmail: ADMIN_EMAIL,
        publicPhone: '+56 2 2345 6789',
        publicWhatsapp: '+56987654321',
        city: 'Providencia',
        region: 'Región Metropolitana',
        countryCode: 'CL',
        servesOnline: true,
        servesPresential: true,
        plan: 'free',
        planExpiresAt,
        updatedAt: now,
    };

    let profile = await db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.userId, userId),
    });

    if (profile) {
        await db.update(agendaProfessionalProfiles).set(payload).where(eq(agendaProfessionalProfiles.id, profile.id));
        console.log(`  ✅ Agenda actualizada → /${slug}`);
    } else {
        [profile] = await db.insert(agendaProfessionalProfiles).values({
            userId,
            timezone: 'America/Santiago',
            createdAt: now,
            ...payload,
        }).returning();
        console.log(`  ✅ Agenda creada → /${slug}`);
    }

    const serviceExists = await db.query.agendaServices.findFirst({
        where: eq(agendaServices.professionalId, profile!.id),
    });
    if (!serviceExists) {
        await db.insert(agendaServices).values({
            professionalId: profile!.id,
            name: 'Consulta individual',
            description: 'Sesión de 50 minutos · demo',
            durationMinutes: 50,
            price: '45000',
            currency: 'CLP',
            isOnline: true,
            isPresential: true,
            isActive: true,
            position: 0,
            createdAt: now,
            updatedAt: now,
        });
        console.log('  ✅ Servicio agenda demo agregado');
    }
}

async function upsertSerenatasGroup(
    db: ReturnType<typeof drizzle<typeof schema>>,
    userId: string,
) {
    const now = new Date();
    const slug = 'mariachi-demo-plataforma';

    let owner = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.userId, userId) });
    if (!owner) {
        [owner] = await db.insert(serenataOwners).values({
            userId,
            bio: 'Dueño demo Simple Plataforma',
            comuna: 'Santiago',
            region: 'Región Metropolitana',
            workingComunas: ['Santiago', 'Providencia', 'Las Condes'],
            subscriptionStatus: 'active',
            subscriptionPrice: 0,
            trialEndsAt: defaultTrialEndsAt(now),
        }).returning();
        console.log('  ✅ Perfil dueño Serenatas creado');
    }

    const groupPayload = {
        ownerId: owner.id,
        name: 'Mariachi Demo Plataforma',
        slug,
        description: 'Grupo de ejemplo del admin de plataforma. Serenatas románticas y celebraciones familiares.',
        logoUrl: IMAGES.logoMariachi,
        coverUrl: IMAGES.coverMariachi,
        phone: '+56987654321',
        whatsapp: '+56987654321',
        region: 'Región Metropolitana',
        comunaBase: 'Santiago',
        serviceComunas: ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa'],
        countryCode: 'CL',
        status: 'active' as const,
        isVerified: true,
        updatedAt: now,
    };

    let group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.ownerUserId, userId),
    });

    if (group) {
        await db.update(serenataProviderGroups).set(groupPayload).where(eq(serenataProviderGroups.id, group.id));
        console.log(`  ✅ Mariachi actualizado → /${slug}`);
    } else {
        [group] = await db.insert(serenataProviderGroups).values({
            ownerUserId: userId,
            createdAt: now,
            ...groupPayload,
        }).returning();
        console.log(`  ✅ Mariachi creado → /${slug}`);
    }

    const serviceExists = await db.query.serenataGroupServices.findFirst({
        where: eq(serenataGroupServices.providerGroupId, group!.id),
    });
    if (!serviceExists) {
        await db.insert(serenataGroupServices).values({
            providerGroupId: group!.id,
            name: 'Serenata romántica',
            description: '5 músicos · 45 min · 8 canciones',
            musiciansCount: 5,
            durationMinutes: 45,
            price: 120000,
            eventType: 'romantica',
            songsIncluded: 8,
            isActive: true,
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        });
        console.log('  ✅ Servicio mariachi demo agregado');
    }
}

async function main() {
    const client = postgres(DATABASE_URL!, { max: 1 });
    const db = drizzle(client, { schema });

    const admin = await db.query.users.findFirst({ where: eq(users.email, ADMIN_EMAIL) });
    if (!admin) {
        console.error(`No existe ${ADMIN_EMAIL}. Ejecuta: pnpm --filter=@simple/api run seed:admins`);
        process.exit(1);
    }

    console.log(`\n🎭 Sembrando demos públicos para ${ADMIN_EMAIL} (${admin.id})\n`);

    const accountId = await ensurePrimaryAccount(db, admin.id, admin.name ?? 'Admin Plataforma');
    console.log(`  Cuenta primaria: ${accountId}\n`);

    console.log('→ SimpleAgenda');
    await upsertAgendaProfile(db, admin.id, accountId);

    console.log('\n→ SimpleAutos');
    await upsertMarketplaceProfile(db, {
        userId: admin.id,
        accountId,
        vertical: 'autos',
        slug: 'demo-plataforma-autos',
        displayName: 'Automotora Demo Plataforma',
        headline: 'Compra y venta con atención directa',
        bio: 'Perfil de ejemplo para revisar la ficha pública de SimpleAutos.',
        accountKind: 'company',
        operatorSubtype: 'dealership',
        city: 'Las Condes',
        region: 'Región Metropolitana',
        coverImageUrl: IMAGES.coverCar,
        avatarImageUrl: IMAGES.logoCar,
        specialties: ['venta', 'financiamiento'],
    });

    console.log('\n→ SimplePropiedades');
    await upsertMarketplaceProfile(db, {
        userId: admin.id,
        accountId,
        vertical: 'propiedades',
        slug: 'demo-plataforma-propiedades',
        displayName: 'Inmobiliaria Demo Plataforma',
        headline: 'Arriendo y venta en Santiago',
        bio: 'Perfil de ejemplo para revisar la ficha pública de SimplePropiedades.',
        accountKind: 'company',
        operatorSubtype: 'real_estate_agency',
        city: 'Providencia',
        region: 'Región Metropolitana',
        coverImageUrl: IMAGES.coverHome,
        avatarImageUrl: IMAGES.logoHome,
        specialties: ['venta', 'arriendo'],
    });

    console.log('\n→ SimpleSerenatas');
    await upsertSerenatasGroup(db, admin.id);

    await client.end();

    console.log('\n✅ Listo. URLs locales (con apps en dev):\n');
    console.log('  Agenda:        http://localhost:3004/demo-plataforma-agenda');
    console.log('  Autos:         http://localhost:3002/perfil/demo-plataforma-autos');
    console.log('  Propiedades:   http://localhost:3003/perfil/demo-plataforma-propiedades');
    console.log('  Serenatas:     http://localhost:3005/mariachi-demo-plataforma');
    console.log('  Serenatas cat: http://localhost:3005/mariachis\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
