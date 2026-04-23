import { Hono } from 'hono';
import {
    type CrmServiceDeps,
    type AppUser,
    type VerticalType,
    type ListingLeadStatus,
    type ServiceLeadStatus,
    listingLeadStatusSchema,
    serviceLeadStatusSchema,
    listingLeadUpdateSchema,
    listingLeadNoteSchema,
    leadQuickActionSchema,
    pipelineColumnCreateSchema,
    pipelineColumnUpdateSchema,
    pipelineColumnReorderSchema,
    serviceLeadUpdateSchema,
    serviceLeadNoteSchema,
    listListingLeadRecords,
    getListingLeadById,
    buildListingLeadDetailPayload,
    updateListingLeadRecord,
    createListingLeadActivity,
    runListingLeadQuickAction,
    ensureListingPipelineColumns,
    listPipelineColumns,
    getListingPipelineColumnById,
    reorderPipelineColumns,
    listServiceLeadRecords,
    getServiceLeadById,
    buildServiceLeadDetailPayload,
    updateServiceLeadRecord,
    createServiceLeadActivity,
    runServiceLeadQuickAction,
    canUserAccessListingLead,
    listingLeadToResponse,
    listingLeadActivityToResponse,
    serviceLeadToResponse,
    serviceLeadActivityToResponse,
    pipelineColumnToResponse,
    getLeadQuickActionLabel,
    listingLeadStatusLabel,
} from './service.js';

export type CrmRouterDeps = CrmServiceDeps & {
    authUser: (c: any) => Promise<AppUser | null>;
    isAdminRole: (role: any) => boolean;
    isAdminForVertical: (user: AppUser, vertical: VerticalType) => boolean;
    userCanUseCrm: (user: any, vertical: any) => boolean;
    parseVertical: (raw: any) => any;
    tables: CrmServiceDeps['tables'];
};

export function createCrmRouter(deps: CrmRouterDeps) {
    const app = new Hono();

    // ── Listing leads ────────────────────────────────────────────────────────

    app.get('/listing-leads', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) {
            return c.json({ ok: false, error: 'Tu plan actual no incluye CRM.' }, 403);
        }

        const statusRaw = c.req.query('status');
        const status = listingLeadStatusSchema.safeParse(statusRaw).success
            ? (statusRaw as ListingLeadStatus)
            : undefined;

        const items = await listListingLeadRecords(deps, {
            vertical,
            status,
            ownerUserId: user.role === 'superadmin' ? undefined : user.id,
        });
        return c.json({ ok: true, items: items.map((item) => listingLeadToResponse(deps, item)) });
    });

    app.get('/listing-leads/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead || lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (!canUserAccessListingLead(user, lead)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        return c.json({ ok: true, ...(await buildListingLeadDetailPayload(deps, lead, user.id)) });
    });

    app.patch('/listing-leads/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead || lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (!canUserAccessListingLead(user, lead)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const result = await updateListingLeadRecord(deps, { actor: user, lead, changes: parsed.data });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);

        return c.json({ ok: true, item: listingLeadToResponse(deps, result.item) });
    });

    app.post('/listing-leads/:id/notes', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadNoteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead || lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (!canUserAccessListingLead(user, lead)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const rows = await deps.db.update(deps.tables.listingLeads).set({
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.listingLeads.id, lead.id)).returning();

        const activity = await createListingLeadActivity(deps, {
            leadId: lead.id,
            actorUserId: user.id,
            type: 'note',
            body: parsed.data.body.trim(),
        });

        return c.json({
            ok: true,
            item: listingLeadToResponse(deps, lead),
            activity: listingLeadActivityToResponse(deps, activity),
        }, 201);
    });

    app.post('/listing-leads/:id/actions', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = leadQuickActionSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getListingLeadById(deps, c.req.param('id'));
        if (!lead || lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (!canUserAccessListingLead(user, lead)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const result = await runListingLeadQuickAction(deps, { actor: user, lead, action: parsed.data.action });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);

        return c.json({
            ok: true,
            item: listingLeadToResponse(deps, result.item),
            activity: listingLeadActivityToResponse(deps, result.activity),
            actionLabel: getLeadQuickActionLabel(parsed.data.action),
        }, 201);
    });

    // ── Pipeline columns ─────────────────────────────────────────────────────

    app.get('/pipeline-columns', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const items = await ensureListingPipelineColumns(deps, user.id, vertical);
        return c.json({ ok: true, items: items.map(pipelineColumnToResponse) });
    });

    app.post('/pipeline-columns', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = pipelineColumnCreateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const columns = await ensureListingPipelineColumns(deps, user.id, vertical);
        const accountId = await deps.getPrimaryAccountIdForUser(user.id);
        const rows = await deps.db.insert(deps.tables.crmPipelineColumns).values({
            accountId,
            userId: user.id,
            vertical,
            scope: 'listing',
            name: parsed.data.name.trim(),
            status: parsed.data.status,
            position: columns.length,
        }).returning();

        const created = rows[0];
        const items = await listPipelineColumns(deps, user.id, vertical, 'listing');
        return c.json({
            ok: true,
            item: pipelineColumnToResponse({ ...created, createdAt: created.createdAt.getTime(), updatedAt: created.updatedAt.getTime() }),
            items: items.map(pipelineColumnToResponse),
        }, 201);
    });

    app.post('/pipeline-columns/reorder', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = pipelineColumnReorderSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const result = await reorderPipelineColumns(deps, user.id, vertical, parsed.data.columnIds);
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);
        return c.json({ ok: true, items: result.items.map(pipelineColumnToResponse) });
    });

    app.patch('/pipeline-columns/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const payload = await c.req.json().catch(() => null);
        const parsed = pipelineColumnUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const column = await getListingPipelineColumnById(deps, c.req.param('id'));
        if (!column || column.userId !== user.id || column.vertical !== vertical || column.scope !== 'listing') {
            return c.json({ ok: false, error: 'Columna no encontrada' }, 404);
        }

        const columns = await ensureListingPipelineColumns(deps, user.id, vertical);
        const nextStatus = parsed.data.status ?? column.status;
        if (nextStatus !== column.status && columns.filter((col) => col.status === column.status).length <= 1) {
            return c.json({ ok: false, error: 'Debe quedar al menos una columna para esa etapa base.' }, 400);
        }

        const rows = await deps.db.update(deps.tables.crmPipelineColumns).set({
            name: parsed.data.name?.trim() ?? column.name,
            status: nextStatus,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.crmPipelineColumns.id, column.id)).returning();

        const updatedRaw = rows[0];
        const updated = { ...updatedRaw, createdAt: updatedRaw.createdAt.getTime(), updatedAt: updatedRaw.updatedAt.getTime() };

        if (nextStatus !== column.status) {
            await deps.db.update(deps.tables.listingLeads).set({
                status: nextStatus,
                updatedAt: new Date(),
            }).where(deps.eq(deps.tables.listingLeads.pipelineColumnId, column.id));
        }

        const items = await listPipelineColumns(deps, user.id, vertical, 'listing');
        return c.json({ ok: true, item: pipelineColumnToResponse(updated), items: items.map(pipelineColumnToResponse) });
    });

    app.delete('/pipeline-columns/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseCrm(user, vertical)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const column = await getListingPipelineColumnById(deps, c.req.param('id'));
        if (!column || column.userId !== user.id || column.vertical !== vertical || column.scope !== 'listing') {
            return c.json({ ok: false, error: 'Columna no encontrada' }, 404);
        }

        const columns = await ensureListingPipelineColumns(deps, user.id, vertical);
        const sameStatus = columns.filter((col) => col.status === column.status);
        if (sameStatus.length <= 1) {
            return c.json({ ok: false, error: 'Debe quedar al menos una columna para esa etapa base.' }, 400);
        }

        const fallback = sameStatus.find((col) => col.id !== column.id) ?? null;
        if (!fallback) return c.json({ ok: false, error: 'No pudimos reasignar los leads de esta columna.' }, 400);

        await deps.db.update(deps.tables.listingLeads).set({
            pipelineColumnId: fallback.id,
            status: fallback.status,
            updatedAt: new Date(),
        }).where(deps.eq(deps.tables.listingLeads.pipelineColumnId, column.id));

        await deps.db.delete(deps.tables.crmPipelineColumns).where(deps.eq(deps.tables.crmPipelineColumns.id, column.id));

        const remaining = (await listPipelineColumns(deps, user.id, vertical, 'listing'))
            .filter((col) => col.id !== column.id)
            .sort((a, b) => a.position - b.position);
        await reorderPipelineColumns(deps, user.id, vertical, remaining.map((col) => col.id));
        const items = await listPipelineColumns(deps, user.id, vertical, 'listing');
        return c.json({ ok: true, items: items.map(pipelineColumnToResponse) });
    });

    // ── Service leads (admin) ────────────────────────────────────────────────

    app.get('/leads', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(user.role)) return c.json({ ok: true, items: [] });

        const requestedVertical = deps.parseVertical(c.req.query('vertical'));
        const scopedVertical: VerticalType = user.role === 'superadmin'
            ? requestedVertical
            : (user.primaryVertical ?? requestedVertical);
        if (!deps.isAdminForVertical(user, scopedVertical)) {
            return c.json({ ok: false, error: 'No autorizado para esta vertical' }, 403);
        }
        const statusRaw = c.req.query('status');
        const status = serviceLeadStatusSchema.safeParse(statusRaw).success
            ? (statusRaw as ServiceLeadStatus)
            : undefined;

        const items = await listServiceLeadRecords(deps, { vertical: scopedVertical, status });
        return c.json({ ok: true, items: items.map((item) => serviceLeadToResponse(deps, item)) });
    });

    app.get('/leads/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const requestedVertical = deps.parseVertical(c.req.query('vertical'));
        const vertical: VerticalType = user.role === 'superadmin'
            ? requestedVertical
            : (user.primaryVertical ?? requestedVertical);
        if (!deps.isAdminForVertical(user, vertical)) {
            return c.json({ ok: false, error: 'No autorizado para esta vertical' }, 403);
        }
        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

        return c.json({ ok: true, ...(await buildServiceLeadDetailPayload(deps, lead)) });
    });

    app.patch('/leads/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const requestedVertical = deps.parseVertical(c.req.query('vertical'));
        const vertical: VerticalType = user.role === 'superadmin'
            ? requestedVertical
            : (user.primaryVertical ?? requestedVertical);
        if (!deps.isAdminForVertical(user, vertical)) {
            return c.json({ ok: false, error: 'No autorizado para esta vertical' }, 403);
        }
        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadUpdateSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

        const result = await updateServiceLeadRecord(deps, { actor: user, lead, changes: parsed.data });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);

        return c.json({ ok: true, item: serviceLeadToResponse(deps, result.item) });
    });

    app.post('/leads/:id/notes', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const requestedVertical = deps.parseVertical(c.req.query('vertical'));
        const vertical: VerticalType = user.role === 'superadmin'
            ? requestedVertical
            : (user.primaryVertical ?? requestedVertical);
        if (!deps.isAdminForVertical(user, vertical)) {
            return c.json({ ok: false, error: 'No autorizado para esta vertical' }, 403);
        }
        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadNoteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

        await deps.db.update(deps.tables.serviceLeads).set({ updatedAt: new Date() })
            .where(deps.eq(deps.tables.serviceLeads.id, lead.id));

        const activity = await createServiceLeadActivity(deps, {
            leadId: lead.id,
            actorUserId: user.id,
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

    app.post('/leads/:id/actions', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        if (!deps.isAdminRole(user.role)) return c.json({ ok: false, error: 'No autorizado' }, 403);

        const requestedVertical = deps.parseVertical(c.req.query('vertical'));
        const vertical: VerticalType = user.role === 'superadmin'
            ? requestedVertical
            : (user.primaryVertical ?? requestedVertical);
        if (!deps.isAdminForVertical(user, vertical)) {
            return c.json({ ok: false, error: 'No autorizado para esta vertical' }, 403);
        }
        const payload = await c.req.json().catch(() => null);
        const parsed = leadQuickActionSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const lead = await getServiceLeadById(deps, c.req.param('id'));
        if (!lead) return c.json({ ok: false, error: 'Lead no encontrado' }, 404);
        if (lead.vertical !== vertical) return c.json({ ok: false, error: 'Lead no disponible en esta vertical.' }, 404);

        const result = await runServiceLeadQuickAction(deps, { actor: user, lead, action: parsed.data.action });
        if (!result.ok) return c.json({ ok: false, error: result.error }, 400);

        return c.json({
            ok: true,
            item: serviceLeadToResponse(deps, result.item),
            activity: serviceLeadActivityToResponse(deps, result.activity),
            actionLabel: getLeadQuickActionLabel(parsed.data.action),
        }, 201);
    });

    return app;
}
