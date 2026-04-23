import { Hono } from 'hono';

export type ListingsRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    parseVertical: (v: any) => any;
    parseListingSection: (listingType: any, vertical: any) => any;
    parseListingStatus: (status: any) => any;
    normalizeListingLocation: (data: unknown) => any;
    listingDefaultHref: (vertical: any, id: string) => string;
    stripStoredListingMetadata: (data: unknown) => any;
    makeListingId: () => string;
    listingsById: Map<string, any>;
    listingIdsByUser: Map<string, string[]>;
    getListingById: (id: string) => Promise<any | null>;
    insertListingRecord: (record: any) => Promise<any>;
    saveListingRecord: (record: any) => Promise<any>;
    deleteListingRecord: (id: string) => Promise<void>;
    isListingSlugConflictError: (error: unknown) => boolean;
    listingToResponse: (record: any) => any;
    listingToDetailResponse: (record: any) => any;
    upsertBoostListingFromListing: (listing: any) => void;
    maybeAutoPublishListing: (user: any, listing: any) => Promise<void>;
    isPortalAvailableForVertical: (vertical: any, portal: any) => boolean;
    getPortalCoverage: (listing: any, portal: any) => { missingRequired: string[]; missingRecommended: string[] };
    getPortalSyncView: (listing: any, portal: any) => any;
    getListingDraftRecord: (userId: string, vertical: any) => Promise<any>;
    upsertListingDraftRecord: (userId: string, vertical: any, draft: unknown) => Promise<any>;
    deleteListingDraftRecord: (userId: string, vertical: any) => Promise<void>;
    schemas: {
        createListingSchema: any;
        updateListingSchema: any;
        updateListingStatusSchema: any;
        publishListingPortalSchema: any;
        listingDraftWriteSchema: any;
    };
};

export function createListingDraftRouter(deps: ListingsRouterDeps) {
    const app = new Hono();

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const item = await deps.getListingDraftRecord(user.id, vertical);
        return c.json({ ok: true, item });
    });

    app.put('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.listingDraftWriteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const item = await deps.upsertListingDraftRecord(user.id, vertical, parsed.data.draft);
        return c.json({ ok: true, item });
    });

    app.delete('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        await deps.deleteListingDraftRecord(user.id, vertical);
        return c.json({ ok: true });
    });

    return app;
}

export function createListingsRouter(deps: ListingsRouterDeps) {
    const app = new Hono();

    // ── Listings ──────────────────────────────────────────────────────────────

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const mine = c.req.query('mine') !== 'false';

        const items = Array.from(deps.listingsById.values())
            .filter((listing) => listing.vertical === vertical)
            .filter((listing) => {
                if (!mine) return user.role === 'superadmin' ? true : listing.ownerId === user.id;
                return listing.ownerId === user.id;
            })
            .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
            .map((listing: any) => deps.listingToResponse(listing));

        return c.json({ ok: true, items });
    });

    app.post('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.createListingSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const vertical = parsed.data.vertical;
        const section = deps.parseListingSection(parsed.data.listingType, vertical);
        const now = Date.now();
        const listingId = deps.makeListingId();
        const locationData = deps.normalizeListingLocation(parsed.data.locationData);
        const locationLabel = locationData?.publicLabel || parsed.data.location?.trim() || undefined;

        const record: any = {
            id: listingId,
            ownerId: user.id,
            vertical,
            section,
            listingType: section,
            title: parsed.data.title.trim(),
            description: parsed.data.description.trim(),
            price: parsed.data.priceLabel.trim(),
            location: locationLabel,
            locationData,
            href: parsed.data.href?.trim() || deps.listingDefaultHref(vertical, listingId),
            status: deps.parseListingStatus(parsed.data.status),
            views: 0,
            favs: 0,
            leads: 0,
            createdAt: now,
            updatedAt: now,
            rawData: deps.stripStoredListingMetadata(parsed.data.rawData),
            integrations: {},
        };

        try {
            const persisted = await deps.insertListingRecord(record);
            const current = deps.listingIdsByUser.get(user.id) ?? [];
            deps.listingIdsByUser.set(user.id, [persisted.id, ...current]);
            deps.upsertBoostListingFromListing(persisted);
            void deps.maybeAutoPublishListing(user, persisted);

            return c.json({ ok: true, item: deps.listingToResponse(persisted) }, 201);
        } catch (error) {
            if (deps.isListingSlugConflictError(error)) {
                return c.json({ ok: false, error: 'Ya existe una publicación con ese enlace.' }, 409);
            }
            throw error;
        }
    });

    app.get('/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        const listing = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        return c.json({ ok: true, item: deps.listingToDetailResponse(listing) });
    });

    app.put('/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.updateListingSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const locationData = deps.normalizeListingLocation(parsed.data.locationData);
        const locationLabel = locationData?.publicLabel || parsed.data.location?.trim() || undefined;
        const nextSection = deps.parseListingSection(parsed.data.listingType, listing.vertical);
        listing.section = nextSection;
        listing.listingType = nextSection;
        listing.title = parsed.data.title;
        listing.description = parsed.data.description;
        listing.price = parsed.data.priceLabel;
        listing.location = locationLabel;
        listing.locationData = locationData;
        listing.href = parsed.data.href?.trim() || deps.listingDefaultHref(listing.vertical, listing.id);
        listing.rawData = deps.stripStoredListingMetadata(parsed.data.rawData);
        if (parsed.data.status) {
            listing.status = parsed.data.status;
        }
        listing.updatedAt = Date.now();

        try {
            listing = await deps.saveListingRecord(listing);
            deps.upsertBoostListingFromListing(listing);
            void deps.maybeAutoPublishListing(user, listing);

            return c.json({ ok: true, item: deps.listingToDetailResponse(listing) });
        } catch (error) {
            if (deps.isListingSlugConflictError(error)) {
                return c.json({ ok: false, error: 'Ya existe una publicación con ese enlace.' }, 409);
            }
            throw error;
        }
    });

    app.post('/:id/integrations/publish', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.publishListingPortalSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const portal = parsed.data.portal;
        if (!deps.isPortalAvailableForVertical(listing.vertical, portal)) {
            return c.json({ ok: false, error: 'Este portal no está disponible para esta vertical.' }, 400);
        }
        const coverage = deps.getPortalCoverage(listing, portal);
        const now = Date.now();

        if (coverage.missingRequired.length > 0) {
            listing.integrations[portal] = {
                portal,
                status: 'failed',
                lastAttemptAt: now,
                publishedAt: null,
                externalId: null,
                lastError: 'Faltan campos requeridos para este portal.',
            };
            listing.updatedAt = now;
            listing = await deps.saveListingRecord(listing);
            return c.json(
                {
                    ok: false,
                    error: 'Faltan campos requeridos para este portal.',
                    portal,
                    missingRequired: coverage.missingRequired,
                    missingRecommended: coverage.missingRecommended,
                    integration: deps.getPortalSyncView(listing, portal),
                },
                422
            );
        }

        listing.integrations[portal] = {
            portal,
            status: 'published',
            lastAttemptAt: now,
            publishedAt: now,
            externalId: `${portal}-${listing.id}-${now}`,
            lastError: null,
        };
        listing.updatedAt = now;
        listing = await deps.saveListingRecord(listing);

        return c.json({
            ok: true,
            portal,
            integration: deps.getPortalSyncView(listing, portal),
        });
    });

    app.patch('/:id/status', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.updateListingStatusSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const nextStatus = parsed.data.status;
        const currentStatus = listing.status;
        const invalid = currentStatus === 'archived' && nextStatus !== currentStatus;

        if (invalid) {
            return c.json({ ok: false, error: 'Este aviso ya está cerrado y no puede cambiar de estado desde el panel.' }, 409);
        }

        if (currentStatus === nextStatus) {
            return c.json({ ok: true, item: deps.listingToResponse(listing) });
        }

        listing.status = nextStatus;
        listing.updatedAt = Date.now();
        listing = await deps.saveListingRecord(listing);
        void deps.maybeAutoPublishListing(user, listing);

        return c.json({ ok: true, item: deps.listingToResponse(listing) });
    });

    app.delete('/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        const listing = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        await deps.deleteListingRecord(listingId);
        return c.json({ ok: true });
    });

    app.post('/:id/renew', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        if (listing.status === 'sold' || listing.status === 'archived') {
            return c.json({ ok: false, error: 'Este aviso ya está cerrado y no puede renovarse.' }, 409);
        }

        listing.updatedAt = Date.now();
        if (listing.status === 'draft') {
            listing.status = 'active';
        }
        listing = await deps.saveListingRecord(listing);
        void deps.maybeAutoPublishListing(user, listing);

        return c.json({ ok: true, item: deps.listingToResponse(listing) });
    });

    return app;
}
