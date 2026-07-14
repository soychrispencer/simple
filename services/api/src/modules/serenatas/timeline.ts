import { and, eq, ne, sql } from 'drizzle-orm';
import type { TimelineActor, TimelineEventInput, TimelinePersonRef } from '@simple/utils';
import { db } from '../../db/index.js';
import { serenataClients, serenatas, timelineEvents } from '../../db/schema.js';
import { emitTimelineEvent } from '../platform/timeline-events.js';

type SerenataRow = {
    id: string;
    ownerId: string | null;
    providerGroupId: string | null;
    clientId: string | null;
    clientPhone?: string | null;
    recipientName?: string | null;
    status?: string | null;
    source?: string | null;
};

export function serenataBusiness(item: Pick<SerenataRow, 'providerGroupId' | 'ownerId'>): TimelineEventInput['business'] {
    return {
        vertical: 'serenatas',
        id: item.providerGroupId || item.ownerId || 'unknown',
    };
}

export function serenataPerson(opts: {
    clientUserId?: string | null;
    clientId?: string | null;
    clientPhone?: string | null;
}): TimelinePersonRef | null {
    if (opts.clientUserId) return { kind: 'user', id: opts.clientUserId };
    if (opts.clientId) return { kind: 'opaque', id: `serenata_client:${opts.clientId}` };
    const phone = opts.clientPhone?.replace(/\D/g, '');
    if (phone) return { kind: 'opaque', id: `phone:${phone}` };
    return null;
}

async function resolveClientUserId(clientId: string | null | undefined): Promise<string | null> {
    if (!clientId) return null;
    const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, clientId) });
    return client?.userId ?? null;
}

export function emitSerenataTimeline(
    type: TimelineEventInput['type'],
    item: SerenataRow,
    opts: {
        actor: TimelineActor;
        person?: TimelinePersonRef | null;
        payload?: Record<string, unknown>;
    },
): void {
    emitTimelineEvent(db, timelineEvents, {
        type,
        business: serenataBusiness(item),
        person: opts.person ?? serenataPerson({ clientId: item.clientId, clientPhone: item.clientPhone }),
        subject: { kind: 'serenata', id: item.id },
        actor: opts.actor,
        payload: opts.payload,
    });
}

/** Fire-and-forget: resolve person + emit. */
export function emitSerenataTimelineAsync(
    type: TimelineEventInput['type'],
    item: SerenataRow,
    opts: {
        actor: TimelineActor;
        payload?: Record<string, unknown>;
        fromStatus?: string | null;
        toStatus?: string | null;
    },
): void {
    void (async () => {
        const clientUserId = await resolveClientUserId(item.clientId);
        emitSerenataTimeline(type, item, {
            actor: opts.actor,
            person: serenataPerson({
                clientUserId,
                clientId: item.clientId,
                clientPhone: item.clientPhone,
            }),
            payload: {
                ...(opts.payload ?? {}),
                ...(opts.fromStatus != null ? { fromStatus: opts.fromStatus } : {}),
                ...(opts.toStatus != null ? { toStatus: opts.toStatus } : {}),
                source: item.source ?? undefined,
            },
        });
    })().catch((error: unknown) => {
        console.error('[timeline] serenata emit failed', type, error);
    });
}

/** First serenata for this contratante with the owner → relationship.created. */
export function maybeEmitSerenataRelationshipCreated(item: SerenataRow, actor: TimelineActor): void {
    if (!item.ownerId || !item.clientId) return;
    void (async () => {
        const [row] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(serenatas)
            .where(and(
                eq(serenatas.ownerId, item.ownerId!),
                eq(serenatas.clientId, item.clientId!),
                ne(serenatas.id, item.id),
            ));
        if (Number(row?.count ?? 0) > 0) return;
        const clientUserId = await resolveClientUserId(item.clientId);
        emitSerenataTimeline('relationship.created', item, {
            actor,
            person: serenataPerson({
                clientUserId,
                clientId: item.clientId,
                clientPhone: item.clientPhone,
            }),
            payload: { source: item.source ?? 'unknown', role: 'contractor' },
        });
    })().catch((error: unknown) => {
        console.error('[timeline] relationship.created failed', error);
    });
}
