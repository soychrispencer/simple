import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    serenataGroupMembers,
    serenataOffers,
    serenataOwners,
    serenatas,
} from '../../db/schema.js';
import { listOwnerMarketplaceSerenatas } from './marketplace.js';

export async function listOwnerSerenatas(
    owner: typeof serenataOwners.$inferSelect,
    range: { start: Date; end: Date } | null,
) {
    const assignedConditions = [
        eq(serenatas.ownerId, owner.id),
        inArray(serenatas.status, ['accepted_pending_group']),
    ];
    if (range) assignedConditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
    const assigned = await db
        .select({ item: serenatas, offerId: serenataOffers.id, offerStatus: serenataOffers.status })
        .from(serenatas)
        .leftJoin(serenataOffers, and(eq(serenataOffers.serenataId, serenatas.id), eq(serenataOffers.ownerId, owner.id)))
        .where(and(...assignedConditions))
        .orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));

    const offerConditions = [
        eq(serenataOffers.ownerId, owner.id),
        inArray(serenataOffers.status, ['offered', 'accepted']),
    ];
    if (range) offerConditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
    const offered = await db
        .select({ item: serenatas, offerId: serenataOffers.id, offerStatus: serenataOffers.status })
        .from(serenataOffers)
        .innerJoin(serenatas, eq(serenatas.id, serenataOffers.serenataId))
        .where(and(...offerConditions))
        .orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));

    const marketplaceDirect = await listOwnerMarketplaceSerenatas(owner.id, range);
    const marketplaceRows = marketplaceDirect.map((item) => ({
        item,
        offerId: null as string | null,
        offerStatus: null as string | null,
    }));

    const seen = new Set<string>();
    return [...assigned, ...offered, ...marketplaceRows]
        .filter((row) => {
            if (seen.has(row.item.id)) return false;
            seen.add(row.item.id);
            return true;
        })
        .sort((a, b) => {
            const dateDiff = new Date(a.item.eventDate).getTime() - new Date(b.item.eventDate).getTime();
            if (dateDiff !== 0) return dateDiff;
            return (a.item.eventTime ?? '').localeCompare(b.item.eventTime ?? '');
        })
        .map((row) => ({ ...row.item, offerId: row.offerId, offerStatus: row.offerStatus }));
}

export async function listMusicianSerenatas(
    musician: { id: string },
    range: { start: Date; end: Date } | null,
) {
    const memberRows = await db
        .select({ groupId: serenataGroupMembers.groupId })
        .from(serenataGroupMembers)
        .where(and(eq(serenataGroupMembers.musicianId, musician.id), eq(serenataGroupMembers.status, 'accepted')));
    const groupIds = memberRows.map((row) => row.groupId);
    if (groupIds.length === 0) return [];
    const conditions = [inArray(serenatas.groupId, groupIds)];
    if (range) conditions.push(gte(serenatas.eventDate, range.start), lte(serenatas.eventDate, range.end));
    return db.select().from(serenatas).where(and(...conditions)).orderBy(asc(serenatas.eventDate), asc(serenatas.eventTime));
}

export async function listMusicianAgenda(
    musician: { id: string },
    range: { start: Date; end: Date },
) {
    const memberRows = await db
        .select({ groupId: serenataGroupMembers.groupId })
        .from(serenataGroupMembers)
        .where(and(eq(serenataGroupMembers.musicianId, musician.id), eq(serenataGroupMembers.status, 'accepted')));
    const groupIds = memberRows.map((row) => row.groupId);
    if (groupIds.length === 0) return [];
    return db.select().from(serenatas)
        .where(and(
            inArray(serenatas.groupId, groupIds),
            inArray(serenatas.status, ['scheduled', 'completed']),
            gte(serenatas.eventDate, range.start),
            lte(serenatas.eventDate, range.end),
        ))
        .orderBy(asc(serenatas.eventTime));
}
