import type { Context } from 'hono';
import { db } from '../db/index.js';
import { agendaAuditEvents, agendaNotificationEvents } from '../db/schema.js';

export type AuditEntity =
    | 'profile'
    | 'service'
    | 'availability'
    | 'appointment'
    | 'payment'
    | 'location'
    | 'client'
    | 'notification_prefs'
    | 'promotion'
    | 'pack'
    | 'client_pack'
    | 'group_session'
    | 'group_attendee';

export type AuditAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'publish'
    | 'unpublish'
    | 'slug_change'
    | 'status_change'
    | 'cancel'
    | 'reschedule';

type AuditInput = {
    professionalId: string | null;
    userId?: string | null;
    entityType: AuditEntity;
    entityId?: string | null;
    action: AuditAction;
    metadata?: Record<string, unknown>;
    ctx?: Context;
};

function extractIp(c?: Context): string | null {
    if (!c) return null;
    const xff = c.req.header('x-forwarded-for');
    if (xff) return xff.split(',')[0]!.trim().slice(0, 60);
    const real = c.req.header('x-real-ip');
    if (real) return real.trim().slice(0, 60);
    return null;
}

function extractUa(c?: Context): string | null {
    if (!c) return null;
    const ua = c.req.header('user-agent');
    return ua ? ua.slice(0, 500) : null;
}

export async function logAudit(input: AuditInput): Promise<void> {
    try {
        await db.insert(agendaAuditEvents).values({
            professionalId: input.professionalId,
            userId: input.userId ?? null,
            entityType: input.entityType,
            entityId: input.entityId ?? null,
            action: input.action,
            metadata: input.metadata ?? {},
            ipAddress: extractIp(input.ctx),
            userAgent: extractUa(input.ctx),
        });
    } catch (err) {
        console.error('[audit] failed to log event', err);
        // Never throw — audit must not break the caller.
    }
}

export type NotificationChannel = 'email' | 'whatsapp' | 'push' | 'sms';
export type NotificationEventType =
    | 'confirmation'
    | 'reminder_24h'
    | 'reminder_30min'
    | 'cancellation'
    | 'test'
    | 'professional_new_booking'
    | 'reschedule';

type NotificationInput = {
    professionalId: string | null;
    appointmentId?: string | null;
    clientId?: string | null;
    channel: NotificationChannel;
    eventType: NotificationEventType;
    recipient?: string | null;
    status?: 'sent' | 'failed' | 'skipped';
    errorMessage?: string | null;
    payload?: Record<string, unknown>;
};

export async function logNotification(input: NotificationInput): Promise<void> {
    try {
        await db.insert(agendaNotificationEvents).values({
            professionalId: input.professionalId,
            appointmentId: input.appointmentId ?? null,
            clientId: input.clientId ?? null,
            channel: input.channel,
            eventType: input.eventType,
            recipient: input.recipient ?? null,
            status: input.status ?? 'sent',
            errorMessage: input.errorMessage ?? null,
            payload: input.payload ?? {},
        });
    } catch (err) {
        console.error('[notification-log] failed to log event', err);
    }
}
