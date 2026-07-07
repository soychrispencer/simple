import { Hono } from 'hono';
import type { BoostTargetType } from './types.js';

export type BoostRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    parseVertical: (v: any) => any;
    parseBoostSection: (raw: any, vertical: any) => any;
    getSectionsForVertical: (vertical: any) => any[];
    isBoostSectionAllowed: (vertical: any, section: any) => boolean;
    getBoostPlans: (vertical: any, section: any) => any[];
    inferBoostTargetType: (vertical: any) => string;
    listBoostTargetsForOwner: (vertical: any, ownerId: string) => Promise<any[]>;
    getBoostTargetById: (vertical: any, targetType: BoostTargetType, targetId: string) => Promise<any | null>;
    getBoostOrdersForUser: (userId: string, vertical?: any) => any[];
    createBoostOrderRecord: (input: {
        userId: string;
        vertical: any;
        target: any;
        section: any;
        plan: any;
        startAt?: any;
    }) => { ok: boolean; order?: any; error?: string };
    normalizeBoostOrder: (order: any, now?: number) => any;
    countReservedSlots: (vertical: any, section: any) => number;
    getFreeBoostQuota: (user: any, vertical: any) => { max: number; used: number; remaining: number; unlimited?: boolean };
    sectionLabel: (section: any) => string;
    listFeaturedBoosted: (vertical: any, section: any, limit: number) => Promise<any[]>;
    boostListingsSeed: any[];
    boostOrdersByUser: Map<string, any[]>;
    MAX_BOOST_SLOTS_PER_SECTION: number;
    getMarketplaceBoostPricing?: (vertical: string) => unknown;
    schemas: {
        createBoostOrderSchema: any;
        updateBoostOrderSchema: any;
    };
    insertBoostOrderRow: (order: any, accountId?: string | null) => Promise<void>;
    updateBoostOrderRow: (order: any) => Promise<void>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
};

function hasFreeBoostRemaining(quota: { remaining: number; unlimited?: boolean }) {
    if (quota.unlimited || quota.remaining < 0) return true;
    return quota.remaining > 0;
}

export function createBoostRouter(deps: BoostRouterDeps) {
    const app = new Hono();

    app.get('/pricing', (c) => {
        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.getMarketplaceBoostPricing) {
            return c.json({ ok: false, error: 'Pricing no disponible' }, 501);
        }
        return c.json({ ok: true, vertical, pricing: deps.getMarketplaceBoostPricing(vertical) });
    });

    app.get('/catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const sections = deps.getSectionsForVertical(vertical);
        const listings = user.role === 'superadmin' && (vertical === 'autos' || vertical === 'propiedades')
            ? deps.boostListingsSeed.filter((item) => item.vertical === vertical)
            : await deps.listBoostTargetsForOwner(vertical, user.id);
        const plansBySection = Object.fromEntries(
            sections.map((section) => [
                section,
                deps.getBoostPlans(vertical, section),
            ]),
        );

        const reserved = Object.fromEntries(
            sections.map((section) => [
                section,
                {
                    used: deps.countReservedSlots(vertical, section),
                    max: deps.MAX_BOOST_SLOTS_PER_SECTION,
                },
            ]),
        );

        const freeBoostQuota = deps.getFreeBoostQuota(user, vertical);

        return c.json({
            ok: true,
            vertical,
            sections,
            listings,
            plansBySection,
            reserved,
            freeBoostQuota,
        });
    });

    app.get('/orders', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const orders = await Promise.all(
            deps.getBoostOrdersForUser(user.id, vertical).map(async (order) => {
                const targetType = order.targetType ?? deps.inferBoostTargetType(order.vertical);
                const targetId = order.targetId ?? order.listingId;
                const listing = await deps.getBoostTargetById(order.vertical, targetType, targetId);
                return {
                    ...order,
                    sectionLabel: deps.sectionLabel(order.section),
                    listing,
                };
            }),
        );

        return c.json({ ok: true, orders });
    });

    app.post('/orders', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.createBoostOrderSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const vertical = parsed.data.vertical;
        const targetType = parsed.data.targetType ?? deps.inferBoostTargetType(vertical);
        const target = await deps.getBoostTargetById(vertical, targetType, parsed.data.listingId);
        if (!target) {
            return c.json({ ok: false, error: 'Recurso no encontrado' }, 404);
        }
        if (target.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre este recurso' }, 403);
        }

        const section = parsed.data.section
            ? deps.parseBoostSection(parsed.data.section, vertical)
            : target.section;

        if (!deps.isBoostSectionAllowed(vertical, section)) {
            return c.json({ ok: false, error: 'Sección inválida para esta vertical' }, 400);
        }

        const plans = deps.getBoostPlans(vertical, section);
        const selectedPlan = plans.find((item) => item.id === parsed.data.planId);
        if (!selectedPlan) {
            return c.json({ ok: false, error: 'Plan no disponible' }, 400);
        }

        if (parsed.data.useFreeBoost) {
            const quota = deps.getFreeBoostQuota(user, vertical);
            if (!hasFreeBoostRemaining(quota)) {
                return c.json({ ok: false, error: 'Ya usaste todos tus boosts gratuitos de este mes.' }, 403);
            }
            const freePlan = { ...selectedPlan, price: 0 };
            const created = deps.createBoostOrderRecord({
                userId: user.id,
                vertical,
                target,
                section,
                plan: freePlan,
                startAt: parsed.data.startAt,
            });
            if (!created.ok || !created.order) {
                return c.json({ ok: false, error: created.error ?? 'No pudimos crear el boost.' }, 409);
            }
            await deps.insertBoostOrderRow(
                created.order,
                await deps.getPrimaryAccountIdForUser(user.id),
            );
            return c.json({
                ok: true,
                freeBoost: true,
                order: {
                    ...created.order,
                    sectionLabel: deps.sectionLabel(created.order.section),
                    listing: target,
                },
            });
        }

        return c.json(
            {
                ok: false,
                error: 'Para activar un boost de pago usa el checkout de Mercado Pago.',
                code: 'payment_required',
            },
            402,
        );
    });

    app.patch('/orders/:id', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.updateBoostOrderSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const orderId = c.req.param('id') ?? '';
        const current = deps.boostOrdersByUser.get(user.id) ?? [];
        const targetIndex = current.findIndex((order) => order.id === orderId);
        if (targetIndex < 0) return c.json({ ok: false, error: 'Boost no encontrado' }, 404);

        const target = deps.normalizeBoostOrder(current[targetIndex]);
        const nextStatus = parsed.data.status;

        if (target.status === 'ended') {
            return c.json({ ok: false, error: 'El boost ya está finalizado' }, 409);
        }

        let updated: any;
        if (nextStatus === 'ended') {
            updated = { ...target, status: 'ended', endAt: Date.now(), updatedAt: Date.now() };
        } else if (nextStatus === 'paused') {
            updated = { ...target, status: 'paused', updatedAt: Date.now() };
        } else {
            updated = deps.normalizeBoostOrder({ ...target, status: 'active', updatedAt: Date.now() });
        }

        const nextOrders = [...current];
        nextOrders[targetIndex] = updated;
        deps.boostOrdersByUser.set(user.id, nextOrders);
        await deps.updateBoostOrderRow(updated);

        return c.json({ ok: true, order: updated });
    });

    app.get('/featured', async (c) => {
        const vertical = deps.parseVertical(c.req.query('vertical'));
        const section = deps.parseBoostSection(c.req.query('section'), vertical);
        const limitRaw = Number(c.req.query('limit') ?? '8');
        const limit = Number.isFinite(limitRaw) ? Math.min(30, Math.max(1, limitRaw)) : 8;

        const items = await deps.listFeaturedBoosted(vertical, section, limit);
        return c.json({
            ok: true,
            vertical,
            section,
            sectionLabel: deps.sectionLabel(section),
            items,
        });
    });

    return app;
}
