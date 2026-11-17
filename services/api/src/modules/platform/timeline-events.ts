import type { TimelineEventInput } from '@simple/utils';

/**
 * Persist a TimelineEvent. Never throws to callers of emitTimelineEvent.
 * Failures are logged; business mutations must not depend on this.
 */
export async function recordTimelineEvent(
    db: any,
    timelineEvents: any,
    input: TimelineEventInput,
): Promise<void> {
    const occurredAt =
        input.occurredAt instanceof Date
            ? input.occurredAt
            : input.occurredAt
                ? new Date(input.occurredAt)
                : new Date();

    const row = {
        idempotencyKey: input.idempotencyKey ?? null,
        type: input.type,
        occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
        vertical: input.business.vertical,
        businessId: input.business.id,
        personKind: input.person?.kind ?? null,
        personId: input.person?.id ?? null,
        subjectKind: input.subject.kind,
        subjectId: input.subject.id,
        actor: input.actor,
        payload: input.payload ?? null,
    };
    const insert = db.insert(timelineEvents).values(row);
    if (input.idempotencyKey) {
        await insert.onConflictDoNothing();
    } else {
        await insert;
    }
}

/** Fire-and-forget wrapper for request handlers. */
export function emitTimelineEvent(
    db: any,
    timelineEvents: any,
    input: TimelineEventInput,
): void {
    void recordTimelineEvent(db, timelineEvents, input).catch((error: unknown) => {
        console.error('[timeline] emit failed', input.type, error);
    });
}

export function agendaClientPerson(clientId: string | null | undefined): TimelineEventInput['person'] {
    if (!clientId) return null;
    return { id: clientId, kind: 'agenda_client' };
}

export function agendaBusiness(professionalId: string): TimelineEventInput['business'] {
    return { vertical: 'agenda', id: professionalId };
}
