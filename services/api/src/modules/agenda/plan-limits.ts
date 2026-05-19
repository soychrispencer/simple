import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { agendaAppointments, agendaClients, agendaProfessionalProfiles } from '../../db/schema.js';

export async function getAgendaProfile(userId: string) {
    return db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.userId, userId),
    });
}

export const FREE_TIER_LIMITS = { maxClientsTotal: 5, maxAppointmentsPerMonth: 10 };

export function isFreePlan(profile: { plan: string; planExpiresAt: Date | null }, userRole?: string): boolean {
    if (userRole === 'superadmin') return false;
    if (profile.plan === 'free') return true;
    if (profile.plan === 'pro' && profile.planExpiresAt && profile.planExpiresAt < new Date()) return true;
    return false;
}

export async function checkClientLimit(profileId: string): Promise<string | null> {
    const [row] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(agendaClients)
        .where(eq(agendaClients.professionalId, profileId));
    if ((row?.total ?? 0) >= FREE_TIER_LIMITS.maxClientsTotal) {
        return `Has alcanzado el límite de ${FREE_TIER_LIMITS.maxClientsTotal} pacientes del plan gratuito. Actualiza a Pro para pacientes ilimitados.`;
    }
    return null;
}

export async function checkAppointmentLimit(profileId: string): Promise<string | null> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [row] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(agendaAppointments)
        .where(and(eq(agendaAppointments.professionalId, profileId), gte(agendaAppointments.startsAt, monthStart)));
    if ((row?.total ?? 0) >= FREE_TIER_LIMITS.maxAppointmentsPerMonth) {
        return `Has alcanzado el límite de ${FREE_TIER_LIMITS.maxAppointmentsPerMonth} citas mensuales del plan gratuito. Actualiza a Pro para citas ilimitadas.`;
    }
    return null;
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
        const end = new Date(dateMidnight.getTime() + toMs(rule.endTime));

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
