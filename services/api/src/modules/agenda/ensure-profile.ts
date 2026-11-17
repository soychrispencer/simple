import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { normalizeTimezone, resolveOperatorDisplayLabel, type OperatorTier } from '@simple/utils';
import type { AppUser } from '../../lib/domain-types.js';
import { db } from '../../db/index.js';
import { accountVerticalSettings, accounts, agendaProfessionalProfiles } from '../../db/schema.js';
import { runAccountMemberWrite } from '../accounts/write-access.js';
import { ensureAgendaProfileTrial } from './plan-limits.js';
import { defaultTrialEndsAt } from '../billing/trial-config.js';
import { loadCurrentSubscriptionFromDb } from '../subscriptions/persist-db.js';
import { isValidAgendaSlug } from './runtime-support.js';

type EnsurePrimaryAccount = (user: AppUser) => Promise<{ id: string }>;

function slugBaseFromUser(user: Pick<AppUser, 'name' | 'email'>): string {
    const fromName = (user.name ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    if (fromName.length >= 3) return fromName.slice(0, 40);
    const emailPart = user.email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
    if (emailPart.length >= 3) return emailPart.slice(0, 40);
    return 'profesional';
}

function parseOperatorTier(value: string | null | undefined): OperatorTier | null {
    return value === 'individual' || value === 'independent' || value === 'company'
        ? value
        : null;
}

async function pickUniqueSlug(user: Pick<AppUser, 'name' | 'email'>): Promise<string> {
    const base = slugBaseFromUser(user);
    for (let attempt = 0; attempt < 12; attempt++) {
        const suffix = attempt === 0 ? Date.now().toString(36) : randomBytes(3).toString('hex');
        let candidate = `${base}-${suffix}`.slice(0, 60);
        const validation = isValidAgendaSlug(candidate);
        if (!validation.ok) {
            candidate = `prof-${suffix}`.slice(0, 60);
            if (!isValidAgendaSlug(candidate).ok) continue;
        }
        const existing = await db
            .select({ id: agendaProfessionalProfiles.id })
            .from(agendaProfessionalProfiles)
            .where(eq(agendaProfessionalProfiles.slug, candidate))
            .limit(1);
        if (existing.length === 0) return candidate;
    }
    return `agenda-${randomBytes(4).toString('hex')}`;
}

export function createEnsureAgendaProfile(deps: { ensurePrimaryAccountForUser: EnsurePrimaryAccount }) {
    const { ensurePrimaryAccountForUser } = deps;

    return async function ensureAgendaProfile(user: AppUser) {
        for (let attempt = 0; attempt < 3; attempt++) {
            const account = await ensurePrimaryAccountForUser(user);
            const result = await runAccountMemberWrite(db, { userId: user.id, accountId: account.id }, async (tx) => {
                const [workspace] = await tx.select({
                    accountKind: accountVerticalSettings.accountKind,
                    operatorSubtype: accountVerticalSettings.operatorSubtype,
                    operatorSubtypeCustom: accountVerticalSettings.operatorSubtypeCustom,
                })
                    .from(accountVerticalSettings)
                    .where(and(
                        eq(accountVerticalSettings.accountId, account.id),
                        eq(accountVerticalSettings.vertical, 'agenda'),
                    ))
                    .limit(1);
                const workspaceTier = parseOperatorTier(workspace?.accountKind);

                const [accountRow] = await tx.select({
                    isPersonal: accounts.isPersonal,
                    ownerUserId: accounts.ownerUserId,
                })
                    .from(accounts)
                    .where(eq(accounts.id, account.id))
                    .limit(1);
                const [scopedProfile] = await tx.select().from(agendaProfessionalProfiles)
                    .where(and(
                        eq(agendaProfessionalProfiles.userId, user.id),
                        eq(agendaProfessionalProfiles.accountId, account.id),
                    ))
                    .limit(1)
                    .for('update');
                let existing = scopedProfile;

                // Legacy profiles can be adopted only by their owner's personal workspace.
                if (!existing && accountRow?.isPersonal && accountRow.ownerUserId === user.id) {
                    const [legacyProfile] = await tx.select().from(agendaProfessionalProfiles)
                        .where(and(
                            eq(agendaProfessionalProfiles.userId, user.id),
                            isNull(agendaProfessionalProfiles.accountId),
                        ))
                        .limit(1)
                        .for('update');
                    existing = legacyProfile;
                }

                if (existing) {
                    const updates: Partial<typeof agendaProfessionalProfiles.$inferInsert> = {};
                    if (existing.accountId !== account.id) updates.accountId = account.id;
                    if (workspaceTier && existing.accountKind !== workspaceTier) {
                        updates.accountKind = workspaceTier;
                    }
                    if (workspace?.operatorSubtype && existing.operatorSubtype !== workspace.operatorSubtype) {
                        updates.operatorSubtype = workspace.operatorSubtype;
                    }
                    if (workspaceTier && workspace?.operatorSubtype) {
                        const profession = resolveOperatorDisplayLabel(
                            'agenda',
                            workspaceTier,
                            workspace.operatorSubtype,
                            workspace.operatorSubtypeCustom,
                        );
                        if (existing.profession !== profession) updates.profession = profession;
                    }
                    const [updated] = Object.keys(updates).length > 0
                        ? await tx.update(agendaProfessionalProfiles)
                            .set({ ...updates, updatedAt: new Date() })
                            .where(eq(agendaProfessionalProfiles.id, existing.id))
                            .returning()
                        : [existing];
                    return updated ?? existing;
                }

                let plan: 'free' | 'pro' | 'pro_plus' = 'free';
                let planExpiresAt: Date | null = defaultTrialEndsAt();
                try {
                    const accountSubscription = await loadCurrentSubscriptionFromDb(user.id, 'agenda', account.id);
                    if (accountSubscription && ['pro', 'pro_plus', 'enterprise'].includes(accountSubscription.planSlug)) {
                        plan = accountSubscription.planSlug === 'pro_plus' ? 'pro_plus' : 'pro';
                        planExpiresAt = accountSubscription.expiresAt ?? null;
                    }
                } catch (error) {
                    console.warn('[agenda] could not load account plan while creating a professional profile', {
                        accountId: account.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }

                const slug = await pickUniqueSlug(user);
                const displayName = user.name?.trim() || user.email.split('@')[0] || null;
                const residenceCountry = (user.residenceCountryCode ?? 'CL').trim().toUpperCase() || 'CL';
                const [profile] = await tx.insert(agendaProfessionalProfiles)
                    .values({
                        accountId: account.id,
                        userId: user.id,
                        slug,
                        displayName,
                        accountKind: workspaceTier ?? 'individual',
                        operatorSubtype: workspace?.operatorSubtype ?? null,
                        profession: workspaceTier && workspace.operatorSubtype
                            ? resolveOperatorDisplayLabel(
                                'agenda',
                                workspaceTier,
                                workspace.operatorSubtype,
                                workspace.operatorSubtypeCustom,
                            )
                            : null,
                        countryCode: residenceCountry,
                        timezone: normalizeTimezone(user.timezone),
                        plan,
                        planExpiresAt,
                    })
                    .returning();
                return profile;
            });

            if (result.ok) return ensureAgendaProfileTrial(result.value);
        }

        throw new Error('El espacio activo cambió mientras preparábamos SimpleAgenda. Actualiza la página e inténtalo nuevamente.');
    };
}
