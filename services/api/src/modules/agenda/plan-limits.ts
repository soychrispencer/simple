import { and, asc, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { accountUsers, accounts, agendaAccountTrials, agendaAppointments, agendaProfessionalProfiles } from '../../db/schema.js';
import { AGENDA_PRICING, isPlatformLaunchActive } from '@simple/utils';

export async function getAgendaProfile(userId: string, accountId?: string | null) {
    let resolvedAccountId = accountId;
    if (resolvedAccountId === undefined) {
        const [membership] = await db
            .select({ accountId: accountUsers.accountId })
            .from(accountUsers)
            .where(eq(accountUsers.userId, userId))
            .orderBy(desc(accountUsers.isDefault), asc(accountUsers.createdAt))
            .limit(1);
        resolvedAccountId = membership?.accountId ?? null;
    }

    if (!resolvedAccountId) {
        return null;
    }

    const profile = await db.query.agendaProfessionalProfiles.findFirst({
        where: and(
            eq(agendaProfessionalProfiles.userId, userId),
            eq(agendaProfessionalProfiles.accountId, resolvedAccountId),
        ),
    });
    if (profile) return profile;

    // Legacy profiles can be adopted by the user's personal workspace only.
    const [account] = await db
        .select({ isPersonal: accounts.isPersonal, ownerUserId: accounts.ownerUserId })
        .from(accounts)
        .where(eq(accounts.id, resolvedAccountId))
        .limit(1);
    if (!account?.isPersonal || account.ownerUserId !== userId) return null;

    return db.query.agendaProfessionalProfiles.findFirst({
        where: and(eq(agendaProfessionalProfiles.userId, userId), isNull(agendaProfessionalProfiles.accountId)),
    });
}

export function normalizeAgendaBillingPlan(plan: string): 'free' | 'pro' | 'pro_plus' {
    return plan === 'pro' || plan === 'pro_plus' ? plan : 'free';
}

/**
 * Marca el plan como free expirado y conserva la fecha histórica de fin.
 * Las pruebas nuevas se registran por cuenta en `agenda_account_trials`.
 */
export function expiredAgendaPlanEndsAt(from = new Date()): Date {
    return new Date(from.getTime() - 60_000);
}

/**
 * Normaliza el plan del perfil. La prueba Pro ya no se inicia al visitar o crear
 * el perfil; se activa explícitamente desde la sección de planes.
 */
export async function ensureAgendaProfileTrial(
    profile: typeof agendaProfessionalProfiles.$inferSelect,
) {
    const billingPlan = normalizeAgendaBillingPlan(profile.plan);
    const needsPlanNormalize = profile.plan !== billingPlan;

    if (!needsPlanNormalize) return profile;

    const conditions = [
        eq(agendaProfessionalProfiles.id, profile.id),
        eq(agendaProfessionalProfiles.plan, profile.plan),
        profile.planExpiresAt === null
            ? isNull(agendaProfessionalProfiles.planExpiresAt)
            : eq(agendaProfessionalProfiles.planExpiresAt, profile.planExpiresAt),
    ];
    const [updated] = await db
        .update(agendaProfessionalProfiles)
        .set({
            plan: billingPlan,
            updatedAt: new Date(),
        })
        .where(and(...conditions))
        .returning();

    if (updated) return updated;
    return await db.query.agendaProfessionalProfiles.findFirst({
        where: eq(agendaProfessionalProfiles.id, profile.id),
    }) ?? profile;
}

export function isAgendaTrialActive(profile: { plan: string; planExpiresAt: Date | null }): boolean {
    return normalizeAgendaBillingPlan(profile.plan) === 'free'
        && Boolean(profile.planExpiresAt && profile.planExpiresAt.getTime() >= Date.now());
}

export function isAgendaProActive(profile: { plan: string; planExpiresAt: Date | null }): boolean {
    const plan = normalizeAgendaBillingPlan(profile.plan);
    if (plan !== 'pro' && plan !== 'pro_plus') return false;
    return !profile.planExpiresAt || profile.planExpiresAt.getTime() >= Date.now();
}

export function hasAgendaFullAccess(
    profile: { plan: string; planExpiresAt: Date | null },
): boolean {
    if (isPlatformLaunchActive('agenda')) return true;
    return isAgendaTrialActive(profile) || isAgendaProActive(profile);
}

export function hasAgendaProPlusAccess(
    profile: { plan: string; planExpiresAt: Date | null },
): boolean {
    if (isPlatformLaunchActive('agenda')) return true;
    if (normalizeAgendaBillingPlan(profile.plan) !== 'pro_plus') return false;
    return !profile.planExpiresAt || profile.planExpiresAt.getTime() >= Date.now();
}

/** Baja el plan del espacio asociado al perfil sin afectar otros espacios del usuario. */
export async function downgradeAgendaProfileAccessById(
    profileId: string,
    endsAt: Date = expiredAgendaPlanEndsAt(),
): Promise<void> {
    await db.transaction(async (tx) => {
        const [snapshot] = await tx.select({
            userId: agendaProfessionalProfiles.userId,
            accountId: agendaProfessionalProfiles.accountId,
        })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.id, profileId))
            .limit(1);
        if (!snapshot) return;

        let accountId = snapshot.accountId;
        if (!accountId) {
            const [personalAccount] = await tx.select({ id: accounts.id })
                .from(accounts)
                .where(and(
                    eq(accounts.ownerUserId, snapshot.userId),
                    eq(accounts.isPersonal, true),
                ))
                .limit(1);
            accountId = personalAccount?.id ?? null;
        }

        // Match account-write lock order: serialize workspace entitlement changes
        // before locking profiles so a trial activation cannot race a downgrade.
        if (accountId) {
            const [lockedAccount] = await tx.select({ id: accounts.id })
                .from(accounts)
                .where(eq(accounts.id, accountId))
                .limit(1)
                .for('update');
            if (!lockedAccount) return;
        }

        const [profile] = await tx.select({
            userId: agendaProfessionalProfiles.userId,
            accountId: agendaProfessionalProfiles.accountId,
        })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.id, profileId))
            .limit(1)
            .for('update');
        if (!profile) return;
        if (profile.accountId && profile.accountId !== accountId) {
            throw new Error('El perfil cambió de espacio durante la baja del plan.');
        }

        const updateValues = { plan: 'free', planExpiresAt: endsAt, updatedAt: new Date() };
        if (accountId) {
            await tx.update(agendaProfessionalProfiles)
                .set(updateValues)
                .where(eq(agendaProfessionalProfiles.accountId, accountId));
            if (!profile.accountId) {
                await tx.update(agendaProfessionalProfiles)
                    .set(updateValues)
                    .where(and(
                        eq(agendaProfessionalProfiles.userId, snapshot.userId),
                        isNull(agendaProfessionalProfiles.accountId),
                    ));
            }
            await tx.update(agendaAccountTrials)
                .set({ endsAt })
                .where(and(
                    eq(agendaAccountTrials.accountId, accountId),
                    gt(agendaAccountTrials.endsAt, endsAt),
                ));
            return;
        }

        await tx.update(agendaProfessionalProfiles)
            .set(updateValues)
            .where(eq(agendaProfessionalProfiles.id, profileId));
    });
}

/** Normaliza Pro vencidos a Gratis; los perfiles publicados siguen recibiendo citas. */
export async function downgradeExpiredAgendaProProfiles(): Promise<number> {
    if (isPlatformLaunchActive('agenda')) return 0;

    const result = await db.execute(sql`
        UPDATE agenda_professional_profiles
        SET plan = 'free', updated_at = now()
        WHERE plan IN ('pro', 'pro_plus')
          AND plan_expires_at IS NOT NULL
          AND plan_expires_at <= now()
    `);

    return Number((result as { rowCount?: number }).rowCount ?? 0);
}

/** Sin trial ni Pro activo: bloquea funciones de pago y aplica límites legacy. */
export function isFreePlan(profile: { plan: string; planExpiresAt: Date | null }): boolean {
    return !hasAgendaFullAccess(profile);
}

/** La cuenta Gratis no limita el número de fichas de clientes. */
export async function checkClientLimit(_profileId: string, _additionalClients = 1, _queryable: any = db): Promise<string | null> {
    return null;
}

/** Cuenta las citas creadas durante el mes calendario de Chile, incluidas las canceladas. */
export async function getAgendaMonthlyBookingCount(profileId: string, queryable: any = db): Promise<number> {
    const rows = await queryable
        .select({ count: sql<number>`count(*)::int` })
        .from(agendaAppointments)
        .where(and(
            eq(agendaAppointments.professionalId, profileId),
            sql`${agendaAppointments.createdAt} >= GREATEST(
                date_trunc('month', now() AT TIME ZONE COALESCE((SELECT timezone FROM agenda_professional_profiles WHERE id = ${profileId}), 'America/Santiago')) AT TIME ZONE COALESCE((SELECT timezone FROM agenda_professional_profiles WHERE id = ${profileId}), 'America/Santiago'),
                COALESCE(
                    (SELECT plan_expires_at FROM agenda_professional_profiles WHERE id = ${profileId}),
                    date_trunc('month', now() AT TIME ZONE COALESCE((SELECT timezone FROM agenda_professional_profiles WHERE id = ${profileId}), 'America/Santiago')) AT TIME ZONE COALESCE((SELECT timezone FROM agenda_professional_profiles WHERE id = ${profileId}), 'America/Santiago')
                )
            )`,
        ));

    return Number(rows[0]?.count ?? 0);
}

export async function checkAppointmentLimit(profileId: string, additionalAppointments = 1, queryable: any = db): Promise<string | null> {
    const used = await getAgendaMonthlyBookingCount(profileId, queryable);
    if (used + additionalAppointments <= AGENDA_PRICING.free.monthlyBookings) return null;

    return `El plan Gratis incluye hasta ${AGENDA_PRICING.free.monthlyBookings} citas nuevas al mes (las canceladas también cuentan). Ya llevas ${used}; activa Pro por ${AGENDA_PRICING.proMonthlyNetClp.toLocaleString('es-CL')} + IVA al mes para seguir recibiendo citas.`;
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
