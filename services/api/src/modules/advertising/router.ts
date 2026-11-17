import { Hono } from 'hono';
import type { Context } from 'hono';
import { canManageAccountRole } from '../accounts/permissions.js';
import { runAccountManagerWrite } from '../accounts/write-access.js';

export interface AdvertisingRouterDeps {
    authUser: (c: Context) => Promise<any>;
    parseVertical: (v: string | undefined) => any;
    db: any;
    tables: { adCampaigns: any };
    dbHelpers: { eq: any; and: any; isNull: any };
    listAdCampaignRecords: (opts: any) => Promise<any[]>;
    adCampaignToResponse: (item: any) => any;
    adCampaignCreateSchema: any;
    adCampaignUpdateSchema: any;
    getAdCampaignRecordForUser: (userId: string, campaignId: string, accountId?: string | null, includeLegacyPersonal?: boolean) => Promise<any>;
    sanitizeAdCampaignWriteInput: (input: any, ctx: any) => any;
    normalizeAdCampaigns: (rows: any[]) => any[];
    mapAdCampaignRow: (row: any) => any;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => any[];
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    isPersonalAccountForUser: (userId: string, accountId: string) => boolean;
    MAX_CAMPAIGNS_TOTAL: number;
    AdStatus: any;
}

export function createAdvertisingRouter(deps: AdvertisingRouterDeps) {
    const {
        authUser,
        parseVertical,
        db,
        tables: { adCampaigns },
        dbHelpers: { eq, and, isNull },
        listAdCampaignRecords,
        adCampaignToResponse,
        adCampaignCreateSchema,
        adCampaignUpdateSchema,
        getAdCampaignRecordForUser,
        sanitizeAdCampaignWriteInput,
        normalizeAdCampaigns,
        mapAdCampaignRow,
        getPrimaryAccountIdForUser,
        getAccountMembershipsForUser,
        getAccountMembershipFromDb,
        isPersonalAccountForUser,
        MAX_CAMPAIGNS_TOTAL,
    } = deps;

    async function getCurrentAccountScope(userId: string) {
        const membership = getAccountMembershipFromDb
            ? await getAccountMembershipFromDb(userId)
            : null;
        const accountId = getAccountMembershipFromDb
            ? membership?.accountId ?? null
            : await getPrimaryAccountIdForUser(userId);
        const currentMembership = membership?.accountId === accountId
            ? membership
            : accountId
                ? getAccountMembershipFromDb
                    ? await getAccountMembershipFromDb(userId, accountId)
                    : getAccountMembershipsForUser(userId).find((item: any) => item.accountId === accountId) ?? null
                : null;
        return {
            accountId,
            membership: currentMembership,
            canManage: canManageAccountRole(currentMembership?.role),
            includeLegacyPersonal: Boolean(accountId && isPersonalAccountForUser(userId, accountId)),
        };
    }

    function campaignWriteCondition(campaign: any, userId: string) {
        return campaign.accountId
            ? and(eq(adCampaigns.id, campaign.id), eq(adCampaigns.accountId, campaign.accountId))
            : and(eq(adCampaigns.id, campaign.id), eq(adCampaigns.userId, userId), isNull(adCampaigns.accountId));
    }

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
        const scope = await getCurrentAccountScope(user.id);
        if (!scope.accountId || !scope.membership) {
            return c.json({ ok: false, error: 'No encontramos el espacio de trabajo activo.' }, 403);
        }
        const items = await listAdCampaignRecords({
            accountId: scope.accountId,
            includeLegacyPersonalForUserId: scope.includeLegacyPersonal ? user.id : undefined,
            vertical,
        });
        return c.json({ ok: true, items: items.map(adCampaignToResponse) });
    });

    app.post('/campaigns', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const scope = await getCurrentAccountScope(user.id);
        if (!scope.accountId || !scope.canManage) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede gestionar campañas pagadas.' }, 403);
        }

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
            const sanitized = sanitizeAdCampaignWriteInput(input, {
                vertical: input.vertical,
                format: input.format,
                placementSection: input.placementSection,
            });
            const now = new Date();
            const endAt = new Date(startAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
            const baseStatus = startAt.getTime() <= Date.now() ? 'active' : 'scheduled';
            const write = await runAccountManagerWrite(
                db,
                { userId: user.id, accountId: scope.accountId },
                async (tx) => {
                    const existing = await listAdCampaignRecords({
                        accountId: scope.accountId,
                        includeLegacyPersonalForUserId: scope.includeLegacyPersonal ? user.id : undefined,
                        vertical: input.vertical,
                    });
                    if (existing.filter((item: any) => item.status !== 'ended').length >= MAX_CAMPAIGNS_TOTAL) {
                        return { error: `Máximo ${MAX_CAMPAIGNS_TOTAL} campañas vigentes.` };
                    }
                    const [row] = await tx.insert(adCampaigns).values({
                        accountId: scope.accountId,
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
                    return { row };
                },
            );
            if (!write.ok) return c.json({ ok: false, error: 'Tus permisos cambiaron. Actualiza el panel e inténtalo nuevamente.' }, 403);
            if ('error' in write.value) return c.json({ ok: false, error: write.value.error }, 409);
            const item = normalizeAdCampaigns([mapAdCampaignRow(write.value.row)])[0];
            return c.json({ ok: true, item: adCampaignToResponse(item) }, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No pudimos crear la campaña.';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    app.patch('/campaigns/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const scope = await getCurrentAccountScope(user.id);
        if (!scope.accountId || !scope.canManage) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede gestionar campañas pagadas.' }, 403);
        }

        const campaignId = c.req.param('id') ?? '';
        const existing = await getAdCampaignRecordForUser(user.id, campaignId, scope.accountId, scope.includeLegacyPersonal);
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
                const write = await runAccountManagerWrite(
                    db,
                    { userId: user.id, accountId: scope.accountId },
                    async (tx) => {
                        const [current] = await tx.select().from(adCampaigns)
                            .where(campaignWriteCondition(existing, user.id))
                            .limit(1)
                            .for('update');
                        if (!current || current.status === 'ended') {
                            return { error: 'La campaña finalizada no se puede editar.' };
                        }
                        const [row] = await tx.update(adCampaigns).set({
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
                        }).where(campaignWriteCondition(current, user.id)).returning();
                        return { row };
                    },
                );
                if (!write.ok) return c.json({ ok: false, error: 'Tus permisos cambiaron. Actualiza el panel e inténtalo nuevamente.' }, 403);
                if ('error' in write.value) return c.json({ ok: false, error: write.value.error }, 409);
                if (!write.value.row) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);
                const item = normalizeAdCampaigns([mapAdCampaignRow(write.value.row)])[0];
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

        const write = await runAccountManagerWrite(
            db,
            { userId: user.id, accountId: scope.accountId },
            async (tx) => {
                const [current] = await tx.select().from(adCampaigns)
                    .where(campaignWriteCondition(existing, user.id))
                    .limit(1)
                    .for('update');
                if (!current || current.status === 'ended') {
                    return { error: 'La campaña finalizada no se puede reactivar ni pausar.' };
                }
                const [row] = await tx.update(adCampaigns).set({ status: nextStatus, updatedAt: new Date() })
                    .where(campaignWriteCondition(current, user.id))
                    .returning();
                return { row };
            },
        );
        if (!write.ok) return c.json({ ok: false, error: 'Tus permisos cambiaron. Actualiza el panel e inténtalo nuevamente.' }, 403);
        if ('error' in write.value) return c.json({ ok: false, error: write.value.error }, 409);
        if (!write.value.row) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);
        const item = normalizeAdCampaigns([mapAdCampaignRow(write.value.row)])[0];
        return c.json({ ok: true, item: adCampaignToResponse(item) });
    });

    app.delete('/campaigns/:id', async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const scope = await getCurrentAccountScope(user.id);
        if (!scope.accountId || !scope.canManage) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede gestionar campañas pagadas.' }, 403);
        }
        const campaignId = c.req.param('id') ?? '';
        const existing = await getAdCampaignRecordForUser(user.id, campaignId, scope.accountId, scope.includeLegacyPersonal);
        if (!existing) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);
        const write = await runAccountManagerWrite(
            db,
            { userId: user.id, accountId: scope.accountId },
            (tx) => tx.delete(adCampaigns)
                .where(campaignWriteCondition(existing, user.id))
                .returning({ id: adCampaigns.id })
                .then((rows: Array<{ id: string }>) => rows.length),
        );
        if (!write.ok) return c.json({ ok: false, error: 'Tus permisos cambiaron. Actualiza el panel e inténtalo nuevamente.' }, 403);
        if (!write.value) return c.json({ ok: false, error: 'Campaña no encontrada' }, 404);
        return c.json({ ok: true });
    });

    return app;
}
