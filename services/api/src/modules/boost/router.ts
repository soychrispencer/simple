import { Hono } from 'hono';

export type BoostRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    parseVertical: (v: any) => any;
    parseBoostSection: (raw: any, vertical: any) => any;
    getSectionsForVertical: (vertical: any) => any[];
    isBoostSectionAllowed: (vertical: any, section: any) => boolean;
    getBoostPlans: (vertical: any, section: any) => any[];
    getBoostListingById: (vertical: any, listingId: string) => any | null;
    getBoostListingsByOwner: (vertical: any, ownerId: string) => any[];
    getBoostOrdersForUser: (userId: string, vertical?: any) => any[];
    createBoostOrderRecord: (input: {
        userId: string;
        vertical: any;
        listing: any;
        section: any;
        plan: any;
        startAt?: any;
    }) => { ok: boolean; order?: any; error?: string };
    normalizeBoostOrder: (order: any, now?: number) => any;
    countReservedSlots: (vertical: any, section: any) => number;
    getFreeBoostQuota: (user: any, vertical: any) => { max: number; used: number; remaining: number };
    sectionLabel: (section: any) => string;
    listFeaturedBoosted: (vertical: any, section: any, limit: number) => Promise<any[]>;
    boostListingsSeed: any[];
    boostOrdersByUser: Map<string, any[]>;
    MAX_BOOST_SLOTS_PER_SECTION: number;
    schemas: {
        createBoostOrderSchema: any;
        updateBoostOrderSchema: any;
    };
};

export function createBoostRouter(deps: BoostRouterDeps) {
    const app = new Hono();

    app.get('/catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const sections = deps.getSectionsForVertical(vertical);
        const listings =
            user.role === 'superadmin'
                ? deps.boostListingsSeed.filter((item) => item.vertical === vertical)
                : deps.getBoostListingsByOwner(vertical, user.id);
        const plansBySection = Object.fromEntries(
            sections.map((section) => [
                section,
                deps.getBoostPlans(vertical, section),
            ])
        );

        const reserved = Object.fromEntries(
            sections.map((section) => [
                section,
                {
                    used: deps.countReservedSlots(vertical, section),
                    max: deps.MAX_BOOST_SLOTS_PER_SECTION,
                },
            ])
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
        const orders = deps.getBoostOrdersForUser(user.id, vertical).map((order) => {
            const listing = deps.getBoostListingById(order.vertical, order.listingId);
            return {
                ...order,
                sectionLabel: deps.sectionLabel(order.section),
                listing,
            };
        });

        return c.json({ ok: true, orders });
    });

    app.post('/orders', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const parsed = deps.schemas.createBoostOrderSchema.safeParse(payload);
        if (!parsed.success) return c.json({ ok: false, error: 'Payload inválido' }, 400);

        const vertical = parsed.data.vertical;
        const listing = deps.getBoostListingById(vertical, parsed.data.listingId);
        if (!listing) {
            return c.json({ ok: false, error: 'Publicación no encontrada' }, 404);
        }
        if (listing.ownerId !== user.id && user.role !== 'superadmin') {
            return c.json({ ok: false, error: 'No tienes permisos sobre esta publicación' }, 403);
        }

        const section = parsed.data.section
            ? deps.parseBoostSection(parsed.data.section, vertical)
            : listing.section;

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
            if (quota.remaining === 0) {
                return c.json({ ok: false, error: 'Ya usaste todos tus boosts gratuitos de este mes.' }, 403);
            }
            const freePlan = { ...selectedPlan, price: 0 };
            const created = deps.createBoostOrderRecord({
                userId: user.id,
                vertical,
                listing,
                section,
                plan: freePlan,
                startAt: parsed.data.startAt,
            });
            if (!created.ok || !created.order) {
                return c.json({ ok: false, error: created.error ?? 'No pudimos crear el boost.' }, 409);
            }
            return c.json({
                ok: true,
                freeBoost: true,
                order: {
                    ...created.order,
                    sectionLabel: deps.sectionLabel(created.order.section),
                    listing,
                },
            });
        }

        const created = deps.createBoostOrderRecord({
            userId: user.id,
            vertical,
            listing,
            section,
            plan: selectedPlan,
            startAt: parsed.data.startAt,
        });
        if (!created.ok || !created.order) {
            return c.json({ ok: false, error: created.error ?? 'No pudimos crear el boost.' }, 409);
        }

        return c.json({
            ok: true,
            order: {
                ...created.order,
                sectionLabel: deps.sectionLabel(created.order.section),
                listing,
            },
        });
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

        return c.json({ ok: true, order: updated });
    });

    app.get('/featured', async (c) => {
        const vertical = deps.parseVertical(c.req.query('vertical'));
        const section = deps.parseBoostSection(c.req.query('section'), vertical);
        const limitRaw = Number(c.req.query('limit') ?? '8');
        const limit = Number.isFinite(limitRaw) ? Math.min(24, Math.max(1, limitRaw)) : 8;

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
