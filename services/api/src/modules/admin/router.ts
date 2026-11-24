import { Hono } from 'hono';
import { z } from 'zod';
import type { SubscriptionPlanId, AppUser, VerticalType } from '../../lib/domain-types.js';
import { accountUsers, accounts, publicProfiles, serenataClients, serenataMusicians, serenataOwners } from '../../db/schema.js';
import { formatAuthFromAddress, getAuthMailerTransporter } from '../../lib/auth-email.js';
import { getEmailBrandProfileForVertical, type EmailBrandProfile, type EmailBrandVertical } from '../../lib/email-brand.js';
import { ensureEmailLogoCache } from '../../lib/email-brand-logo.js';
import { buildActionEmailPackage, buildActionEmailText, escapeHtml } from '../../lib/email-template.js';
import {
    getPersonalAccountIdForUserFromDb,
    loadCurrentSubscriptionFromDb,
    persistManualAdminSubscription,
    persistUserSubscription,
} from '../subscriptions/persist-db.js';
import { cancelAgendaProSubscription } from '../agenda/cancel-subscription.js';
import { downgradeAgendaProfileAccessById } from '../agenda/plan-limits.js';
import { defaultSerenataTrialEndsAt } from '../serenatas/plan-config.js';
import { isDevMercadoPagoPreapprovalId } from '../mercadopago/checkout-helpers.js';
import {
    captureManualResponse,
    listAdminConversations,
    recordAdminOutboundMessage,
    updateConversationStatus,
} from './conversations.js';

export type AdminRouterDeps = {
    db: any;
    eq: any;
    and: any;
    isNull: any;
    or?: any;
    desc: any;
    asc?: any;
    sql: any;
    authUser: (c: any) => Promise<AppUser | null>;
    isAdminRole: (role: any) => boolean;
    parseVertical: (raw: any) => any;
    getUserById: (id: string) => Promise<AppUser | null>;
    sanitizeUser: (user: any) => any;
    mapUserRowToAppUser: (row: any) => AppUser;
    permanentlyDeleteUser: (userId: string) => Promise<void>;
    countActiveSuperadminUsers: () => Promise<number>;
    isActiveAdminStatus: (status: any) => boolean;
    ensurePrimaryAccountForUser: (user: any, accountType?: any) => Promise<any>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getEnvStatus: () => Record<string, unknown>;
    isAdminForVertical: (user: AppUser, vertical: VerticalType) => boolean;
    listAdminUsersSnapshot: (vertical?: VerticalType | null) => Promise<any[]>;
    listAdminListingsSnapshot: (vertical?: VerticalType | null) => Promise<any[]>;
    getPaidSubscriptionPlan: (vertical: any, planId: any) => any;
    makeSubscriptionId: (vertical: any, planId: any) => string;
    upsertActiveSubscription: (sub: any) => void;
    cancelActiveSubscriptionForUser?: (userId: string, vertical: VerticalType, accountId?: string | null, billingProfileType?: 'provider' | 'musician') => void;
    activeSubscriptionsByUser: Map<string, any[]>;
    isAdminBootstrapEnabled: () => boolean;
    handleBootstrap: (c: any) => Promise<Response>;
    tables: {
        users: any;
        agendaProfessionalProfiles: any;
        subscriptions?: any;
        timelineEvents?: any;
    };
    inArray?: any;
};

type AdminEmailBrandInput = EmailBrandVertical | 'simpleagenda' | 'simpleautos' | 'simplepropiedades' | 'simpleserenatas' | null | undefined;

function syncAdminSubscriptionCache(
    deps: AdminRouterDeps,
    userId: string,
    accountId: string | null,
    vertical: 'agenda' | 'autos' | 'propiedades' | 'serenatas',
    subscription: Awaited<ReturnType<typeof loadCurrentSubscriptionFromDb>>,
    billingProfileType?: 'provider' | 'musician',
): void {
    if (
        !subscription
        || subscription.status !== 'active'
        || (subscription.expiresAt && subscription.expiresAt.getTime() <= Date.now())
    ) {
        deps.cancelActiveSubscriptionForUser?.(userId, vertical as VerticalType, accountId, billingProfileType);
        return;
    }

    const plan = deps.getPaidSubscriptionPlan(vertical, subscription.planSlug);
    if (!plan) return;
    deps.upsertActiveSubscription({
        id: subscription.id,
        accountId,
        userId,
        vertical: vertical as VerticalType,
        ...(vertical === 'serenatas' ? { billingProfileType: billingProfileType ?? subscription.billingProfileType ?? 'provider' } : {}),
        planId: plan.id,
        billingCycle: subscription.billingCycle,
        planName: subscription.planName || plan.name,
        priceMonthly: subscription.priceMonthly,
        currency: 'CLP',
        features: subscription.features,
        status: 'active',
        providerPreapprovalId: subscription.providerSubscriptionId ?? `db-${subscription.id}`,
        providerStatus: subscription.providerStatus,
        expiresAt: subscription.expiresAt?.getTime() ?? null,
        startedAt: subscription.startedAt.getTime(),
        updatedAt: subscription.updatedAt.getTime(),
    });
}

const adminOutboundMessageSchema = z.object({
    channel: z.enum(['whatsapp_personal', 'whatsapp_business', 'email']),
    phone: z.string().trim().max(40).optional().default(''),
    email: z.string().trim().max(254).optional().default(''),
    name: z.string().trim().max(160).optional().default(''),
    company: z.string().trim().max(180).optional().default(''),
    message: z.string().trim().min(2).max(6000),
    sourceVertical: z.enum(['agenda', 'propiedades', 'autos', 'serenatas', 'platform', 'general']),
    purpose: z.enum(['alliance', 'app_invitation', 'client_prospecting', 'follow_up', 'support', 'other']),
    campaignName: z.string().trim().max(160).optional().default(''),
}).strict().superRefine((input, ctx) => {
    if (input.channel === 'email' && !input.email) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Indica el correo del destinatario.' });
    } else if (input.email && !z.string().email().safeParse(input.email).success) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Indica un correo válido.' });
    }
    if (input.channel !== 'email' && !input.phone) {
        ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Indica el WhatsApp del destinatario.' });
    }
});

function normalizeAdminEmailBrandVertical(input: AdminEmailBrandInput): EmailBrandVertical | null {
    if (input === 'agenda' || input === 'simpleagenda') return 'agenda';
    if (input === 'autos' || input === 'simpleautos') return 'autos';
    if (input === 'propiedades' || input === 'simplepropiedades') return 'propiedades';
    if (input === 'serenatas' || input === 'simpleserenatas') return 'serenatas';
    if (input === 'platform') return 'platform';
    return null;
}

function resolveAdminEmailBrand(targetUser: AppUser, requestedBrand?: AdminEmailBrandInput): EmailBrandProfile {
    const requested = normalizeAdminEmailBrandVertical(requestedBrand);
    if (requested) return getEmailBrandProfileForVertical(requested);
    return getEmailBrandProfileForVertical(normalizeAdminEmailBrandVertical(targetUser.primaryVertical as AdminEmailBrandInput) ?? 'platform');
}

function personalizeAdminEmailMessage(message: string, targetUser: AppUser): string {
    const name = targetUser.name?.trim() || 'tu cuenta';
    return message.replaceAll('{{name}}', name);
}

function buildAdminUserEmail(input: {
    brand: EmailBrandProfile;
    subject: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
}) {
    const actionUrl = input.actionUrl || input.brand.siteUrl;
    const actionLabel = input.actionLabel || `Abrir ${input.brand.appName}`;
    const bodyHtml = input.message
        .split(/\n{2,}/)
        .map((paragraph) => `<p style="margin:0 0 16px;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
        .join('');
    const supportEmail = 'hola@simpleplataforma.app';
    const supportWhatsapp = '+56 9 7862 3828';
    const footnote = `Te escribimos desde ${input.brand.appName}. Si necesitas ayuda, escríbenos a ${supportEmail} o al WhatsApp ${supportWhatsapp}.`;
    const mail = buildActionEmailPackage({
        brand: input.brand,
        preheader: input.subject,
        eyebrow: input.brand.appName,
        headline: input.subject,
        bodyHtml,
        buttonLabel: actionLabel,
        actionUrl,
        footnote,
    });
    const text = buildActionEmailText({
        headline: input.subject,
        body: input.message,
        buttonLabel: actionLabel,
        actionUrl,
        footnote,
        supportEmail,
        appName: input.brand.appName,
    });
    return { actionUrl, actionLabel, mail, text, footnote };
}


export function createAdminRouter(deps: AdminRouterDeps) {
    const app = new Hono();
    const createAdminAudit = async (input: {
        actorUserId: string;
        action: string;
        entityType: string;
        entityId: string;
        payload?: unknown;
    }) => {
        try {
            await deps.db.execute(deps.sql`
                INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, payload)
                VALUES (${input.actorUserId}, ${input.action}, ${input.entityType}, ${input.entityId}, ${JSON.stringify(input.payload ?? {})}::jsonb)
            `);
        } catch (error) {
            console.error('[admin audit] error creating log', error);
        }
    };

    const resolveSubscriptionAccount = async (userId: string, requestedAccountId?: string | null) => {
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return { ok: false as const, error: 'Usuario no encontrado', status: 404 as const };
        if (requestedAccountId) {
            const memberships = await deps.db.select({ id: accountUsers.id })
                .from(accountUsers)
                .where(deps.and(
                    deps.eq(accountUsers.accountId, requestedAccountId),
                    deps.eq(accountUsers.userId, userId),
                ))
                .limit(1);
            if (!memberships.length) return { ok: false as const, error: 'El usuario no pertenece a ese espacio de trabajo', status: 403 as const };
            const accountRows = await deps.db.select().from(accounts).where(deps.eq(accounts.id, requestedAccountId)).limit(1);
            if (!accountRows[0]) return { ok: false as const, error: 'Espacio de trabajo no encontrado', status: 404 as const };
            return { ok: true as const, account: accountRows[0] };
        }
        return { ok: true as const, account: await deps.ensurePrimaryAccountForUser(targetUser) };
    };

    // ── Bootstrap ────────────────────────────────────────────────────────────

    app.post('/bootstrap', (c) => deps.handleBootstrap(c));

    // ── Overview ─────────────────────────────────────────────────────────────

    app.get('/overview', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const [adminUsers, adminListings] = await Promise.all([
            deps.listAdminUsersSnapshot(scopedVertical),
            deps.listAdminListingsSnapshot(scopedVertical),
        ]);

        const autosListings = adminListings.filter((item: any) => item.vertical === 'autos');
        const propiedadesListings = adminListings.filter((item: any) => item.vertical === 'propiedades');

        return c.json({
            ok: true,
            stats: {
                usersTotal: adminUsers.length,
                autosListingsTotal: autosListings.length,
                propiedadesListingsTotal: propiedadesListings.length,
            },
            recentUsers: adminUsers.slice(0, 6),
            recentListings: adminListings.slice(0, 6),
            systemStatus: deps.getEnvStatus(),
        });
    });

    // ── System status ─────────────────────────────────────────────────────────

    app.get('/system-status', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        return c.json({ ok: true, status: deps.getEnvStatus() });
    });

    // ── Users ─────────────────────────────────────────────────────────────────

    app.get('/users', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const items = await deps.listAdminUsersSnapshot(scopedVertical);
        return c.json({ ok: true, items });
    });

    app.patch('/users/:id/role', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede modificar roles' }, 403);

        const payload = await c.req.json().catch(() => null);
        const role = payload?.role;
        if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
            return c.json({ ok: false, error: 'Rol inválido' }, 400);
        }

        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const updated = await deps.db.update(deps.tables.users).set({ role }).where(deps.eq(deps.tables.users.id, userId)).returning();
        if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

        const appUser = deps.mapUserRowToAppUser(updated[0]);
        return c.json({ ok: true, item: deps.sanitizeUser(appUser) });
    });

    app.patch('/users/:id/status', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede modificar el estado de usuarios' }, 403);

        const payload = await c.req.json().catch(() => null);
        const status = payload?.status;
        if (!status || !['active', 'verified', 'suspended'].includes(status)) {
            return c.json({ ok: false, error: 'Status inválido' }, 400);
        }

        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const updated = await deps.db.update(deps.tables.users).set({ status }).where(deps.eq(deps.tables.users.id, userId)).returning();
        if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

        const appUser = deps.mapUserRowToAppUser(updated[0]);
        return c.json({ ok: true, item: deps.sanitizeUser(appUser) });
    });

    app.delete('/users/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede eliminar usuarios' }, 403);

        const userId = c.req.param('id') ?? '';
        if (adminUser.id === userId) {
            return c.json({ ok: false, error: 'No puedes eliminar tu propia cuenta' }, 400);
        }

        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        if (targetUser.role === 'superadmin' && deps.isActiveAdminStatus(targetUser.status)) {
            const remainingSuperadmins = await deps.countActiveSuperadminUsers();
            if (remainingSuperadmins <= 1) {
                return c.json({ ok: false, error: 'No puedes eliminar al último superadmin activo' }, 400);
            }
        }

        try {
            await deps.permanentlyDeleteUser(userId);
        } catch (error) {
            console.error('[admin] permanentlyDeleteUser failed', { userId, error });
            const detail = error instanceof Error ? error.message : String(error);
            if (/transfiere la propiedad del espacio empresarial/i.test(detail)) {
                return c.json(
                    {
                        ok: false,
                        error: 'Este usuario es titular de un espacio de trabajo compartido. Transfiere primero su propiedad desde el panel de equipo.',
                    },
                    409,
                );
            }
            const isFkViolation = /foreign key|violates foreign key|23503/i.test(detail);
            return c.json(
                {
                    ok: false,
                    error: isFkViolation
                        ? 'No se pudo eliminar: el usuario aún tiene datos vinculados. Revisa suscripciones, pagos o serenatas.'
                        : 'No se pudo eliminar el usuario. Intenta de nuevo o contacta soporte.',
                    detail,
                },
                500,
            );
        }
        return c.json({ ok: true, message: 'Usuario eliminado permanentemente' });
    });

    app.put('/users/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede editar usuarios' }, 403);

        const payload = await c.req.json().catch(() => null);
        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const updates: Record<string, any> = {};
        if (payload?.name && typeof payload.name === 'string' && payload.name.trim().length > 0) {
            updates.name = payload.name.trim();
        }
        if (payload?.phone && typeof payload.phone === 'string') {
            updates.phone = payload.phone.trim() || null;
        }
        if ('primaryVertical' in (payload ?? {})) {
            const primaryVertical = payload?.primaryVertical;
            if (primaryVertical === null || primaryVertical === '') {
                updates.primaryVertical = null;
            } else if (['autos', 'propiedades', 'agenda'].includes(primaryVertical)) {
                updates.primaryVertical = primaryVertical;
            } else {
                return c.json({ ok: false, error: 'Vertical inválida' }, 400);
            }
        }
        if (Object.keys(updates).length === 0) {
            return c.json({ ok: false, error: 'No hay datos para actualizar' }, 400);
        }

        const updated = await deps.db.update(deps.tables.users).set(updates).where(deps.eq(deps.tables.users.id, userId)).returning();
        if (updated.length === 0) return c.json({ ok: false, error: 'No se pudo actualizar el usuario' }, 500);

        const appUser = deps.mapUserRowToAppUser(updated[0]);
        return c.json({ ok: true, item: deps.sanitizeUser(appUser) });
    });

    app.patch('/users/:id/subscriptions', async (c) => {
        try {
            const adminUser = await deps.authUser(c);
            if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
            if (adminUser.role !== 'superadmin') {
                return c.json({ ok: false, error: 'Solo superadmin puede editar suscripciones' }, 403);
            }

            const payload = await c.req.json().catch(() => null) as { accountId?: string | null; subscriptions?: Record<string, unknown> } | null;
            const userId = c.req.param('id') ?? '';
            if (payload?.accountId !== undefined && payload.accountId !== null && (typeof payload.accountId !== 'string' || !payload.accountId.trim())) {
                return c.json({ ok: false, error: 'El espacio de trabajo no es válido' }, 400);
            }

            const targetUser = await deps.getUserById(userId);
            if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
            const requestedAccountId = payload?.accountId?.trim() || null;
            let targetAccount: any;
            if (requestedAccountId) {
                const memberships = await deps.db.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(deps.and(
                        deps.eq(accountUsers.accountId, requestedAccountId),
                        deps.eq(accountUsers.userId, userId),
                    ))
                    .limit(1);
                if (!memberships.length) return c.json({ ok: false, error: 'El usuario no pertenece a ese espacio de trabajo' }, 403);
                const accountRows = await deps.db.select().from(accounts).where(deps.eq(accounts.id, requestedAccountId)).limit(1);
                if (!accountRows[0]) return c.json({ ok: false, error: 'Espacio de trabajo no encontrado' }, 404);
                targetAccount = accountRows[0];
            } else {
                targetAccount = await deps.ensurePrimaryAccountForUser(targetUser);
            }

            const subData = payload?.subscriptions ?? {};
            const serenatasProviderUpdate = subData.serenatasProvider ?? subData.serenatas;
            const serenatasMusicianUpdate = subData.serenatasMusician;
            const hasSerenatasBillingUpdate = Boolean(serenatasProviderUpdate || serenatasMusicianUpdate);
            const serenatasAccountId = hasSerenatasBillingUpdate
                ? await getPersonalAccountIdForUserFromDb(userId)
                : null;
            if (hasSerenatasBillingUpdate && !serenatasAccountId) {
                return c.json({
                    ok: false,
                    error: 'No se puede actualizar SimpleSerenatas: el usuario no tiene una cuenta personal identificable.',
                }, 409);
            }
            const results: Record<string, unknown> = {};

            if (subData.agenda) {
                const agendaPayload = subData.agenda as { plan?: string; expiresAt?: string | null };
                let profile = await deps.db.select()
                    .from(deps.tables.agendaProfessionalProfiles)
                    .where(deps.and(
                        deps.eq(deps.tables.agendaProfessionalProfiles.userId, userId),
                        deps.eq(deps.tables.agendaProfessionalProfiles.accountId, targetAccount.id),
                    ))
                    .limit(1);
                if (profile.length === 0 && targetAccount.isPersonal) {
                    profile = await deps.db.select()
                        .from(deps.tables.agendaProfessionalProfiles)
                        .where(deps.and(
                            deps.eq(deps.tables.agendaProfessionalProfiles.userId, userId),
                            deps.isNull(deps.tables.agendaProfessionalProfiles.accountId),
                        ))
                        .limit(1);
                }

                const plan: 'free' | 'pro' | 'pro_plus' = agendaPayload.plan === 'pro_plus'
                    ? 'pro_plus'
                    : agendaPayload.plan === 'pro'
                        ? 'pro'
                        : 'free';
                const isPaidAgendaPlan = plan === 'pro' || plan === 'pro_plus';
                const expiresAt = agendaPayload.expiresAt ? new Date(agendaPayload.expiresAt) : null;
                if (expiresAt && Number.isNaN(expiresAt.getTime())) {
                    return c.json({ ok: false, error: 'La fecha de expiración de Agenda no es válida.' }, 400);
                }

                if (profile.length > 0) {
                    if (plan === 'free') {
                        const cancelled = await cancelAgendaProSubscription(userId, targetAccount.id, targetAccount.isPersonal);
                        if (cancelled.ok) {
                            deps.cancelActiveSubscriptionForUser?.(userId, 'agenda', targetAccount.id);
                            results.agenda = { plan, status: 'free', message: cancelled.message };
                        } else if (cancelled.status === 400) {
                            await downgradeAgendaProfileAccessById(profile[0].id);
                            deps.cancelActiveSubscriptionForUser?.(userId, 'agenda', targetAccount.id);
                            results.agenda = { plan: 'free', expiresAt: null };
                        } else {
                            return c.json({ ok: false, error: cancelled.error }, cancelled.status as 400 | 404 | 502);
                        }
                    } else if (profile[0].plan === plan) {
                        const currentSubscription = await loadCurrentSubscriptionFromDb(
                            userId,
                            'agenda',
                            targetAccount.id,
                            { includeInactive: true },
                        );
                        if (currentSubscription?.status === 'active' && currentSubscription.planSlug !== plan) {
                            return c.json({
                                ok: false,
                                error: 'El plan de Agenda cambió mientras editabas. Actualiza el panel e inténtalo nuevamente.',
                            }, 409);
                        }

                        if (
                            currentSubscription?.status === 'active'
                            && currentSubscription.planSlug === plan
                            && currentSubscription.providerSubscriptionId
                        ) {
                            const persisted = await persistUserSubscription({
                                userId,
                                accountId: targetAccount.id,
                                vertical: 'agenda',
                                planSlug: plan,
                                billingCycle: currentSubscription.billingCycle,
                                providerSubscriptionId: currentSubscription.providerSubscriptionId,
                                providerStatus: currentSubscription.providerStatus ?? 'active',
                                status: 'active',
                                subscriptionStartedAt: currentSubscription.startedAt,
                                expiresAt,
                                expectedProviderSubscriptionId: currentSubscription.providerSubscriptionId,
                                expectedPlanSlug: plan,
                            });
                            if (!persisted.applied) {
                                return c.json({
                                    ok: false,
                                    error: 'La suscripción de Agenda cambió mientras guardabas. Actualiza el panel e inténtalo nuevamente.',
                                }, 409);
                            }
                        } else {
                            // A same-plan edit with no active provider subscription is an explicit
                            // admin assignment. Active Mercado Pago rows above keep their identity.
                            const persisted = await persistUserSubscription({
                                userId,
                                accountId: targetAccount.id,
                                vertical: 'agenda',
                                planSlug: plan,
                                providerSubscriptionId: `admin-manual-${adminUser.id}-${Date.now()}`,
                                providerStatus: 'manual',
                                status: 'active',
                                expiresAt,
                                expectedProviderSubscriptionId: currentSubscription?.providerSubscriptionId ?? null,
                                ...(currentSubscription && currentSubscription.planSlug !== 'free'
                                    ? { expectedPlanSlug: currentSubscription.planSlug as 'pro' | 'pro_plus' | 'enterprise' }
                                    : {}),
                            });
                            if (!persisted.applied) {
                                return c.json({
                                    ok: false,
                                    error: 'La suscripción de Agenda cambió mientras guardabas. Actualiza el panel e inténtalo nuevamente.',
                                }, 409);
                            }
                        }
                        const refreshedSubscription = await loadCurrentSubscriptionFromDb(
                            userId,
                            'agenda',
                            targetAccount.id,
                            { includeInactive: true },
                        );
                        syncAdminSubscriptionCache(deps, userId, targetAccount.id, 'agenda', refreshedSubscription);
                        results.agenda = { plan, status: 'active', expiresAt: expiresAt?.toISOString() ?? null };
                    } else {
                        const result = await persistManualAdminSubscription({
                            userId,
                            accountId: targetAccount.id,
                            vertical: 'agenda',
                            planSlug: plan,
                            status: 'active',
                            expiresAt,
                        });
                        const refreshedSubscription = await loadCurrentSubscriptionFromDb(
                            userId,
                            'agenda',
                            targetAccount.id,
                            { includeInactive: true },
                        );
                        syncAdminSubscriptionCache(deps, userId, targetAccount.id, 'agenda', refreshedSubscription);
                        results.agenda = { ...result, expiresAt: expiresAt?.toISOString() ?? null };
                    }
                } else if (isPaidAgendaPlan) {
                    const slug = `${targetUser.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`;
                    await deps.db.insert(deps.tables.agendaProfessionalProfiles).values({
                        accountId: targetAccount.id,
                        userId,
                        slug,
                        displayName: targetUser.name,
                        plan: 'free',
                        planExpiresAt: new Date(Date.now() - 60_000),
                    }).returning();
                    const result = await persistManualAdminSubscription({
                        userId,
                        accountId: targetAccount.id,
                        vertical: 'agenda',
                        planSlug: plan,
                        status: 'active',
                        expiresAt,
                    });
                    const refreshedSubscription = await loadCurrentSubscriptionFromDb(
                        userId,
                        'agenda',
                        targetAccount.id,
                        { includeInactive: true },
                    );
                    syncAdminSubscriptionCache(deps, userId, targetAccount.id, 'agenda', refreshedSubscription);
                    results.agenda = { ...result, expiresAt: expiresAt?.toISOString() ?? null, created: true };
                } else {
                    results.agenda = { plan, skipped: 'Sin perfil Agenda para asignar free' };
                }
            }

            const billingVerticals = ['autos', 'propiedades', 'serenatas'] as const;
            for (const vertical of billingVerticals) {
                const raw = (vertical === 'serenatas'
                    ? serenatasProviderUpdate
                    : subData[vertical]) as {
                    planId?: string;
                    status?: 'active' | 'cancelled' | 'expired';
                    expiresAt?: string | null;
                    trialEndsAt?: string | null;
                } | undefined;
                if (!raw) continue;

                const planSlug = (raw.planId ?? 'free') as SubscriptionPlanId;
                const allowedPlans = vertical === 'serenatas'
                    ? ['free', 'pro']
                    : ['free', 'pro', 'enterprise'];
                if (!allowedPlans.includes(planSlug)) {
                    return c.json({ ok: false, error: `Plan inválido para ${vertical}` }, 400);
                }

                if (raw.status !== undefined && !['active', 'cancelled', 'expired'].includes(raw.status)) {
                    return c.json({ ok: false, error: `Estado inválido para ${vertical}` }, 400);
                }
                if (raw.expiresAt !== undefined && raw.expiresAt !== null && typeof raw.expiresAt !== 'string') {
                    return c.json({ ok: false, error: `La fecha de expiración de ${vertical} no es válida.` }, 400);
                }

                const status = raw.status ?? (planSlug === 'free' ? 'cancelled' : 'active');
                const accountId = vertical === 'serenatas' ? serenatasAccountId : targetAccount.id;
                if (vertical === 'serenatas' && raw.trialEndsAt !== undefined
                    && raw.trialEndsAt !== null && typeof raw.trialEndsAt !== 'string') {
                    return c.json({ ok: false, error: 'La fecha de prueba del perfil proveedor no es válida.' }, 400);
                }
                const requestedSerenataTrialEndsAt = vertical === 'serenatas' && raw.trialEndsAt
                    ? new Date(raw.trialEndsAt)
                    : null;
                if (requestedSerenataTrialEndsAt && Number.isNaN(requestedSerenataTrialEndsAt.getTime())) {
                    return c.json({ ok: false, error: 'La fecha de prueba del perfil proveedor no es válida.' }, 400);
                }
                const currentSubscription = await loadCurrentSubscriptionFromDb(userId, vertical, accountId, {
                    includeInactive: true,
                    ...(vertical === 'serenatas' ? { billingProfileType: 'provider' as const } : {}),
                });
                const expiresAt = raw.expiresAt === undefined
                    ? currentSubscription?.expiresAt ?? null
                    : raw.expiresAt
                        ? new Date(raw.expiresAt)
                        : null;
                if (expiresAt && Number.isNaN(expiresAt.getTime())) {
                    return c.json({ ok: false, error: `La fecha de expiración de ${vertical} no es válida.` }, 400);
                }

                let persisted: Awaited<ReturnType<typeof persistManualAdminSubscription>>;
                const providerSubscriptionId = currentSubscription?.providerSubscriptionId ?? null;
                const liveProviderSubscriptionId = currentSubscription?.providerSubscriptionId;
                const hasLiveProviderSubscription = Boolean(
                    currentSubscription?.status === 'active'
                    && liveProviderSubscriptionId
                    && !liveProviderSubscriptionId.startsWith('admin-manual-')
                    && !liveProviderSubscriptionId.startsWith('cancelled-')
                    && !isDevMercadoPagoPreapprovalId(liveProviderSubscriptionId),
                );

                if (hasLiveProviderSubscription && (status !== 'active' || planSlug !== currentSubscription?.planSlug)) {
                    return c.json({
                        ok: false,
                        error: `La suscripción activa de ${vertical} está vinculada a Mercado Pago. Usa el flujo de cancelación antes de cambiar el plan o el estado.`,
                    }, 409);
                }

                if (hasLiveProviderSubscription && currentSubscription && liveProviderSubscriptionId) {
                    if (currentSubscription.planSlug === 'free') {
                        return c.json({
                            ok: false,
                            error: `La suscripción activa de ${vertical} no tiene un plan pagado asociado. Revisa el registro antes de editarlo.`,
                        }, 409);
                    }
                    const result = await persistUserSubscription({
                        userId,
                        accountId,
                        vertical,
                        ...(vertical === 'serenatas' ? { billingProfileType: 'provider' as const } : {}),
                        planSlug: planSlug as Exclude<SubscriptionPlanId, 'free'>,
                        billingCycle: currentSubscription.billingCycle,
                        providerSubscriptionId: liveProviderSubscriptionId,
                        providerStatus: currentSubscription.providerStatus ?? 'active',
                        status: 'active',
                        subscriptionStartedAt: currentSubscription.startedAt,
                        expiresAt,
                        expectedProviderSubscriptionId: liveProviderSubscriptionId,
                        expectedPlanSlug: currentSubscription.planSlug as Exclude<SubscriptionPlanId, 'free'>,
                    });
                    if (!result.applied) {
                        return c.json({
                            ok: false,
                            error: `La suscripción de ${vertical} cambió mientras guardabas. Actualiza el panel e inténtalo nuevamente.`,
                        }, 409);
                    }
                    persisted = {
                        planSlug: result.planSlug,
                        status: 'active',
                        expiresAt: expiresAt?.toISOString() ?? null,
                        applied: true,
                    };
                } else {
                    persisted = await persistManualAdminSubscription({
                        userId,
                        accountId,
                        vertical,
                        ...(vertical === 'serenatas' ? { billingProfileType: 'provider' as const } : {}),
                        planSlug,
                        status,
                        expiresAt,
                        expectedProviderSubscriptionId: providerSubscriptionId,
                        ...(currentSubscription && currentSubscription.planSlug !== 'free'
                            ? { expectedPlanSlug: currentSubscription.planSlug as Exclude<SubscriptionPlanId, 'free'> }
                            : {}),
                    });
                    if (!persisted.applied) {
                        return c.json({
                            ok: false,
                            error: `La suscripción de ${vertical} cambió mientras guardabas. Actualiza el panel e inténtalo nuevamente.`,
                        }, 409);
                    }
                }
                const refreshedSubscription = await loadCurrentSubscriptionFromDb(userId, vertical, accountId, {
                    includeInactive: true,
                    ...(vertical === 'serenatas' ? { billingProfileType: 'provider' as const } : {}),
                });
                syncAdminSubscriptionCache(
                    deps,
                    userId,
                    accountId,
                    vertical,
                    refreshedSubscription,
                    vertical === 'serenatas' ? 'provider' : undefined,
                );
                results[vertical] = persisted;

                if (vertical === 'serenatas' && raw.trialEndsAt !== undefined) {
                    const owners = await deps.db.select({ id: serenataOwners.id, createdAt: serenataOwners.createdAt })
                        .from(serenataOwners)
                        .where(deps.eq(serenataOwners.userId, userId))
                        .limit(1);
                    if (owners[0]) {
                        const trialEndsAt = requestedSerenataTrialEndsAt ?? defaultSerenataTrialEndsAt(owners[0].createdAt);
                        await deps.db.update(serenataOwners)
                            .set({ trialEndsAt, updatedAt: new Date() })
                            .where(deps.eq(serenataOwners.id, owners[0].id));
                        results.serenatasTrialEndsAt = trialEndsAt?.toISOString() ?? null;
                    } else {
                        results.serenatasTrialEndsAt = { skipped: 'Usuario sin perfil dueño Serenatas' };
                    }
                }

                if ((vertical === 'autos' || vertical === 'propiedades') && raw.trialEndsAt !== undefined) {
                    results[`${vertical}MarketplaceTrialEndsAt`] = { skipped: 'Autos y Propiedades no usan periodo de prueba' };
                }
            }

            const musicianBilling = serenatasMusicianUpdate as {
                planId?: string;
                status?: 'active' | 'cancelled' | 'expired';
                expiresAt?: string | null;
                trialEndsAt?: string | null;
            } | undefined;
            if (musicianBilling) {
                const planSlug = (musicianBilling.planId ?? 'free') as SubscriptionPlanId;
                if (!['free', 'pro'].includes(planSlug)) {
                    return c.json({ ok: false, error: 'Plan inválido para el perfil músico de Serenatas' }, 400);
                }
                if (musicianBilling.status !== undefined && !['active', 'cancelled', 'expired'].includes(musicianBilling.status)) {
                    return c.json({ ok: false, error: 'Estado inválido para el perfil músico de Serenatas' }, 400);
                }
                if (musicianBilling.expiresAt !== undefined && musicianBilling.expiresAt !== null
                    && typeof musicianBilling.expiresAt !== 'string') {
                    return c.json({ ok: false, error: 'La fecha de facturación del perfil músico no es válida.' }, 400);
                }
                if (musicianBilling.trialEndsAt !== undefined && musicianBilling.trialEndsAt !== null
                    && typeof musicianBilling.trialEndsAt !== 'string') {
                    return c.json({ ok: false, error: 'La fecha de prueba del perfil músico no es válida.' }, 400);
                }
                const currentSubscription = await loadCurrentSubscriptionFromDb(
                    userId,
                    'serenatas',
                    serenatasAccountId,
                    { includeInactive: true, billingProfileType: 'musician' },
                );
                const expiresAt = musicianBilling.expiresAt === undefined
                    ? currentSubscription?.expiresAt ?? null
                    : musicianBilling.expiresAt
                        ? new Date(musicianBilling.expiresAt)
                        : null;
                const trialEndsAt = musicianBilling.trialEndsAt ? new Date(musicianBilling.trialEndsAt) : null;
                if ((expiresAt && Number.isNaN(expiresAt.getTime())) || (trialEndsAt && Number.isNaN(trialEndsAt.getTime()))) {
                    return c.json({ ok: false, error: 'La fecha de facturación del perfil músico no es válida.' }, 400);
                }
                const status = musicianBilling.status ?? (planSlug === 'free' ? 'cancelled' : 'active');
                const providerSubscriptionId = currentSubscription?.providerSubscriptionId ?? null;
                const liveProviderSubscriptionId = currentSubscription?.providerSubscriptionId;
                const hasLiveProviderSubscription = Boolean(
                    currentSubscription?.status === 'active'
                    && liveProviderSubscriptionId
                    && !liveProviderSubscriptionId.startsWith('admin-manual-')
                    && !liveProviderSubscriptionId.startsWith('cancelled-')
                    && !isDevMercadoPagoPreapprovalId(liveProviderSubscriptionId),
                );
                if (hasLiveProviderSubscription && (status !== 'active' || planSlug !== currentSubscription?.planSlug)) {
                    return c.json({
                        ok: false,
                        error: 'La suscripción activa del perfil músico está vinculada a Mercado Pago. Usa el flujo de cancelación antes de cambiar el plan o el estado.',
                    }, 409);
                }

                let persisted: Awaited<ReturnType<typeof persistManualAdminSubscription>>;
                if (hasLiveProviderSubscription && currentSubscription && liveProviderSubscriptionId) {
                    if (currentSubscription.planSlug === 'free') {
                        return c.json({
                            ok: false,
                            error: 'La suscripción activa del perfil músico no tiene un plan pagado asociado. Revisa el registro antes de editarlo.',
                        }, 409);
                    }
                    const result = await persistUserSubscription({
                        userId,
                        accountId: serenatasAccountId,
                        vertical: 'serenatas',
                        billingProfileType: 'musician',
                        planSlug: planSlug as Exclude<SubscriptionPlanId, 'free'>,
                        billingCycle: currentSubscription.billingCycle,
                        providerSubscriptionId: liveProviderSubscriptionId,
                        providerStatus: currentSubscription.providerStatus ?? 'active',
                        status: 'active',
                        subscriptionStartedAt: currentSubscription.startedAt,
                        expiresAt,
                        expectedProviderSubscriptionId: liveProviderSubscriptionId,
                        expectedPlanSlug: currentSubscription.planSlug as Exclude<SubscriptionPlanId, 'free'>,
                    });
                    if (!result.applied) {
                        return c.json({
                            ok: false,
                            error: 'La suscripción del perfil músico cambió mientras guardabas. Actualiza el panel e inténtalo nuevamente.',
                        }, 409);
                    }
                    persisted = {
                        planSlug: result.planSlug,
                        status: 'active',
                        expiresAt: expiresAt?.toISOString() ?? null,
                        applied: true,
                    };
                } else {
                    persisted = await persistManualAdminSubscription({
                        userId,
                        accountId: serenatasAccountId,
                        vertical: 'serenatas',
                        billingProfileType: 'musician',
                        planSlug,
                        status,
                        expiresAt,
                        expectedProviderSubscriptionId: providerSubscriptionId,
                        ...(currentSubscription && currentSubscription.planSlug !== 'free'
                            ? { expectedPlanSlug: currentSubscription.planSlug as Exclude<SubscriptionPlanId, 'free'> }
                            : {}),
                    });
                    if (!persisted.applied) {
                        return c.json({
                            ok: false,
                            error: 'La suscripción del perfil músico cambió mientras guardabas. Actualiza el panel e inténtalo nuevamente.',
                        }, 409);
                    }
                }
                results.serenatasMusician = persisted;
                const refreshedSubscription = await loadCurrentSubscriptionFromDb(
                    userId,
                    'serenatas',
                    serenatasAccountId,
                    { includeInactive: true, billingProfileType: 'musician' },
                );
                syncAdminSubscriptionCache(deps, userId, serenatasAccountId, 'serenatas', refreshedSubscription, 'musician');

                if (musicianBilling.trialEndsAt !== undefined) {
                    const musicianProfiles = await deps.db.select({ id: serenataMusicians.id, createdAt: serenataMusicians.createdAt })
                        .from(serenataMusicians)
                        .where(deps.eq(serenataMusicians.userId, userId))
                        .limit(1);
                    if (musicianProfiles[0]) {
                        const effectiveTrialEndsAt = trialEndsAt ?? defaultSerenataTrialEndsAt(musicianProfiles[0].createdAt);
                        await deps.db.update(serenataMusicians)
                            .set({ trialEndsAt: effectiveTrialEndsAt, updatedAt: new Date() })
                            .where(deps.eq(serenataMusicians.id, musicianProfiles[0].id));
                        results.serenatasMusicianTrialEndsAt = effectiveTrialEndsAt.toISOString();
                    } else {
                        results.serenatasMusicianTrialEndsAt = { skipped: 'Usuario sin perfil músico Serenatas' };
                    }
                }
            }

            await createAdminAudit({
                actorUserId: adminUser.id,
                action: 'user.subscriptions.update',
                entityType: 'user',
                entityId: userId,
                payload: {
                    accountId: targetAccount.id,
                    serenatasBillingAccountId: serenatasAccountId ?? undefined,
                    serenatasBillingProfiles: hasSerenatasBillingUpdate
                        ? {
                            provider: Boolean(serenatasProviderUpdate),
                            musician: Boolean(serenatasMusicianUpdate),
                        }
                        : undefined,
                    subscriptions: subData,
                    results,
                },
            });

            return c.json({ ok: true, results });
        } catch (error) {
            console.error('[admin subscriptions] error:', error);
            const message = error instanceof Error ? error.message : 'Error al actualizar suscripciones';
            return c.json({ ok: false, error: message }, 500);
        }
    });

    app.patch('/users/:id/serenatas-profile', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') {
            return c.json({ ok: false, error: 'Solo superadmin puede modificar perfiles de Serenatas' }, 403);
        }

        const payload = await c.req.json().catch(() => null) as {
            profileType?: string;
            note?: string;
        } | null;
        const profileType = payload?.profileType;
        if (profileType !== 'client' && profileType !== 'musician' && profileType !== 'owner') {
            return c.json({ ok: false, error: 'Tipo de perfil inválido' }, 400);
        }

        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const now = new Date();
        const result: Record<string, unknown> = { profileType };

        if (profileType === 'client') {
            const existing = await deps.db.select({ id: serenataClients.id })
                .from(serenataClients)
                .where(deps.eq(serenataClients.userId, userId))
                .limit(1);
            if (existing[0]) {
                await deps.db.update(serenataClients)
                    .set({ phone: targetUser.phone ?? null, updatedAt: now })
                    .where(deps.eq(serenataClients.id, existing[0].id));
                result.client = 'updated';
            } else {
                await deps.db.insert(serenataClients).values({
                    userId,
                    phone: targetUser.phone ?? null,
                    comuna: null,
                    region: null,
                });
                result.client = 'created';
            }
        }

        if (profileType === 'musician') {
            const existing = await deps.db.select({ id: serenataMusicians.id })
                .from(serenataMusicians)
                .where(deps.eq(serenataMusicians.userId, userId))
                .limit(1);
            if (existing[0]) {
                await deps.db.update(serenataMusicians)
                    .set({ updatedAt: now })
                    .where(deps.eq(serenataMusicians.id, existing[0].id));
                result.musician = 'updated';
            } else {
                await deps.db.insert(serenataMusicians).values({
                    userId,
                    instrument: null,
                    instruments: [],
                    bio: null,
                    comuna: null,
                    region: null,
                    workZones: [],
                });
                result.musician = 'created';
            }
        }

        if (profileType === 'owner') {
            const [existingOwner, musician] = await Promise.all([
                deps.db.select({ id: serenataOwners.id })
                    .from(serenataOwners)
                    .where(deps.eq(serenataOwners.userId, userId))
                    .limit(1),
                deps.db.select({
                    bio: serenataMusicians.bio,
                    comuna: serenataMusicians.comuna,
                    region: serenataMusicians.region,
                    workZones: serenataMusicians.workZones,
                })
                    .from(serenataMusicians)
                    .where(deps.eq(serenataMusicians.userId, userId))
                    .limit(1),
            ]);
            if (existingOwner[0]) {
                await deps.db.update(serenataOwners)
                    .set({ updatedAt: now })
                    .where(deps.eq(serenataOwners.id, existingOwner[0].id));
                result.owner = 'updated';
            } else {
                const sourceMusician = musician[0];
                await deps.db.insert(serenataOwners).values({
                    userId,
                    bio: sourceMusician?.bio ?? null,
                    comuna: sourceMusician?.comuna ?? null,
                    region: sourceMusician?.region ?? null,
                    workingComunas: sourceMusician?.workZones?.length
                        ? sourceMusician.workZones
                        : sourceMusician?.comuna
                            ? [sourceMusician.comuna]
                            : [],
                    subscriptionStatus: 'trialing',
                    subscriptionPrice: 0,
                    trialEndsAt: defaultSerenataTrialEndsAt(),
                });
                result.owner = 'created';
            }
        }

        await createAdminAudit({
            actorUserId: adminUser.id,
            action: 'user.serenatas_profile.update',
            entityType: 'user',
            entityId: userId,
            payload: {
                ...result,
                note: typeof payload?.note === 'string' ? payload.note.trim().slice(0, 500) : null,
            },
        });

        return c.json({ ok: true, result });
    });

    app.post('/users/:id/email', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') {
            return c.json({ ok: false, error: 'Solo superadmin puede enviar correos desde SimpleAdmin' }, 403);
        }

        const payload = await c.req.json().catch(() => null) as {
            subject?: string;
            message?: string;
            actionUrl?: string;
            actionLabel?: string;
            brandVertical?: AdminEmailBrandInput;
        } | null;
        const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : '';
        const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
        const actionUrl = typeof payload?.actionUrl === 'string' ? payload.actionUrl.trim() : '';
        const actionLabel = typeof payload?.actionLabel === 'string' ? payload.actionLabel.trim() : '';
        if (subject.length < 3 || subject.length > 120) {
            return c.json({ ok: false, error: 'El asunto debe tener entre 3 y 120 caracteres' }, 400);
        }
        if (message.length < 5 || message.length > 3000) {
            return c.json({ ok: false, error: 'El mensaje debe tener entre 5 y 3000 caracteres' }, 400);
        }

        const userId = c.req.param('id') ?? '';
        const targetUser = await deps.getUserById(userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);

        const transporter = getAuthMailerTransporter();
        if (!transporter) {
            return c.json({ ok: false, error: 'SMTP no configurado para enviar correos' }, 503);
        }

        const brand = resolveAdminEmailBrand(targetUser, payload?.brandVertical);
        await ensureEmailLogoCache();
        const prepared = buildAdminUserEmail({
            brand,
            subject,
            message: personalizeAdminEmailMessage(message, targetUser),
            actionUrl,
            actionLabel,
        });

        await transporter.sendMail({
            from: formatAuthFromAddress(brand),
            replyTo: 'hola@simpleplataforma.app',
            to: targetUser.email,
            subject,
            text: prepared.text,
            html: prepared.mail.html,
            attachments: prepared.mail.attachments,
        });

        await createAdminAudit({
            actorUserId: adminUser.id,
            action: 'user.email.send',
            entityType: 'user',
            entityId: userId,
            payload: { subject, actionUrl: prepared.actionUrl, appName: brand.appName },
        });

        return c.json({ ok: true });
    });

    app.post('/users/email-bulk', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (adminUser.role !== 'superadmin') {
            return c.json({ ok: false, error: 'Solo superadmin puede enviar correos desde SimpleAdmin' }, 403);
        }

        const payload = await c.req.json().catch(() => null) as {
            userIds?: unknown;
            subject?: string;
            message?: string;
            actionUrl?: string;
            actionLabel?: string;
            brandVertical?: AdminEmailBrandInput;
        } | null;
        const userIds = Array.isArray(payload?.userIds)
            ? [...new Set(payload.userIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim()))]
            : [];
        const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : '';
        const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
        const actionUrl = typeof payload?.actionUrl === 'string' ? payload.actionUrl.trim() : '';
        const actionLabel = typeof payload?.actionLabel === 'string' ? payload.actionLabel.trim() : '';
        if (userIds.length === 0) return c.json({ ok: false, error: 'Selecciona al menos un usuario' }, 400);
        if (userIds.length > 50) return c.json({ ok: false, error: 'Máximo 50 usuarios por envío seleccionado' }, 400);
        if (subject.length < 3 || subject.length > 120) {
            return c.json({ ok: false, error: 'El asunto debe tener entre 3 y 120 caracteres' }, 400);
        }
        if (message.length < 5 || message.length > 3000) {
            return c.json({ ok: false, error: 'El mensaje debe tener entre 5 y 3000 caracteres' }, 400);
        }

        const transporter = getAuthMailerTransporter();
        if (!transporter) {
            return c.json({ ok: false, error: 'SMTP no configurado para enviar correos' }, 503);
        }

        await ensureEmailLogoCache();

        const sent: string[] = [];
        const skipped: string[] = [];
        for (const userId of userIds) {
            const targetUser = await deps.getUserById(userId);
            if (!targetUser?.email) {
                skipped.push(userId);
                continue;
            }
            const brand = resolveAdminEmailBrand(targetUser, payload?.brandVertical);
            const prepared = buildAdminUserEmail({
                brand,
                subject,
                message: personalizeAdminEmailMessage(message, targetUser),
                actionUrl,
                actionLabel,
            });
            await transporter.sendMail({
                from: formatAuthFromAddress(brand),
                replyTo: 'hola@simpleplataforma.app',
                to: targetUser.email,
                subject,
                text: prepared.text,
                html: prepared.mail.html,
                attachments: prepared.mail.attachments,
            });
            sent.push(userId);
            await createAdminAudit({
                actorUserId: adminUser.id,
                action: 'user.email.send',
                entityType: 'user',
                entityId: userId,
                payload: { subject, actionUrl: prepared.actionUrl, appName: brand.appName, bulk: true },
            });
        }

        await createAdminAudit({
            actorUserId: adminUser.id,
            action: 'user.email.bulk_send',
            entityType: 'user',
            entityId: 'bulk',
            payload: { subject, requested: userIds.length, sent: sent.length, skipped: skipped.length },
        });

        return c.json({ ok: true, sent: sent.length, skipped: skipped.length });
    });




    app.get('/audit-logs', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const entityType = c.req.query('entityType');
        const entityId = c.req.query('entityId');
        const limitRaw = Number(c.req.query('limit') ?? 30);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 30;
        const conditions: any[] = [];
        if (entityType) conditions.push(deps.sql`entity_type = ${entityType}`);
        if (entityId) conditions.push(deps.sql`entity_id = ${entityId}`);

        const rows = await deps.db.execute(
            conditions.length > 0
                ? deps.sql`
                    SELECT id, actor_user_id, action, entity_type, entity_id, payload, created_at
                    FROM admin_audit_logs
                    WHERE ${deps.and(...conditions)}
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                `
                : deps.sql`
                    SELECT id, actor_user_id, action, entity_type, entity_id, payload, created_at
                    FROM admin_audit_logs
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                `
        );

        return c.json({
            ok: true,
            items: (rows as any[]).map((row) => ({
                id: row.id,
                actorUserId: row.actor_user_id,
                action: row.action,
                entityType: row.entity_type,
                entityId: row.entity_id,
                payload: row.payload ?? {},
                createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
            })),
        });
    });

    // ── Listings ──────────────────────────────────────────────────────────────

    app.get('/listings', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);
        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const items = await deps.listAdminListingsSnapshot(scopedVertical);
        return c.json({ ok: true, items });
    });

    // ── Subscriptions (superadmin) ────────────────────────────────────────────

    app.post('/subscriptions/set-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin' }, 403);

        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const { userId, vertical, planId, expiresAt, accountId: requestedAccountId } = body as { userId?: string; vertical?: string; planId?: string; expiresAt?: string | null; accountId?: string | null };

        if (!userId || !vertical || !planId) return c.json({ ok: false, error: 'userId, vertical y planId son requeridos' }, 400);
        if (requestedAccountId !== undefined && requestedAccountId !== null && (typeof requestedAccountId !== 'string' || !requestedAccountId.trim())) {
            return c.json({ ok: false, error: 'El espacio de trabajo no es válido' }, 400);
        }
        const v = deps.parseVertical(vertical);
        if (!['autos', 'propiedades'].includes(v)) return c.json({ ok: false, error: 'Vertical debe ser autos o propiedades' }, 400);

        const accountResult = await resolveSubscriptionAccount(userId, typeof requestedAccountId === 'string' ? requestedAccountId.trim() : null);
        if (!accountResult.ok) return c.json({ ok: false, error: accountResult.error }, accountResult.status);
        const accountId = accountResult.account.id;
        const parsedExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        if (Number.isNaN(parsedExpiry.getTime())) return c.json({ ok: false, error: 'La fecha de expiración no es válida.' }, 400);

        if (planId === 'free') {
            await persistManualAdminSubscription({
                userId,
                accountId,
                vertical: v,
                planSlug: 'free',
                status: 'cancelled',
                expiresAt: parsedExpiry,
            });
            deps.cancelActiveSubscriptionForUser?.(userId, v, accountId);
            return c.json({ ok: true, planId: 'free' });
        }

        const plan = deps.getPaidSubscriptionPlan(v, planId);
        if (!plan) return c.json({ ok: false, error: 'Plan no encontrado' }, 400);

        await persistManualAdminSubscription({
            userId,
            accountId,
            vertical: v,
            planSlug: plan.id,
            status: 'active',
            expiresAt: parsedExpiry,
        });
        const sub = {
            id: deps.makeSubscriptionId(v, planId),
            accountId,
            userId,
            vertical: v,
            planId,
            planName: plan.name,
            priceMonthly: plan.priceMonthly,
            currency: 'CLP',
            features: plan.features,
            status: 'active',
            providerPreapprovalId: `admin-manual-${admin.id}`,
            providerStatus: 'manual',
            startedAt: Date.now(),
            updatedAt: Date.now(),
        };
        deps.upsertActiveSubscription(sub);
        return c.json({ ok: true, planId, expiresAt: parsedExpiry.toISOString() });
    });

    app.delete('/subscriptions/cancel-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin' }, 403);

        const body = await c.req.json().catch(() => ({})) as { userId?: string; vertical?: string; accountId?: string | null };
        if (!body.userId || !body.vertical) return c.json({ ok: false, error: 'userId y vertical son requeridos' }, 400);
        if (body.accountId !== undefined && body.accountId !== null && (typeof body.accountId !== 'string' || !body.accountId.trim())) {
            return c.json({ ok: false, error: 'El espacio de trabajo no es válido' }, 400);
        }
        const v = deps.parseVertical(body.vertical);
        const accountResult = await resolveSubscriptionAccount(body.userId, typeof body.accountId === 'string' ? body.accountId.trim() : null);
        if (!accountResult.ok) return c.json({ ok: false, error: accountResult.error }, accountResult.status);
        const accountId = accountResult.account.id;
        await persistManualAdminSubscription({
            userId: body.userId,
            accountId,
            vertical: v,
            planSlug: 'free',
            status: 'cancelled',
        });
        deps.cancelActiveSubscriptionForUser?.(body.userId, v, accountId);
        return c.json({ ok: true });
    });

    // ── SimpleAgenda (superadmin) ─────────────────────────────────────────────

    app.get('/agenda/subscriptions', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const profiles = await deps.db.select({
            id: deps.tables.agendaProfessionalProfiles.id,
            userId: deps.tables.agendaProfessionalProfiles.userId,
            displayName: deps.tables.agendaProfessionalProfiles.displayName,
            slug: deps.tables.agendaProfessionalProfiles.slug,
            plan: deps.tables.agendaProfessionalProfiles.plan,
            planExpiresAt: deps.tables.agendaProfessionalProfiles.planExpiresAt,
            isPublished: deps.tables.agendaProfessionalProfiles.isPublished,
            createdAt: deps.tables.agendaProfessionalProfiles.createdAt,
        }).from(deps.tables.agendaProfessionalProfiles).orderBy(deps.desc(deps.tables.agendaProfessionalProfiles.createdAt));

        const allUsers = await deps.listAdminUsersSnapshot(null);
        const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

        const result = profiles.map((p: any) => {
            const u = userMap.get(p.userId) as any;
            const expired = p.plan === 'pro' && p.planExpiresAt && p.planExpiresAt < new Date();
            return {
                profileId: p.id,
                userId: p.userId,
                userName: u?.name ?? 'Sin nombre',
                userEmail: u?.email ?? '',
                displayName: p.displayName ?? '',
                slug: p.slug,
                plan: p.plan,
                planExpiresAt: p.planExpiresAt ? p.planExpiresAt.toISOString() : null,
                isPublished: p.isPublished,
                status: p.plan === 'pro' && !expired ? 'active' : expired ? 'expired' : (p.planExpiresAt && p.planExpiresAt >= new Date() ? 'trial' : 'free'),
                createdAt: p.createdAt.toISOString(),
            };
        });

        return c.json({ ok: true, subscriptions: result });
    });

    app.post('/agenda/set-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const { profileId, plan, expiresAt, notes } = body as { profileId?: string; plan?: string; expiresAt?: string | null; notes?: string };

        if (!profileId || !plan) return c.json({ ok: false, error: 'Se requiere profileId y plan' }, 400);
        if (!['free', 'pro'].includes(plan)) return c.json({ ok: false, error: 'Plan debe ser free o pro' }, 400);
        const agendaPlan: 'free' | 'pro' = plan === 'pro' ? 'pro' : 'free';

        const profiles = await deps.db.select().from(deps.tables.agendaProfessionalProfiles)
            .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profileId)).limit(1);
        if (!profiles[0]) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const targetUser = await deps.getUserById(profiles[0].userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
        let profileAccountId = profiles[0].accountId as string | null;
        if (!profileAccountId) {
            const [personalAccount] = await deps.db.select({ id: accounts.id })
                .from(accounts)
                .where(deps.and(
                    deps.eq(accounts.ownerUserId, targetUser.id),
                    deps.eq(accounts.isPersonal, true),
                ))
                .limit(1);
            profileAccountId = personalAccount?.id ?? null;
            if (!profileAccountId) {
                return c.json({ ok: false, error: 'No encontramos la cuenta personal asociada a este perfil antiguo.' }, 409);
            }
        }
        const expiry = agendaPlan === 'pro' && expiresAt ? new Date(expiresAt) : null;
        if (expiry && Number.isNaN(expiry.getTime())) return c.json({ ok: false, error: 'La fecha de expiración no es válida.' }, 400);
        let result: Record<string, unknown>;
        if (agendaPlan === 'free') {
            const [billingAccount] = await deps.db.select({ isPersonal: accounts.isPersonal })
                .from(accounts)
                .where(deps.eq(accounts.id, profileAccountId))
                .limit(1);
            const cancelled = await cancelAgendaProSubscription(targetUser.id, profileAccountId, Boolean(billingAccount?.isPersonal));
            if (cancelled.ok) {
                result = { plan: 'free', status: 'free', message: cancelled.message };
            } else if (cancelled.status === 400) {
                await downgradeAgendaProfileAccessById(profileId);
                result = { plan: 'free', status: 'free' };
            } else {
                return c.json({ ok: false, error: cancelled.error }, cancelled.status as 400 | 404 | 502);
            }
        } else if (profiles[0].plan === 'pro') {
            await deps.db.update(deps.tables.agendaProfessionalProfiles)
                .set({ plan: 'pro', planExpiresAt: expiry, updatedAt: new Date() })
                .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profileId));
            result = { plan: 'pro', status: 'active' };
        } else {
            result = await persistManualAdminSubscription({
                userId: targetUser.id,
                accountId: profileAccountId,
                vertical: 'agenda',
                planSlug: 'pro',
                status: 'active',
                expiresAt: expiry,
            });
        }
        await createAdminAudit({
            actorUserId: admin.id,
            action: 'agenda.subscription.set_plan',
            entityType: 'agenda_profile',
            entityId: profileId,
            payload: { userId: targetUser.id, plan: agendaPlan, expiresAt: expiry?.toISOString() ?? null, notes },
        });

        return c.json({ ok: true, ...result, plan: agendaPlan, expiresAt: expiry?.toISOString() ?? null });
    });

    app.delete('/agenda/cancel-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const body = await c.req.json().catch(() => ({})) as { profileId?: string };
        if (!body.profileId) return c.json({ ok: false, error: 'Se requiere profileId' }, 400);
        const profile = await deps.db.select().from(deps.tables.agendaProfessionalProfiles)
            .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, body.profileId)).limit(1);
        if (!profile[0]) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);
        const targetUser = await deps.getUserById(profile[0].userId);
        if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
        let accountId = profile[0].accountId as string | null;
        if (!accountId) {
            const [personalAccount] = await deps.db.select({ id: accounts.id })
                .from(accounts)
                .where(deps.and(
                    deps.eq(accounts.ownerUserId, targetUser.id),
                    deps.eq(accounts.isPersonal, true),
                ))
                .limit(1);
            accountId = personalAccount?.id ?? null;
            if (!accountId) {
                return c.json({ ok: false, error: 'No encontramos la cuenta personal asociada a este perfil antiguo.' }, 409);
            }
        }
        const [billingAccount] = await deps.db.select({ isPersonal: accounts.isPersonal })
            .from(accounts)
            .where(deps.eq(accounts.id, accountId))
            .limit(1);
        const cancelled = await cancelAgendaProSubscription(targetUser.id, accountId, Boolean(billingAccount?.isPersonal));
        let result: Record<string, unknown>;
        if (cancelled.ok) {
            result = { plan: 'free', status: 'free', message: cancelled.message };
        } else if (cancelled.status === 400) {
            await downgradeAgendaProfileAccessById(profile[0].id);
            result = { plan: 'free', status: 'free' };
        } else {
            return c.json({ ok: false, error: cancelled.error }, cancelled.status as 400 | 404 | 502);
        }
        await createAdminAudit({
            actorUserId: admin.id,
            action: 'agenda.subscription.cancel_plan',
            entityType: 'agenda_profile',
            entityId: body.profileId,
            payload: { userId: targetUser.id, result },
        });

        return c.json({ ok: true });
    });

    // ── Conversaciones (ops inbox / Relationship Engine) ─────────────────────

    app.get('/conversations', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(admin.role)) return c.json({ ok: false, error: 'Sin permiso' }, 403);
        if (!deps.tables.timelineEvents || !deps.inArray) {
            return c.json({ ok: false, error: 'Conversaciones no disponibles en este entorno.' }, 503);
        }

        const statusRaw = c.req.query('status') ?? 'pending';
        const status = statusRaw === 'all' || statusRaw === 'done' || statusRaw === 'pending'
            ? statusRaw
            : 'pending';
        const verticalRaw = c.req.query('vertical') ?? 'all';
        const vertical = ['all', 'agenda', 'propiedades', 'autos', 'serenatas', 'platform', 'general', 'unclassified'].includes(verticalRaw)
            ? verticalRaw
            : 'all';

        try {
            const result = await listAdminConversations({
                db: deps.db,
                eq: deps.eq,
                and: deps.and,
                inArray: deps.inArray,
                desc: deps.desc,
                tables: { timelineEvents: deps.tables.timelineEvents },
                status,
                vertical,
            });
            return c.json({ ok: true, ...result });
        } catch (error) {
            console.error('[admin] list conversations failed', error);
            return c.json({ ok: false, error: 'No se pudieron cargar las conversaciones.' }, 500);
        }
    });

    app.post('/conversations/inbound-manual', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(admin.role)) return c.json({ ok: false, error: 'Sin permiso' }, 403);
        if (!deps.tables.timelineEvents) {
            return c.json({ ok: false, error: 'Conversaciones no disponibles en este entorno.' }, 503);
        }

        const body = await c.req.json().catch(() => ({})) as {
            channel?: string;
            phone?: string;
            email?: string;
            name?: string;
            message?: string;
            sourceVertical?: string;
            purpose?: string;
            campaignName?: string;
        };
        const channel = body.channel ?? 'whatsapp_personal';
        if (channel !== 'email' && channel !== 'whatsapp_personal' && channel !== 'whatsapp_business') {
            return c.json({ ok: false, error: 'Selecciona WhatsApp personal, WhatsApp Business o correo electrónico.' }, 400);
        }
        if (!['agenda', 'propiedades', 'autos', 'serenatas', 'platform', 'general'].includes(body.sourceVertical ?? '')) {
            return c.json({ ok: false, error: 'Selecciona el servicio relacionado con esta respuesta.' }, 400);
        }
        if (!['alliance', 'app_invitation', 'client_prospecting', 'follow_up', 'support', 'other'].includes(body.purpose ?? '')) {
            return c.json({ ok: false, error: 'Selecciona el motivo de esta conversación.' }, 400);
        }
        if (!body.message?.trim()) {
            return c.json({ ok: false, error: 'Copia el texto de la respuesta recibida.' }, 400);
        }
        if (channel === 'email' ? !body.email?.trim() : !body.phone?.trim()) {
            return c.json({ ok: false, error: channel === 'email' ? 'Indica el correo del contacto.' : 'Indica el WhatsApp o teléfono del contacto.' }, 400);
        }

        try {
            const result = await captureManualResponse({
                db: deps.db,
                tables: { timelineEvents: deps.tables.timelineEvents },
                adminUserId: admin.id,
                channel: channel as 'whatsapp_personal' | 'whatsapp_business' | 'email',
                phone: body.phone,
                email: body.email,
                name: body.name,
                message: body.message,
                sourceVertical: body.sourceVertical as 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general',
                purpose: body.purpose as 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other',
                campaignName: body.campaignName,
            });
            return c.json({ ok: true, ...result }, 201);
        } catch (error) {
            if (error instanceof Error && error.message === 'INVALID_PHONE') {
                return c.json({ ok: false, error: 'Teléfono o WhatsApp inválido.' }, 400);
            }
            if (error instanceof Error && error.message === 'INVALID_EMAIL') {
                return c.json({ ok: false, error: 'Correo inválido.' }, 400);
            }
            if (error instanceof Error && error.message === 'INVALID_MESSAGE') {
                return c.json({ ok: false, error: 'La respuesta debe tener hasta 6000 caracteres.' }, 400);
            }
            console.error('[admin] capture inbound manual failed', error);
            return c.json({ ok: false, error: 'No se pudo registrar el contacto.' }, 500);
        }
    });

    app.post('/conversations/outbound-manual', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(admin.role)) return c.json({ ok: false, error: 'Sin permiso' }, 403);
        if (!deps.tables.timelineEvents) {
            return c.json({ ok: false, error: 'Conversaciones no disponibles en este entorno.' }, 503);
        }

        const raw = await c.req.json().catch(() => null);
        const parsed = adminOutboundMessageSchema.safeParse(raw);
        if (!parsed.success) {
            return c.json({ ok: false, error: parsed.error.issues[0]?.message || 'Revisa los datos del registro.' }, 400);
        }

        try {
            const result = await recordAdminOutboundMessage({
                db: deps.db,
                tables: { timelineEvents: deps.tables.timelineEvents },
                input: { ...parsed.data, adminUserId: admin.id },
            });
            return c.json({ ok: true, ...result }, 201);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'INVALID_PHONE') return c.json({ ok: false, error: 'WhatsApp o teléfono inválido.' }, 400);
                if (error.message === 'INVALID_EMAIL') return c.json({ ok: false, error: 'Correo inválido.' }, 400);
                if (error.message === 'PHONE_REQUIRED') return c.json({ ok: false, error: 'Indica el WhatsApp del destinatario.' }, 400);
                if (error.message === 'EMAIL_REQUIRED') return c.json({ ok: false, error: 'Indica el correo del destinatario.' }, 400);
            }
            console.error('[admin] record outbound message failed', error);
            return c.json({ ok: false, error: 'No se pudo guardar el mensaje enviado.' }, 500);
        }
    });

    app.patch('/conversations/:threadId/status', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(admin.role)) return c.json({ ok: false, error: 'Sin permiso' }, 403);
        if (!deps.tables.timelineEvents) {
            return c.json({ ok: false, error: 'Conversaciones no disponibles en este entorno.' }, 503);
        }

        const threadId = decodeURIComponent(c.req.param('threadId') || '').trim();
        if (!threadId) return c.json({ ok: false, error: 'Hilo inválido.' }, 400);

        const body = await c.req.json().catch(() => ({})) as { status?: string; note?: string };
        if (body.status !== 'pending' && body.status !== 'done') {
            return c.json({ ok: false, error: 'Estado debe ser pending o done.' }, 400);
        }

        try {
            await updateConversationStatus({
                db: deps.db,
                tables: { timelineEvents: deps.tables.timelineEvents },
                adminUserId: admin.id,
                threadId,
                status: body.status,
                note: body.note,
            });
            return c.json({ ok: true });
        } catch (error) {
            console.error('[admin] update conversation status failed', error);
            return c.json({ ok: false, error: 'No se pudo actualizar el estado.' }, 500);
        }
    });

    return app;
}
