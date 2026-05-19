import { and, eq, inArray, sql } from 'drizzle-orm';
import type { db } from '../../db/index.js';
import {
    serenataClients,
    serenataGroupMembers,
    serenataGroupServices,
    serenataGroups,
    serenataMusicians,
    serenataNotifications,
    serenataProviderGroupMembers,
    serenatas,
    users,
} from '../../db/schema.js';
import { validateGroupForSerenata } from './availability.js';

export type AssignGroupInput = {
    mode: 'existing' | 'new';
    groupId?: string | null;
    name?: string | null;
    musicianIds: string[];
    message?: string | null;
};

export type AssignGroupResult =
    | { ok: true; item: typeof serenatas.$inferSelect; group: typeof serenataGroups.$inferSelect }
    | { ok: false; error: string; status: 400 | 404 | 409 };

type Tx = Pick<typeof db, 'query' | 'select' | 'insert' | 'update'>;

export function assertOperationalGroupProviderMatch(
    serenataProviderGroupId: string | null,
    operationalGroupProviderGroupId: string | null,
): string | null {
    if (!serenataProviderGroupId) return null;
    if (operationalGroupProviderGroupId && operationalGroupProviderGroupId !== serenataProviderGroupId) {
        return 'El grupo seleccionado no pertenece al proveedor de esta solicitud.';
    }
    return null;
}

export function assertProviderRosterComplete(
    musicianIds: string[],
    rosterMusicianIds: string[],
): string | null {
    if (musicianIds.length === 0) return null;
    const roster = new Set(rosterMusicianIds);
    if (musicianIds.some((id) => !roster.has(id))) {
        return 'Selecciona solo integrantes activos del grupo proveedor.';
    }
    return null;
}

export async function assignSerenataOperationalGroup(
    tx: Tx,
    params: {
        ownerId: string;
        serenataId: string;
        input: AssignGroupInput;
        requiredMusiciansForPackage: (packageCode: string | null) => number;
    },
): Promise<AssignGroupResult> {
    const { ownerId, serenataId, input, requiredMusiciansForPackage } = params;
    const musicianIds = Array.from(new Set(input.musicianIds));

    const current = await tx.query.serenatas.findFirst({
        where: and(eq(serenatas.id, serenataId), eq(serenatas.ownerId, ownerId)),
    });
    if (!current) return { ok: false, error: 'Serenata no encontrada', status: 404 };
    if (!['accepted_pending_group', 'scheduled'].includes(current.status)) {
        return { ok: false, error: 'Esta serenata no está lista para asignar grupo.', status: 409 };
    }

    let group: typeof serenataGroups.$inferSelect | undefined;

    if (input.mode === 'existing') {
        if (!input.groupId) return { ok: false, error: 'Selecciona un grupo.', status: 400 };
        group = await tx.query.serenataGroups.findFirst({
            where: and(eq(serenataGroups.id, input.groupId), eq(serenataGroups.ownerId, ownerId)),
        });
        if (!group) return { ok: false, error: 'Grupo no encontrado', status: 404 };
        const providerMismatch = assertOperationalGroupProviderMatch(
            current.providerGroupId,
            group.providerGroupId,
        );
        if (providerMismatch) return { ok: false, error: providerMismatch, status: 409 };
        if (current.providerGroupId && !group.providerGroupId) {
            const [linked] = await tx.update(serenataGroups).set({
                providerGroupId: current.providerGroupId,
                updatedAt: new Date(),
            }).where(eq(serenataGroups.id, group.id)).returning();
            group = linked;
        }
    } else {
        if (current.providerGroupId) {
            const [existingJornada] = await tx.select().from(serenataGroups).where(and(
                eq(serenataGroups.ownerId, ownerId),
                eq(serenataGroups.providerGroupId, current.providerGroupId),
                eq(serenataGroups.status, 'active'),
                sql`date_trunc('day', ${serenataGroups.date}) = date_trunc('day', ${current.eventDate})`,
            )).limit(1);
            if (existingJornada) {
                group = existingJornada;
            }
        }
        if (!group) {
            const fallbackName = `Serenata ${current.recipientName}`;
            const [created] = await tx.insert(serenataGroups).values({
                ownerId,
                providerGroupId: current.providerGroupId ?? null,
                name: input.name?.trim() || fallbackName,
                date: current.eventDate,
                status: 'active',
            }).returning();
            group = created;
        }
    }

    const existingMembers = await tx.select({ musicianId: serenataGroupMembers.musicianId })
        .from(serenataGroupMembers)
        .where(eq(serenataGroupMembers.groupId, group.id));
    if (existingMembers.length === 0 && musicianIds.length === 0) {
        return { ok: false, error: 'Agrega al menos un músico al grupo.', status: 400 };
    }

    if (musicianIds.length > 0) {
        if (current.providerGroupId) {
            const providerMembers = await tx.select({ musicianId: serenataProviderGroupMembers.musicianId })
                .from(serenataProviderGroupMembers)
                .where(and(
                    eq(serenataProviderGroupMembers.providerGroupId, current.providerGroupId),
                    eq(serenataProviderGroupMembers.status, 'active'),
                    inArray(serenataProviderGroupMembers.musicianId, musicianIds),
                ));
            const rosterError = assertProviderRosterComplete(
                musicianIds,
                providerMembers.map((row) => row.musicianId),
            );
            if (rosterError) return { ok: false, error: rosterError, status: 409 };
        }

        const musicians = await tx.select({
            id: serenataMusicians.id,
            userId: serenataMusicians.userId,
            instrument: serenataMusicians.instrument,
        }).from(serenataMusicians).where(inArray(serenataMusicians.id, musicianIds));
        if (musicians.length !== musicianIds.length) {
            return { ok: false, error: 'Uno o más músicos no existen.', status: 404 };
        }

        await tx.insert(serenataGroupMembers).values(musicians.map((musician) => ({
            groupId: group.id,
            musicianId: musician.id,
            instrument: musician.instrument,
            message: input.message,
            status: 'invited',
        }))).onConflictDoUpdate({
            target: [serenataGroupMembers.groupId, serenataGroupMembers.musicianId],
            set: { message: input.message, status: 'invited', updatedAt: new Date() },
        });

        await tx.insert(serenataNotifications).values(musicians.map((musician) => ({
            userId: musician.userId,
            type: 'group_invitation',
            title: 'Nueva invitación',
            message: `Te invitaron al grupo ${group.name}.`,
            metadata: { serenataId: current.id, groupId: group.id, providerGroupId: current.providerGroupId },
        }))).onConflictDoNothing();
    }

    const nextMemberCount = existingMembers.length
        + musicianIds.filter((id) => !existingMembers.some((member) => member.musicianId === id)).length;
    const selectedService = current.selectedServiceId
        ? await tx.query.serenataGroupServices.findFirst({ where: eq(serenataGroupServices.id, current.selectedServiceId) })
        : null;
    const requiredMusicians = selectedService?.musiciansCount ?? requiredMusiciansForPackage(current.packageCode) ?? 0;
    if (requiredMusicians > 0 && nextMemberCount < requiredMusicians) {
        return {
            ok: false,
            error: `Este servicio requiere ${requiredMusicians} músicos. Selecciona más integrantes antes de confirmar.`,
            status: 409,
        };
    }

    const conflict = current.eventTime
        ? await validateGroupForSerenata(tx, {
            ownerId,
            serenataId: current.id,
            groupId: group.id,
            requiredMusicians: requiredMusiciansForPackage(current.packageCode),
            eventDate: current.eventDate,
            eventTime: current.eventTime,
            duration: current.duration,
        })
        : null;
    if (conflict) return { ok: false, error: conflict, status: 409 };

    const [item] = await tx.update(serenatas).set({
        groupId: group.id,
        status: 'scheduled',
        updatedAt: new Date(),
    }).where(eq(serenatas.id, current.id)).returning();

    if (item.clientId) {
        const client = await tx.query.serenataClients.findFirst({ where: eq(serenataClients.id, item.clientId) });
        if (client) {
            await tx.insert(serenataNotifications).values({
                userId: client.userId,
                type: 'client_serenata_scheduled',
                title: 'Serenata confirmada',
                message: 'El grupo confirmó el evento para tu serenata.',
                metadata: { serenataId: item.id, groupId: group.id, providerGroupId: item.providerGroupId },
            });
        }
    }

    return { ok: true, item, group };
}
