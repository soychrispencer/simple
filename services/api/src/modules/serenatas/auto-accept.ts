import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataGroupMembers, serenataGroupServices, serenataGroups, serenataProviderGroups, serenatas } from '../../db/schema.js';
import { validateGroupForSerenata, validateProviderGroupSlot } from './availability.js';
import { acceptMarketplaceSerenata, type MarketplaceDeps } from './marketplace.js';

type ValidateOwnerAvailability = MarketplaceDeps['validateOwnerAvailability'];

export type AutoAcceptResult =
    | { accepted: true; item: typeof serenatas.$inferSelect }
    | { accepted: false; reason: 'not_configured' | 'flexible_schedule' | 'slot_unavailable' | 'accept_failed'; error?: string };

async function tryAutoAssignScheduledGroup(item: typeof serenatas.$inferSelect, ownerId: string) {
    if (!item.providerGroupId || !item.eventTime) return item;
    const candidates = await db
        .select()
        .from(serenataGroups)
        .where(and(
            eq(serenataGroups.ownerId, ownerId),
            eq(serenataGroups.providerGroupId, item.providerGroupId),
            eq(serenataGroups.status, 'active'),
            sql`date_trunc('day', ${serenataGroups.date}) = date_trunc('day', ${item.eventDate})`,
        ))
        .orderBy(desc(serenataGroups.updatedAt));
    for (const group of candidates) {
        const service = item.selectedServiceId
            ? await db.query.serenataGroupServices.findFirst({ where: eq(serenataGroupServices.id, item.selectedServiceId) })
            : null;
        const requiredMusicians = service?.musiciansCount ?? 0;
        const activeMembers = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(serenataGroupMembers)
            .where(and(
                eq(serenataGroupMembers.groupId, group.id),
                inArray(serenataGroupMembers.status, ['invited', 'accepted']),
            ));
        const memberCount = Number(activeMembers[0]?.count ?? 0);
        if (requiredMusicians > 0 && memberCount < requiredMusicians) continue;
        const conflict = await validateGroupForSerenata(db, {
            ownerId,
            serenataId: item.id,
            groupId: group.id,
            requiredMusicians,
            eventDate: item.eventDate,
            eventTime: item.eventTime,
            duration: item.duration,
        });
        if (conflict) continue;
        const [scheduled] = await db.update(serenatas).set({
            groupId: group.id,
            status: 'scheduled',
            updatedAt: new Date(),
        }).where(eq(serenatas.id, item.id)).returning();
        if (scheduled) return scheduled;
    }
    return item;
}

export async function tryAutoAcceptMarketplaceSerenata(
    ownerId: string,
    serenataId: string,
    validateAvailability: ValidateOwnerAvailability,
): Promise<AutoAcceptResult> {
    const serenata = await db.query.serenatas.findFirst({
        where: and(
            eq(serenatas.id, serenataId),
            eq(serenatas.ownerId, ownerId),
            isNotNull(serenatas.providerGroupId),
            inArray(serenatas.status, ['pending', 'pending_open']),
            eq(serenatas.source, 'platform_lead'),
        ),
    });
    if (!serenata?.providerGroupId) {
        return { accepted: false, reason: 'not_configured' };
    }

    const group = await db.query.serenataProviderGroups.findFirst({
        where: eq(serenataProviderGroups.id, serenata.providerGroupId),
    });
    if (!group || group.bookingMode !== 'auto_if_available') {
        return { accepted: false, reason: 'not_configured' };
    }

    if (serenata.flexibleSchedule || !serenata.eventTime) {
        return { accepted: false, reason: 'flexible_schedule' };
    }

    const slotConflict = await validateProviderGroupSlot(db, {
        ownerId,
        providerGroupId: serenata.providerGroupId,
        eventDate: serenata.eventDate,
        eventTime: serenata.eventTime,
        duration: serenata.duration,
        excludeId: serenata.id,
        includePending: true,
    });
    if (slotConflict) {
        return { accepted: false, reason: 'slot_unavailable', error: slotConflict };
    }

    const ownerConflict = await validateAvailability(db, {
        ownerId,
        serenata,
        excludeId: serenata.id,
    });
    if (ownerConflict) {
        return { accepted: false, reason: 'slot_unavailable', error: ownerConflict };
    }

    const result = await acceptMarketplaceSerenata(ownerId, serenataId, validateAvailability);
    if (!result.ok) {
        return { accepted: false, reason: 'accept_failed', error: result.error };
    }
    const maybeScheduled = await tryAutoAssignScheduledGroup(result.item, ownerId);
    return { accepted: true, item: maybeScheduled };
}
