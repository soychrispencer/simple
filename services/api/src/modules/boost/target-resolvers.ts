import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaProfessionalProfiles, serenataProviderGroups } from '../../db/schema.js';
import type { BoostTargetRecord, BoostTargetType, VerticalType } from './types.js';
import { getBoostListingById, getBoostListingsByOwner } from './service.js';

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
    return getBoostListingsByOwner(vertical, ownerId).map((item) => ({ ...item, targetType: 'listing' as const }));
}

export function inferBoostTargetType(vertical: VerticalType): BoostTargetType {
    if (vertical === 'serenatas') return 'serenata_group';
    if (vertical === 'agenda') return 'operator_profile';
    return 'listing';
}