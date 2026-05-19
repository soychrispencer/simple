import cron from 'node-cron';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaAppointments, agendaProfessionalProfiles } from '../../db/schema.js';
import { notifyReminder24h, notifyReminder30min } from '../whatsapp/service.js';
import { logNotification } from '../../lib/audit.js';
import { isProduction } from '../../env.js';

/** Advisory lock PostgreSQL: solo una réplica API ejecuta jobs de agenda a la vez. */
const AGENDA_CRON_ADVISORY_LOCK_KEY = 839_201;

async function tryAcquireAgendaCronLock(): Promise<boolean> {
    try {
        const result = await db.execute(
            sql`SELECT pg_try_advisory_lock(${AGENDA_CRON_ADVISORY_LOCK_KEY}) AS acquired`,
        );
        const row = (result as { rows?: Array<{ acquired?: boolean }> }).rows?.[0];
        return row?.acquired === true;
    } catch {
        // Sin PostgreSQL advisory locks (tests locales): permitir ejecución best-effort.
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

export function registerAgendaCronJobs() {
    /**
     * Cron de recordatorios Agenda:
     * - Producción: activo por defecto (una réplica con lock advisory).
     * - Desarrollo/staging: solo con AGENDA_CRON_ENABLED=true (evita duplicados en dev).
     * - Con N réplicas: usar 1 instancia con cron o confiar en pg_try_advisory_lock.
     */
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

    // Every 5 minutes: check for appointments that need 24h reminder
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
                    sql`${agendaProfessionalProfiles.waNotificationsEnabled} = true`,
                ));

            for (const { appt, prof } of appts) {
                if (!appt.clientPhone) continue;
                try {
                    await notifyReminder24h(
                        { clientName: appt.clientName, clientPhone: appt.clientPhone, startsAt: appt.startsAt, endsAt: appt.endsAt },
                        { displayName: prof.displayName, timezone: prof.timezone, cancellationHours: prof.cancellationHours },
                    );
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_24h',
                        recipient: appt.clientPhone,
                        status: 'sent',
                    });
                } catch (err) {
                    console.error('[agenda] 24h reminder failed for', appt.id, ':', err);
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_24h',
                        recipient: appt.clientPhone,
                        status: 'failed',
                        errorMessage: err instanceof Error ? err.message : String(err),
                    });
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

    // Every 5 minutes: check for appointments that need 30min reminder
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
                    sql`${agendaProfessionalProfiles.waNotificationsEnabled} = true`,
                ));

            for (const { appt, prof } of appts) {
                if (!appt.clientPhone) continue;
                try {
                    await notifyReminder30min(
                        { clientName: appt.clientName, clientPhone: appt.clientPhone, startsAt: appt.startsAt, endsAt: appt.endsAt },
                        { displayName: prof.displayName, timezone: prof.timezone, cancellationHours: prof.cancellationHours },
                    );
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_30min',
                        recipient: appt.clientPhone,
                        status: 'sent',
                    });
                } catch (err) {
                    console.error('[agenda] 30min reminder failed for', appt.id, ':', err);
                    await logNotification({
                        professionalId: prof.id,
                        appointmentId: appt.id,
                        clientId: appt.clientId,
                        channel: 'whatsapp',
                        eventType: 'reminder_30min',
                        recipient: appt.clientPhone,
                        status: 'failed',
                        errorMessage: err instanceof Error ? err.message : String(err),
                    });
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