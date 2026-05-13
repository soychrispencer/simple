import cron from 'node-cron';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaAppointments, agendaProfessionalProfiles } from '../../db/schema.js';
import { notifyReminder24h, notifyReminder30min } from '../whatsapp/service.js';
import { logNotification } from '../../lib/audit.js';
import { isProduction } from '../../env.js';

export function registerAgendaCronJobs() {
    // Solo activar cron jobs de SimpleAgenda en producción o cuando esté configurado
    const agendaEnabled = process.env.AGENDA_CRON_ENABLED === 'true';

    if (!isProduction && !agendaEnabled) {
        console.info('[agenda] cron jobs desactivados (no es producción y AGENDA_CRON_ENABLED != true)');
        return;
    }

    console.info('[agenda] registering reminder cron jobs...');

    // Every 5 minutes: check for appointments that need 24h reminder
    cron.schedule('*/5 * * * *', async () => {
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

    // Every 5 minutes: check for appointments that need 30min reminder
    cron.schedule('*/5 * * * *', async () => {
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
}