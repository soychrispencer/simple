import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { serenataProviderGroups, serenataSavedProviderGroups } from '../../db/schema.js';
import { enrichProviderGroupsForMarketplace } from './marketplace-enrich.js';

export type SavedMariachiApiRecord = {
    id: string;
    slug: string;
    href: string;
    title: string;
    price: string;
    image?: string;
    location?: string;
    savedAt: number;
    subtitle?: string;
};

export const toggleSavedMariachiSchema = z.object({
    providerGroupId: z.string().uuid(),
});

function formatMarketplaceMoney(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return 'Por confirmar';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(value);
}

function profileLocation(comunaBase: string | null, region: string | null): string {
    return [comunaBase, region].filter(Boolean).join(', ') || 'Zona por confirmar';
}

function zonesSubtitle(serviceComunas: string[] | null | undefined): string | undefined {
    const comunas = serviceComunas ?? [];
    if (comunas.length === 0) return undefined;
    const visible = comunas.slice(0, 3).join(', ');
    return comunas.length > 3 ? `${visible} +${comunas.length - 3}` : visible;
}

function toSavedMariachiRecord(
    group: Awaited<ReturnType<typeof enrichProviderGroupsForMarketplace>>[number],
    savedAt: Date,
): SavedMariachiApiRecord {
    const href = `/${encodeURIComponent(group.slug)}`;
    return {
        id: group.id,
        slug: group.slug,
        href,
        title: group.name,
        price: formatMarketplaceMoney(group.startingPrice),
        image: group.coverUrl ?? group.logoUrl ?? undefined,
        location: profileLocation(group.comunaBase, group.region),
        savedAt: savedAt.getTime(),
        subtitle: zonesSubtitle(group.serviceComunas),
    };
}

export async function listSavedMariachisForUser(userId: string): Promise<SavedMariachiApiRecord[]> {
    const savedRows = await db
        .select()
        .from(serenataSavedProviderGroups)
        .where(eq(serenataSavedProviderGroups.userId, userId))
        .orderBy(desc(serenataSavedProviderGroups.savedAt));

    if (savedRows.length === 0) return [];

    const groupIds = savedRows.map((row) => row.providerGroupId);
    const groups = await db
        .select()
        .from(serenataProviderGroups)
        .where(and(inArray(serenataProviderGroups.id, groupIds), eq(serenataProviderGroups.status, 'active')));

    const enriched = await enrichProviderGroupsForMarketplace(groups);
    const enrichedById = new Map(enriched.map((group) => [group.id, group]));

    return savedRows
        .map((row) => {
            const group = enrichedById.get(row.providerGroupId);
            if (!group) return null;
            return toSavedMariachiRecord(group, row.savedAt);
        })
        .filter((item): item is SavedMariachiApiRecord => item != null);
}

export async function toggleSavedMariachiForUser(
    userId: string,
    providerGroupId: string,
): Promise<{ saved: boolean; items: SavedMariachiApiRecord[] }> {
    const group = await db.query.serenataProviderGroups.findFirst({
        where: and(eq(serenataProviderGroups.id, providerGroupId), eq(serenataProviderGroups.status, 'active')),
    });
    if (!group) {
        throw new Error('NOT_FOUND');
    }

    const existing = await db
        .select()
        .from(serenataSavedProviderGroups)
        .where(
            and(
                eq(serenataSavedProviderGroups.userId, userId),
                eq(serenataSavedProviderGroups.providerGroupId, providerGroupId),
            ),
        )
        .limit(1);

    let saved = false;
    if (existing.length > 0) {
        await db
            .delete(serenataSavedProviderGroups)
            .where(
                and(
                    eq(serenataSavedProviderGroups.userId, userId),
                    eq(serenataSavedProviderGroups.providerGroupId, providerGroupId),
                ),
            );
    } else {
        saved = true;
        await db.insert(serenataSavedProviderGroups).values({
            userId,
            providerGroupId,
            savedAt: new Date(),
        });
    }

    const items = await listSavedMariachisForUser(userId);
    return { saved, items };
}

export async function removeSavedMariachiForUser(userId: string, providerGroupId: string): Promise<SavedMariachiApiRecord[]> {
    await db
        .delete(serenataSavedProviderGroups)
        .where(
            and(
                eq(serenataSavedProviderGroups.userId, userId),
                eq(serenataSavedProviderGroups.providerGroupId, providerGroupId),
            ),
        );
    return listSavedMariachisForUser(userId);
}
