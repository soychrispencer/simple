import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { relationshipNotes, serenataOwners, timelineEvents } from '../../db/schema.js';
import { emitTimelineEvent, recordTimelineEvent } from './timeline-events.js';
import type { TimelineVertical } from '@simple/utils';

export const relationshipNoteVerticalSchema = z.enum(['autos', 'propiedades', 'serenatas']);
export type RelationshipNoteVertical = z.infer<typeof relationshipNoteVerticalSchema>;

export type RelationshipNoteRecord = {
    id: string;
    vertical: RelationshipNoteVertical;
    businessId: string;
    personKind: string;
    personId: string;
    body: string;
    authorUserId: string;
    createdAt: string;
    updatedAt: string;
};

export async function resolveRelationshipBusinessId(
    userId: string,
    vertical: RelationshipNoteVertical,
    accountId?: string | null,
): Promise<string | null> {
    if (vertical === 'autos' || vertical === 'propiedades') return accountId ?? userId;
    const owner = await db.query.serenataOwners.findFirst({
        where: eq(serenataOwners.userId, userId),
    });
    return owner?.id ?? null;
}

function mapNote(row: typeof relationshipNotes.$inferSelect): RelationshipNoteRecord {
    return {
        id: row.id,
        vertical: row.vertical as RelationshipNoteVertical,
        businessId: row.businessId,
        personKind: row.personKind,
        personId: row.personId,
        body: row.body,
        authorUserId: row.authorUserId,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
}

export async function listRelationshipNotes(input: {
    vertical: RelationshipNoteVertical;
    businessId: string;
    personId: string;
    executor?: any;
}): Promise<RelationshipNoteRecord[]> {
    const executor = input.executor ?? db;
    const rows = await executor
        .select()
        .from(relationshipNotes)
        .where(and(
            eq(relationshipNotes.vertical, input.vertical),
            eq(relationshipNotes.businessId, input.businessId),
            eq(relationshipNotes.personId, input.personId),
        ))
        .orderBy(desc(relationshipNotes.createdAt))
        .limit(100);
    return rows.map(mapNote);
}

export async function getRelationshipNotePersonId(input: {
    noteId: string;
    vertical: RelationshipNoteVertical;
    businessId: string;
    executor?: any;
}): Promise<string | null> {
    const executor = input.executor ?? db;
    const [row] = await executor
        .select({ personId: relationshipNotes.personId })
        .from(relationshipNotes)
        .where(and(
            eq(relationshipNotes.id, input.noteId),
            eq(relationshipNotes.vertical, input.vertical),
            eq(relationshipNotes.businessId, input.businessId),
        ))
        .limit(1);
    return row?.personId ?? null;
}

export async function createRelationshipNote(input: {
    vertical: RelationshipNoteVertical;
    businessId: string;
    personId: string;
    body: string;
    authorUserId: string;
    actor?: import('@simple/utils').TimelineEventInput['actor'];
}, options?: { executor?: any }): Promise<RelationshipNoteRecord> {
    const body = input.body.trim();
    const personId = input.personId.trim().slice(0, 160);
    const executor = options?.executor ?? db;
    const [row] = await executor.insert(relationshipNotes).values({
        vertical: input.vertical,
        businessId: input.businessId,
        personKind: 'opaque',
        personId,
        body,
        authorUserId: input.authorUserId,
    }).returning();

    const timelineInput = {
        type: 'note.written',
        business: { vertical: input.vertical as TimelineVertical, id: input.businessId },
        person: { id: personId.slice(0, 80), kind: 'opaque' },
        subject: { kind: 'relationship_note', id: row.id },
        actor: input.actor ?? 'owner',
        payload: { preview: body.slice(0, 120) },
    } satisfies import('@simple/utils').TimelineEventInput;
    if (options?.executor) {
        try {
            await recordTimelineEvent(executor, timelineEvents, timelineInput);
        } catch (error) {
            console.error('[timeline] emit failed', timelineInput.type, error);
        }
    } else {
        emitTimelineEvent(db, timelineEvents, timelineInput);
    }

    return mapNote(row);
}

export async function deleteRelationshipNote(input: {
    noteId: string;
    businessId: string;
    authorUserId: string;
}, options?: { executor?: any }): Promise<boolean> {
    const executor = options?.executor ?? db;
    const [deleted] = await executor
        .delete(relationshipNotes)
        .where(and(
            eq(relationshipNotes.id, input.noteId),
            eq(relationshipNotes.businessId, input.businessId),
            eq(relationshipNotes.authorUserId, input.authorUserId),
        ))
        .returning({ id: relationshipNotes.id });
    return Boolean(deleted);
}
