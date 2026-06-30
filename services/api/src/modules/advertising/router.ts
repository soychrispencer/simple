import { Hono } from 'hono';
import type { Context } from 'hono';

export interface AdvertisingRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    db: any;
    tables: { adCampaigns: any };
    dbHelpers: { eq: any; and: any };
    listAdCampaignRecords: (opts: any) => Promise<any[]>;
    adCampaignToResponse: (item: any) => any;
    adCampaignCreateSchema: any;
    adCampaignUpdateSchema: any;
    getAdCampaignRecordForUser: (userId: string, campaignId: string) => Promise<any>;
    sanitizeAdCampaignWriteInput: (input: any, ctx: any) => any;
    normalizeAdCampaigns: (rows: any[]) => any[];
    mapAdCampaignRow: (row: any) => any;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    MAX_CAMPAIGNS_TOTAL: number;
    AdStatus: any;
}

export function createAdvertisingRouter(deps: AdvertisingRouterDeps) {
    const {
        authUser,
        parseVertical,
        db,
        tables: { adCampaigns },
        dbHelpers: { eq, and },
        listAdCampaignRecords,
        adCampaignToResponse,
        adCampaignCreateSchema,
        adCampaignUpdateSchema,
        getAdCampaignRecordForUser,
        sanitizeAdCampaignWriteInput,
        normalizeAdCampaigns,
        mapAdCampaignRow,
        getPrimaryAccountIdForUser,
        MAX_CAMPAIGNS_TOTAL,
    } = deps;

    const app = new Hono();

    app.get('/public', async (c) => {
        const vertical = parseVertical(c.req.query('vertical'));
        const items = await listAdCampaignRecords({ vertical, paymentStatus: 'paid', onlyPublicActive: true });
        return c.json({ ok: true, items: items.map(adCampaignToResponse) });
    });

    app.get('/campaigns', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const vertical = parseVertical(c.req.query('vertical'));
        const items = await listAdCampaignRecords({ userId: user.id, vertical });
        return c.json({ ok: true, items: items.map(adCampaignToResponse) });
    });

    app.post('/campaigns', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = adCampaignCreateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        const input = parsed.data;
        const startAt = new Date(input.startAt);
        if (Number.isNaN(startAt.getTime())) {
            return c.json({ ok: false, error: 'La fecha de inicio no es válida.' }, 400);
        }

        try {
            const existing = await listAdCampaignRecords({ userId: user.id, vertical: input.vertical });
            if (existing.filter((item: any) => item.status !== 'ended').length >= MAX_CAMPAIGNS_TOTAL) {
                return c.json({ ok: false, error: `Máximo ${MAX_CAMPAIGNS_TOTAL} campañas vigentes.` }, 409);
            }

            const sanitized = sanitizeAdCampaignWriteInput(input, {
                vertical: input.vertical,
                format: input.format,
                placementSection: input.placementSection,
            });
            const now = new Date();
            const endAt = new Date(startAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
            const baseStatus = startAt.getTime() <= Date.now() ? 'active' : 'scheduled';

            const rows = await db.insert(adCampaigns).values({
                accountId: await getPrimaryAccountIdForUser(user.id),
                userId: user.id,
                vertical: input.vertical,
                name: sanitized.name,
                format: input.format,
                status: baseStatus,
                paymentStatus: 'pending',
                destinationType: sanitized.destinationType,
                destinationUrl: sanitized.destinationUrl,
                listingHref: sanitized.listingHref,
                profileSlug: sanitized.profileSlug,
                desktopImageDataUrl: sanitized.desktopImageDataUrl,
                mobileImageDataUrl: sanitized.mobileImageDataUrl,
                overlayEnabled: sanitized.overlayEnabled,
                overlayTitle: sanitized.overlayTitle,
                overlaySubtitle: sanitized.overlaySubtitle,
                overlayCta: sanitized.overlayCta,
                overlayAlign: sanitized.overlayAlign,
                placementSection: sanitized.placementSection,
                startAt,
                endAt,
                durationDays: input.durationDays,
                paidAt: null,
                createdAt: now,
                updatedAt: now,
            }).returning();

            const item = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
            return c.json({ ok: true, item: adCampaignToResponse(item) }, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos crear la campaña.';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    app.patch('/campaigns/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const campaignId = c.req.param('id') ?? '';
        const existing = await getAdCampaignRecordForUser(user.id, campaignId);
        if (!existing) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);

        const payload = await c.req.json().catch(() => null);
        const parsed = adCampaignUpdateSchema.safeParse(payload);
        if (!parsed.success) {
            return c.json({ ok: false, error: 'Payload inválido' }, 400);
        }

        if (parsed.data.action === 'content') {
            if (existing.status === 'ended') {
                return c.json({ ok: false, error: 'La campaña finalizada no se puede editar.' }, 409);
            }

            try {
                const sanitized = sanitizeAdCampaignWriteInput(parsed.data, {
                    vertical: existing.vertical,
                    format: existing.format,
                    placementSection: existing.placementSection,
                });
                const rows = await db.update(adCampaigns).set({
                    name: sanitized.name,
                    destinationType: sanitized.destinationType,
                    destinationUrl: sanitized.destinationUrl,
                    listingHref: sanitized.listingHref,
                    profileSlug: sanitized.profileSlug,
                    desktopImageDataUrl: sanitized.desktopImageDataUrl,
                    mobileImageDataUrl: sanitized.mobileImageDataUrl,
                    overlayEnabled: sanitized.overlayEnabled,
                    overlayTitle: sanitized.overlayTitle,
                    overlaySubtitle: sanitized.overlaySubtitle,
                    overlayCta: sanitized.overlayCta,
                    overlayAlign: sanitized.overlayAlign,
                    updatedAt: new Date(),
                }).where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.userId, user.id))).returning();

                const item = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
                return c.json({ ok: true, item: adCampaignToResponse(item) });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'No pudimos guardar la campaña.';
                return c.json({ ok: false, error: message }, 400);
            }
        }

        if (existing.status === 'ended') {
            return c.json({ ok: false, error: 'La campaña finalizada no se puede reactivar ni pausar.' }, 409);
        }

        const nextStatus =
            parsed.data.status === 'paused'
                ? 'paused'
                : existing.startAt <= Date.now()
                    ? 'active'
                    : 'scheduled';

        const rows = await db.update(adCampaigns).set({
            status: nextStatus,
            updatedAt: new Date(),
        }).where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.userId, user.id))).returning();

        const item = normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0];
        return c.json({ ok: true, item: adCampaignToResponse(item) });
    });

    app.delete('/campaigns/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const campaignId = c.req.param('id') ?? '';
        const existing = await getAdCampaignRecordForUser(user.id, campaignId);
        if (!existing) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);
        await db.delete(adCampaigns).where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.userId, user.id)));
        return c.json({ ok: true });
    });

    return app;
}
