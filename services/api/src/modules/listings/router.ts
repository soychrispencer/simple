import { Hono } from 'hono';
import { z } from 'zod';
import type { ListingAccessControl } from './access.js';
import { ListingWriteAuthorizationError } from './persist.js';
import { resolveUniqueListingHref } from './href-slug.js';

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
    /** Lectura panel sin Map en memoria (PostgreSQL directo). */
    getListingByIdFromDb?: (id: string) => Promise<any | null>;
    /** Listado panel desde PostgreSQL (DB-first). */
    listListingsFromDb?: (
        user: { id: string; role: string },
        vertical: unknown,
        mine: boolean,
        accountId?: string | null,
    ) => Promise<any[]>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string>;
    getAccountMembershipsForUser?: (userId: string) => Array<{ accountId: string; role: string }>;
    getAccountMembershipFromDb?: (userId: string) => Promise<{ accountId: string; role: string } | null>;
    isPersonalAccountForUser?: (userId: string, accountId: string) => boolean;
    listingAccessControl: ListingAccessControl;
    getListingTeamContext?: (userId: string, vertical: 'autos' | 'propiedades') => Promise<{
        accountId: string;
        teamEnabled: boolean;
        canManage: boolean;
        members: Array<{ userId: string; role: string; name: string; email: string | null }>;
    } | null>;
    listAccountListingAssignments?: (accountId: string, vertical: 'autos' | 'propiedades') => Promise<Array<{ listingId: string; assignedUserId: string }>>;
    isListingAssignedToUser?: (accountId: string, listingId: string, userId: string) => Promise<boolean>;
    replaceAccountListingAssignments?: (input: {
        accountId: string;
        vertical: 'autos' | 'propiedades';
        listingId: string;
        assignedUserIds: string[];
        assignedByUserId: string;
    }) => Promise<{ ok: true } | { ok: false; error: string; status: 400 | 403 | 404 }>;
    insertListingRecord: (record: any, actor: { id: string }) => Promise<any>;
    saveListingRecord: (record: any, actor: { id: string }) => Promise<any>;
    deleteListingRecord: (id: string, actor: { id: string }) => Promise<void>;
    isListingSlugConflictError: (error: unknown) => boolean;
    listingToResponse: (record: any) => any;
    listingToDetailResponse: (record: any) => any;
    upsertBoostListingFromListing: (listing: any) => void;
    maybeAutoPublishListing: (user: any, listing: any) => Promise<void>;
    isPortalAvailableForVertical: (vertical: any, portal: any) => boolean;
    getPortalCoverage: (listing: any, portal: any) => { missingRequired: string[]; missingRecommended: string[] };
    getPortalSyncView: (listing: any, portal: any) => any;
    buildListingDistribution?: (input: {
        listing: any;
        instagramPublications: any[];
        socialPublications: any[];
    }) => any[];
    getInstagramPublicationsForUser?: (userId: string, vertical?: any) => any[];
    getSocialPublicationsForUser?: (userId: string, vertical?: any) => any[];
    getListingDraftRecord: (userId: string, vertical: any, accountId?: string | null) => Promise<any>;
    upsertListingDraftRecord: (userId: string, vertical: any, draft: unknown, accountId?: string | null) => Promise<any>;
    deleteListingDraftRecord: (userId: string, vertical: any, accountId?: string | null) => Promise<void>;
    generateListingReel?: (input: {
        user: { id: string; role?: string };
        listing: any;
        replaceExisting?: boolean;
    }) => Promise<{ publicUrl: string; sizeBytes: number; durationSeconds: number; slideCount: number }>;
    isReelGeneratorAvailable?: () => boolean;
    checkListingCreationAllowed?: (
        user: { id: string },
        vertical: unknown,
        options?: {
            targetStatus?: string;
            previousStatus?: string;
            photoCount?: number;
            previousPhotoCount?: number;
        },
    ) => string | null | Promise<string | null>;
    schemas: {
        createListingSchema: any;
        updateListingSchema: any;
        updateListingStatusSchema: any;
        publishListingPortalSchema: any;
        trackListingPortalSchema: any;
        listingDraftWriteSchema: any;
        generateListingReelSchema?: any;
    };
};

export function createListingDraftRouter(deps: ListingsRouterDeps) {
    const app = new Hono();
    const getCurrentAccountId = async (userId: string) => deps.getAccountMembershipFromDb
        ? (await deps.getAccountMembershipFromDb(userId))?.accountId ?? null
        : await deps.getPrimaryAccountIdForUser(userId);

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const accountId = await getCurrentAccountId(user.id);
        const item = await deps.getListingDraftRecord(user.id, vertical, accountId);
        return c.json({ ok: true, item });
    });

    app.put('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.listingDraftWriteSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const accountId = await getCurrentAccountId(user.id);
        const item = await deps.upsertListingDraftRecord(user.id, vertical, parsed.data.draft, accountId);
        return c.json({ ok: true, item });
    });

    app.delete('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const accountId = await getCurrentAccountId(user.id);
        await deps.deleteListingDraftRecord(user.id, vertical, accountId);
        return c.json({ ok: true });
    });

    return app;
}

export function createListingsRouter(deps: ListingsRouterDeps) {
    const app = new Hono();
    const getCurrentAccountId = async (userId: string) => deps.getAccountMembershipFromDb
        ? (await deps.getAccountMembershipFromDb(userId))?.accountId ?? null
        : await deps.getPrimaryAccountIdForUser(userId);

    function listingPhotoCount(rawData: unknown): number {
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return 0;
        const record = rawData as Record<string, unknown>;
        const media = record.media && typeof record.media === 'object' && !Array.isArray(record.media)
            ? record.media as Record<string, unknown>
            : null;
        const photos = media?.photos ?? record.photos;
        return Array.isArray(photos) ? photos.length : 0;
    }

    const { canManageListing, canDeleteListing } = deps.listingAccessControl;

    async function runListingWrite<T>(c: any, action: () => Promise<T>) {
        try {
            return { ok: true as const, value: await action() };
        } catch (error) {
            if (error instanceof ListingWriteAuthorizationError) {
                return { ok: false as const, response: c.json({ ok: false, error: error.message }, error.status) };
            }
            throw error;
        }
    }

    async function resolvePanelListing(listingId: string) {
        if (deps.getListingByIdFromDb) {
            return deps.getListingByIdFromDb(listingId);
        }
        return deps.listingsById.get(listingId) ?? await deps.getListingById(listingId);
    }

    app.get('/assignments', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (vertical !== 'propiedades') return c.json({ ok: false, error: 'Esta asignación está disponible para SimplePropiedades.' }, 400);
        const context = await deps.getListingTeamContext?.(user.id, vertical);
        if (!context) return c.json({ ok: false, error: 'No encontramos tu espacio activo.' }, 403);
        if (!context.teamEnabled) return c.json({ ok: true, enabled: false, canManage: false, assignments: [], members: [] });
        if (!context.canManage) return c.json({ ok: false, error: 'Solo quien administra el espacio puede organizar la cartera del equipo.' }, 403);
        const assignments = await deps.listAccountListingAssignments?.(context.accountId, vertical) ?? [];
        return c.json({
            ok: true,
            enabled: true,
            canManage: true,
            members: context.members,
            assignments,
        });
    });

    app.put('/assignments/:listingId', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const listingId = c.req.param('listingId') ?? '';
        if (!z.string().uuid().safeParse(listingId).success) return c.json({ ok: false, error: 'Publicación no válida.' }, 400);
        const payload = await c.req.json().catch(() => null);
        const parsed = z.object({
            vertical: z.literal('propiedades'),
            assignedUserIds: z.array(z.string().uuid()).max(100),
        }).safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Selecciona integrantes válidos para la publicación.' }, 400);

        const context = await deps.getListingTeamContext?.(user.id, parsed.data.vertical);
        if (!context?.teamEnabled || !context.canManage) {
            return c.json({ ok: false, error: 'Solo quien administra un espacio de empresa puede asignar publicaciones.' }, 403);
        }
        const listing = await resolvePanelListing(listingId);
        if (!listing || listing.accountId !== context.accountId || listing.vertical !== parsed.data.vertical) {
            return c.json({ ok: false, error: 'La publicación no pertenece a este espacio.' }, 404);
        }
        const assignedUserIds = [...new Set(parsed.data.assignedUserIds)];
        if (assignedUserIds.some((id) => !context.members.some((member) => member.userId === id))) {
            return c.json({ ok: false, error: 'Hay una persona seleccionada que ya no pertenece a este equipo.' }, 400);
        }
        if (!deps.replaceAccountListingAssignments) {
            return c.json({ ok: false, error: 'La asignación de publicaciones no está disponible.' }, 503);
        }
        const result = await deps.replaceAccountListingAssignments({
            accountId: context.accountId,
            vertical: parsed.data.vertical,
            listingId,
            assignedUserIds,
            assignedByUserId: user.id,
        });
        if (!result.ok) return c.json({ ok: false, error: result.error }, result.status);
        return c.json({ ok: true, assignedUserIds });
    });

    // ── Listings ──────────────────────────────────────────────────────────────

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const mine = c.req.query('mine') !== 'false';
        const accountId = await getCurrentAccountId(user.id);

        let records: any[];
        if (deps.listListingsFromDb) {
            records = await deps.listListingsFromDb(user, vertical, mine, accountId);
        } else {
            const candidates = Array.from(deps.listingsById.values())
                .filter((listing) => listing.vertical === vertical);
            const visibility = await Promise.all(candidates.map(async (listing) => ({
                listing,
                visible: await canManageListing(user, listing),
            })));
            records = visibility
                .filter((item) => item.visible)
                .map((item) => item.listing)
                .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
        }

        const items = await Promise.all(records.map(async (listing: any) => ({
            ...deps.listingToResponse(listing),
            canDelete: await canDeleteListing(user, listing),
        })));

        return c.json({ ok: true, items });
    });

    app.post('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.createListingSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const vertical = parsed.data.vertical;
        const nextStatus = deps.parseListingStatus(parsed.data.status);
        const limitError = await deps.checkListingCreationAllowed?.(user, vertical, {
            targetStatus: nextStatus,
            photoCount: listingPhotoCount(parsed.data.rawData),
        });
        if (limitError) return c.json({ ok: false, error: limitError }, 403);

        const section = deps.parseListingSection(parsed.data.listingType, vertical);
        const now = Date.now();
        const listingId = deps.makeListingId();
        const locationData = deps.normalizeListingLocation(parsed.data.locationData);
        const locationLabel = locationData?.publicLabel || parsed.data.location?.trim() || undefined;
        const href = await resolveUniqueListingHref({
            vertical,
            listingId,
            href: parsed.data.href,
        });

        const record: any = {
            accountId: await getCurrentAccountId(user.id),
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
            href,
            status: nextStatus,
            views: 0,
            favs: 0,
            leads: 0,
            createdAt: now,
            updatedAt: now,
            rawData: deps.stripStoredListingMetadata(parsed.data.rawData),
            integrations: {},
            videoUrl: parsed.data.videoUrl || null,
            videoThumbnailUrl: parsed.data.videoThumbnailUrl || null,
        };

        try {
            const write = await runListingWrite(c, () => deps.insertListingRecord(record, user));
            if (!write.ok) return write.response;
            const persisted = write.value;
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
        const listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        return c.json({
            ok: true,
            item: {
                ...deps.listingToDetailResponse(listing),
                canDelete: await canDeleteListing(user, listing),
                distribution: deps.buildListingDistribution
                    ? deps.buildListingDistribution({
                        listing,
                        instagramPublications: deps.getInstagramPublicationsForUser?.(user.id, listing.vertical) ?? [],
                        socialPublications: deps.getSocialPublicationsForUser?.(user.id, listing.vertical) ?? [],
                    })
                    : [],
            },
        });
    });

    app.put('/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.updateListingSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const nextStatus = parsed.data.status ?? listing.status;
        const previousPhotoCount = listingPhotoCount(listing.rawData);
        const nextPhotoCount = listingPhotoCount(parsed.data.rawData);
        const limitError = await deps.checkListingCreationAllowed?.(user, listing.vertical, {
            targetStatus: nextStatus,
            previousStatus: listing.status,
            photoCount: nextPhotoCount,
            previousPhotoCount,
        });
        if (limitError) return c.json({ ok: false, error: limitError }, 403);

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
        listing.href = await resolveUniqueListingHref({
            vertical: listing.vertical,
            listingId: listing.id,
            href: parsed.data.href,
            excludeListingId: listing.id,
        });
        listing.rawData = deps.stripStoredListingMetadata(parsed.data.rawData);
        listing.videoUrl = parsed.data.videoUrl ?? listing.videoUrl;
        listing.videoThumbnailUrl = parsed.data.videoThumbnailUrl ?? listing.videoThumbnailUrl;
        listing.status = nextStatus;
        listing.updatedAt = Date.now();

        try {
            const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
            if (!write.ok) return write.response;
            listing = write.value;
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
        let listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.publishListingPortalSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const portal = parsed.data.portal;
        if (!deps.isPortalAvailableForVertical(listing.vertical, portal)) {
            return c.json({ ok: false, error: 'Este portal no está disponible para esta vertical.' }, 400);
        }
        if (portal === 'facebook') {
            return c.json({
                ok: false,
                error: 'Facebook Marketplace se publica de forma manual. Usa el asistente y marca el aviso cuando esté en Marketplace.',
                code: 'manual_portal',
            }, 400);
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
                externalUrl: null,
                lastError: 'Faltan campos requeridos para este portal.',
            };
            listing.updatedAt = now;
            const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
            if (!write.ok) return write.response;
            listing = write.value;
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
            externalUrl: null,
            lastError: null,
        };
        listing.updatedAt = now;
        const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
        if (!write.ok) return write.response;
        listing = write.value;

        return c.json({
            ok: true,
            portal,
            integration: deps.getPortalSyncView(listing, portal),
        });
    });

    app.post('/:id/integrations/track', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.trackListingPortalSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const portal = parsed.data.portal;
        if (!deps.isPortalAvailableForVertical(listing.vertical, portal)) {
            return c.json({ ok: false, error: 'Este portal no está disponible para esta vertical.' }, 400);
        }
        if (portal !== 'facebook') {
            return c.json({ ok: false, error: 'Solo Facebook Marketplace admite seguimiento manual por ahora.' }, 400);
        }

        const rawExternalUrl = parsed.data.externalUrl?.trim() ?? '';
        const externalUrl = rawExternalUrl
            ? (rawExternalUrl.startsWith('http://') || rawExternalUrl.startsWith('https://') ? rawExternalUrl : null)
            : null;
        if (rawExternalUrl && !externalUrl) {
            return c.json({ ok: false, error: 'El enlace de Marketplace debe comenzar con http:// o https://' }, 400);
        }

        const now = Date.now();
        const existing = listing.integrations[portal];

        if (parsed.data.action === 'clear') {
            delete listing.integrations[portal];
            listing.updatedAt = now;
            const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
            if (!write.ok) return write.response;
            listing = write.value;
            return c.json({
                ok: true,
                portal,
                integration: deps.getPortalSyncView(listing, portal),
                distribution: deps.buildListingDistribution
                    ? deps.buildListingDistribution({
                        listing,
                        instagramPublications: deps.getInstagramPublicationsForUser?.(user.id, listing.vertical) ?? [],
                        socialPublications: deps.getSocialPublicationsForUser?.(user.id, listing.vertical) ?? [],
                    })
                    : [],
            });
        }

        listing.integrations[portal] = {
            portal,
            status: 'published',
            lastAttemptAt: now,
            publishedAt: existing?.publishedAt ?? now,
            externalId: existing?.externalId ?? `manual-${listing.id}-${now}`,
            externalUrl: externalUrl ?? existing?.externalUrl ?? null,
            lastError: null,
        };
        listing.updatedAt = now;
        const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
        if (!write.ok) return write.response;
        listing = write.value;

        return c.json({
            ok: true,
            portal,
            integration: deps.getPortalSyncView(listing, portal),
            distribution: deps.buildListingDistribution
                ? deps.buildListingDistribution({
                    listing,
                    instagramPublications: deps.getInstagramPublicationsForUser?.(user.id, listing.vertical) ?? [],
                    socialPublications: deps.getSocialPublicationsForUser?.(user.id, listing.vertical) ?? [],
                })
                : [],
        });
    });

    app.post('/:id/generate-reel', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        if (!deps.generateListingReel || !deps.isReelGeneratorAvailable?.()) {
            return c.json({ ok: false, error: 'El generador de video no está disponible en este entorno.' }, 503);
        }

        const listingId = c.req.param('id') ?? '';
        let listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }
        if (listing.status !== 'active') {
            return c.json({ ok: false, error: 'Solo puedes generar video para avisos activos.' }, 409);
        }

        const payload = await c.req.json().catch(() => ({}));
        const parsed = deps.schemas.generateListingReelSchema?.safeParse(payload);
        if (parsed && !parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        try {
            const write = await runListingWrite(c, () => deps.generateListingReel!({
                user,
                listing,
                replaceExisting: parsed?.success ? parsed.data.replaceExisting : false,
            }));
            if (!write.ok) return write.response;
            const result = write.value;
            listing = await resolvePanelListing(listingId);
            return c.json({
                ok: true,
                videoUrl: result.publicUrl,
                durationSeconds: result.durationSeconds,
                slideCount: result.slideCount,
                item: listing ? deps.listingToDetailResponse(listing) : undefined,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo generar el video.';
            return c.json({ ok: false, error: message }, 422);
        }
    });

    app.patch('/:id/status', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
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

        const limitError = await deps.checkListingCreationAllowed?.(user, listing.vertical, {
            targetStatus: nextStatus,
            previousStatus: currentStatus,
            photoCount: listingPhotoCount(listing.rawData),
            previousPhotoCount: listingPhotoCount(listing.rawData),
        });
        if (limitError) return c.json({ ok: false, error: limitError }, 403);

        listing.status = nextStatus;
        listing.updatedAt = Date.now();
        const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
        if (!write.ok) return write.response;
        listing = write.value;
        void deps.maybeAutoPublishListing(user, listing);

        return c.json({ ok: true, item: deps.listingToResponse(listing) });
    });

    app.delete('/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        const listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canDeleteListing(user, listing)) {
            return c.json({ ok: false, error: 'Solo quien administra el espacio puede eliminar una publicación.' }, 403);
        }

        const write = await runListingWrite(c, () => deps.deleteListingRecord(listingId, user));
        if (!write.ok) return write.response;
        return c.json({ ok: true });
    });

    app.post('/:id/renew', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const listingId = c.req.param('id') ?? '';
        let listing = await resolvePanelListing(listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (!await canManageListing(user, listing)) {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        if (listing.status === 'sold' || listing.status === 'archived') {
            return c.json({ ok: false, error: 'Este aviso ya está cerrado y no puede renovarse.' }, 409);
        }

        if (listing.status === 'draft') {
            const limitError = await deps.checkListingCreationAllowed?.(user, listing.vertical, {
                targetStatus: 'active',
                previousStatus: 'draft',
                photoCount: listingPhotoCount(listing.rawData),
                previousPhotoCount: listingPhotoCount(listing.rawData),
            });
            if (limitError) return c.json({ ok: false, error: limitError }, 403);
        }

        listing.updatedAt = Date.now();
        if (listing.status === 'draft') {
            listing.status = 'active';
        }
        const write = await runListingWrite(c, () => deps.saveListingRecord(listing, user));
        if (!write.ok) return write.response;
        listing = write.value;
        void deps.maybeAutoPublishListing(user, listing);

        return c.json({ ok: true, item: deps.listingToResponse(listing) });
    });

    return app;
}
