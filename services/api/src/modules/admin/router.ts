import { Hono } from 'hono';
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

export function createAdminRouter(deps: AdminRouterDeps) {
    const app = new Hono();

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

        await deps.permanentlyDeleteUser(userId);
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
            if (adminUser.role !== 'superadmin') return c.json({ ok: false, error: 'Solo superadmin puede acceder' }, 403);

            const payload = await c.req.json().catch(() => null);
            const userId = c.req.param('id') ?? '';

            const targetUser = await deps.getUserById(userId);
            if (!targetUser) return c.json({ ok: false, error: 'Usuario no encontrado' }, 404);
            const targetAccount = await deps.ensurePrimaryAccountForUser(targetUser);

            const subData = payload?.subscriptions || {};
            const results: Record<string, any> = {};

            if (subData.agenda) {
                const profile = await deps.db.select()
                    .from(deps.tables.agendaProfessionalProfiles)
                    .where(deps.eq(deps.tables.agendaProfessionalProfiles.userId, userId))
                    .limit(1);

                const plan = subData.agenda.plan;
                const expiresAt = subData.agenda.expiresAt ? new Date(subData.agenda.expiresAt) : null;

                if (profile.length > 0) {
                    await deps.db.update(deps.tables.agendaProfessionalProfiles)
                        .set({ plan, planExpiresAt: expiresAt, updatedAt: new Date() })
                        .where(deps.eq(deps.tables.agendaProfessionalProfiles.id, profile[0].id));
                    results.agenda = { plan, expiresAt: expiresAt?.toISOString() || null };
                } else {
                    const slug = `${targetUser.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now().toString(36)}`;
                    await deps.db.insert(deps.tables.agendaProfessionalProfiles).values({
                        accountId: await deps.getPrimaryAccountIdForUser(userId),
                        userId,
                        slug,
                        displayName: targetUser.name,
                        plan,
                        planExpiresAt: expiresAt,
                    }).returning();
                    results.agenda = { plan, expiresAt: expiresAt?.toISOString() || null, created: true };
                }
            }

            if (subData.autos) {
                const planId = subData.autos.planId || null;
                const status = subData.autos.status || 'active';
                const expiresAt = subData.autos.expiresAt ? new Date(subData.autos.expiresAt) : null;
                const existing = await deps.db.execute(deps.sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} AND vertical = 'autos' LIMIT 1
                `);
                if (existing.length > 0) {
                    await deps.db.execute(deps.sql`
                        UPDATE subscriptions SET plan_id = ${planId}, status = ${status}, expires_at = ${expiresAt}, updated_at = now()
                        WHERE id = ${(existing[0] as any).id}
                    `);
                } else {
                    await deps.db.execute(deps.sql`
                        INSERT INTO subscriptions (account_id, user_id, plan_id, vertical, status, provider, expires_at)
                        VALUES (${targetAccount.id}, ${userId}, ${planId}, 'autos', ${status}, 'manual', ${expiresAt})
                    `);
                }
                results.autos = { planId, status, expiresAt: expiresAt?.toISOString() || null };
            }

            if (subData.propiedades) {
                const planId = subData.propiedades.planId || null;
                const status = subData.propiedades.status || 'active';
                const expiresAt = subData.propiedades.expiresAt ? new Date(subData.propiedades.expiresAt) : null;
                const existing = await deps.db.execute(deps.sql`
                    SELECT id FROM subscriptions WHERE user_id = ${userId} AND vertical = 'propiedades' LIMIT 1
                `);
                if (existing.length > 0) {
                    await deps.db.execute(deps.sql`
                        UPDATE subscriptions SET plan_id = ${planId}, status = ${status}, expires_at = ${expiresAt}, updated_at = now()
                        WHERE id = ${(existing[0] as any).id}
                    `);
                } else {
                    await deps.db.execute(deps.sql`
                        INSERT INTO subscriptions (account_id, user_id, plan_id, vertical, status, provider, expires_at)
                        VALUES (${targetAccount.id}, ${userId}, ${planId}, 'propiedades', ${status}, 'manual', ${expiresAt})
                    `);
                }
                results.propiedades = { planId, status, expiresAt: expiresAt?.toISOString() || null };
            }

            return c.json({ ok: true, results });
        } catch (error) {
            console.error('[admin subscriptions] error:', error);
            return c.json({ ok: false, error: 'Error al actualizar suscripciones' }, 500);
        }
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
            vertical: vertical === 'autos' || vertical === 'propiedades' || vertical === 'agenda' || vertical === 'serenatas' ? (vertical as VerticalType) : undefined,
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
            vertical: vertical === 'autos' || vertical === 'propiedades' || vertical === 'agenda' || vertical === 'serenatas' ? (vertical as VerticalType) : undefined,
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
