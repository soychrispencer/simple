import cron from 'node-cron';
import { eq, and, gte, lte, isNull, sql, type SQL } from 'drizzle-orm';
import { isPlatformLaunchActive } from '@simple/utils';
import { db } from '../../db/index.js';
import {
    agendaAppointments,
    agendaNotificationEvents,
    agendaProfessionalProfiles,
    users,
} from '../../db/schema.js';
import { logNotification } from '../../lib/audit.js';
import { isProduction } from '../../env.js';
import { sendAppointmentReminderEmail } from '../../lib/auth-email.js';
import { sendAgendaTrialEmail, type AgendaTrialEmailKind } from '../../lib/agenda-trial-email.js';
import { insertPlatformNotifications } from '../platform/notifications-service.js';
import { unpublishAgendaProfilesWithoutAccess } from './plan-limits.js';

const AGENDA_CRON_ADVISORY_LOCK_KEY = 839_201;

async function tryAcquireAgendaCronLock(): Promise<boolean> {
    try {
        const result = await db.execute(
            sql`SELECT pg_try_advisory_lock(${AGENDA_CRON_ADVISORY_LOCK_KEY}) AS acquired`,
        );
        const row = (result as { rows?: Array<{ acquired?: boolean }> }).rows?.[0];
        return row?.acquired === true;
    } catch {
        return true;
    }
}

async function releaseAgendaCronLock(): Promise<void> {
    try {
        await db.execute(sql`SELECT pg_advisory_unlock(${AGENDA_CRON_ADVISORY_LOCK_KEY})`);
    } catch {
        // ignore
    }
}

function formatReminderLabels(startsAt: Date, timezone: string) {
    const dateLabel = startsAt.toLocaleDateString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: timezone,
    });
    const timeLabel = startsAt.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone,
    });
    return { dateLabel, timeLabel };
}

function agendaAppBaseUrl(): string {
    return (process.env.AGENDA_APP_URL || 'https://simpleagenda.app').replace(/\/$/, '');
}

function buildCancelUrl(appointmentId: string, slug: string): string {
    return `${agendaAppBaseUrl()}/cancelar?appt=${encodeURIComponent(appointmentId)}&slug=${encodeURIComponent(slug)}`;
}

/**
 * Quién recibe recordatorios automáticos:
 * - Launch mode: todos (misma promesa de acceso completo).
 * - Fuera de launch: trial (free + planExpiresAt vigente) o Pro vigente.
 */
function reminderEntitlementCondition(): SQL {
    if (isPlatformLaunchActive('agenda')) {
        return sql`TRUE`;
    }
    return sql`(
        (
            ${agendaProfessionalProfiles.plan} = 'pro'
            AND (
                ${agendaProfessionalProfiles.planExpiresAt} IS NULL
                OR ${agendaProfessionalProfiles.planExpiresAt} > now()
            )
        )
        OR (
            ${agendaProfessionalProfiles.plan} = 'free'
            AND ${agendaProfessionalProfiles.planExpiresAt} IS NOT NULL
            AND ${agendaProfessionalProfiles.planExpiresAt} > now()
        )
    )`;
}

export function registerAgendaCronJobs() {
    const agendaEnabled = process.env.AGENDA_CRON_ENABLED === 'true';

    if (!isProduction && !agendaEnabled) {
        console.info('[agenda] cron jobs desactivados (no es producción y AGENDA_CRON_ENABLED != true)');
        return;
    }

    if (isProduction && agendaEnabled) {
        console.info('[agenda] AGENDA_CRON_ENABLED=true en producción — preferir una sola réplica con cron');
    }

    console.info('[agenda] registering reminder cron jobs (advisory lock %s)...', AGENDA_CRON_ADVISORY_LOCK_KEY);

    const runWithLock = async (job: () => Promise<void>) => {
        const acquired = await tryAcquireAgendaCronLock();
        if (!acquired) return;
        try {
            await job();
        } finally {
            await releaseAgendaCronLock();
        }
    };

    const entitlement = reminderEntitlementCondition();

    cron.schedule('*/5 * * * *', async () => {
        await runWithLock(async () => {
            try {
                const now = new Date();
                const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
                const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

                const appts = await db.select({
                    appt: agendaAppointments,
                    prof: agendaProfessionalProfiles,
                })
                    .from(agendaAppointments)
                    .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
                    .where(and(
                        gte(agendaAppointments.startsAt, windowStart),
                        lte(agendaAppointments.startsAt, windowEnd),
                        sql`${agendaAppointments.status} IN ('confirmed', 'pending')`,
                        isNull(agendaAppointments.reminderSentAt),
                        entitlement,
                    ));

                for (const { appt, prof } of appts) {
                    const tz = prof.timezone ?? 'America/Santiago';
                    const { dateLabel, timeLabel } = formatReminderLabels(appt.startsAt, tz);
                    const whenLabel = `${dateLabel} · ${timeLabel}`;
                    const cancelUrl = buildCancelUrl(appt.id, prof.slug);
                    try {
                        if (appt.clientEmail) {
                            await sendAppointmentReminderEmail(appt.clientEmail, {
                                clientName: appt.clientName ?? 'Paciente',
                                professionalName: prof.displayName ?? 'el profesional',
                                dateLabel: whenLabel,
                                modality: appt.modality,
                                meetingUrl: appt.meetingUrl,
                                location: appt.location,
                                cancelUrl,
                                appUrl: agendaAppBaseUrl(),
                                kind: '24h',
                            });
                            await logNotification({
                                professionalId: prof.id,
                                appointmentId: appt.id,
                                clientId: appt.clientId,
                                channel: 'email',
                                eventType: 'reminder_24h',
                                recipient: appt.clientEmail,
                                status: 'sent',
                            });
                        }
                        await insertPlatformNotifications({
                            userId: prof.userId,
                            vertical: 'agenda',
                            type: 'appointment.reminder_24h',
                            title: 'Recordatorio de cita mañana',
                            body: `${appt.clientName ?? 'Paciente'} · ${whenLabel}`,
                            actionUrl: '/panel/agenda',
                            entityType: 'appointment',
                            entityId: appt.id,
                        });
                    } catch (err) {
                        console.error('[agenda] 24h reminder failed for', appt.id, ':', err);
                        if (appt.clientEmail) {
                            await logNotification({
                                professionalId: prof.id,
                                appointmentId: appt.id,
                                clientId: appt.clientId,
                                channel: 'email',
                                eventType: 'reminder_24h',
                                recipient: appt.clientEmail,
                                status: 'failed',
                                errorMessage: err instanceof Error ? err.message : String(err),
                            });
                        }
                    }
                    await db.update(agendaAppointments)
                        .set({ reminderSentAt: now })
                        .where(eq(agendaAppointments.id, appt.id));
                }
            } catch (e) {
                console.error('[agenda] 24h reminder cron error:', e);
            }
        });
    });

    cron.schedule('*/5 * * * *', async () => {
        await runWithLock(async () => {
            try {
                const now = new Date();
                const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
                const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

                const appts = await db.select({
                    appt: agendaAppointments,
                    prof: agendaProfessionalProfiles,
                })
                    .from(agendaAppointments)
                    .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
                    .where(and(
                        gte(agendaAppointments.startsAt, windowStart),
                        lte(agendaAppointments.startsAt, windowEnd),
                        sql`${agendaAppointments.status} IN ('confirmed', 'pending')`,
                        isNull(agendaAppointments.reminder30minSentAt),
                        entitlement,
                    ));

                for (const { appt, prof } of appts) {
                    const tz = prof.timezone ?? 'America/Santiago';
                    const { dateLabel, timeLabel } = formatReminderLabels(appt.startsAt, tz);
                    const whenLabel = `${dateLabel} · ${timeLabel}`;
                    const cancelUrl = buildCancelUrl(appt.id, prof.slug);
                    try {
                        if (appt.clientEmail) {
                            await sendAppointmentReminderEmail(appt.clientEmail, {
                                clientName: appt.clientName ?? 'Paciente',
                                professionalName: prof.displayName ?? 'el profesional',
                                dateLabel: whenLabel,
                                modality: appt.modality,
                                meetingUrl: appt.meetingUrl,
                                location: appt.location,
                                cancelUrl,
                                appUrl: agendaAppBaseUrl(),
                                kind: '30min',
                            });
                            await logNotification({
                                professionalId: prof.id,
                                appointmentId: appt.id,
                                clientId: appt.clientId,
                                channel: 'email',
                                eventType: 'reminder_30min',
                                recipient: appt.clientEmail,
                                status: 'sent',
                            });
                        }
                        await insertPlatformNotifications({
                            userId: prof.userId,
                            vertical: 'agenda',
                            type: 'appointment.reminder_30min',
                            title: 'Cita en 30 minutos',
                            body: `${appt.clientName ?? 'Paciente'} · ${whenLabel}`,
                            actionUrl: '/panel/agenda',
                            entityType: 'appointment',
                            entityId: appt.id,
                        });
                    } catch (err) {
                        console.error('[agenda] 30min reminder failed for', appt.id, ':', err);
                        if (appt.clientEmail) {
                            await logNotification({
                                professionalId: prof.id,
                                appointmentId: appt.id,
                                clientId: appt.clientId,
                                channel: 'email',
                                eventType: 'reminder_30min',
                                recipient: appt.clientEmail,
                                status: 'failed',
                                errorMessage: err instanceof Error ? err.message : String(err),
                            });
                        }
                    }
                    await db.update(agendaAppointments)
                        .set({ reminder30minSentAt: now })
                        .where(eq(agendaAppointments.id, appt.id));
                }
            } catch (e) {
                console.error('[agenda] 30min reminder cron error:', e);
            }
        });
    });

    // Hora local estable incluso al cambiar el horario de verano.
    cron.schedule('0 9 * * *', async () => {
        await runWithLock(async () => {
            try {
                const unpublished = await unpublishAgendaProfilesWithoutAccess();
                if (unpublished > 0) {
                    console.info(`[agenda] unpublished ${unpublished} profiles without billing access`);
                }
                await runAgendaTrialEmails();
            } catch (e) {
                console.error('[agenda] trial/billing cron error:', e);
            }
        });
    }, { timezone: 'America/Santiago' });
}

async function runAgendaTrialEmails(): Promise<void> {
    if (isPlatformLaunchActive('agenda')) return;

    const now = new Date();
    const dayMs = 86_400_000;

    const windows: Array<{
        kind: AgendaTrialEmailKind;
        minDays: number;
        maxDays: number;
    }> = [
        { kind: 'trial_d7', minDays: 6.5, maxDays: 7.5 },
        { kind: 'trial_d3', minDays: 2.5, maxDays: 3.5 },
        { kind: 'trial_d1', minDays: 0.5, maxDays: 1.5 },
        { kind: 'trial_expired', minDays: -1.5, maxDays: -0.1 },
    ];

    for (const window of windows) {
        const from = new Date(now.getTime() + window.minDays * dayMs);
        const to = new Date(now.getTime() + window.maxDays * dayMs);
        const rangeStart = from < to ? from : to;
        const rangeEnd = from < to ? to : from;

        const rows = await db
            .select({
                profileId: agendaProfessionalProfiles.id,
                userId: agendaProfessionalProfiles.userId,
                displayName: agendaProfessionalProfiles.displayName,
                planExpiresAt: agendaProfessionalProfiles.planExpiresAt,
                email: users.email,
                name: users.name,
            })
            .from(agendaProfessionalProfiles)
            .innerJoin(users, eq(users.id, agendaProfessionalProfiles.userId))
            .where(and(
                eq(agendaProfessionalProfiles.plan, 'free'),
                gte(agendaProfessionalProfiles.planExpiresAt, rangeStart),
                lte(agendaProfessionalProfiles.planExpiresAt, rangeEnd),
            ));

        for (const row of rows) {
            if (!row.email || !row.planExpiresAt) continue;

            const already = await db
                .select({ id: agendaNotificationEvents.id })
                .from(agendaNotificationEvents)
                .where(and(
                    eq(agendaNotificationEvents.professionalId, row.profileId),
                    eq(agendaNotificationEvents.eventType, window.kind),
                    eq(agendaNotificationEvents.channel, 'email'),
                    gte(agendaNotificationEvents.createdAt, new Date(now.getTime() - 20 * dayMs)),
                ))
                .limit(1);

            if (already[0]) continue;

            const result = await sendAgendaTrialEmail({
                email: row.email,
                name: row.displayName || row.name || 'profesional',
                userId: row.userId,
                kind: window.kind,
            });

            await logNotification({
                professionalId: row.profileId,
                channel: 'email',
                eventType: window.kind,
                recipient: row.email,
                status: result === 'failed' ? 'failed' : result === 'skipped' ? 'skipped' : 'sent',
                payload: {
                    planExpiresAt: row.planExpiresAt.toISOString(),
                    kind: window.kind,
                },
            });
        }
    }
}
