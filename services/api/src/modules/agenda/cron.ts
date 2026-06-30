import cron from 'node-cron';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaAppointments, agendaProfessionalProfiles } from '../../db/schema.js';
import { logNotification } from '../../lib/audit.js';
import { isProduction } from '../../env.js';
import { sendAppointmentReminderEmail } from '../../lib/auth-email.js';
import { insertPlatformNotifications } from '../platform/notifications-service.js';

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
                        sql`${agendaProfessionalProfiles.plan} = 'pro'`,
                        sql`(${agendaProfessionalProfiles.planExpiresAt} IS NULL OR ${agendaProfessionalProfiles.planExpiresAt} > now())`,
                    ));

                for (const { appt, prof } of appts) {
                    const tz = prof.timezone ?? 'America/Santiago';
                    const { dateLabel } = formatReminderLabels(appt.startsAt, tz);
                    try {
                        if (appt.clientEmail) {
                            await sendAppointmentReminderEmail(appt.clientEmail, {
                                clientName: appt.clientName ?? 'Paciente',
                                professionalName: prof.displayName ?? 'el profesional',
                                dateLabel,
                                modality: appt.modality,
                                meetingUrl: appt.meetingUrl,
                                location: appt.location,
                                cancelUrl: '',
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
                            body: `${appt.clientName ?? 'Paciente'} · ${dateLabel}`,
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
                        sql`${agendaProfessionalProfiles.plan} = 'pro'`,
                        sql`(${agendaProfessionalProfiles.planExpiresAt} IS NULL OR ${agendaProfessionalProfiles.planExpiresAt} > now())`,
                    ));

                for (const { appt, prof } of appts) {
                    const tz = prof.timezone ?? 'America/Santiago';
                    const { timeLabel } = formatReminderLabels(appt.startsAt, tz);
                    try {
                        if (appt.clientEmail) {
                            await sendAppointmentReminderEmail(appt.clientEmail, {
                                clientName: appt.clientName ?? 'Paciente',
                                professionalName: prof.displayName ?? 'el profesional',
                                dateLabel: timeLabel,
                                modality: appt.modality,
                                meetingUrl: appt.meetingUrl,
                                location: appt.location,
                                cancelUrl: '',
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
                            body: `${appt.clientName ?? 'Paciente'} · ${timeLabel}`,
                            actionUrl: '/panel/agenda',
                            entityType: 'appointment',
                            entityId: appt.id,
                        });
                    } catch (err) {
                        console.error('[agenda] 30min reminder failed for', appt.id, ':', err);
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
}
