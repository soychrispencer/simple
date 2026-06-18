import { Hono } from 'hono';
import type { Context } from 'hono';
import type { VerticalType } from '@simple/types';
import type { SocialPublishTarget } from './publish-hub.js';

export interface SocialHubRouterDeps {
    authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
    parseVertical: (v: string | undefined) => VerticalType;
    asString: (v: unknown) => string;
    asObject: (v: unknown) => Record<string, unknown>;
    listingsById: Map<string, { id: string; vertical: VerticalType; ownerId: string; status: string; title: string; updatedAt: number; [key: string]: unknown }>;
    getListingById: (id: string) => Promise<{ id: string; vertical: VerticalType; ownerId: string; status: string; title: string; updatedAt: number; [key: string]: unknown } | null>;
    isInstagramConfigured: () => boolean;
    userCanUseInstagram: (user: { id: string; role?: string }, vertical: VerticalType) => boolean;
    getEffectivePlanId: (user: { id: string; role?: string }, vertical: VerticalType) => string;
    getInstagramRequiredPlanIds: () => string[];
    getInstagramAccount: (userId: string, vertical: VerticalType) => {
        status: string;
        username: string;
        facebookPageId: string | null;
        facebookPageName: string | null;
    } | null;
    getTikTokAccount: (userId: string, vertical: VerticalType) => {
        status: string;
        username: string;
    } | null;
    getYouTubeAccount: (userId: string, vertical: VerticalType) => {
        status: string;
        channelTitle: string;
    } | null;
    resolveBrowserOrigin: (c: Context) => string | null;
    instagramAccountToResponse: (account: unknown) => unknown;
    getSocialPublicationsForUser: (userId: string, vertical?: VerticalType) => unknown[];
    socialPublicationToResponse: (item: unknown) => unknown;
    socialPublishSchema: {
        safeParse: (input: unknown) => {
            success: boolean;
            data?: {
                vertical: VerticalType;
                listingId: string;
                captionOverride?: string | null;
                publishAll?: boolean;
                targets?: SocialPublishTarget[];
            };
            error?: { format: () => unknown };
        };
    };
    publishListingToSocialHub: (
        user: { id: string; role?: string },
        listing: { id: string; vertical: VerticalType; status: string; title: string; updatedAt: number; [key: string]: unknown },
        options: {
            targets?: SocialPublishTarget[];
            publishAll?: boolean;
            captionOverride?: string | null;
        },
    ) => Promise<Array<{ target: SocialPublishTarget; ok: boolean; message: string; permalink?: string | null }>>;
    isTikTokConfigured: () => boolean;
    isYouTubeConfigured: () => boolean;
}

export function createSocialHubRouter(deps: SocialHubRouterDeps) {
    const app = new Hono();

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const account = deps.getInstagramAccount(user.id, vertical);
        const igConnected = Boolean(account && account.status === 'connected');
        const fbConnected = Boolean(igConnected && account?.facebookPageId && account.facebookPageName);
        const tiktokAccount = deps.getTikTokAccount(user.id, vertical);
        const youtubeAccount = deps.getYouTubeAccount(user.id, vertical);
        const tiktokConnected = Boolean(tiktokAccount && tiktokAccount.status === 'connected');
        const youtubeConnected = Boolean(youtubeAccount && youtubeAccount.status === 'connected');
        const origin = deps.resolveBrowserOrigin(c);
        const integrationsReturn = origin ? `${origin}/panel/mi-cuenta/integraciones` : null;

        return c.json({
            ok: true,
            vertical,
            configured: deps.isInstagramConfigured(),
            eligible: deps.userCanUseInstagram(user, vertical),
            currentPlanId: deps.getEffectivePlanId(user, vertical),
            requiredPlanIds: deps.getInstagramRequiredPlanIds(),
            platforms: {
                instagram: {
                    available: true,
                    connected: igConnected,
                    username: account?.username ?? null,
                },
                facebook: {
                    available: true,
                    connected: fbConnected,
                    pageName: account?.facebookPageName ?? null,
                    needsReconnect: igConnected && !fbConnected,
                },
                tiktok: {
                    available: deps.isTikTokConfigured(),
                    configured: deps.isTikTokConfigured(),
                    connected: tiktokConnected,
                    username: tiktokAccount?.username ?? null,
                    connectUrl: integrationsReturn && deps.isTikTokConfigured()
                        ? `/api/integrations/tiktok/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(integrationsReturn)}`
                        : null,
                },
                youtube: {
                    available: deps.isYouTubeConfigured(),
                    configured: deps.isYouTubeConfigured(),
                    connected: youtubeConnected,
                    channelTitle: youtubeAccount?.channelTitle ?? null,
                    connectUrl: integrationsReturn && deps.isYouTubeConfigured()
                        ? `/api/integrations/youtube/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(integrationsReturn)}`
                        : null,
                },
            },
            metaAccount: deps.instagramAccountToResponse(account),
            recentPublications: deps.getSocialPublicationsForUser(user.id, vertical)
                .slice(0, 8)
                .map((item) => deps.socialPublicationToResponse(item)),
        });
    });

    app.post('/publish', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.socialPublishSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido', details: parsed.error?.format() }, 400);
        }

        const listing = deps.listingsById.get(parsed.data!.listingId)
            ?? await deps.getListingById(parsed.data!.listingId);
        if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        if (listing.vertical !== parsed.data!.vertical) {
            return c.json({ ok: false, error: 'La publicación no corresponde a esta vertical.' }, 409);
        }
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }
        if (!deps.userCanUseInstagram(user, parsed.data!.vertical)) {
            return c.json({ ok: false, error: 'El hub social está disponible solo para planes Pro y Empresa.' }, 403);
        }

        const results = await deps.publishListingToSocialHub(user, listing, {
            targets: parsed.data!.targets,
            publishAll: parsed.data!.publishAll,
            captionOverride: parsed.data!.captionOverride ?? null,
        });

        const ok = results.some((item) => item.ok);
        return c.json({ ok, results });
    });

    return app;
}
