import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaAppointments, agendaProfessionalProfiles } from '../../db/schema.js';
import { defaultTrialEndsAt } from '../billing/trial-config.js';

import { AGENDA_PRICING, isPlatformLaunchActive } from '@simple/utils';

export async function getAgendaProfile(userId: string) {
    return db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.userId, userId),
    });
}

export function normalizeAgendaBillingPlan(plan: string): 'free' | 'pro' {
    return plan === 'pro' ? 'pro' : 'free';
}

/**
 * Marca el plan como free expirado (sin regenerar trial).
 * `planExpiresAt` queda en el pasado — nunca null — para que ensureAgendaProfileTrial no reabra 30 días.
 */
export function expiredAgendaPlanEndsAt(from = new Date()): Date {
    return new Date(from.getTime() - 60_000);
}

/**
 * Perfiles free sin fecha: solo perfiles legacy que nunca tuvieron trial.
 * No re-otorga prueba si ya expiró o se canceló (fecha en el pasado).
 */
export async function ensureAgendaProfileTrial(
    profile: typeof agendaProfessionalProfiles.$inferSelect,
) {
    const billingPlan = normalizeAgendaBillingPlan(profile.plan);
    const needsTrialDate = billingPlan === 'free' && profile.planExpiresAt == null;
    const needsPlanNormalize = profile.plan !== billingPlan;

    if (!needsTrialDate && !needsPlanNormalize) return profile;

    const planExpiresAt = needsTrialDate
        ? defaultTrialEndsAt(new Date())
        : profile.planExpiresAt;

    const [updated] = await db
        .update(agendaProfessionalProfiles)
        .set({
            plan: billingPlan,
            planExpiresAt,
            updatedAt: new Date(),
        })
        .where(eq(agendaProfessionalProfiles.id, profile.id))
        .returning();

    return updated ?? profile;
}

export function isAgendaTrialActive(profile: { plan: string; planExpiresAt: Date | null }): boolean {
    return normalizeAgendaBillingPlan(profile.plan) === 'free'
        && Boolean(profile.planExpiresAt && profile.planExpiresAt.getTime() >= Date.now());
}

export function isAgendaProActive(profile: { plan: string; planExpiresAt: Date | null }): boolean {
    if (normalizeAgendaBillingPlan(profile.plan) !== 'pro') return false;
    return !profile.planExpiresAt || profile.planExpiresAt.getTime() >= Date.now();
}

export function hasAgendaFullAccess(
    profile: { plan: string; planExpiresAt: Date | null },
    userRole?: string,
): boolean {
    if (isPlatformLaunchActive('agenda')) return true;
    if (userRole === 'superadmin') return true;
    return isAgendaTrialActive(profile) || isAgendaProActive(profile);
}

/** Baja a Gratis sin despublicar el perfil ni borrar la configuración. */
export async function downgradeAgendaProfileAccess(
    userId: string,
    endsAt: Date = expiredAgendaPlanEndsAt(),
): Promise<void> {
    await db
        .update(agendaProfessionalProfiles)
        .set({
            plan: 'free',
            planExpiresAt: endsAt,
            updatedAt: new Date(),
        })
        .where(eq(agendaProfessionalProfiles.userId, userId));
}

/** Normaliza Pro vencidos a Gratis; los perfiles publicados siguen recibiendo reservas. */
export async function downgradeExpiredAgendaProProfiles(): Promise<number> {
    if (isPlatformLaunchActive('agenda')) return 0;

    const result = await db.execute(sql`
        UPDATE agenda_professional_profiles
        SET plan = 'free', updated_at = now()
        WHERE plan = 'pro'
          AND plan_expires_at IS NOT NULL
          AND plan_expires_at <= now()
    `);

    return Number((result as { rowCount?: number }).rowCount ?? 0);
}

/** Sin trial ni Pro activo: bloquea funciones de pago y aplica límites legacy. */
export function isFreePlan(profile: { plan: string; planExpiresAt: Date | null }, userRole?: string): boolean {
    return !hasAgendaFullAccess(profile, userRole);
}

/** La cuenta Gratis no limita el número de fichas de clientes. */
export async function checkClientLimit(_profileId: string, _additionalClients = 1): Promise<string | null> {
    return null;
}

/** Cuenta las reservas creadas durante el mes calendario de Chile, incluidas las canceladas. */
export async function getAgendaMonthlyBookingCount(profileId: string): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(agendaAppointments)
        .where(and(
            eq(agendaAppointments.professionalId, profileId),
            sql`${agendaAppointments.createdAt} >= GREATEST(
                date_trunc('month', now() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago',
                COALESCE(
                    (SELECT plan_expires_at FROM agenda_professional_profiles WHERE id = ${profileId}),
                    date_trunc('month', now() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'
                )
            )`,
        ));

    return Number(rows[0]?.count ?? 0);
}

export async function checkAppointmentLimit(profileId: string, additionalAppointments = 1): Promise<string | null> {
    const used = await getAgendaMonthlyBookingCount(profileId);
    if (used + additionalAppointments <= AGENDA_PRICING.free.monthlyBookings) return null;

    return `El plan Gratis incluye hasta ${AGENDA_PRICING.free.monthlyBookings} reservas al mes. Ya llevas ${used}; activa Pro por ${AGENDA_PRICING.proMonthlyNetClp.toLocaleString('es-CL')} + IVA al mes para seguir recibiendo reservas.`;
}

/** Genera slots para una fecha según reglas de disponibilidad y citas existentes. */
export function generateSlots(
    rules: { startTime: string; endTime: string; breakStart?: string | null; breakEnd?: string | null }[],
    durationMinutes: number,
    dateMidnight: Date,
    existingAppts: { startsAt: Date; endsAt: Date }[],
    blockedSlots: { startsAt: Date; endsAt: Date }[],
    _timezone: string,
): { startsAt: string; endsAt: string }[] {
    const slots: { startsAt: string; endsAt: string }[] = [];
    const toMs = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h * 60 + m) * 60_000;
    };

    for (const rule of rules) {
        let cursor = new Date(dateMidnight.getTime() + toMs(rule.startTime));
        const endMs = toMs(rule.endTime === '23:59' ? '23:59' : rule.endTime);
        const end = new Date(dateMidnight.getTime() + endMs + (rule.endTime === '23:59' ? 59_000 : 0));

        const bStart = rule.breakStart ? new Date(dateMidnight.getTime() + toMs(rule.breakStart)) : null;
        const bEnd = rule.breakEnd ? new Date(dateMidnight.getTime() + toMs(rule.breakEnd)) : null;

        while (cursor < end) {
            const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
            if (slotEnd > end) break;

            const inBreak = bStart && bEnd && cursor < bEnd && slotEnd > bStart;
            const clash = existingAppts.some(
                (a) => cursor < a.endsAt && slotEnd > a.startsAt,
            );
            const blocked = blockedSlots.some((b) => cursor < b.endsAt && slotEnd > b.startsAt);
            const inPast = cursor <= new Date();

            if (!inBreak && !clash && !blocked && !inPast) {
                slots.push({ startsAt: cursor.toISOString(), endsAt: slotEnd.toISOString() });
            }
            cursor = new Date(cursor.getTime() + durationMinutes * 60_000);
        }
    }
    return slots;
}
