import { Hono } from 'hono';
import type { Context } from 'hono';

export interface LeadsRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    db: any;
    tables: { serviceLeads: any };
    serviceLeadCreateSchema: any;
    listingLeadCreateSchema: any;
    listingLeadActionCreateSchema: any;
    externalListingLeadImportSchema: any;
    portalKeySchema: any;
    mapServiceLeadRow: (row: any) => any;
    serviceLeadToResponse: (lead: any) => any;
    listingLeadToResponse: (lead: any, opts?: any) => any;
    messageThreadToResponse: (thread: any, userId: string, entries: any[]) => any;
    messageEntryToResponse: (entry: any, userId: string) => any;
    createServiceLeadActivity: (opts: any) => Promise<any>;
    isLeadIngestConfigured: () => boolean;
    isLeadIngestAuthorized: (c: Context) => boolean;
    inferPortalFromLeadImportSource: (source: any, portal: any) => any;
    isPortalAvailableForVertical: (vertical: any, portal: any) => boolean;
    resolveListingForImportedLead: (opts: any) => Promise<any>;
    upsertImportedListingLead: (opts: any) => Promise<any>;
    inferListingLeadChannel: (source: any, channel: any) => any;
    getMessageThreadByLeadId: (leadId: string) => Promise<any>;
    listingsById: Map<string, any>;
    getListingById: (id: string) => Promise<any>;
    isPublicListingVisible: (listing: any) => boolean;
    createOrAppendListingConversation: (opts: any) => Promise<any>;
    createListingLeadRecord: (opts: any) => Promise<any>;
    createListingLeadActivity: (opts: any) => Promise<any>;
    createOrRefreshListingLeadAction: (opts: any) => Promise<any>;
}

export function createLeadsRouter(deps: LeadsRouterDeps) {
    const {
        authUser,
        db,
        tables: { serviceLeads },
        serviceLeadCreateSchema,
        listingLeadCreateSchema,
        listingLeadActionCreateSchema,
        externalListingLeadImportSchema,
        portalKeySchema,
        mapServiceLeadRow,
        serviceLeadToResponse,
        listingLeadToResponse,
        messageThreadToResponse,
        messageEntryToResponse,
        createServiceLeadActivity,
        isLeadIngestConfigured,
        isLeadIngestAuthorized,
        inferPortalFromLeadImportSource,
        isPortalAvailableForVertical,
        resolveListingForImportedLead,
        upsertImportedListingLead,
        inferListingLeadChannel,
        getMessageThreadByLeadId,
        listingsById,
        getListingById,
        isPublicListingVisible,
        createOrAppendListingConversation,
        createListingLeadRecord,
        createListingLeadActivity,
        createOrRefreshListingLeadAction,
    } = deps;

    const app = new Hono();

    async function handleImportedListingLeadRequest(c: Context, forcedPortal?: any) {
        if (!isLeadIngestConfigured()) {
            return c.json({ ok: false, error: 'La ingesta externa de leads no está configurada.' }, 503);
        }
        if (!isLeadIngestAuthorized(c)) {
            return c.json({ ok: false, error: 'No autorizado' }, 401);
        }

        const payload = await c.req.json().catch(() => null);
        const rawPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
            ? {
                ...(payload as Record<string, unknown>),
                ...(forcedPortal ? {
                    portal: forcedPortal,
                    source: (payload as Record<string, unknown>).source ?? forcedPortal,
                } : {}),
            }
            : payload;
        const parsed = externalListingLeadImportSchema.safeParse(rawPayload);
        if (!parsed.success) {
            return c.json({
                ok: false,
                error: parsed.error.issues[0]?.message ?? 'Payload inválido',
            }, 400);
        }

        const portal = inferPortalFromLeadImportSource(parsed.data.source, parsed.data.portal);
        if (portal && !isPortalAvailableForVertical(parsed.data.vertical, portal)) {
            return c.json({ ok: false, error: 'Ese portal no está disponible para esta vertical.' }, 400);
        }

        const listing = await resolveListingForImportedLead({
            vertical: parsed.data.vertical,
            portal,
            listingId: parsed.data.listingId,
            listingSlug: parsed.data.listingSlug,
            listingHref: parsed.data.listingHref,
            externalListingId: parsed.data.externalListingId,
        });

        if (!listing || listing.vertical !== parsed.data.vertical) {
            return c.json({ ok: false, error: 'No se encontró la publicación asociada al lead.' }, 404);
        }

        const result = await upsertImportedListingLead({
            listing,
            source: parsed.data.source,
            channel: inferListingLeadChannel(parsed.data.source, parsed.data.channel),
            portal,
            externalListingId: parsed.data.externalListingId,
            externalSourceId: parsed.data.externalSourceId,
            contactName: parsed.data.contactName,
            contactEmail: parsed.data.contactEmail,
            contactPhone: parsed.data.contactPhone,
            contactWhatsapp: parsed.data.contactWhatsapp,
            message: parsed.data.message,
            sourcePage: parsed.data.sourcePage,
            receivedAt: parsed.data.receivedAt,
            meta: parsed.data.meta,
        });

        const thread = await getMessageThreadByLeadId(result.lead.id);
        return c.json({
            ok: true,
            imported: true,
            created: result.created,
            item: listingLeadToResponse(result.lead, { threadId: thread?.id ?? null }),
        }, result.created ? 201 : 200);
    }

    app.post('/service-leads', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = serviceLeadCreateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        if (parsed.data.vertical === 'autos' && parsed.data.serviceType !== 'venta_asistida') {
            return c.json({ ok: false, error: 'Tipo de servicio inválido para la vertical autos.' }, 400);
        }
        if (parsed.data.vertical === 'propiedades' && parsed.data.serviceType !== 'gestion_inmobiliaria') {
            return c.json({ ok: false, error: 'Tipo de servicio inválido para la vertical propiedades.' }, 400);
        }

        const currentUser = await authUser(c);
        const now = new Date();
        const rows = await db.insert(serviceLeads).values({
            userId: currentUser?.id ?? null,
            vertical: parsed.data.vertical,
            serviceType: parsed.data.serviceType,
            planId: parsed.data.planId,
            contactName: parsed.data.contactName.trim(),
            contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
            contactPhone: parsed.data.contactPhone.trim(),
            contactWhatsapp: parsed.data.contactWhatsapp?.trim() || null,
            locationLabel: parsed.data.locationLabel?.trim() || null,
            assetType: parsed.data.assetType?.trim() || null,
            assetBrand: parsed.data.assetBrand?.trim() || null,
            assetModel: parsed.data.assetModel?.trim() || null,
            assetYear: parsed.data.assetYear?.trim() || null,
            assetMileage: parsed.data.assetMileage?.trim() || null,
            assetArea: parsed.data.assetArea?.trim() || null,
            expectedPrice: parsed.data.expectedPrice?.trim() || null,
            notes: parsed.data.notes?.trim() || null,
            status: 'new',
            sourcePage: parsed.data.sourcePage?.trim() || null,
            createdAt: now,
            updatedAt: now,
        }).returning();

        const lead = mapServiceLeadRow(rows[0]);
        await createServiceLeadActivity({
            leadId: lead.id,
            actorUserId: currentUser?.id ?? null,
            type: 'created',
            body: `Lead creado desde ${lead.sourcePage || 'formulario web'}.`,
            meta: {
                vertical: lead.vertical,
                serviceType: lead.serviceType,
                planId: lead.planId,
            },
        });

        return c.json({ ok: true, item: serviceLeadToResponse(lead) }, 201);
    });

    app.post('/integrations/leads/import', async (c) => {
        return handleImportedListingLeadRequest(c);
    });

    app.post('/integrations/portals/:portal/leads', async (c) => {
        const portal = portalKeySchema.safeParse(c.req.param('portal'));
        if (!portal.success) {
            return c.json({ ok: false, error: 'Portal inválido.' }, 400);
        }
        return handleImportedListingLeadRequest(c, portal.data);
    });

    app.post('/listing-leads', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadCreateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
        if (!listing || listing.vertical !== parsed.data.vertical || !isPublicListingVisible(listing)) {
            return c.json({ ok: false, error: 'Publicación no encontrada o no disponible.' }, 404);
        }

        const currentUser = await authUser(c);
        if (currentUser && currentUser.id === listing.ownerId) {
            return c.json({ ok: false, error: 'No puedes consultar tu propia publicación.' }, 400);
        }

        if (currentUser && parsed.data.createThread) {
            const conversation = await createOrAppendListingConversation({
                listing,
                buyer: currentUser,
                contactName: parsed.data.contactName,
                contactEmail: parsed.data.contactEmail,
                contactPhone: parsed.data.contactPhone,
                contactWhatsapp: parsed.data.contactWhatsapp,
                message: parsed.data.message,
                sourcePage: parsed.data.sourcePage,
            });

            return c.json({
                ok: true,
                item: listingLeadToResponse(conversation.lead, { threadId: conversation.thread.id }),
                thread: messageThreadToResponse(conversation.thread, currentUser.id, [conversation.entry]),
                entry: messageEntryToResponse(conversation.entry, currentUser.id),
            }, conversation.createdLead ? 201 : 200);
        }

        const lead = await createListingLeadRecord({
            listingId: listing.id,
            ownerUserId: listing.ownerId,
            buyerUserId: currentUser?.id ?? null,
            vertical: listing.vertical,
            source: 'internal_form',
            channel: 'lead',
            contactName: parsed.data.contactName,
            contactEmail: parsed.data.contactEmail,
            contactPhone: parsed.data.contactPhone,
            contactWhatsapp: parsed.data.contactWhatsapp,
            message: parsed.data.message,
            sourcePage: parsed.data.sourcePage,
        });
        await createListingLeadActivity({
            leadId: lead.id,
            actorUserId: currentUser?.id ?? null,
            type: 'created',
            body: `Lead creado desde ${parsed.data.sourcePage || 'publicación pública'}.`,
            meta: {
                source: 'internal_form',
                channel: 'lead',
            },
        });

        return c.json({ ok: true, item: listingLeadToResponse(lead) }, 201);
    });

    app.post('/listing-leads/actions', async (c) => {
        const payload = await c.req.json().catch(() => null);
        const parsed = listingLeadActionCreateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
        if (!listing || listing.vertical !== parsed.data.vertical || !isPublicListingVisible(listing)) {
            return c.json({ ok: false, error: 'Publicación no encontrada o no disponible.' }, 404);
        }

        const currentUser = await authUser(c);
        if (currentUser && currentUser.id === listing.ownerId) {
            return c.json({ ok: false, error: 'No puedes contactar tu propia publicación.' }, 400);
        }

        const result = await createOrRefreshListingLeadAction({
            listing,
            buyer: currentUser,
            source: parsed.data.source,
            contactName: parsed.data.contactName,
            contactEmail: parsed.data.contactEmail,
            contactPhone: parsed.data.contactPhone,
            contactWhatsapp: parsed.data.contactWhatsapp,
            message: parsed.data.message,
            sourcePage: parsed.data.sourcePage,
        });

        const thread = await getMessageThreadByLeadId(result.lead.id);
        return c.json({
            ok: true,
            created: result.created,
            item: listingLeadToResponse(result.lead, { threadId: thread?.id ?? null }),
        }, result.created ? 201 : 200);
    });

    return app;
}
