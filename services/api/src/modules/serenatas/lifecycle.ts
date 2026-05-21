import { and, eq, inArray, isNotNull, isNull, lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { serenataOwners, serenataClients, serenatas } from '../../db/schema.js';
import { insertSerenataNotifications } from '../../lib/serenata-in-app-notifications.js';
import {
    deliverSerenataAgendaNotification,
    deliverSerenataRequestNotification,
} from '../../lib/serenatas-notification-delivery.js';

export const SERENATA_TIMEZONE = 'America/Santiago';

export const CLOSURE_PENDING_STATUSES = ['scheduled'] as const;
export const COMPLETABLE_STATUSES = ['scheduled'] as const;
export const CANCELLABLE_STATUSES = ['scheduled', 'accepted_pending_group'] as const;
export const TERMINAL_STATUSES = ['completed', 'cancelled'] as const;

/** Cliente: anular/cancelar antes de aceptación del dueño. */
export const CLIENT_CANCELABLE_STATUSES = ['payment_pending', 'pending', 'pending_open'] as const;

export function clientCancelRequiresReason(item: {
    status: string;
    paymentStatus?: string | null;
}): boolean {
    if (item.status === 'payment_pending') return false;
    return item.paymentStatus === 'paid';
}

export function validateClientCancelReason(
    item: { status: string; paymentStatus?: string | null },
    cancelReason?: string | null,
): string | null {
    if (!clientCancelRequiresReason(item)) return null;
    const reason = cancelReason?.trim() ?? '';
    if (reason.length < 3) {
        return 'Indica un motivo de cancelación de al menos 3 caracteres.';
    }
    return null;
}

export function todayYmdInChile(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SERENATA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

export function eventDateYmd(eventDate: Date | string): string | null {
    if (typeof eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return eventDate;
    const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SERENATA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

export function isEventBeforeToday(eventDate: Date | string, todayYmd = todayYmdInChile()): boolean {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return false;
    return ymd < todayYmd;
}

export function isEventOnOrAfterToday(eventDate: Date | string, todayYmd = todayYmdInChile()): boolean {
    const ymd = eventDateYmd(eventDate);
    if (!ymd) return false;
    return ymd >= todayYmd;
}

export function needsClosure(item: { status: string; eventDate: Date | string }): boolean {
    if (!CLOSURE_PENDING_STATUSES.includes(item.status as (typeof CLOSURE_PENDING_STATUSES)[number])) {
        return false;
    }
    return isEventBeforeToday(item.eventDate);
}

export function validateCompleteTransition(current: { status: string }): string | null {
    if (TERMINAL_STATUSES.includes(current.status as (typeof TERMINAL_STATUSES)[number])) {
        return current.status === 'completed'
            ? 'Esta serenata ya está marcada como completada.'
            : 'Esta serenata está cancelada y no puede completarse.';
    }
    if (!COMPLETABLE_STATUSES.includes(current.status as (typeof COMPLETABLE_STATUSES)[number])) {
        if (current.status === 'accepted_pending_group') {
            return 'Asigna un grupo y confirma la serenata antes de marcarla como completada.';
        }
        return 'Solo puedes completar serenatas confirmadas (programadas).';
    }
    return null;
}

export function validateCancelTransition(
    current: { status: string; eventDate: Date | string },
    cancelReason: string,
): string | null {
    const reason = cancelReason.trim();
    if (reason.length < 3) {
        return 'Indica un motivo de cancelación de al menos 3 caracteres.';
    }
    if (TERMINAL_STATUSES.includes(current.status as (typeof TERMINAL_STATUSES)[number])) {
        return current.status === 'cancelled'
            ? 'Esta serenata ya está cancelada.'
            : 'Esta serenata ya está completada y no puede cancelarse.';
    }
    if (!CANCELLABLE_STATUSES.includes(current.status as (typeof CANCELLABLE_STATUSES)[number])) {
        return 'Esta serenata no puede cancelarse en su estado actual.';
    }
    if (isEventBeforeToday(current.eventDate)) {
        return 'La fecha del evento ya pasó. No puedes cancelar desde aquí; marca la serenata como completada o contacta soporte si hubo un no-show.';
    }
    return null;
}

export function validateClientConfirmTransition(current: {
    status: string;
    clientConfirmedAt: Date | null;
}): string | null {
    if (current.status !== 'completed') {
        return 'Solo puedes confirmar serenatas que el grupo marcó como completadas.';
    }
    if (current.clientConfirmedAt) {
        return 'Ya confirmaste esta serenata.';
    }
    return null;
}

export async function listOwnerSerenatasNeedingClosure(ownerId: string) {
    const rows = await db
        .select()
        .from(serenatas)
        .where(and(
            eq(serenatas.ownerId, ownerId),
            inArray(serenatas.status, [...CLOSURE_PENDING_STATUSES]),
        ))
        .orderBy(serenatas.eventDate);
    return rows.filter(needsClosure);
}

/** Recordatorios in-app al dueño tras la fecha del evento (una vez por serenata). */
export async function maybeSendClosureReminders(
    ownerUserId: string,
    items: Array<typeof serenatas.$inferSelect>,
) {
    for (const item of items) {
        if (!needsClosure(item) || item.closureReminderSentAt) continue;

        const [updated] = await db
            .update(serenatas)
            .set({ closureReminderSentAt: new Date(), updatedAt: new Date() })
            .where(and(
                eq(serenatas.id, item.id),
                isNull(serenatas.closureReminderSentAt),
                inArray(serenatas.status, [...CLOSURE_PENDING_STATUSES]),
            ))
            .returning({ id: serenatas.id });

        if (!updated) continue;

        const title = 'Confirma si se realizó';
        const message = `La serenata para ${item.recipientName} ya pasó. Márcala como completada o cancelada.`;
        await insertSerenataNotifications({
            userId: ownerUserId,
            type: 'serenata_closure_reminder',
            title,
            message,
            metadata: { serenataId: item.id },
        });
        void deliverSerenataAgendaNotification(ownerUserId, {
            title,
            message,
            panelPath: `/panel/solicitudes?serenata=${encodeURIComponent(item.id)}`,
        });
    }
}

export async function loadOwnerScheduledForReminders(ownerId: string) {
    return db
        .select()
        .from(serenatas)
        .where(and(
            eq(serenatas.ownerId, ownerId),
            inArray(serenatas.status, [...CLOSURE_PENDING_STATUSES]),
        ));
}

export async function resolveOwnerUserId(ownerId: string): Promise<string | null> {
    const owner = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.id, ownerId) });
    return owner?.userId ?? null;
}

function slaHalfwayMs(item: { createdAt: Date; responseDueAt: Date | null }) {
    if (!item.responseDueAt) return null;
    const created = item.createdAt.getTime();
    const due = item.responseDueAt.getTime();
    if (!Number.isFinite(created) || !Number.isFinite(due) || due <= created) return null;
    return created + Math.floor((due - created) / 2);
}

/** Expira solicitudes marketplace pending cuyo SLA venció. */
export async function expirePendingSerenatas(now = new Date()) {
    const rows = await db
        .select()
        .from(serenatas)
        .where(and(
            inArray(serenatas.status, ['payment_pending', 'pending', 'pending_open']),
            eq(serenatas.source, 'platform_lead'),
            isNotNull(serenatas.responseDueAt),
            lt(serenatas.responseDueAt, now),
        ));

    for (const row of rows) {
        const [updated] = await db
            .update(serenatas)
            .set({
                status: 'expired',
                expiredAt: now,
                expiredReason: 'sla_timeout',
                updatedAt: now,
            })
            .where(and(
                eq(serenatas.id, row.id),
                inArray(serenatas.status, ['payment_pending', 'pending', 'pending_open']),
            ))
            .returning();

        if (!updated) continue;

        if (updated.clientId) {
            const client = await db.query.serenataClients.findFirst({ where: eq(serenataClients.id, updated.clientId) });
            if (client) {
                const expiredTitle = 'Solicitud expirada';
                const expiredMessage = 'El grupo no respondió a tiempo. Puedes solicitar otra serenata.';
                await insertSerenataNotifications({
                    userId: client.userId,
                    type: 'client_serenata_expired',
                    title: expiredTitle,
                    message: expiredMessage,
                    metadata: { serenataId: updated.id, providerGroupId: updated.providerGroupId },
                });
                void deliverSerenataRequestNotification(client.userId, {
                    title: expiredTitle,
                    message: expiredMessage,
                    panelPath: '/panel/serenatas',
                });
            }
        }

        if (updated.ownerId) {
            const admin = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.id, updated.ownerId) });
            if (admin) {
                await insertSerenataNotifications({
                    userId: admin.userId,
                    type: 'provider_group_request_expired',
                    title: 'Solicitud expirada',
                    message: `Venció el plazo de respuesta para ${updated.recipientName}.`,
                    metadata: { serenataId: updated.id, providerGroupId: updated.providerGroupId },
                });
            }
        }
    }

    return rows.length;
}

/** Recordatorio admin a mitad del SLA (una vez por solicitud). */
export async function maybeSendPendingSlaReminders(now = new Date()) {
    const pending = await db
        .select()
        .from(serenatas)
        .where(and(
            inArray(serenatas.status, ['pending', 'pending_open']),
            eq(serenatas.source, 'platform_lead'),
            isNotNull(serenatas.responseDueAt),
            isNull(serenatas.pendingReminderSentAt),
        ));

    for (const item of pending) {
        const halfway = slaHalfwayMs(item);
        if (halfway == null || now.getTime() < halfway) continue;
        if (!item.ownerId) continue;

        const [updated] = await db
            .update(serenatas)
            .set({ pendingReminderSentAt: now, updatedAt: now })
            .where(and(
                eq(serenatas.id, item.id),
                isNull(serenatas.pendingReminderSentAt),
                inArray(serenatas.status, ['pending', 'pending_open']),
            ))
            .returning({ id: serenatas.id });

        if (!updated) continue;

        const admin = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.id, item.ownerId) });
        if (!admin) continue;

        const reminderTitle = 'Solicitud pendiente';
        const reminderMessage = `Queda poco plazo para responder la solicitud de ${item.recipientName}.`;
        await insertSerenataNotifications({
            userId: admin.userId,
            type: 'provider_group_request_reminder',
            title: reminderTitle,
            message: reminderMessage,
            metadata: { serenataId: item.id, providerGroupId: item.providerGroupId },
        });
        void deliverSerenataRequestNotification(admin.userId, {
            title: reminderTitle,
            message: reminderMessage,
            panelPath: `/panel/solicitudes?serenata=${encodeURIComponent(item.id)}`,
        });
    }
}

export async function runPendingSerenataLifecycle() {
    await expirePendingSerenatas();
    await maybeSendPendingSlaReminders();
}

export async function cancelClientPendingSerenata(
    clientId: string,
    userId: string,
    serenataId: string,
    cancelReason?: string | null,
) {
    const pending = await db.query.serenatas.findFirst({
        where: and(
            eq(serenatas.id, serenataId),
            eq(serenatas.clientId, clientId),
            inArray(serenatas.status, [...CLIENT_CANCELABLE_STATUSES]),
            eq(serenatas.source, 'platform_lead'),
        ),
    });
    if (!pending) {
        return {
            ok: false as const,
            error: 'Solo puedes anular solicitudes sin respuesta del mariachi (antes de que acepte).',
            status: 404 as const,
        };
    }

    const reasonError = validateClientCancelReason(pending, cancelReason);
    if (reasonError) {
        return { ok: false as const, error: reasonError, status: 400 as const };
    }

    const reason = cancelReason?.trim() || null;
    const now = new Date();
    const [item] = await db
        .update(serenatas)
        .set({
            status: 'cancelled',
            cancelReason: reason,
            cancelledAt: now,
            cancelledBy: userId,
            updatedAt: now,
        })
        .where(and(eq(serenatas.id, serenataId), inArray(serenatas.status, ['payment_pending', 'pending', 'pending_open'])))
        .returning();

    if (!item) {
        return { ok: false as const, error: 'Esta solicitud ya no está pendiente.', status: 409 as const };
    }

    if (item.ownerId) {
        const admin = await db.query.serenataOwners.findFirst({ where: eq(serenataOwners.id, item.ownerId) });
        if (admin) {
            const cancelTitle = 'Solicitud cancelada';
            const cancelMessage = `El cliente canceló la solicitud para ${item.recipientName}.`;
            await insertSerenataNotifications({
                userId: admin.userId,
                type: 'provider_group_request_cancelled',
                title: cancelTitle,
                message: cancelMessage,
                metadata: { serenataId: item.id, providerGroupId: item.providerGroupId },
            });
            void deliverSerenataRequestNotification(admin.userId, {
                title: cancelTitle,
                message: cancelMessage,
                panelPath: `/panel/solicitudes?serenata=${encodeURIComponent(item.id)}`,
            });
        }
    }

    return { ok: true as const, item };
}
