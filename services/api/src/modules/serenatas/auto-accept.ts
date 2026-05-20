import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataProviderGroups, serenatas } from '../../db/schema.js';
import { validateProviderGroupSlot } from './availability.js';
import { acceptMarketplaceSerenata, type MarketplaceDeps } from './marketplace.js';

type ValidateOwnerAvailability = MarketplaceDeps['validateOwnerAvailability'];

export type AutoAcceptResult =
    | { accepted: true; item: typeof serenatas.$inferSelect }
    | { accepted: false; reason: 'not_configured' | 'flexible_schedule' | 'slot_unavailable' | 'accept_failed'; error?: string };

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
    return { accepted: true, item: result.item };
}
