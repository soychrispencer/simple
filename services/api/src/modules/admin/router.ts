import { Hono } from 'hono';
import type { SubscriptionPlanId } from '../../lib/domain-types.js';
import { serenataClients, serenataMusicians, serenataOwners } from '../../db/schema.js';
import { formatAuthFromAddress, getAuthMailerTransporter } from '../../lib/auth-email.js';
import { getEmailBrandProfileForVertical, type EmailBrandProfile, type EmailBrandVertical } from '../../lib/email-brand.js';
import { ensureEmailLogoCache } from '../../lib/email-brand-logo.js';
import { buildActionEmailPackage, buildActionEmailText, escapeHtml } from '../../lib/email-template.js';
import { persistManualAdminSubscription } from '../subscriptions/persist-db.js';
import {
    type CrmServiceDeps,
    type AppUser,
    type VerticalType,
    type ListingLeadStatus,
    type ServiceLeadStatus,
    serviceLeadUpdateSchema,
    serviceLeadNoteSchema,
    listingLeadUpdateSchema,
    listingLeadNoteSchema,
    leadQuickActionSchema,
    listServiceLeadRecords,
    getServiceLeadById,
    buildServiceLeadDetailPayload,
    updateServiceLeadRecord,
    createServiceLeadActivity,
    runServiceLeadQuickAction,
    serviceLeadToResponse,
    serviceLeadActivityToResponse,
    listListingLeadRecords,
    getListingLeadById,
    buildListingLeadDetailPayload,
    updateListingLeadRecord,
    createListingLeadActivity,
    runListingLeadQuickAction,
    listingLeadToResponse,
    listingLeadActivityToResponse,
    getLeadQuickActionLabel,
    mapServiceLeadRow,
    mapListingLeadRow,
} from '../crm/service.js';


export type AdminRouterDeps = CrmServiceDeps & {
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
    activeSubscriptionsByUser: Map<string, any[]>;
    isAdminBootstrapEnabled: () => boolean;
    handleBootstrap: (c: any) => Promise<Response>;
    tables: CrmServiceDeps['tables'] & {
        agendaProfessionalProfiles: any;
        subscriptions?: any;
    };
    sql: any;
};

type AdminEmailBrandInput = EmailBrandVertical | 'simpleagenda' | 'simpleautos' | 'simplepropiedades' | 'simpleserenatas' | null | undefined;

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

    // ── Bootstrap ────────────────────────────────────────────────────────────

    app.post('/bootstrap', (c) => deps.handleBootstrap(c));

    // ── Overview ─────────────────────────────────────────────────────────────

    app.get('/overview', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const [adminUsers, adminListings, recentLeads] = await Promise.all([
            deps.listAdminUsersSnapshot(scopedVertical),
            deps.listAdminListingsSnapshot(scopedVertical),
            listServiceLeadRecords(deps, { limit: 6, vertical: scopedVertical ?? undefined }),
        ]);

        const autosListings = adminListings.filter((item: any) => item.vertical === 'autos');
        const propiedadesListings = adminListings.filter((item: any) => item.vertical === 'propiedades');
        const newLeads = recentLeads.filter((lead) => lead.status === 'new').length;

        return c.json({
            ok: true,
            stats: {
                usersTotal: adminUsers.length,
                autosListingsTotal: autosListings.length,
                propiedadesListingsTotal: propiedadesListings.length,
                newServiceLeads: newLeads,
            },
            recentUsers: adminUsers.slice(0, 6),
            recentListings: adminListings.slice(0, 6),
            recentLeads: recentLeads.map((r) => serviceLeadToResponse(deps, r)),
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

            const payload = await c.req.json().catch(() => null) as { subscriptions?: Record<string, unknown> } | null;
            const userId = c.req.param('id') ?? '';

            const targetUser = await deps.getUserById(userId);
            if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
            const targetAccount = await deps.ensurePrimaryAccountForUser(targetUser);

            const subData = payload?.subscriptions ?? {};
            const results: Record<string, unknown> = {};

            if (subData.agenda) {
                const agendaPayload = subData.agenda as { plan?: string; expiresAt?: string | null };
                const profile = await deps.db.select()
                    .from(deps.tables.agendaProfessionalProfiles)
                    .where(deps.eq(deps.tables.agendaProfessionalProfiles.userId, userId))
                    .limit(1);

                const plan = agendaPayload.plan === 'pro' ? 'pro' : 'free';
                const expiresAt = agendaPayload.expiresAt ? new Date(agendaPayload.expiresAt) : null;

                if (profile.length > 0) {
                    await deps.db.update(deps.tables.agendaProfessionalProfiles)
                        .set({ plan, planExpiresAt: expiresAt, updatedAt: new Date() })
                        .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profile[0].id));
                    results.agenda = { plan, expiresAt: expiresAt?.toISOString() ?? null };
                } else if (plan === 'pro') {
                    const slug = `${targetUser.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`;
                    await deps.db.insert(deps.tables.agendaProfessionalProfiles).values({
                        accountId: await deps.getPrimaryAccountIdForUser(userId),
                        userId,
                        slug,
                        displayName: targetUser.name,
                        plan,
                        planExpiresAt: expiresAt,
                    }).returning();
                    results.agenda = { plan, expiresAt: expiresAt?.toISOString() ?? null, created: true };
                } else {
                    results.agenda = { plan, skipped: 'Sin perfil Agenda para asignar free' };
                }
            }

            const billingVerticals = ['autos', 'propiedades', 'serenatas'] as const;
            for (const vertical of billingVerticals) {
                const raw = subData[vertical] as {
                    planId?: string;
                    status?: 'active' | 'cancelled' | 'expired';
                    expiresAt?: string | null;
                    trialEndsAt?: string | null;
                } | undefined;
                if (!raw) continue;

                const planSlug = (raw.planId ?? 'free') as SubscriptionPlanId;
                const allowedPlans =
                    vertical === 'serenatas'
                        ? ['free', 'pro']
                        : ['free', 'pro', 'enterprise'];
                if (!allowedPlans.includes(planSlug)) {
                    return c.json({ ok: false, error: `Plan inválido para ${vertical}` }, 400);
                }

                const status = raw.status ?? (planSlug === 'free' ? 'cancelled' : 'active');
                const expiresAt = raw.expiresAt ? new Date(raw.expiresAt) : null;

                results[vertical] = await persistManualAdminSubscription({
                    userId,
                    accountId: targetAccount.id,
                    vertical,
                    planSlug,
                    status,
                    expiresAt,
                });

                if (vertical === 'serenatas' && raw.trialEndsAt !== undefined) {
                    const trialEndsAt = raw.trialEndsAt ? new Date(raw.trialEndsAt) : null;
                    const owners = await deps.db.select({ id: serenataOwners.id })
                        .from(serenataOwners)
                        .where(deps.eq(serenataOwners.userId, userId))
                        .limit(1);
                    if (owners[0]) {
                        await deps.db.update(serenataOwners)
                            .set({ trialEndsAt, updatedAt: new Date() })
                            .where(deps.eq(serenataOwners.id, owners[0].id));
                        results.serenatasTrialEndsAt = trialEndsAt?.toISOString() ?? null;
                    } else {
                        results.serenatasTrialEndsAt = { skipped: 'Usuario sin perfil dueño Serenatas' };
                    }
                }
            }

            await createAdminAudit({
                actorUserId: adminUser.id,
                action: 'user.subscriptions.update',
                entityType: 'user',
                entityId: userId,
                payload: { subscriptions: subData, results },
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
            removeClientProfile?: boolean;
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
                    subscriptionStatus: 'active',
                    subscriptionPrice: 0,
                    trialEndsAt: new Date('2099-12-31T00:00:00.000Z'),
                });
                result.owner = 'created';
            }
        }

        if (payload?.removeClientProfile && profileType !== 'client') {
            await deps.db.delete(serenataClients).where(deps.eq(serenataClients.userId, userId));
            result.clientRemoved = true;
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

    // ── Service leads ─────────────────────────────────────────────────────────

    app.get('/service-leads', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const vertical = scopedVertical ?? c.req.query('vertical');
        const status = c.req.query('status');
        const items = await listServiceLeadRecords(deps, {
            vertical: vertical === 'autos' || vertical === 'propiedades' || vertical === 'agenda' ? (vertical as VerticalType) : undefined,
            status: status === 'new' || status === 'contacted' || status === 'qualified' || status === 'closed' ? (status as ServiceLeadStatus) : undefined,
        });
        return c.json({ ok: true, items: items.map((r) => serviceLeadToResponse(deps, r)) });
    });

    app.get('/service-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        return c.json({ ok: true, ...(await buildServiceLeadDetailPayload(deps, lead)) });
    });

    app.patch('/service-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await updateServiceLeadRecord(deps, { actor: adminUser, lead, changes: parsed.data });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({ ok: true, item: serviceLeadToResponse(deps, result.item) });
    });

    app.post('/service-leads/:id/notes', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadNoteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        await deps.db.update(deps.tables.serviceLeads).set({ updatedAt: new Date() })
            .where(deps.eq(deps.tables.serviceLeads.id, lead.id));

        const activity = await createServiceLeadActivity(deps, {
            leadId: lead.id,
            actorUserId: adminUser.id,
            type: 'note',
            body: parsed.data.body.trim(),
        });
        const refreshed = await getServiceLeadById(deps, lead.id);
        return c.json({
            ok: true,
            item: serviceLeadToResponse(deps, refreshed ?? lead),
            activity: serviceLeadActivityToResponse(deps, activity),
        }, 201);
    });

    app.post('/service-leads/:id/actions', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = leadQuickActionSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await runServiceLeadQuickAction(deps, { actor: adminUser, lead, action: parsed.data.action });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({
            ok: true,
            item: serviceLeadToResponse(deps, result.item),
            activity: serviceLeadActivityToResponse(deps, result.activity),
            actionLabel: getLeadQuickActionLabel(parsed.data.action),
        }, 201);
    });

    // ── Listing leads ─────────────────────────────────────────────────────────

    app.get('/listing-leads', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const scopedVertical = adminUser.role === 'superadmin' ? null : (adminUser.primaryVertical ?? null);
        const vertical = scopedVertical ?? c.req.query('vertical');
        const status = c.req.query('status');
        const items = await listListingLeadRecords(deps, {
            vertical: vertical === 'autos' || vertical === 'propiedades' || vertical === 'agenda' ? (vertical as VerticalType) : undefined,
            status: status === 'new' || status === 'contacted' || status === 'qualified' || status === 'closed' ? (status as ListingLeadStatus) : undefined,
        });
        return c.json({ ok: true, items: items.map((item) => listingLeadToResponse(deps, item)) });
    });

    app.get('/listing-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        return c.json({ ok: true, ...(await buildListingLeadDetailPayload(deps, lead, adminUser.id)) });
    });

    app.patch('/listing-leads/:id', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await updateListingLeadRecord(deps, { actor: adminUser, lead, changes: parsed.data });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({ ok: true, item: listingLeadToResponse(deps, result.item) });
    });

    app.post('/listing-leads/:id/notes', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadNoteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        await deps.db.update(deps.tables.listingLeads).set({ updatedAt: new Date() })
            .where(deps.eq(deps.tables.listingLeads.id, lead.id));

        const activity = await createListingLeadActivity(deps, {
            leadId: lead.id,
            actorUserId: adminUser.id,
            type: 'note',
            body: parsed.data.body.trim(),
        });
        const refreshed = await getListingLeadById(deps, lead.id);
        return c.json({
            ok: true,
            item: listingLeadToResponse(deps, refreshed ?? lead),
            activity: listingLeadActivityToResponse(deps, activity),
        }, 201);
    });

    app.post('/listing-leads/:id/actions', async (c) => {
        const adminUser = await deps.authUser(c);
        if (!adminUser) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(adminUser.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = leadQuickActionSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);

        const result = await runListingLeadQuickAction(deps, { actor: adminUser, lead, action: parsed.data.action });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({
            ok: true,
            item: listingLeadToResponse(deps, result.item),
            activity: listingLeadActivityToResponse(deps, result.activity),
            actionLabel: getLeadQuickActionLabel(parsed.data.action),
        }, 201);
    });

    // ── Subscriptions (superadmin) ────────────────────────────────────────────

    app.post('/subscriptions/set-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin' }, 403);

        const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
        const { userId, vertical, planId, expiresAt } = body as { userId?: string; vertical?: string; planId?: string; expiresAt?: string | null };

        if (!userId || !vertical || !planId) return c.json({ ok: false, error: 'userId, vertical y planId son requeridos' }, 400);
        const v = deps.parseVertical(vertical);
        if (!['autos', 'propiedades'].includes(v)) return c.json({ ok: false, error: 'Vertical debe ser autos o propiedades' }, 400);

        if (planId === 'free') {
            const current = deps.activeSubscriptionsByUser.get(userId) ?? [];
            const updated = current.map((item: any) => {
                if (item.vertical !== v || item.status !== 'active') return item;
                return { ...item, status: 'cancelled' as const, updatedAt: Date.now() };
            });
            deps.activeSubscriptionsByUser.set(userId, updated);
            return c.json({ ok: true, planId: 'free' });
        }

        const plan = deps.getPaidSubscriptionPlan(v, planId);
        if (!plan) return c.json({ ok: false, error: 'Plan no encontrado' }, 400);

        const expiry = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 365 * 24 * 60 * 60 * 1000;
        const sub = {
            id: deps.makeSubscriptionId(v, planId),
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
        return c.json({ ok: true, planId, expiresAt: new Date(expiry).toISOString() });
    });

    app.delete('/subscriptions/cancel-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin' }, 403);

        const body = await c.req.json().catch(() => ({})) as { userId?: string; vertical?: string };
        if (!body.userId || !body.vertical) return c.json({ ok: false, error: 'userId y vertical son requeridos' }, 400);
        const v = deps.parseVertical(body.vertical);

        const current = deps.activeSubscriptionsByUser.get(body.userId) ?? [];
        const updated = current.map((item: any) => {
            if (item.vertical !== v || item.status !== 'active') return item;
            return { ...item, status: 'cancelled' as const, updatedAt: Date.now() };
        });
        deps.activeSubscriptionsByUser.set(body.userId, updated);
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
                status: p.plan === 'pro' && !expired ? 'active' : expired ? 'expired' : 'free',
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

        const profiles = await deps.db.select().from(deps.tables.agendaProfessionalProfiles)
            .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profileId)).limit(1);
        if (!profiles[0]) return c.json({ ok: false, error: 'Perfil no encontrado' }, 404);

        const expiry = plan === 'pro' && expiresAt ? new Date(expiresAt) : null;

        await deps.db.update(deps.tables.agendaProfessionalProfiles).set({
            plan,
            planExpiresAt: expiry,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profileId));

        return c.json({ ok: true, plan, expiresAt: expiry?.toISOString() ?? null });
    });

    app.delete('/agenda/cancel-plan', async (c) => {
        const admin = await deps.authUser(c);
        if (!admin) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (admin.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

        const body = await c.req.json().catch(() => ({})) as { profileId?: string };
        if (!body.profileId) return c.json({ ok: false, error: 'Se requiere profileId' }, 400);

        await deps.db.update(deps.tables.agendaProfessionalProfiles).set({
            plan: 'free',
            planExpiresAt: null,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.agendaProfessionalProfiles.id, body.profileId));

        return c.json({ ok: true });
    });

    return app;
}
