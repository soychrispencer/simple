import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaProfessionalProfiles, marketplaceOperatorProducts, marketplaceOperatorServices, publicProfiles, serenataProviderGroups } from '../../db/schema.js';
import type { BoostTargetRecord, BoostTargetType, VerticalType } from './types.js';
import { getBoostListingById, getBoostListingsByOwner } from './service.js';

function formatCatalogPrice(price: unknown, promoPrice: unknown, currency: unknown) {
    const value = promoPrice ?? price;
    if (value == null) return 'Consultar precio';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value);
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: typeof currency === 'string' ? currency : 'CLP',
        maximumFractionDigits: 0,
    }).format(amount);
}

async function resolveOperatorProductTarget(productId: string): Promise<BoostTargetRecord | null> {
    const [row] = await db
        .select({ product: marketplaceOperatorProducts, profile: publicProfiles })
        .from(marketplaceOperatorProducts)
        .innerJoin(publicProfiles, eq(marketplaceOperatorProducts.publicProfileId, publicProfiles.id))
        .where(and(
            eq(marketplaceOperatorProducts.id, productId),
            eq(marketplaceOperatorProducts.isActive, true),
            eq(publicProfiles.isPublished, true),
        ))
        .limit(1);
    if (!row) return null;
    const { product, profile } = row;
    return {
        id: String(product.id),
        targetType: 'operator_product',
        vertical: 'autos',
        section: 'products',
        ownerId: String(profile.userId),
        href: `/perfil/${profile.slug}`,
        title: String(product.name),
        subtitle: 'Producto',
        price: formatCatalogPrice(product.price, product.promoPrice, product.currency),
        location: profile.city ?? profile.region ?? 'Chile',
        imageUrl: product.imageUrl ? String(product.imageUrl) : profile.coverImageUrl ?? profile.avatarImageUrl ?? undefined,
    };
}

async function resolveOperatorServiceTarget(serviceId: string): Promise<BoostTargetRecord | null> {
    const [row] = await db
        .select({ service: marketplaceOperatorServices, profile: publicProfiles })
        .from(marketplaceOperatorServices)
        .innerJoin(publicProfiles, eq(marketplaceOperatorServices.publicProfileId, publicProfiles.id))
        .where(and(
            eq(marketplaceOperatorServices.id, serviceId),
            eq(marketplaceOperatorServices.isActive, true),
            eq(publicProfiles.isPublished, true),
        ))
        .limit(1);
    if (!row) return null;
    const { service, profile } = row;
    const pricingMode = String(service.pricingMode ?? 'fixed');
    return {
        id: String(service.id),
        targetType: 'operator_service',
        vertical: 'autos',
        section: 'services',
        ownerId: String(profile.userId),
        href: `/perfil/${profile.slug}`,
        title: String(service.name),
        subtitle: 'Servicio',
        price: pricingMode === 'quote'
            ? 'Cotizar'
            : formatCatalogPrice(service.price, service.promoPrice, service.currency),
        location: profile.city ?? profile.region ?? 'Chile',
        imageUrl: service.imageUrl ? String(service.imageUrl) : profile.coverImageUrl ?? profile.avatarImageUrl ?? undefined,
    };
}

async function listAutosCatalogTargetsForOwner(ownerUserId: string): Promise<BoostTargetRecord[]> {
    const profiles = await db
        .select()
        .from(publicProfiles)
        .where(and(eq(publicProfiles.userId, ownerUserId), eq(publicProfiles.vertical, 'autos'), eq(publicProfiles.isPublished, true)));
    const profileIds = profiles.map((profile) => profile.id);
    if (profileIds.length === 0) return [];

    const productRows = await db
        .select({ product: marketplaceOperatorProducts, profile: publicProfiles })
        .from(marketplaceOperatorProducts)
        .innerJoin(publicProfiles, eq(marketplaceOperatorProducts.publicProfileId, publicProfiles.id))
        .where(and(eq(marketplaceOperatorProducts.vertical, 'autos'), eq(marketplaceOperatorProducts.isActive, true), eq(publicProfiles.userId, ownerUserId)));

    const serviceRows = await db
        .select({ service: marketplaceOperatorServices, profile: publicProfiles })
        .from(marketplaceOperatorServices)
        .innerJoin(publicProfiles, eq(marketplaceOperatorServices.publicProfileId, publicProfiles.id))
        .where(and(eq(marketplaceOperatorServices.vertical, 'autos'), eq(marketplaceOperatorServices.isActive, true), eq(publicProfiles.userId, ownerUserId)));

    const products = await Promise.all(productRows.map(({ product }) => resolveOperatorProductTarget(String(product.id))));
    const services = await Promise.all(serviceRows.map(({ service }) => resolveOperatorServiceTarget(String(service.id))));
    return [...products, ...services].filter((item): item is BoostTargetRecord => item != null);
}

export async function resolveSerenataGroupTarget(groupId: string): Promise<BoostTargetRecord | null> {
    const [row] = await db
        .select()
        .from(serenataProviderGroups)
        .where(eq(serenataProviderGroups.id, groupId))
        .limit(1);
    if (!row || row.status !== 'active' || !row.logoUrl || !row.coverUrl) return null;

    return {
        id: row.id,
        targetType: 'serenata_group',
        vertical: 'serenatas',
        section: 'marketplace',
        ownerId: row.ownerUserId,
        href: `/${row.slug}`,
        title: row.name,
        subtitle: [row.comunaBase, row.region].filter(Boolean).join(' · ') || 'Chile',
        price: 'Desde marketplace',
        location: row.comunaBase ?? row.region ?? 'Chile',
        imageUrl: row.logoUrl ?? row.coverUrl ?? undefined,
        imageUrls: [row.coverUrl, row.logoUrl].filter(Boolean) as string[],
    };
}

export async function resolveOperatorProfileTarget(profileId: string): Promise<BoostTargetRecord | null> {
    const [row] = await db
        .select()
        .from(agendaProfessionalProfiles)
        .where(eq(agendaProfessionalProfiles.id, profileId))
        .limit(1);
    if (!row || !row.isPublished) return null;

    return {
        id: row.id,
        targetType: 'operator_profile',
        vertical: 'agenda',
        section: 'marketplace',
        ownerId: row.userId,
        href: `/${row.slug}`,
        title: row.displayName ?? row.profession ?? 'Profesional',
        subtitle: [row.profession, row.city ?? row.region].filter(Boolean).join(' · ') || 'Agenda',
        price: 'Consultar',
        location: row.city ?? row.region ?? 'Chile',
        imageUrl: row.avatarUrl ?? row.coverUrl ?? undefined,
        imageUrls: [row.coverUrl, row.avatarUrl].filter(Boolean) as string[],
    };
}

export async function getBoostTargetById(
    vertical: VerticalType,
    targetType: BoostTargetType,
    targetId: string,
): Promise<BoostTargetRecord | null> {
    if (targetType === 'listing') {
        const listing = getBoostListingById(vertical, targetId);
        if (!listing) return null;
        return { ...listing, targetType: 'listing' };
    }
    if (targetType === 'serenata_group' && vertical === 'serenatas') {
        return resolveSerenataGroupTarget(targetId);
    }
    if (targetType === 'operator_profile' && vertical === 'agenda') {
        return resolveOperatorProfileTarget(targetId);
    }
    if (targetType === 'operator_product' && vertical === 'autos') {
        return resolveOperatorProductTarget(targetId);
    }
    if (targetType === 'operator_service' && vertical === 'autos') {
        return resolveOperatorServiceTarget(targetId);
    }
    return null;
}

export async function listSerenataGroupTargetsForOwner(ownerUserId: string): Promise<BoostTargetRecord[]> {
    const rows = await db
        .select()
        .from(serenataProviderGroups)
        .where(and(
            eq(serenataProviderGroups.ownerUserId, ownerUserId),
            eq(serenataProviderGroups.status, 'active'),
        ));
    const targets: BoostTargetRecord[] = [];
    for (const row of rows) {
        if (!row.logoUrl || !row.coverUrl) continue;
        targets.push({
            id: row.id,
            targetType: 'serenata_group',
            vertical: 'serenatas',
            section: 'marketplace',
            ownerId: row.ownerUserId,
            href: `/${row.slug}`,
            title: row.name,
            subtitle: [row.comunaBase, row.region].filter(Boolean).join(' · ') || 'Chile',
            price: 'Desde marketplace',
            location: row.comunaBase ?? row.region ?? 'Chile',
            imageUrl: row.logoUrl ?? row.coverUrl ?? undefined,
        });
    }
    return targets;
}

export async function listOperatorProfileTargetsForOwner(userId: string): Promise<BoostTargetRecord[]> {
    const [row] = await db
        .select()
        .from(agendaProfessionalProfiles)
        .where(eq(agendaProfessionalProfiles.userId, userId))
        .limit(1);
    if (!row || !row.isPublished) return [];

    return [{
        id: row.id,
        targetType: 'operator_profile',
        vertical: 'agenda',
        section: 'marketplace',
        ownerId: row.userId,
        href: `/${row.slug}`,
        title: row.displayName ?? row.profession ?? 'Profesional',
        subtitle: [row.profession, row.city ?? row.region].filter(Boolean).join(' · ') || 'Agenda',
        price: 'Consultar',
        location: row.city ?? row.region ?? 'Chile',
        imageUrl: row.avatarUrl ?? row.coverUrl ?? undefined,
    }];
}

export async function listBoostTargetsForOwner(vertical: VerticalType, ownerId: string): Promise<BoostTargetRecord[]> {
    if (vertical === 'serenatas') return listSerenataGroupTargetsForOwner(ownerId);
    if (vertical === 'agenda') return listOperatorProfileTargetsForOwner(ownerId);
    if (vertical === 'autos') {
        const listings = getBoostListingsByOwner(vertical, ownerId).map((item) => ({ ...item, targetType: 'listing' as const }));
        const catalogTargets = await listAutosCatalogTargetsForOwner(ownerId);
        return [...listings, ...catalogTargets];
    }
    return getBoostListingsByOwner(vertical, ownerId).map((item) => ({ ...item, targetType: 'listing' as const }));
}

export function inferBoostTargetType(vertical: VerticalType): BoostTargetType {
    if (vertical === 'serenatas') return 'serenata_group';
    if (vertical === 'agenda') return 'operator_profile';
    return 'listing';
}