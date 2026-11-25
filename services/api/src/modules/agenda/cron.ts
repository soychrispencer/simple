import cron from 'node-cron';
import { eq, and, gte, lte, lt, isNull, inArray, sql, type SQL } from 'drizzle-orm';
import { isPlatformLaunchActive } from '@simple/utils';
import { db, pgClient } from '../../db/index.js';
import {
    agendaAppointments,
    agendaAccountVisits,
    agendaClients,
    agendaNotificationEvents,
    agendaProfessionalProfiles,
    agendaServices,
    listings,
    platformNotifications,
    users,
} from '../../db/schema.js';
import { logNotification } from '../../lib/audit.js';
import { isProduction } from '../../env.js';
import { sendAppointmentReminderEmail } from '../../lib/auth-email.js';
import { isWhatsAppCloudConfigured, sendAppointmentReminderWhatsApp } from '../../lib/whatsapp-cloud.js';
import { sendAgendaTrialEmail, type AgendaTrialEmailKind } from '../../lib/agenda-trial-email.js';
import { createAccountNotificationRecipientResolver, insertPlatformNotifications } from '../platform/notifications-service.js';
import { downgradeExpiredAgendaProProfiles, getAgendaWhatsappQuota } from './plan-limits.js';

const AGENDA_CRON_ADVISORY_LOCK_KEY = 839_201;
const ACCOUNT_VISIT_CRON_ADVISORY_LOCK_KEY = 839_204;
const UNPAID_MP_BOOKING_TTL_MINUTES = 30;

export async function releaseExpiredUnpaidMercadoPagoBookings(
    ttlMinutes: number = UNPAID_MP_BOOKING_TTL_MINUTES,
): Promise<number> {
    const cutoff = new Date(Date.now() - ttlMinutes * 60_000);
    const expired = await db.select({
        appointment: agendaAppointments,
        professional: agendaProfessionalProfiles,
    })
        .from(agendaAppointments)
        .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
        .where(and(
            eq(agendaAppointments.bookingPaymentMethod, 'mp'),
            eq(agendaAppointments.paymentStatus, 'pending'),
            inArray(agendaAppointments.status, ['pending', 'confirmed']),
            lt(agendaAppointments.createdAt, cutoff),
        ))
        .limit(100);

    let releasedCount = 0;
    for (const { appointment, professional } of expired) {
        const released = await db.transaction(async (tx) => {
            const [current] = await tx.select().from(agendaAppointments).where(and(
                eq(agendaAppointments.id, appointment.id),
                eq(agendaAppointments.bookingPaymentMethod, 'mp'),
                eq(agendaAppointments.paymentStatus, 'pending'),
                inArray(agendaAppointments.status, ['pending', 'confirmed']),
            )).limit(1).for('update');
            if (!current) return null;

            const now = new Date();
            const [updated] = await tx.update(agendaAppointments).set({
                status: 'cancelled',
                cancelledAt: now,
                cancelledBy: 'system',
                cancellationReason: `Pago en MercadoPago no completado dentro del plazo (${ttlMinutes} min).`,
                updatedAt: now,
            }).where(eq(agendaAppointments.id, current.id)).returning();
            return updated ?? null;
        });

        if (!released) continue;
        releasedCount += 1;

        const { dateLabel, timeLabel } = formatReminderLabels(
            released.startsAt,
            professional.timezone ?? 'America/Santiago',
        );
        void insertPlatformNotifications({
            userId: professional.userId,
            vertical: 'agenda',
            type: 'appointment.cancelled',
            title: 'Hora liberada por falta de pago',
            body: `${released.clientName ?? 'Cliente'} no completó el pago en MercadoPago (${dateLabel} · ${timeLabel}).`,
            actionUrl: '/panel/agenda',
            entityType: 'appointment',
            entityId: released.id,
        }).catch(() => {});
    }

    if (releasedCount > 0) {
        console.info(`[agenda] released ${releasedCount} expired unpaid MercadoPago booking(s)`);
    }
    return releasedCount;
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

async function sendUpcomingAccountVisitReminders(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
        const lockResult = await tx.execute(
            sql`SELECT pg_try_advisory_xact_lock(${ACCOUNT_VISIT_CRON_ADVISORY_LOCK_KEY}) AS acquired`,
        );
        const lockRow = (lockResult as { rows?: Array<{ acquired?: boolean }> }).rows?.[0];
        if (lockRow?.acquired !== true) return;

        const visits = await tx.select({
            visit: agendaAccountVisits,
            listingTitle: listings.title,
        })
            .from(agendaAccountVisits)
            .leftJoin(listings, eq(agendaAccountVisits.listingId, listings.id))
            .where(and(
                gte(agendaAccountVisits.startsAt, windowStart),
                lte(agendaAccountVisits.startsAt, windowEnd),
                inArray(agendaAccountVisits.status, ['scheduled', 'confirmed']),
                isNull(agendaAccountVisits.reminderSentAt),
            ))
            .orderBy(agendaAccountVisits.startsAt)
            .limit(250);

        const resolveRecipient = createAccountNotificationRecipientResolver(tx);
        for (const { visit, listingTitle } of visits) {
            const isBrokerageMeeting = visit.visitType === 'brokerage_meeting';
            const notificationType = isBrokerageMeeting
                ? 'brokerage_meeting.reminder_24h'
                : 'property_visit.reminder_24h';
            const entityType = isBrokerageMeeting ? 'account_business_visit' : 'account_property_visit';
            const visitSummary = isBrokerageMeeting
                ? `Reunión comercial${listingTitle ? ` · ${listingTitle}` : ''}`
                : listingTitle ?? 'Propiedad';
            const recipientUserId = await resolveRecipient(
                visit.accountId,
                [visit.assignedUserId, visit.createdByUserId],
            );
            if (!recipientUserId) continue;
            const [currentVisit] = await tx.select().from(agendaAccountVisits)
                .where(and(
                    eq(agendaAccountVisits.id, visit.id),
                    eq(agendaAccountVisits.accountId, visit.accountId),
                    inArray(agendaAccountVisits.status, ['scheduled', 'confirmed']),
                    gte(agendaAccountVisits.startsAt, windowStart),
                    lte(agendaAccountVisits.startsAt, windowEnd),
                    isNull(agendaAccountVisits.reminderSentAt),
                ))
                .limit(1)
                .for('update');
            if (!currentVisit
                || currentVisit.updatedAt.getTime() !== visit.updatedAt.getTime()
                || currentVisit.assignedUserId !== visit.assignedUserId
                || currentVisit.createdByUserId !== visit.createdByUserId) {
                continue;
            }
            const startsAt = visit.startsAt.toISOString();
            const existing = await tx.select({ id: platformNotifications.id })
                .from(platformNotifications)
                .where(and(
                    eq(platformNotifications.userId, recipientUserId),
                    eq(platformNotifications.vertical, 'agenda'),
                    eq(platformNotifications.type, notificationType),
                    eq(platformNotifications.entityType, entityType),
                    eq(platformNotifications.entityId, visit.id),
                    sql`${platformNotifications.metadata}->>'startsAt' = ${startsAt}`,
                ))
                .limit(1);

            if (!existing[0]) {
                const { dateLabel, timeLabel } = formatReminderLabels(visit.startsAt, 'America/Santiago');
                await insertPlatformNotifications({
                    userId: recipientUserId,
                    vertical: 'agenda',
                    type: notificationType,
                    title: isBrokerageMeeting ? 'Reunión comercial mañana' : 'Visita inmobiliaria mañana',
                    body: `${visit.contactName} · ${visitSummary} · ${dateLabel} · ${timeLabel}`,
                    actionUrl: '/panel/visitas-equipo',
                    entityType,
                    entityId: visit.id,
                    metadata: {
                        accountId: visit.accountId,
                        listingId: visit.listingId,
                        visitType: visit.visitType,
                        startsAt,
                    },
                }, { tx });
            }

            await tx.update(agendaAccountVisits)
                .set({ reminderSentAt: now })
                .where(and(
                    eq(agendaAccountVisits.id, visit.id),
                    isNull(agendaAccountVisits.reminderSentAt),
                ));
        }
    });
}

/**
 * Quién recibe recordatorios automáticos:
 * - Launch mode: todos (misma promesa de acceso completo).
 * - Fuera de launch: Gratis, trial, Pro o Pro+ vigentes.
 */
function reminderEntitlementCondition(): SQL {
    if (isPlatformLaunchActive('agenda')) {
        return sql`TRUE`;
    }
    return sql`(
        ${agendaProfessionalProfiles.plan} = 'free'
        OR (
            ${agendaProfessionalProfiles.plan} IN ('pro', 'pro_plus')
            AND (
                ${agendaProfessionalProfiles.planExpiresAt} IS NULL
                OR ${agendaProfessionalProfiles.planExpiresAt} > now()
            )
        )
    )`;
}

async function sendUpcomingAppointmentReminders(kind: '24h' | '30min', entitlement: SQL) {
    const upcoming = kind === '24h' ? { from: 23 * 60, until: 25 * 60 } : { from: 15, until: 35 };
    const now = new Date();
    const windowStart = new Date(now.getTime() + upcoming.from * 60_000);
    const windowEnd = new Date(now.getTime() + upcoming.until * 60_000);
    const reminderColumn = kind === '24h' ? agendaAppointments.reminderSentAt : agendaAppointments.reminder30minSentAt;
    const eventType = kind === '24h' ? 'reminder_24h' : 'reminder_30min';
    const confirmedInWindow = and(
        eq(agendaAppointments.status, 'confirmed'),
        inArray(agendaAppointments.paymentStatus, ['paid', 'not_required']),
        gte(agendaAppointments.startsAt, windowStart),
        lte(agendaAppointments.startsAt, windowEnd),
        isNull(reminderColumn),
    );
    const appointments = await db.select({
        appointment: agendaAppointments,
        professional: agendaProfessionalProfiles,
    }).from(agendaAppointments)
        .innerJoin(agendaProfessionalProfiles, eq(agendaAppointments.professionalId, agendaProfessionalProfiles.id))
        .where(and(confirmedInWindow, entitlement));

    for (const { appointment, professional } of appointments) {
        const { dateLabel, timeLabel } = formatReminderLabels(appointment.startsAt, professional.timezone ?? 'America/Santiago');
        const whenLabel = `${dateLabel} · ${timeLabel}`;
        let processed: { emailAccepted: boolean } | null;
        try {
            processed = await db.transaction(async (tx) => {
                const [current] = await tx.select().from(agendaAppointments).where(and(
                    eq(agendaAppointments.id, appointment.id),
                    eq(agendaAppointments.updatedAt, appointment.updatedAt),
                    confirmedInWindow,
                )).limit(1).for('update');
                if (!current) return null;
                const emailAccepted = current.clientEmail ? await sendAppointmentReminderEmail(current.clientEmail, {
                    clientName: current.clientName ?? 'Paciente',
                    professionalName: professional.displayName ?? 'el profesional',
                    dateLabel: whenLabel,
                    modality: current.modality,
                    meetingUrl: current.meetingUrl,
                    location: current.location,
                    cancelUrl: buildCancelUrl(current.id, professional.slug),
                    appUrl: agendaAppBaseUrl(),
                    kind,
                }) : false;

                await tx.update(agendaAppointments)
                    .set(kind === '24h' ? { reminderSentAt: new Date() } : { reminder30minSentAt: new Date() })
                    .where(eq(agendaAppointments.id, current.id));
                return { emailAccepted };
            });
        } catch (error) {
            console.error(`[agenda] ${kind} reminder failed for`, appointment.id, ':', error);
            if (appointment.clientEmail) {
                await logNotification({
                    professionalId: professional.id,
                    appointmentId: appointment.id,
                    clientId: appointment.clientId,
                    channel: 'email',
                    eventType,
                    recipient: appointment.clientEmail,
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
            }
            continue;
        }
        if (!processed) continue;
        if (processed.emailAccepted && appointment.clientEmail) {
            await logNotification({
                professionalId: professional.id,
                appointmentId: appointment.id,
                clientId: appointment.clientId,
                channel: 'email',
                eventType,
                recipient: appointment.clientEmail,
                status: 'sent',
            });
        }
        if (
            kind === '24h'
            && !appointment.whatsappReminderSentAt
            && professional.whatsappRemindersEnabled !== false
            && isWhatsAppCloudConfigured()
        ) {
            try {
                const [clientRow, serviceRow] = await Promise.all([
                    appointment.clientId
                        ? db.query.agendaClients.findFirst({ where: eq(agendaClients.id, appointment.clientId) })
                        : Promise.resolve(null),
                    appointment.serviceId
                        ? db.query.agendaServices.findFirst({ where: eq(agendaServices.id, appointment.serviceId) })
                        : Promise.resolve(null),
                ]);
                const waPhone = clientRow?.whatsapp || appointment.clientPhone || clientRow?.phone || null;
                if (waPhone) {
                    const quota = await getAgendaWhatsappQuota(professional);
                    if (quota.remaining > 0) {
                        const locationLabel = appointment.modality === 'online'
                            ? 'Atención online'
                            : (appointment.location || 'Atención presencial');
                        const waResult = await sendAppointmentReminderWhatsApp({
                            appointmentId: appointment.id,
                            toPhone: waPhone,
                            clientName: appointment.clientName ?? 'Paciente',
                            professionalName: professional.displayName ?? 'tu profesional',
                            serviceName: serviceRow?.name ?? null,
                            whenLabel,
                            locationLabel,
                        });
                        if (waResult.ok) {
                            await db.update(agendaAppointments)
                                .set({ whatsappReminderSentAt: new Date() })
                                .where(eq(agendaAppointments.id, appointment.id));
                            if (quota.used >= quota.planLimit && (professional.whatsappExtraCredits ?? 0) > 0) {
                                await db.update(agendaProfessionalProfiles)
                                    .set({ whatsappExtraCredits: sql`GREATEST(${agendaProfessionalProfiles.whatsappExtraCredits} - 1, 0)` })
                                    .where(eq(agendaProfessionalProfiles.id, professional.id));
                            }
                            await logNotification({
                                professionalId: professional.id,
                                appointmentId: appointment.id,
                                clientId: appointment.clientId,
                                channel: 'whatsapp',
                                eventType: 'reminder_24h',
                                recipient: waPhone,
                                status: 'sent',
                                payload: waResult.messageId ? { messageId: waResult.messageId } : {},
                            });
                        } else {
                            await logNotification({
                                professionalId: professional.id,
                                appointmentId: appointment.id,
                                clientId: appointment.clientId,
                                channel: 'whatsapp',
                                eventType: 'reminder_24h',
                                recipient: waPhone,
                                status: 'failed',
                                errorMessage: waResult.error ?? 'Error enviando WhatsApp',
                            });
                        }
                    } else if (quota.totalLimit > 0) {
                        await logNotification({
                            professionalId: professional.id,
                            appointmentId: appointment.id,
                            clientId: appointment.clientId,
                            channel: 'whatsapp',
                            eventType: 'reminder_24h',
                            recipient: waPhone,
                            status: 'skipped',
                            errorMessage: 'Cuota mensual de WhatsApp alcanzada; se usó respaldo por email / wa.me',
                        });
                    }
                }
            } catch (waError) {
                console.error('[agenda] WhatsApp 24h reminder failed for', appointment.id, ':', waError);
            }
        }
        await insertPlatformNotifications({
            userId: professional.userId,
            vertical: 'agenda',
            type: `appointment.${eventType}`,
            title: kind === '24h' ? 'Recordatorio de cita mañana' : 'Cita próxima',
            body: `${appointment.clientName ?? 'Paciente'} · ${whenLabel}`,
            actionUrl: '/panel/agenda',
            entityType: 'appointment',
            entityId: appointment.id,
        });
    }
}

export function registerAgendaCronJobs() {
    const agendaEnabled = process.env.AGENDA_CRON_ENABLED === 'true';

    if (process.env.SIMPLE_ACCOUNT_VISIT_REMINDERS_ENABLED !== 'false') {
        cron.schedule('*/5 * * * *', async () => {
            try {
                await sendUpcomingAccountVisitReminders();
            } catch (e) {
                console.error('[agenda] account visit reminder cron error:', e);
            }
        });
        console.info('[agenda] recordatorios de visitas del equipo programados');
    }

    if (!isProduction && !agendaEnabled) {
        console.info('[agenda] cron jobs desactivados (no es producción y AGENDA_CRON_ENABLED != true)');
        return;
    }

    if (isProduction && agendaEnabled) {
        console.info('[agenda] AGENDA_CRON_ENABLED=true en producción — preferir una sola réplica con cron');
    }

    console.info('[agenda] registering reminder cron jobs (advisory lock %s)...', AGENDA_CRON_ADVISORY_LOCK_KEY);

    const runWithLock = async (job: () => Promise<void>) => {
        const lockConnection = await pgClient.reserve();
        let acquired = false;
        try {
            const result = await lockConnection`SELECT pg_try_advisory_lock(${AGENDA_CRON_ADVISORY_LOCK_KEY}) AS acquired`;
            acquired = result[0]?.acquired === true;
            if (!acquired) return;
            await job();
        } catch (error) {
            console.error('[agenda] cron lock/job error:', error);
        } finally {
            try {
                if (acquired) await lockConnection`SELECT pg_advisory_unlock(${AGENDA_CRON_ADVISORY_LOCK_KEY})`;
            } finally {
                lockConnection.release();
            }
        }
    };

    const entitlement = reminderEntitlementCondition();

    cron.schedule('*/5 * * * *', () => runWithLock(() => sendUpcomingAppointmentReminders('24h', entitlement)));
    cron.schedule('*/5 * * * *', () => runWithLock(() => sendUpcomingAppointmentReminders('30min', entitlement)));
    cron.schedule('*/5 * * * *', () => runWithLock(async () => {
        await releaseExpiredUnpaidMercadoPagoBookings();
    }));

    // Hora local estable incluso al cambiar el horario de verano.
    cron.schedule('0 9 * * *', async () => {
        await runWithLock(async () => {
            try {
                const downgraded = await downgradeExpiredAgendaProProfiles();
                if (downgraded > 0) {
                    console.info(`[agenda] downgraded ${downgraded} expired Pro profiles to Gratis`);
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
