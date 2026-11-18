import { and, asc, eq, gt, gte, lt, inArray } from 'drizzle-orm';
import { pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { resolveBookingModality } from '@simple/utils';
import type { db as database } from '../../db/index.js';
import {
    accounts,
    accountUsers,
    accountVerticalSettings,
    agendaAppointments,
    agendaProfessionalProfiles,
    agendaServices,
    users,
} from '../../db/schema.js';
import { canManageAccountRole } from '../accounts/permissions.js';
import { runAccountManagerWrite, runAccountWorkspaceWrite } from '../accounts/write-access.js';
import { createAgendaBookingSchedule, type AgendaRouterDeps } from './router.js';

const receptionAssignments = pgTable('agenda_reception_assignments', {
    membershipId: uuid('membership_id').notNull().references(() => accountUsers.id, { onDelete: 'cascade' }),
    professionalId: uuid('professional_id').notNull().references(() => agendaProfessionalProfiles.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.membershipId, table.professionalId] })]);

const pilotMemberRole = 'agent';
const assignmentInput = z.object({ membershipId: z.uuid(), professionalId: z.uuid(), enabled: z.boolean() });
const professionalIdInput = z.uuid();
const schedulingSelection = z.object({ serviceId: z.uuid(), appointmentId: z.undefined().optional() })
    .or(z.object({ appointmentId: z.uuid(), serviceId: z.undefined().optional() }));
const timingInput = z.object({
    startsAt: z.iso.datetime({ offset: true }),
    expectedStartsAt: z.iso.datetime({ offset: true }).optional(),
    clientName: z.string().trim().min(1).max(160).optional(),
    clientEmail: z.email().optional(),
    modality: z.enum(['online', 'presential']).optional(),
});
const allowedStatuses = ['pending', 'confirmed'];
type AgendaDatabase = typeof database;
type AgendaTransaction = Parameters<Parameters<AgendaDatabase['transaction']>[0]>[0];

const workspaceScope = {
    id: accounts.id,
    name: accounts.name,
    membershipId: accountUsers.id,
    role: accountUsers.role,
} as const;

async function activeAgendaTeam(db: AgendaDatabase | AgendaTransaction, userId: string) {
    const [workspace] = await db.select(workspaceScope).from(accountUsers)
        .innerJoin(accounts, eq(accountUsers.accountId, accounts.id))
        .innerJoin(accountVerticalSettings, and(
            eq(accountVerticalSettings.accountId, accounts.id),
            eq(accountVerticalSettings.vertical, 'agenda'),
            eq(accountVerticalSettings.accountKind, 'company'),
        ))
        .where(and(
            eq(accountUsers.userId, userId),
            eq(accountUsers.isDefault, true),
            eq(accounts.isPersonal, false),
        ))
        .limit(1);
    return workspace ?? null;
}

function scopedAgendas(db: AgendaDatabase | AgendaTransaction, accountId: string) {
    return db.select({
        id: agendaProfessionalProfiles.id,
        displayName: agendaProfessionalProfiles.displayName,
        timezone: agendaProfessionalProfiles.timezone,
    }).from(agendaProfessionalProfiles).innerJoin(accountUsers, and(
        eq(accountUsers.accountId, agendaProfessionalProfiles.accountId),
        eq(accountUsers.userId, agendaProfessionalProfiles.userId),
    )).where(eq(agendaProfessionalProfiles.accountId, accountId))
        .orderBy(asc(agendaProfessionalProfiles.displayName));
}

function scopedAssignments(db: AgendaDatabase | AgendaTransaction, accountId: string, membershipId?: string) {
    return db.select({
        membershipId: receptionAssignments.membershipId,
        professionalId: receptionAssignments.professionalId,
    }).from(receptionAssignments)
        .innerJoin(accountUsers, eq(accountUsers.id, receptionAssignments.membershipId))
        .innerJoin(agendaProfessionalProfiles, eq(agendaProfessionalProfiles.id, receptionAssignments.professionalId))
        .where(and(
            eq(accountUsers.accountId, accountId),
            eq(accountUsers.role, pilotMemberRole),
            eq(agendaProfessionalProfiles.accountId, accountId),
            membershipId ? eq(receptionAssignments.membershipId, membershipId) : undefined,
        ));
}

export function createAgendaTeamRouter({
    db, authUser, requireVerifiedSession, syncToGoogleCalendar, sendBookingConfirmationEmail, logAudit, scheduleDeps,
}: {
    db: AgendaDatabase;
    authUser: (context: Context) => Promise<{ id: string } | null | undefined>;
    requireVerifiedSession: MiddlewareHandler;
    scheduleDeps: Pick<AgendaRouterDeps, 'db' | 'sql' | 'tables' | 'dbHelpers' | 'generateSlots' | 'isFreePlan' | 'checkAppointmentLimit'>;
} & Pick<AgendaRouterDeps, 'syncToGoogleCalendar' | 'sendBookingConfirmationEmail' | 'logAudit'>) {
    const app = new Hono();
    app.use('*', requireVerifiedSession);

    async function assignedProfile(tx: AgendaTransaction | AgendaDatabase, userId: string, id: string, lock = false) {
        const current = await activeAgendaTeam(tx, userId);
        if (current?.role !== pilotMemberRole) return null;
        const query = tx.select({ profile: agendaProfessionalProfiles })
            .from(agendaProfessionalProfiles)
            .innerJoin(receptionAssignments, and(eq(receptionAssignments.professionalId, agendaProfessionalProfiles.id),
                eq(receptionAssignments.membershipId, current.membershipId)))
            .innerJoin(accountUsers, and(eq(accountUsers.accountId, agendaProfessionalProfiles.accountId),
                eq(accountUsers.userId, agendaProfessionalProfiles.userId)))
            .where(and(eq(agendaProfessionalProfiles.id, id), eq(agendaProfessionalProfiles.accountId, current.id))).limit(1);
        const [row] = await (lock ? query.for('update', { of: agendaProfessionalProfiles }) : query);
        return row?.profile ?? null;
    }

    const activeServices = (id: string) => and(
        eq(agendaServices.professionalId, id), eq(agendaServices.kind, 'appointment'), eq(agendaServices.isActive, true),
    );

    async function schedulingTarget(tx: AgendaTransaction | AgendaDatabase, profileId: string, selection: z.infer<typeof schedulingSelection>) {
        if (selection.appointmentId) {
            const [appointment] = await tx.select().from(agendaAppointments)
                .where(and(eq(agendaAppointments.id, selection.appointmentId), eq(agendaAppointments.professionalId, profileId),
                    inArray(agendaAppointments.status, allowedStatuses), gt(agendaAppointments.startsAt, new Date()))).limit(1);
            return appointment ? { appointment, service: null, duration: appointment.durationMinutes } : null;
        }
        const [service] = await tx.select().from(agendaServices)
            .where(and(activeServices(profileId), eq(agendaServices.id, selection.serviceId!))).limit(1);
        return service ? { appointment: null, service, duration: service.durationMinutes } : null;
    }

    app.get('/', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado.' }, 401);
        const workspace = await activeAgendaTeam(db, user.id);
        if (!workspace) return c.json({ ok: true, workspace: null, members: [], agendas: [], assignments: [] });

        const canManage = canManageAccountRole(workspace.role);
        const itineraries = await scopedAgendas(db, workspace.id);
        const assignments = await scopedAssignments(db, workspace.id, canManage ? undefined : workspace.membershipId);
        const permittedIds = new Set(assignments.map(({ professionalId }) => professionalId));
        const agendas = canManage ? itineraries : itineraries.filter((item) => permittedIds.has(item.id));
        const members = canManage ? await db.select({
            id: accountUsers.id,
            name: users.name,
            role: accountUsers.role,
        }).from(accountUsers).innerJoin(users, eq(users.id, accountUsers.userId))
            .where(eq(accountUsers.accountId, workspace.id)).orderBy(asc(users.name)) : [];
        return c.json({ ok: true, workspace: { name: workspace.name, role: workspace.role, canManage }, members, agendas, assignments });
    });

    app.put('/assignment', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado.' }, 401);
        const workspace = await activeAgendaTeam(db, user.id);
        if (!workspace || !canManageAccountRole(workspace.role)) return c.json({ ok: false, error: 'Tu rol no puede gestionar accesos.' }, 403);
        const parsed = assignmentInput.safeParse(await c.req.json().catch(() => null));
        if (!parsed.success) return c.json({ ok: false, error: 'Selecciona una persona y una agenda.' }, 400);
        const { membershipId, professionalId, enabled } = parsed.data;

        const result = await runAccountManagerWrite(db, { userId: user.id, accountId: workspace.id }, async (tx: AgendaTransaction) => {
            const current = await activeAgendaTeam(tx, user.id);
            if (current?.id !== workspace.id) return false;
            const [member] = await tx.select({ id: accountUsers.id }).from(accountUsers).where(and(
                eq(accountUsers.id, membershipId),
                eq(accountUsers.accountId, current.id),
                eq(accountUsers.role, pilotMemberRole),
            )).limit(1);
            const agendas = await scopedAgendas(tx, current.id);
            if (!member || !agendas.some((agenda) => agenda.id === professionalId)) return false;

            if (enabled) {
                await tx.insert(receptionAssignments).values({ membershipId, professionalId }).onConflictDoNothing();
            } else {
                await tx.delete(receptionAssignments).where(and(
                    eq(receptionAssignments.membershipId, membershipId),
                    eq(receptionAssignments.professionalId, professionalId),
                ));
            }
            return true;
        });
        if (!result.ok || !result.value) return c.json({ ok: false, error: 'Elige una persona y una agenda del espacio activo.' }, 403);
        return c.json({ ok: true });
    });

    app.get('/agendas/:id/appointments', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado.' }, 401);
        const id = professionalIdInput.safeParse(c.req.param('id'));
        if (!id.success) return c.json({ ok: false, error: 'Agenda no disponible.' }, 404);
        const workspace = await activeAgendaTeam(db, user.id);
        if (!workspace || workspace.role !== pilotMemberRole) return c.json({ ok: false, error: 'Agenda no disponible.' }, 404);

        const assignments = await scopedAssignments(db, workspace.id, workspace.membershipId);
        if (!assignments.some(({ professionalId }) => professionalId === id.data)) {
            return c.json({ ok: false, error: 'Agenda no disponible.' }, 404);
        }
        const now = new Date();
        const appointments = await db.select({
            id: agendaAppointments.id,
            clientName: agendaAppointments.clientName,
            startsAt: agendaAppointments.startsAt,
            endsAt: agendaAppointments.endsAt,
            status: agendaAppointments.status,
            paymentStatus: agendaAppointments.paymentStatus,
        }).from(agendaAppointments)
            .innerJoin(agendaProfessionalProfiles, eq(agendaProfessionalProfiles.id, agendaAppointments.professionalId))
            .innerJoin(receptionAssignments, eq(receptionAssignments.professionalId, agendaAppointments.professionalId))
            .innerJoin(accountUsers, eq(accountUsers.id, receptionAssignments.membershipId))
            .where(and(
                eq(agendaAppointments.professionalId, id.data),
                eq(agendaProfessionalProfiles.accountId, workspace.id),
                eq(accountUsers.id, workspace.membershipId),
                eq(accountUsers.accountId, workspace.id),
                eq(accountUsers.userId, user.id),
                eq(accountUsers.isDefault, true),
                eq(accountUsers.role, pilotMemberRole),
                gte(agendaAppointments.endsAt, now),
                lt(agendaAppointments.startsAt, new Date(now.getTime() + 7 * 86400000)),
                inArray(agendaAppointments.status, ['pending', 'confirmed']),
            )).orderBy(asc(agendaAppointments.startsAt)).limit(100);
        return c.json({ ok: true, appointments });
    });

    app.get('/agendas/:id/services', async (c) => {
        const user = await authUser(c);
        const id = professionalIdInput.safeParse(c.req.param('id'));
        const profile = user && id.success ? await assignedProfile(db, user.id, id.data) : null;
        if (!profile) return c.json({ ok: false, error: 'Agenda no disponible.' }, 404);
        const services = await db.select({
            id: agendaServices.id, name: agendaServices.name, isOnline: agendaServices.isOnline, isPresential: agendaServices.isPresential,
        }).from(agendaServices).where(activeServices(profile.id)).orderBy(asc(agendaServices.name));
        return c.json({ ok: true, services, allowsManualBooking: !profile.requiresAdvancePayment,
            bookingPath: profile.isPublished ? `/${encodeURIComponent(profile.slug)}` : null });
    });

    app.get('/agendas/:id/schedule', async (c) => {
        const user = await authUser(c);
        const id = professionalIdInput.safeParse(c.req.param('id'));
        const selection = schedulingSelection.safeParse(c.req.query());
        const date = c.req.query('date');
        const profile = user && id.success ? await assignedProfile(db, user.id, id.data) : null;
        if (!profile || !selection.success || !date) return c.json({ ok: false, error: 'Agenda o fecha no disponible.' }, 404);
        const target = await schedulingTarget(db, profile.id, selection.data);
        if (!target) return c.json({ ok: false, error: 'Revisa el servicio o el estado de la cita.' }, 409);
        const { getPublicBookingSlots } = createAgendaBookingSchedule(scheduleDeps);
        const slots = await getPublicBookingSlots(profile, date, target.duration, db, target.appointment?.id);
        c.header('Cache-Control', 'no-store');
        const now = Date.now();
        return c.json({ ok: true, slots: slots.filter((slot: { startsAt: string }) => {
            const start = new Date(slot.startsAt).getTime();
            return start > now && start !== target.appointment?.startsAt.getTime();
        }),
            timezone: profile.timezone, expectedStartsAt: target.appointment?.startsAt });
    });

    app.post('/agendas/:id/schedule', async (c) => {
        const user = await authUser(c);
        const id = professionalIdInput.safeParse(c.req.param('id'));
        const body = await c.req.json().catch(() => null);
        const selection = schedulingSelection.safeParse(body);
        const timing = timingInput.safeParse(body);
        const workspace = user ? await activeAgendaTeam(db, user.id) : null;
        if (!user || !id.success || workspace?.role !== pilotMemberRole) return c.json({ ok: false, error: 'Agenda no disponible.' }, 404);
        if (!selection.success || !timing.success) return c.json({ ok: false, error: 'Revisa el servicio, horario y datos de contacto.' }, 400);

        const input = timing.data;
        const startsAt = new Date(input.startsAt);
        const { getPublicBookingSlots, localDateKey } = createAgendaBookingSchedule(scheduleDeps);
        const result = await runAccountWorkspaceWrite(db, { userId: user.id, accountId: workspace.id },
            (role) => role === pilotMemberRole, async (tx: AgendaTransaction) => {
                const profile = await assignedProfile(tx, user.id, id.data, true);
                if (profile?.accountId !== workspace.id) return { error: 'Tu acceso a esta agenda cambió.' };
                const target = await schedulingTarget(tx, profile.id, selection.data);
                if (!target || startsAt.getTime() <= Date.now()) return { error: 'La cita o el horario ya no está disponible.' };
                if (target.appointment && (!input.expectedStartsAt ||
                    target.appointment.startsAt.getTime() !== new Date(input.expectedStartsAt).getTime())) {
                    return { error: 'La cita cambió. Vuelve a consultar las horas.' };
                }
                if (target.appointment?.startsAt.getTime() === startsAt.getTime()) {
                    return { error: 'Elige una hora distinta a la actual.' };
                }
                if (target.service) {
                    if (profile.requiresAdvancePayment) return { error: 'Para esta reserva con anticipo, comparte el enlace de reservas.' };
                    if (!input.clientName) return { error: 'Escribe el nombre del cliente.' };
                    if (scheduleDeps.isFreePlan(profile)) {
                        const limitError = await scheduleDeps.checkAppointmentLimit(profile.id, 1);
                        if (limitError) return { error: limitError };
                    }
                }
                const timezone = profile.timezone ?? 'America/Santiago';
                const lastDay = new Date(`${localDateKey(new Date(), timezone)}T12:00:00Z`);
                lastDay.setUTCDate(lastDay.getUTCDate() + profile.bookingWindowDays);
                const date = localDateKey(startsAt, timezone);
                if (date > lastDay.toISOString().slice(0, 10)) return { error: 'La fecha está fuera del período de reserva.' };
                const slots = await getPublicBookingSlots(profile, date, target.duration, tx, target.appointment?.id);
                const chosen = slots.find((slot: { startsAt: string; endsAt: string }) => new Date(slot.startsAt).getTime() === startsAt.getTime());
                if (!chosen) return { error: 'La hora ya no está disponible.' };
                const times = { startsAt, endsAt: new Date(chosen.endsAt), updatedAt: new Date() };
                if (target.appointment) {
                    const [appointment] = await tx.update(agendaAppointments)
                        .set({ ...times, reminderSentAt: null, reminder30minSentAt: null })
                        .where(and(eq(agendaAppointments.id, target.appointment.id), eq(agendaAppointments.startsAt, target.appointment.startsAt),
                            inArray(agendaAppointments.status, allowedStatuses))).returning();
                    return appointment ? { profile, appointment, rescheduled: true } : { error: 'La cita cambió. Vuelve a intentar.' };
                }
                const service = target.service!;
                const modality = resolveBookingModality(service, input.modality ?? null);
                if (!modality) return { error: 'Elige una modalidad de atención.' };
                const [appointment] = await tx.insert(agendaAppointments).values({
                    ...times, professionalId: profile.id, serviceId: service.id, clientName: input.clientName,
                    clientEmail: input.clientEmail, durationMinutes: target.duration, modality,
                    currency: profile.currency, price: service.price, status: 'confirmed',
                }).returning();
                return { profile, appointment, rescheduled: false };
            });
        if (!result.ok) return c.json({ ok: false, error: 'Tu acceso a esta agenda cambió.' }, 403);
        if (!result.value || !result.value.appointment) return c.json({ ok: false, error: result.value?.error ?? 'No pudimos guardar la cita.' }, 409);
        const { appointment, profile, rescheduled } = result.value;
        const calendarEvent = await syncToGoogleCalendar(profile, appointment, rescheduled ? 'update' : 'create')
            .catch((error) => { console.error('[agenda] reception calendar:', error); return null; });
        if (calendarEvent?.eventId) {
            await db.update(agendaAppointments).set({ googleEventId: calendarEvent.eventId })
                .where(and(eq(agendaAppointments.id, appointment.id), eq(agendaAppointments.startsAt, appointment.startsAt),
                    eq(agendaAppointments.status, appointment.status)))
                .catch((error) => console.error('[agenda] reception calendar reference:', error));
        }
        void logAudit({ professionalId: profile.id, userId: user.id, entityType: 'appointment', entityId: appointment.id,
            action: rescheduled ? 'reschedule' : 'create', metadata: { source: 'reception' }, ctx: c })
            .catch((error) => console.error('[agenda] reception audit:', error));
        if (appointment.clientEmail) {
            const appUrl = (process.env.AGENDA_APP_URL || 'https://simpleagenda.app').replace(/\/$/, '');
            void sendBookingConfirmationEmail(appointment.clientEmail, {
                ...appointment, clientName: appointment.clientName ?? 'Cliente', professionalName: profile.displayName ?? 'el profesional',
                timezone: profile.timezone, slug: profile.slug, rescheduled, appUrl,
                cancelUrl: `${appUrl}/cancelar?appt=${appointment.id}&slug=${encodeURIComponent(profile.slug)}`,
            }).catch((error) => console.error('[agenda] reception scheduling email:', error));
        }
        return c.json({ ok: true });
    });

    app.post('/agendas/:id/appointments/:appointmentId/confirm', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado.' }, 401);
        const agendaId = professionalIdInput.safeParse(c.req.param('id'));
        const appointmentId = z.uuid().safeParse(c.req.param('appointmentId'));
        const workspace = await activeAgendaTeam(db, user.id);
        if (!agendaId.success || !appointmentId.success || workspace?.role !== pilotMemberRole) {
            return c.json({ ok: false, error: 'Cita no disponible.' }, 404);
        }

        const result = await runAccountWorkspaceWrite(db, { userId: user.id, accountId: workspace.id },
            (role) => role === pilotMemberRole, async (tx: AgendaTransaction) => {
                const current = await activeAgendaTeam(tx, user.id);
                if (current?.id !== workspace.id || current.membershipId !== workspace.membershipId) return null;
                const assignments = await scopedAssignments(tx, current.id, current.membershipId);
                if (!assignments.some((item) => item.professionalId === agendaId.data)) return null;
                const [profile] = await tx.select().from(agendaProfessionalProfiles)
                    .innerJoin(accountUsers, and(
                        eq(accountUsers.accountId, agendaProfessionalProfiles.accountId),
                        eq(accountUsers.userId, agendaProfessionalProfiles.userId),
                    ))
                    .where(and(eq(agendaProfessionalProfiles.id, agendaId.data), eq(agendaProfessionalProfiles.accountId, current.id)))
                    .limit(1);
                if (!profile) return null;
                const [appointment] = await tx.update(agendaAppointments).set({ status: 'confirmed', updatedAt: new Date() })
                    .where(and(
                        eq(agendaAppointments.id, appointmentId.data),
                        eq(agendaAppointments.professionalId, agendaId.data),
                        eq(agendaAppointments.status, 'pending'),
                        inArray(agendaAppointments.paymentStatus, ['paid', 'not_required']),
                        gt(agendaAppointments.startsAt, new Date()),
                    )).returning();
                return appointment ? { profile: profile.agenda_professional_profiles, appointment } : null;
            });
        if (!result.ok || !result.value) return c.json({ ok: false, error: 'La cita ya cambió o falta acreditar el pago.' }, 409);
        const { profile, appointment } = result.value;
        void logAudit({ professionalId: profile.id, userId: user.id, entityType: 'appointment', entityId: appointment.id, action: 'confirm', metadata: { source: 'reception' }, ctx: c })
            .catch((error) => console.error('[agenda] reception audit:', error));
        void syncToGoogleCalendar(profile, appointment, 'update').catch((error) => console.error('[agenda] reception calendar:', error));
        if (appointment.clientEmail) {
            const appUrl = (process.env.AGENDA_APP_URL || 'http://localhost:3004').replace(/\/$/, '');
            void sendBookingConfirmationEmail(appointment.clientEmail, {
                appointmentId: appointment.id, clientName: appointment.clientName ?? 'Cliente',
                professionalName: profile.displayName ?? 'el profesional', slug: profile.slug,
                serviceName: 'Cita', startsAt: appointment.startsAt, endsAt: appointment.endsAt,
                durationMinutes: appointment.durationMinutes, modality: appointment.modality, timezone: profile.timezone,
                status: appointment.status, paymentStatus: appointment.paymentStatus,
                meetingUrl: appointment.meetingUrl, location: appointment.location,
                appUrl, cancelUrl: `${appUrl}/cancelar?appt=${appointment.id}&slug=${encodeURIComponent(profile.slug)}`,
            }).catch((error) => console.error('[agenda] reception confirmation email:', error));
        }
        return c.json({ ok: true });
    });

    return app;
}
