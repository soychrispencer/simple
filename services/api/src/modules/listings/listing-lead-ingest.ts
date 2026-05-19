import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import type { db } from '../../db/index.js';
import { listingLeads } from '../../db/schema.js';
import type {
    ListingLeadChannel,
    ListingLeadSource,
    PortalKey,
} from './portals.js';
import {
    getImportedLeadSourceLabel,
    normalizeImportedLeadEmail,
    normalizeImportedLeadName,
    parseImportedLeadTimestamp,
} from './portals.js';

type ListingLeadActionSource = 'whatsapp' | 'phone_call' | 'email';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any;

export type ListingLeadIngestDeps = {
    db: typeof db;
    eq: typeof eq;
    resolveInitialListingLeadAssignment: (
        ownerUserId: string,
        vertical: VerticalType,
    ) => Promise<{ assignedToUserId: string | null; assignedToTeamMemberId: string | null }>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    mapListingLeadRow: (row: AnyRecord) => AnyRecord;
    syncListingLeadCountFromDb: (listingId: string) => Promise<void>;
    getListingLeadById: (id: string) => Promise<AnyRecord | null>;
    getListingLeadByExternalReference: (input: {
        listingId: string;
        source: ListingLeadSource;
        externalSourceId: string;
    }) => Promise<AnyRecord | null>;
    getMessageThreadByListingAndBuyer: (
        listingId: string,
        buyerUserId: string,
    ) => Promise<AnyRecord | null>;
    createMessageEntry: (input: AnyRecord) => Promise<AnyRecord>;
    touchMessageThreadAfterIncomingMessage: (
        thread: AnyRecord,
        role: 'buyer',
        timestamp: number,
    ) => Promise<AnyRecord>;
    createMessageThread: (input: AnyRecord) => Promise<AnyRecord>;
    createListingLeadActivity: (input: AnyRecord) => Promise<unknown>;
    listingLeadSourceLabel: (source: ListingLeadSource | ListingLeadActionSource) => string;
};

export function buildListingLeadActionExternalSourceId(input: {
    listingId: string;
    source: ListingLeadActionSource;
    buyerUserId?: string | null;
    contactEmail: string;
    contactPhone?: string | null;
    contactWhatsapp?: string | null;
}) {
    const identity = [
        input.buyerUserId?.trim(),
        input.contactEmail.trim().toLowerCase(),
        input.contactWhatsapp?.trim(),
        input.contactPhone?.trim(),
    ].find((value) => Boolean(value)) ?? 'anon';

    return `contact-action:${input.source}:${createHash('sha1')
        .update(`${input.listingId}:${identity}`)
        .digest('hex')}`;
}

export function createListingLeadIngestHelpers(deps: ListingLeadIngestDeps) {
    const {
        db,
        eq,
        resolveInitialListingLeadAssignment,
        getPrimaryAccountIdForUser,
        mapListingLeadRow,
        syncListingLeadCountFromDb,
        getListingLeadById,
        getListingLeadByExternalReference,
        getMessageThreadByListingAndBuyer,
        createMessageEntry,
        touchMessageThreadAfterIncomingMessage,
        createMessageThread,
        createListingLeadActivity,
        listingLeadSourceLabel,
    } = deps;

    async function createListingLeadRecord(input: {
        listingId: string;
        ownerUserId: string;
        buyerUserId?: string | null;
        vertical: VerticalType;
        source: ListingLeadSource;
        channel: ListingLeadChannel;
        contactName: string;
        contactEmail: string;
        contactPhone?: string | null;
        contactWhatsapp?: string | null;
        message?: string | null;
        sourcePage?: string | null;
        externalSourceId?: string | null;
        createdAt?: number;
    }): Promise<AnyRecord> {
        const createdAt = new Date(input.createdAt ?? Date.now());
        const assignment = await resolveInitialListingLeadAssignment(input.ownerUserId, input.vertical);
        const accountId = await getPrimaryAccountIdForUser(input.ownerUserId);
        const rows = await db.insert(listingLeads).values({
            accountId,
            listingId: input.listingId,
            ownerUserId: input.ownerUserId,
            buyerUserId: input.buyerUserId ?? null,
            vertical: input.vertical,
            source: input.source,
            channel: input.channel,
            contactName: input.contactName.trim(),
            contactEmail: input.contactEmail.trim().toLowerCase(),
            contactPhone: input.contactPhone?.trim() || null,
            contactWhatsapp: input.contactWhatsapp?.trim() || null,
            message: input.message?.trim() || null,
            status: 'new',
            assignedToUserId: assignment.assignedToUserId,
            assignedToTeamMemberId: assignment.assignedToTeamMemberId,
            sourcePage: input.sourcePage?.trim() || null,
            externalSourceId: input.externalSourceId?.trim() || null,
            createdAt,
            updatedAt: createdAt,
        }).returning();
        const lead = mapListingLeadRow(rows[0]);
        await syncListingLeadCountFromDb(lead.listingId);
        return lead;
    }

    async function createOrRefreshListingLeadAction(input: {
        listing: AnyRecord;
        buyer?: AnyRecord | null;
        source: ListingLeadActionSource;
        contactName: string;
        contactEmail: string;
        contactPhone?: string | null;
        contactWhatsapp?: string | null;
        message?: string | null;
        sourcePage?: string | null;
    }): Promise<{ lead: AnyRecord; created: boolean }> {
        const now = Date.now();
        const externalSourceId = buildListingLeadActionExternalSourceId({
            listingId: input.listing.id,
            source: input.source,
            buyerUserId: input.buyer?.id ?? null,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactWhatsapp: input.contactWhatsapp,
        });

        const existingLead = await getListingLeadByExternalReference({
            listingId: input.listing.id,
            source: input.source,
            externalSourceId,
        });

        if (existingLead) {
            const rows = await db.update(listingLeads).set({
                buyerUserId: input.buyer?.id ?? existingLead.buyerUserId,
                contactName: input.contactName.trim(),
                contactEmail: input.contactEmail.trim().toLowerCase(),
                contactPhone: input.contactPhone?.trim() || null,
                contactWhatsapp: input.contactWhatsapp?.trim() || null,
                message: input.message?.trim() || existingLead.message,
                sourcePage: input.sourcePage?.trim() || existingLead.sourcePage,
                updatedAt: new Date(now),
            }).where(eq(listingLeads.id, existingLead.id)).returning();

            const updatedLead = mapListingLeadRow(rows[0]);
            await createListingLeadActivity({
                leadId: updatedLead.id,
                actorUserId: input.buyer?.id ?? null,
                type: 'note',
                body: `Accion de contacto registrada nuevamente por ${listingLeadSourceLabel(input.source)}.`,
                meta: {
                    source: input.source,
                    channel: 'lead',
                    repeated: true,
                },
                createdAt: now,
            });

            return { lead: updatedLead, created: false };
        }

        const lead = await createListingLeadRecord({
            listingId: input.listing.id,
            ownerUserId: input.listing.ownerId,
            buyerUserId: input.buyer?.id ?? null,
            vertical: input.listing.vertical,
            source: input.source,
            channel: 'lead',
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactWhatsapp: input.contactWhatsapp,
            message: input.message,
            sourcePage: input.sourcePage,
            externalSourceId,
            createdAt: now,
        });

        await createListingLeadActivity({
            leadId: lead.id,
            actorUserId: input.buyer?.id ?? null,
            type: 'created',
            body: `Lead creado por clic en ${listingLeadSourceLabel(input.source)}.`,
            meta: {
                source: input.source,
                channel: 'lead',
            },
            createdAt: now,
        });

        return { lead, created: true };
    }

    async function upsertImportedListingLead(input: {
        listing: AnyRecord;
        source: ListingLeadSource;
        channel: ListingLeadChannel;
        portal: PortalKey | null;
        externalListingId?: string | null;
        externalSourceId?: string | null;
        contactName?: string | null;
        contactEmail?: string | null;
        contactPhone?: string | null;
        contactWhatsapp?: string | null;
        message?: string | null;
        sourcePage?: string | null;
        receivedAt?: string | number | null;
        meta?: Record<string, unknown> | null;
    }): Promise<{ lead: AnyRecord; created: boolean }> {
        const receivedAt = parseImportedLeadTimestamp(input.receivedAt);
        const normalizedEmail = normalizeImportedLeadEmail({
            source: input.source,
            externalSourceId: input.externalSourceId,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactWhatsapp: input.contactWhatsapp,
        });
        const normalizedName = normalizeImportedLeadName(
            input.source,
            input.contactName,
            normalizedEmail,
            input.contactPhone ?? null,
            input.contactWhatsapp ?? null,
        );
        const normalizedMessage = input.message?.trim() || null;
        const normalizedSourcePage = input.sourcePage?.trim() || null;
        const normalizedExternalSourceId = input.externalSourceId?.trim() || null;
        const sourceLabel = getImportedLeadSourceLabel(input.listing.vertical, input.source, input.portal);
        const activityMeta = {
            imported: true,
            source: input.source,
            channel: input.channel,
            portal: input.portal,
            externalSourceId: normalizedExternalSourceId,
            externalListingId: input.externalListingId?.trim() || null,
            sourcePage: normalizedSourcePage,
            payloadMeta: input.meta ?? null,
        };

        const existingLead = normalizedExternalSourceId
            ? await getListingLeadByExternalReference({
                listingId: input.listing.id,
                source: input.source,
                externalSourceId: normalizedExternalSourceId,
            })
            : null;

        if (!existingLead) {
            const lead = await createListingLeadRecord({
                listingId: input.listing.id,
                ownerUserId: input.listing.ownerId,
                vertical: input.listing.vertical,
                source: input.source,
                channel: input.channel,
                contactName: normalizedName,
                contactEmail: normalizedEmail,
                contactPhone: input.contactPhone,
                contactWhatsapp: input.contactWhatsapp,
                message: normalizedMessage,
                sourcePage: normalizedSourcePage,
                externalSourceId: normalizedExternalSourceId,
                createdAt: receivedAt,
            });
            await createListingLeadActivity({
                leadId: lead.id,
                type: 'created',
                body: `Lead importado desde ${sourceLabel}.`,
                meta: activityMeta,
                createdAt: receivedAt,
            });
            return { lead, created: true };
        }

        const updates: Record<string, unknown> = {
            updatedAt: new Date(Math.max(existingLead.updatedAt, receivedAt)),
        };
        const changedFields: string[] = [];

        if (normalizedName && normalizedName !== existingLead.contactName) {
            updates.contactName = normalizedName;
            changedFields.push('contactName');
        }
        if (normalizedEmail && normalizedEmail !== existingLead.contactEmail) {
            updates.contactEmail = normalizedEmail;
            changedFields.push('contactEmail');
        }

        const normalizedPhone = input.contactPhone?.trim() || null;
        if (normalizedPhone && normalizedPhone !== existingLead.contactPhone) {
            updates.contactPhone = normalizedPhone;
            changedFields.push('contactPhone');
        }

        const normalizedWhatsapp = input.contactWhatsapp?.trim() || null;
        if (normalizedWhatsapp && normalizedWhatsapp !== existingLead.contactWhatsapp) {
            updates.contactWhatsapp = normalizedWhatsapp;
            changedFields.push('contactWhatsapp');
        }

        if (normalizedMessage && normalizedMessage !== existingLead.message) {
            updates.message = normalizedMessage;
            changedFields.push('message');
        }

        if (normalizedSourcePage && normalizedSourcePage !== existingLead.sourcePage) {
            updates.sourcePage = normalizedSourcePage;
            changedFields.push('sourcePage');
        }

        const rows = await db.update(listingLeads).set(updates).where(eq(listingLeads.id, existingLead.id)).returning();
        const lead = mapListingLeadRow(rows[0]);

        await createListingLeadActivity({
            leadId: lead.id,
            type: normalizedMessage && normalizedMessage !== existingLead.message ? 'message' : 'note',
            body: changedFields.length > 0
                ? `Lead sincronizado desde ${sourceLabel} (${changedFields.join(', ')}).`
                : `Lead sincronizado nuevamente desde ${sourceLabel}.`,
            meta: {
                ...activityMeta,
                changedFields,
            },
            createdAt: receivedAt,
        });

        return { lead, created: false };
    }

    async function createOrAppendListingConversation(input: {
        listing: AnyRecord;
        buyer: AnyRecord;
        contactName: string;
        contactEmail: string;
        contactPhone?: string | null;
        contactWhatsapp?: string | null;
        message: string;
        sourcePage?: string | null;
    }): Promise<{
        lead: AnyRecord;
        thread: AnyRecord;
        entry: AnyRecord;
        createdLead: boolean;
    }> {
        const existingThread = await getMessageThreadByListingAndBuyer(input.listing.id, input.buyer.id);
        if (existingThread) {
            const lead = await getListingLeadById(existingThread.leadId);
            if (!lead) {
                throw new Error('El hilo no tiene un lead asociado válido.');
            }

            const now = Date.now();
            const entry = await createMessageEntry({
                threadId: existingThread.id,
                senderUserId: input.buyer.id,
                senderRole: 'buyer',
                body: input.message.trim(),
                createdAt: now,
            });
            const thread = await touchMessageThreadAfterIncomingMessage(existingThread, 'buyer', now);
            await db.update(listingLeads).set({
                contactName: input.contactName.trim(),
                contactEmail: input.contactEmail.trim().toLowerCase(),
                contactPhone: input.contactPhone?.trim() || null,
                contactWhatsapp: input.contactWhatsapp?.trim() || null,
                message: input.message.trim(),
                updatedAt: new Date(now),
            }).where(eq(listingLeads.id, lead.id));
            await createListingLeadActivity({
                leadId: lead.id,
                actorUserId: input.buyer.id,
                type: 'message',
                body: `Nuevo mensaje del comprador: ${input.message.trim()}`,
            });

            const refreshedLead = await getListingLeadById(lead.id);
            if (!refreshedLead) {
                throw new Error('No se pudo refrescar el lead del hilo.');
            }
            return { lead: refreshedLead, thread, entry, createdLead: false };
        }

        const now = Date.now();
        const lead = await createListingLeadRecord({
            listingId: input.listing.id,
            ownerUserId: input.listing.ownerId,
            buyerUserId: input.buyer.id,
            vertical: input.listing.vertical,
            source: 'direct_message',
            channel: 'message',
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            contactWhatsapp: input.contactWhatsapp,
            message: input.message,
            sourcePage: input.sourcePage,
            createdAt: now,
        });
        await createListingLeadActivity({
            leadId: lead.id,
            actorUserId: input.buyer.id,
            type: 'created',
            body: `Lead creado desde conversación en ${input.sourcePage || 'publicación pública'}.`,
            meta: {
                source: 'direct_message',
                channel: 'message',
            },
        });

        const thread = await createMessageThread({
            vertical: input.listing.vertical,
            listingId: input.listing.id,
            ownerUserId: input.listing.ownerId,
            buyerUserId: input.buyer.id,
            leadId: lead.id,
            ownerUnreadCount: 1,
            buyerUnreadCount: 0,
            lastMessageAt: now,
        });
        const entry = await createMessageEntry({
            threadId: thread.id,
            senderUserId: input.buyer.id,
            senderRole: 'buyer',
            body: input.message.trim(),
            createdAt: now,
        });
        await createListingLeadActivity({
            leadId: lead.id,
            actorUserId: input.buyer.id,
            type: 'message',
            body: `Mensaje inicial del comprador: ${input.message.trim()}`,
        });

        return { lead, thread, entry, createdLead: true };
    }

    return {
        createListingLeadRecord,
        createOrRefreshListingLeadAction,
        upsertImportedListingLead,
        createOrAppendListingConversation,
    };
}
