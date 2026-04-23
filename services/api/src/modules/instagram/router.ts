import { Hono } from 'hono';
import type { Context } from 'hono';

export interface InstagramRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    asString: (v: any) => string;
    asObject: (v: any) => Record<string, unknown>;
    asNumber: (v: any, fallback?: number) => number;
    logDebug: (msg: string) => void;
    listingsById: Map<string, any>;
    getListingById: (id: string) => Promise<any>;
    getInstagramAccount: (userId: string, vertical: any) => any;
    getInstagramAccountByVertical: (vertical: any) => Promise<any>;
    resolveBrowserOrigin: (c: Context) => string | null;
    isInstagramConfigured: () => boolean;
    userCanUseInstagram: (user: any, vertical: any) => boolean;
    getEffectivePlanId: (user: any, vertical: any) => string;
    getInstagramRequiredPlanIds: () => string[];
    instagramAccountToResponse: (account: any) => any;
    getInstagramPublicationsForUser: (userId: string, vertical: any) => any[];
    instagramPublicationToResponse: (item: any) => any;
    sanitizeBrowserReturnUrl: (url: string, fallback: string) => string;
    randomBytes: (size: number) => Buffer;
    setInstagramState: (c: Context, payload: any) => void;
    makeInstagramStatePayload: (opts: any) => any;
    buildInstagramAuthorizationUrl: (opts: any) => string;
    consumeInstagramState: (c: Context) => any;
    parseInstagramStatePayload: (raw: any) => any;
    defaultOrigin: string;
    safeEqualStrings: (a: string, b: string) => boolean;
    getUserById: (id: string) => Promise<any>;
    canAuthenticateUser: (user: any) => boolean;
    exchangeInstagramCode: (code: string) => Promise<any>;
    exchangeToLongLivedToken: (token: string) => Promise<any>;
    getInstagramBusinessAccounts: (token: string) => Promise<any[]>;
    upsertInstagramAccountRecord: (opts: any) => Promise<any>;
    instagramSettingsSchema: any;
    updateInstagramAccountSettings: (userId: string, vertical: any, settings: any) => Promise<any>;
    disconnectInstagramAccount: (userId: string, vertical: any) => Promise<void>;
    instagramPublishSchema: any;
    publishListingToInstagram: (user: any, listing: any, opts: any) => Promise<any>;
    extractListingMediaUrls: (listing: any) => string[];
    getInstagramBasePublicOrigin: () => string;
    instagramEnhancedPublishSchema: any;
    buildInstagramListingData: (listing: any) => any;
    generateSmartTemplates: (data: any) => any;
    // Analytics dependencies
    getInstagramInsights: (instagramUserId: string, accessToken: string, listingId?: string, dateRange?: { from: Date; to: Date } | undefined) => Promise<any>;
    createABTestCampaign: (listing: any, baseContent: any, variations: any[]) => Promise<any>;
    analyzeABTestResults: (campaignId: string) => Promise<any>;
    scheduleInstagramPost: (listingData: any, content: any, options: any) => Promise<any>;
    getSchedulingInsights: (history: any[], posts: any[]) => any;
    optimizeInstagramContent: (instagramUserId: string, accessToken: string, publicationId: string, currentContent: any, listing: any) => Promise<any>;
    InstagramSchedulerService: { getUpcomingPosts: (posts: any[], hoursAhead: number) => any[] };
    tables: {
        instagramAccounts: any;
        instagramPublications: any;
        listings: any;
    };
    db: {
        query: {
            listings: { findFirst: (opts: any) => Promise<any> };
        };
    };
    dbHelpers: {
        eq: any;
    };
}

export function createInstagramRouter(deps: InstagramRouterDeps) {
    const {
        authUser,
        parseVertical,
        asString,
        asObject,
        logDebug,
        listingsById,
        getListingById,
        getInstagramAccount,
        resolveBrowserOrigin,
        isInstagramConfigured,
        userCanUseInstagram,
        getEffectivePlanId,
        getInstagramRequiredPlanIds,
        instagramAccountToResponse,
        getInstagramPublicationsForUser,
        instagramPublicationToResponse,
        sanitizeBrowserReturnUrl,
        randomBytes,
        setInstagramState,
        makeInstagramStatePayload,
        buildInstagramAuthorizationUrl,
        consumeInstagramState,
        parseInstagramStatePayload,
        defaultOrigin,
        safeEqualStrings,
        getUserById,
        canAuthenticateUser,
        exchangeInstagramCode,
        exchangeToLongLivedToken,
        getInstagramBusinessAccounts,
        upsertInstagramAccountRecord,
        instagramSettingsSchema,
        updateInstagramAccountSettings,
        disconnectInstagramAccount,
        instagramPublishSchema,
        publishListingToInstagram,
        extractListingMediaUrls,
        getInstagramBasePublicOrigin,
        instagramEnhancedPublishSchema,
        buildInstagramListingData,
        generateSmartTemplates,
    } = deps;

    const app = new Hono();

    app.get('/', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        const account = getInstagramAccount(user.id, vertical);
        const origin = resolveBrowserOrigin(c);
        const fallbackReturn = origin ? `${origin}/panel/configuracion#integraciones` : null;

        return c.json({
            ok: true,
            vertical,
            configured: isInstagramConfigured(),
            eligible: userCanUseInstagram(user, vertical),
            currentPlanId: getEffectivePlanId(user, vertical),
            requiredPlanIds: getInstagramRequiredPlanIds(),
            connectUrl: fallbackReturn
                ? `/api/integrations/instagram/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(fallbackReturn)}`
                : null,
            account: instagramAccountToResponse(account),
            recentPublications: getInstagramPublicationsForUser(user.id, vertical)
                .slice(0, 8)
                .map((item: any) => instagramPublicationToResponse(item)),
        });
    });

    app.get('/connect', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(c.req.query('vertical'));
        if (!userCanUseInstagram(user, vertical)) {
            return c.json({ ok: false, error: 'Instagram está disponible solo para planes Pro y Empresa.' }, 403);
        }
        if (!isInstagramConfigured()) {
            return c.json({ ok: false, error: 'Instagram no está configurado en este entorno.' }, 503);
        }

        const origin = resolveBrowserOrigin(c);
        if (!origin) {
            return c.json({ ok: false, error: 'Origin no autorizado' }, 403);
        }

        const fallbackReturn = `${origin}/panel/configuracion#integraciones`;
        const returnTo = sanitizeBrowserReturnUrl(asString(c.req.query('returnTo')) || fallbackReturn, fallbackReturn);
        const nonce = randomBytes(24).toString('hex');
        setInstagramState(c, makeInstagramStatePayload({
            nonce,
            userId: user.id,
            vertical,
            returnTo,
        }));

        return c.redirect(buildInstagramAuthorizationUrl({ state: nonce }));
    });

    app.get('/callback', async (c) => {
        const rawStatePayload = consumeInstagramState(c);
        const statePayload = parseInstagramStatePayload(rawStatePayload);
        const fallbackOrigin = defaultOrigin;
        const fallbackReturn = `${fallbackOrigin}/panel/configuracion#integraciones`;
        const returnTo = statePayload?.returnTo || fallbackReturn;

        const redirectWithStatus = (status: 'connected' | 'error', message?: string) => {
            const target = new URL(sanitizeBrowserReturnUrl(returnTo, fallbackReturn));
            target.searchParams.set('instagram', status);
            if (message) {
                target.searchParams.set('instagramMessage', message);
            }
            if (!target.hash) {
                target.hash = '#integraciones';
            }
            return c.redirect(target.toString());
        };

        const code = asString(c.req.query('code'));
        const state = asString(c.req.query('state'));
        const errorReason = asString(c.req.query('error_reason')) || asString(c.req.query('error_description')) || asString(c.req.query('error'));

        if (errorReason) {
            return redirectWithStatus('error', errorReason);
        }
        if (!statePayload || !state || !safeEqualStrings(statePayload.nonce, state)) {
            return redirectWithStatus('error', 'La sesión de conexión con Instagram expiró. Intenta nuevamente.');
        }
        if (!code) {
            return redirectWithStatus('error', 'Instagram no devolvió un código de autorización válido.');
        }

        const user = await getUserById(statePayload.userId);
        if (!user || !canAuthenticateUser(user)) {
            return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar Instagram.');
        }
        if (!userCanUseInstagram(user, statePayload.vertical)) {
            return redirectWithStatus('error', 'Instagram está disponible solo para planes Pro y Empresa.');
        }
        if (!isInstagramConfigured()) {
            return redirectWithStatus('error', 'Instagram no está configurado en este entorno.');
        }

        try {
            const exchanged = await exchangeInstagramCode(code);
            let accessToken = exchanged.accessToken;
            let tokenExpiresAt = exchanged.expiresInSeconds ? Date.now() + exchanged.expiresInSeconds * 1000 : null;

            const longLived = await exchangeToLongLivedToken(accessToken);
            if (longLived?.accessToken) {
                accessToken = longLived.accessToken;
                tokenExpiresAt = longLived.expiresInSeconds ? Date.now() + longLived.expiresInSeconds * 1000 : tokenExpiresAt;
            }

            const accounts = await getInstagramBusinessAccounts(accessToken);
            if (accounts.length === 0) {
                return redirectWithStatus('error', 'No encontramos ninguna cuenta de Instagram Business vinculada a tus páginas de Facebook. Asegúrate de tener una cuenta Profesional (Business/Creator) vinculada a una Página.');
            }

            const profile = accounts[0];
            await upsertInstagramAccountRecord({
                userId: user.id,
                vertical: statePayload.vertical,
                instagramUserId: profile.instagramUserId,
                username: profile.username,
                displayName: profile.displayName,
                accountType: profile.accountType,
                profilePictureUrl: profile.profilePictureUrl,
                accessToken,
                tokenExpiresAt,
                scopes: exchanged.scopes,
                status: 'connected',
                lastSyncedAt: Date.now(),
                lastError: null,
            });

            return redirectWithStatus('connected', `Cuenta @${profile.username} conectada correctamente.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo conectar con Instagram.';
            return redirectWithStatus('error', message);
        }
    });

    app.post('/settings', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = instagramSettingsSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const vertical = parsed.data.vertical;
        if (!userCanUseInstagram(user, vertical)) {
            return c.json({ ok: false, error: 'Instagram está disponible solo para planes Pro y Empresa.' }, 403);
        }

        const updated = await updateInstagramAccountSettings(user.id, vertical, {
            autoPublishEnabled: parsed.data.autoPublishEnabled,
            captionTemplate: parsed.data.captionTemplate === undefined ? undefined : (parsed.data.captionTemplate || null),
            lastSyncedAt: Date.now(),
        });

        if (!updated) {
            return c.json({ ok: false, error: 'Primero conecta una cuenta de Instagram.' }, 404);
        }

        return c.json({ ok: true, account: instagramAccountToResponse(updated) });
    });

    app.post('/disconnect', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(asString(asObject(await c.req.json().catch(() => null)).vertical) || c.req.query('vertical'));
        await disconnectInstagramAccount(user.id, vertical);
        return c.json({ ok: true });
    });

    app.post('/publish', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        logDebug(`[instagram] publish request: ${JSON.stringify(payload)}`);

        const parsed = instagramPublishSchema.safeParse(payload);
        if (!parsed.success) {
            logDebug(`[instagram] validation failed: ${JSON.stringify(parsed.error.format())}`);
            return c.json({ ok: false, error: 'Payload inválido', details: parsed.error.format() }, 400);
        }

        const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
        if (!listing) {
            logDebug(`[instagram] listing not found: ${parsed.data.listingId}`);
            return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        }
        if (listing.vertical !== parsed.data.vertical) {
            return c.json({ ok: false, error: 'La publicación no corresponde a esta vertical.' }, 409);
        }
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        try {
            const publication = await publishListingToInstagram(user, listing, {
                captionOverride: parsed.data.captionOverride ?? null,
            });
            return c.json({ ok: true, publication });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo publicar en Instagram.';
            logDebug(`[instagram] publish error: ${message}`);
            const status = message.includes('Pro y Empresa')
                ? 403
                : message.includes('conecta una cuenta')
                    ? 409
                    : message.includes('API público HTTPS')
                        ? 503
                        : 400;
            return c.json({ ok: false, error: message }, status as any);
        }
    });

    app.post('/publish-enhanced', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        try {
            const payload = await c.req.json().catch(() => null);
            const parsed = instagramEnhancedPublishSchema.safeParse(payload);
            if (!parsed.success) {
                return c.json({ ok: false, error: 'Payload invalido', details: parsed.error.format() }, 400);
            }

            const listing = listingsById.get(parsed.data.listingId) ?? await getListingById(parsed.data.listingId);
            if (!listing) {
                return c.json({ ok: false, error: 'Publicacion no encontrada' }, 404);
            }
            if (listing.vertical !== parsed.data.vertical) {
                return c.json({ ok: false, error: 'La publicacion no corresponde a esta vertical.' }, 409);
            }
            if (listing.ownerId !== user.id && user.role !== 'superadmin') {
                return c.json({ ok: false, error: 'No tienes permisos sobre esta publicacion' }, 403);
            }

            const listingData = buildInstagramListingData(listing);
            const templates = generateSmartTemplates(listingData);
            const selectedTemplate = [
                templates.recommendedTemplate,
                ...templates.alternatives,
            ].find((template: any) => template.id === parsed.data.templateId) ?? templates.recommendedTemplate;

            const publication = await publishListingToInstagram(user, listing, {
                captionOverride: parsed.data.captionOverride ?? null,
                template: selectedTemplate,
            });

            return c.json({
                ok: true,
                result: publication,
                publication,
                template: selectedTemplate,
                aiContent: null,
                adaptations: null,
                score: selectedTemplate?.score ?? null,
            });
        } catch (error) {
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            }, 500);
        }
    });

    app.post('/templates', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        try {
            const body = asObject(await c.req.json().catch(() => null));
            const vertical = parseVertical(asString(body.vertical));
            const listingId = asString(body.listingId);

            if (!listingId) {
                return c.json({ ok: false, error: 'listingId es requerido' }, 400);
            }

            const listing = listingsById.get(listingId) ?? await getListingById(listingId);
            if (!listing) {
                return c.json({ ok: false, error: 'Publicacion no encontrada' }, 404);
            }
            if (listing.vertical !== vertical) {
                return c.json({ ok: false, error: 'La publicacion no corresponde a esta vertical.' }, 409);
            }
            if (listing.ownerId !== user.id && user.role !== 'superadmin') {
                return c.json({ ok: false, error: 'No tienes permisos sobre esta publicacion' }, 403);
            }

            const listingData = buildInstagramListingData(listing);
            const templates = generateSmartTemplates(listingData);

            return c.json({ ok: true, ...templates });
        } catch (error) {
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            }, 500);
        }
    });

    // ── Analytics Routes ───────────────────────────────────────────────────────

    app.get('/insights', async (c) => {
        try {
            const { listingId, from, to } = c.req.query();
            const vertical = parseVertical(c.req.query('vertical'));

            const instagramAccount = await deps.getInstagramAccountByVertical(vertical);
            if (!instagramAccount) {
                return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
            }

            const insights = await deps.getInstagramInsights(
                instagramAccount.instagramUserId,
                instagramAccount.accessToken,
                listingId as string,
                from && to ? { from: new Date(from as string), to: new Date(to as string) } : undefined
            );

            return c.json({ ok: true, ...insights });
        } catch (error) {
            console.error('[instagram] Error obteniendo insights:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    app.post('/ab-test/create', async (c) => {
        try {
            const { vertical, listingId, baseContent, variations } = await c.req.json();

            if (!listingId || !baseContent) {
                return c.json({ ok: false, error: 'listingId y baseContent son requeridos' }, 400);
            }

            const instagramAccount = await deps.getInstagramAccountByVertical(vertical);
            if (!instagramAccount) {
                return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
            }

            const listing = await deps.db.query.listings.findFirst({
                where: deps.dbHelpers.eq(deps.tables.listings.id, listingId)
            });

            if (!listing) {
                return c.json({ ok: false, error: 'Listing no encontrado' }, 404);
            }

            const listingData = deps.buildInstagramListingData(listing);
            const campaign = await deps.createABTestCampaign(listingData, baseContent, variations);

            return c.json({ ok: true, campaign });
        } catch (error) {
            console.error('[instagram] Error creando A/B test:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    app.post('/ab-test/:campaignId/analyze', async (c) => {
        try {
            const campaignId = c.req.param('campaignId');
            const results = await deps.analyzeABTestResults(campaignId);
            return c.json({ ok: true, ...results });
        } catch (error) {
            console.error('[instagram] Error analizando A/B test:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    app.post('/schedule', async (c) => {
        try {
            const { vertical, listingId, content, options = {} } = await c.req.json();

            if (!listingId || !content) {
                return c.json({ ok: false, error: 'listingId y content son requeridos' }, 400);
            }

            const instagramAccount = await deps.getInstagramAccountByVertical(vertical);
            if (!instagramAccount) {
                return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
            }

            const listing = await deps.db.query.listings.findFirst({
                where: deps.dbHelpers.eq(deps.tables.listings.id, listingId)
            });

            if (!listing) {
                return c.json({ ok: false, error: 'Listing no encontrado' }, 404);
            }

            const listingData = deps.buildInstagramListingData(listing);
            const scheduledPost = await deps.scheduleInstagramPost(listingData, content, options);

            return c.json({ ok: true, scheduledPost });
        } catch (error) {
            console.error('[instagram] Error programando publicación:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    app.get('/scheduling-insights', async (c) => {
        try {
            const vertical = parseVertical(c.req.query('vertical'));
            const instagramAccount = await deps.getInstagramAccountByVertical(vertical);

            if (!instagramAccount) {
                return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
            }

            const insights = deps.getSchedulingInsights([], []);
            return c.json({ ok: true, ...insights });
        } catch (error) {
            console.error('[instagram] Error obteniendo scheduling insights:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    app.get('/scheduled', async (c) => {
        try {
            const hoursAhead = deps.asNumber(c.req.query('hoursAhead'), 24);
            const vertical = parseVertical(c.req.query('vertical'));

            const instagramAccount = await deps.getInstagramAccountByVertical(vertical);
            if (!instagramAccount) {
                return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
            }

            const posts = deps.InstagramSchedulerService.getUpcomingPosts([], hoursAhead);
            return c.json({ ok: true, posts });
        } catch (error) {
            console.error('[instagram] Error obteniendo posts programados:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    app.post('/optimize', async (c) => {
        try {
            const { vertical, publicationId, currentContent, listingId } = await c.req.json();

            if (!publicationId || !currentContent || !listingId) {
                return c.json({ ok: false, error: 'publicationId, currentContent y listingId son requeridos' }, 400);
            }

            const instagramAccount = await deps.getInstagramAccountByVertical(vertical);
            if (!instagramAccount) {
                return c.json({ ok: false, error: 'Cuenta de Instagram no configurada' }, 400);
            }

            const listing = await deps.db.query.listings.findFirst({
                where: deps.dbHelpers.eq(deps.tables.listings.id, listingId)
            });

            if (!listing) {
                return c.json({ ok: false, error: 'Listing no encontrado' }, 404);
            }

            const listingData = deps.buildInstagramListingData(listing);
            const optimization = await deps.optimizeInstagramContent(
                instagramAccount.instagramUserId,
                instagramAccount.accessToken,
                publicationId,
                currentContent,
                listingData
            );

            return c.json({ ok: true, optimization });
        } catch (error) {
            console.error('[instagram] Error optimizando contenido:', error);
            return c.json({
                ok: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }, 500);
        }
    });

    return app;
}

export interface InstagramPublicImageRouterDeps {
    listingsById: Map<string, any>;
    getListingById: (id: string) => Promise<any>;
    extractListingMediaUrls: (listing: any) => string[];
    getInstagramBasePublicOrigin: () => string;
}

export function createInstagramPublicImageRouter(deps: InstagramPublicImageRouterDeps) {
    const { listingsById, getListingById, extractListingMediaUrls, getInstagramBasePublicOrigin } = deps;

    const app = new Hono();

    app.get('/instagram-image/:id', async (c) => {
        const listingId = c.req.param('id') ?? '';
        const listing = listingsById.get(listingId) ?? await getListingById(listingId);
        if (!listing || listing.status !== 'active') {
            return c.json({ ok: false, error: 'Imagen no disponible.' }, 404);
        }

        const [image] = extractListingMediaUrls(listing);
        if (!image) {
            return c.json({ ok: false, error: 'La publicación no tiene imágenes.' }, 404);
        }

        if (image.startsWith('data:')) {
            const match = image.match(/^data:([^;,]+)(;base64)?,(.*)$/);
            if (!match) {
                return c.json({ ok: false, error: 'Formato de imagen inválido.' }, 400);
            }
            const contentType = match[1] || 'image/png';
            const isBase64 = Boolean(match[2]);
            const rawBody = match[3] || '';
            const body = isBase64 ? Buffer.from(rawBody, 'base64') : Buffer.from(decodeURIComponent(rawBody));
            return new Response(body, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                },
            });
        }

        let resolvedUrl: string;
        if (/^https?:\/\//i.test(image)) {
            resolvedUrl = image;
        } else {
            try {
                resolvedUrl = new URL(image, getInstagramBasePublicOrigin()).toString();
            } catch {
                return c.json({ ok: false, error: 'No pudimos resolver la imagen pública.' }, 404);
            }
        }

        try {
            const upstream = await fetch(resolvedUrl);
            if (!upstream.ok) {
                return c.json({ ok: false, error: 'No se pudo obtener la imagen.' }, 502);
            }
            const contentType = upstream.headers.get('content-type') || 'image/jpeg';
            const rawArrayBuffer = await upstream.arrayBuffer();

            const needsConversion = contentType.includes('webp') || contentType.includes('avif') || contentType.includes('gif');
            if (needsConversion) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const sharp = require('sharp') as typeof import('sharp');
                const jpegBuffer = await sharp(Buffer.from(rawArrayBuffer)).jpeg({ quality: 90 }).toBuffer();
                return new Response(new Uint8Array(jpegBuffer), {
                    status: 200,
                    headers: {
                        'Content-Type': 'image/jpeg',
                        'Cache-Control': 'public, max-age=3600',
                    },
                });
            }

            return new Response(rawArrayBuffer, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        } catch {
            return c.json({ ok: false, error: 'Error al descargar la imagen.' }, 502);
        }
    });

    return app;
}
