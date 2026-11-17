import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import type { BoostTargetType } from './types.js';
import { canManageAccountRole } from '../accounts/permissions.js';
import { runAccountMemberWrite } from '../accounts/write-access.js';
import { accountListingAssignments, boostOrders, listings } from '../../db/schema.js';

export type BoostRouterDeps = {
    authUser: (c: any) => Promise<any | null>;
    parseVertical: (v: any) => any;
    parseBoostSection: (raw: any, vertical: any) => any;
    getSectionsForVertical: (vertical: any) => any[];
    isBoostSectionAllowed: (vertical: any, section: any) => boolean;
    getBoostPlans: (vertical: any, section: any) => any[];
    inferBoostTargetType: (vertical: any) => string;
    listBoostTargetsForOwner: (vertical: any, ownerId: string) => Promise<any[]>;
    listBoostTargetsForAccount: (vertical: any, accountId: string, legacyOwnerUserId?: string) => Promise<any[]>;
    getBoostTargetById: (vertical: any, targetType: BoostTargetType, targetId: string) => Promise<any | null>;
    db: any;
    getBoostOrdersForUser: (userId: string, vertical?: any) => any[];
    getBoostOrdersForAccount: (accountId: string, vertical?: any, legacyPersonalOwnerUserId?: string) => any[];
    createBoostOrderRecord: (input: {
        userId: string;
        accountId?: string | null;
        legacyPersonalOwnerUserId?: string;
        vertical: any;
        target: any;
        section: any;
        plan: any;
        startAt?: any;
    }) => { ok: boolean; order?: any; error?: string };
    normalizeBoostOrder: (order: any, now?: number) => any;
    countReservedSlots: (vertical: any, section: any) => number;
    getFreeBoostQuota: (user: any, vertical: any, accountId?: string | null, legacyPersonalOwnerUserId?: string) => { max: number; used: number; remaining: number; unlimited?: boolean };
    sectionLabel: (section: any) => string;
    listFeaturedBoosted: (vertical: any, section: any, limit: number) => Promise<any[]>;
    boostOrdersByUser: Map<string, any[]>;
    MAX_BOOST_SLOTS_PER_SECTION: number;
    getMarketplaceBoostPricing?: (vertical: string) => unknown;
    schemas: {
        createBoostOrderSchema: any;
        updateBoostOrderSchema: any;
    };
    insertBoostOrderRow: (order: any, accountId?: string | null, transaction?: any) => Promise<void>;
    upsertBoostOrderInCache: (order: any) => void;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => any[];
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    isPersonalAccountForUser: (userId: string, accountId: string) => boolean;
    listAssignedListingIdsForUser: (accountId: string, vertical: 'autos' | 'propiedades', userId: string) => Promise<string[]>;
};

function hasFreeBoostRemaining(quota: { remaining: number; unlimited?: boolean }) {
    if (quota.unlimited || quota.remaining < 0) return true;
    return quota.remaining > 0;
}

export function createBoostRouter(deps: BoostRouterDeps) {
    const app = new Hono();

    async function getAccountMembership(userId: string) {
        if (deps.getAccountMembershipFromDb) return deps.getAccountMembershipFromDb(userId);
        const accountId = await deps.getPrimaryAccountIdForUser(userId);
        return accountId
            ? deps.getAccountMembershipsForUser(userId).find((item: any) => item.accountId === accountId) ?? null
            : null;
    }

    app.get('/pricing', (c) => {
        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (vertical === 'agenda') return c.json({ ok: false, error: 'Los boosts de SimpleAgenda estarán disponibles más adelante.' }, 404);
        if (!deps.getMarketplaceBoostPricing) {
            return c.json({ ok: false, error: 'Pricing no disponible' }, 501);
        }
        return c.json({ ok: true, vertical, pricing: deps.getMarketplaceBoostPricing(vertical) });
    });

    app.get('/catalog', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (vertical === 'agenda') return c.json({ ok: false, error: 'Los boosts de SimpleAgenda estarán disponibles más adelante.' }, 404);
        const sections = deps.getSectionsForVertical(vertical);
        const membership = await getAccountMembership(user.id);
        const accountId = membership?.accountId ?? null;
        if (!accountId || !membership) {
            return c.json({ ok: false, error: 'No encontramos el espacio de trabajo activo.' }, 403);
        }
        const canManageAccount = canManageAccountRole(membership?.role);
        const includeLegacyPersonal = Boolean(accountId && deps.isPersonalAccountForUser(user.id, accountId));
        const listings = canManageAccount && (vertical === 'autos' || vertical === 'propiedades')
            ? await deps.listBoostTargetsForAccount(vertical, accountId, includeLegacyPersonal ? user.id : undefined)
            : membership.role === 'agent' && (vertical === 'autos' || vertical === 'propiedades')
                ? await (async () => {
                    const assignedIds = new Set(await deps.listAssignedListingIdsForUser(accountId, vertical, user.id));
                    const targets = await deps.listBoostTargetsForAccount(vertical, accountId);
                    return targets.filter((item: any) =>
                        item.targetType === 'listing' && (item.ownerId === user.id || assignedIds.has(item.id)),
                    );
                })()
                : (await deps.listBoostTargetsForOwner(vertical, user.id)).filter((item: any) =>
                    item.accountId === accountId
                    || (includeLegacyPersonal && !item.accountId),
                );
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

        const freeBoostQuota = deps.getFreeBoostQuota(user, vertical, accountId, includeLegacyPersonal ? user.id : undefined);

        return c.json({
            ok: true,
            vertical,
            canManageAccount,
            accountIsShared: Boolean(accountId && !includeLegacyPersonal),
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
        if (vertical === 'agenda') return c.json({ ok: false, error: 'Los boosts de SimpleAgenda estarán disponibles más adelante.' }, 404);
        const membership = await getAccountMembership(user.id);
        const accountId = membership?.accountId ?? null;
        if (!accountId || !membership) {
            return c.json({ ok: false, error: 'No encontramos el espacio de trabajo activo.' }, 403);
        }
        const canManageAccount = canManageAccountRole(membership?.role);
        const includeLegacyPersonal = Boolean(accountId && deps.isPersonalAccountForUser(user.id, accountId));
        const accountOrders = accountId && canManageAccount
            ? deps.getBoostOrdersForAccount(accountId, vertical, includeLegacyPersonal ? user.id : undefined)
            : null;
        const orders = await Promise.all(
            (accountOrders ?? deps.getBoostOrdersForUser(user.id, vertical).filter((order) =>
                order.accountId === accountId || (includeLegacyPersonal && !order.accountId),
            )).map(async (order) => {
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
        if (vertical === 'agenda') return c.json({ ok: false, error: 'Los boosts de SimpleAgenda estarán disponibles más adelante.' }, 404);
        const membership = await getAccountMembership(user.id);
        const accountId = membership?.accountId ?? null;
        if (!accountId || !membership) {
            return c.json({ ok: false, error: 'No encontramos el espacio de trabajo activo.' }, 403);
        }
        const includeLegacyPersonal = Boolean(accountId && deps.isPersonalAccountForUser(user.id, accountId));
        const targetType = parsed.data.targetType ?? deps.inferBoostTargetType(vertical);
        const target = await deps.getBoostTargetById(vertical, targetType, parsed.data.listingId);
        if (!target) {
            return c.json({ ok: false, error: 'Recurso no encontrado' }, 404);
        }
        const targetAccountMatches = target.accountId
            ? target.accountId === accountId
            : Boolean(includeLegacyPersonal && target.ownerId === user.id);
        const canManageAccount = canManageAccountRole(membership?.role);
        const assignedFreeBoostTarget = Boolean(
            parsed.data.useFreeBoost
            && target.targetType === 'listing'
            && accountId
            && membership?.role === 'agent'
            && (vertical === 'autos' || vertical === 'propiedades')
            && (await deps.listAssignedListingIdsForUser(accountId, vertical, user.id)).includes(target.id),
        );
        if (!targetAccountMatches || (target.ownerId !== user.id && !canManageAccount && !assignedFreeBoostTarget)) {
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
            const targetAccountId = target.accountId ?? accountId;
            const freePlan = { ...selectedPlan, price: 0 };
            const write = await runAccountMemberWrite(
                deps.db,
                { userId: user.id, accountId: targetAccountId },
                async (tx, currentRole) => {
                    if (!targetAccountMatches) {
                        return { error: 'El recurso ya no pertenece a este espacio.', status: 403 as const };
                    }

                    const isManager = canManageAccountRole(currentRole);
                    if (targetType === 'listing') {
                        const [currentListing] = await tx.select({
                            accountId: listings.accountId,
                            ownerId: listings.ownerId,
                            vertical: listings.vertical,
                        })
                            .from(listings)
                            .where(eq(listings.id, target.id))
                            .limit(1)
                            .for('update');
                        const legacyPersonalListing = Boolean(
                            includeLegacyPersonal
                            && targetAccountId === accountId
                            && currentListing?.accountId == null
                            && currentListing.ownerId === user.id,
                        );
                        if (!currentListing
                            || currentListing.vertical !== vertical
                            || (currentListing.accountId !== targetAccountId && !legacyPersonalListing)) {
                            return { error: 'La publicación ya no pertenece a este espacio.', status: 404 as const };
                        }

                        if (!isManager && currentListing.ownerId !== user.id) {
                            const [assignment] = await tx.select({ id: accountListingAssignments.id })
                                .from(accountListingAssignments)
                                .where(and(
                                    eq(accountListingAssignments.accountId, targetAccountId),
                                    eq(accountListingAssignments.vertical, vertical),
                                    eq(accountListingAssignments.listingId, target.id),
                                    eq(accountListingAssignments.assignedUserId, user.id),
                                ))
                                .limit(1)
                                .for('update');
                            if (!assignment) {
                                return { error: 'No tienes permisos sobre este recurso.', status: 403 as const };
                            }
                        }
                    } else if (!isManager) {
                        return { error: 'Solo quien administra el espacio puede impulsar este recurso.', status: 403 as const };
                    }

                    const quota = deps.getFreeBoostQuota(
                        user,
                        vertical,
                        targetAccountId,
                        includeLegacyPersonal && targetAccountId === accountId ? user.id : undefined,
                    );
                    if (!hasFreeBoostRemaining(quota)) {
                        return { error: 'Ya usaste todos los boosts gratuitos de este mes.', status: 403 as const };
                    }

                    const created = deps.createBoostOrderRecord({
                        userId: user.id,
                        accountId: targetAccountId,
                        legacyPersonalOwnerUserId: includeLegacyPersonal && targetAccountId === accountId ? user.id : undefined,
                        vertical,
                        target,
                        section,
                        plan: freePlan,
                        startAt: parsed.data.startAt,
                    });
                    if (!created.ok || !created.order) {
                        return { error: created.error ?? 'No pudimos crear el boost.', status: 409 as const };
                    }
                    await deps.insertBoostOrderRow(created.order, targetAccountId, tx);
                    return { order: created.order };
                },
            );
            if (!write.ok) {
                return c.json({ ok: false, error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.' }, 403);
            }
            if ('error' in write.value) return c.json({ ok: false, error: write.value.error }, write.value.status);
            const createdOrder = write.value.order;
            deps.upsertBoostOrderInCache(createdOrder);

            return c.json({
                ok: true,
                freeBoost: true,
                order: {
                    ...createdOrder,
                    sectionLabel: deps.sectionLabel(createdOrder.section),
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
        const membership = await getAccountMembership(user.id);
        const accountId = membership?.accountId ?? null;
        if (!accountId || !membership) {
            return c.json({ ok: false, error: 'No encontramos el espacio de trabajo activo.' }, 403);
        }
        const canManageAccount = canManageAccountRole(membership?.role);
        const includeLegacyPersonal = Boolean(accountId && deps.isPersonalAccountForUser(user.id, accountId));
        const current = accountId && canManageAccount
            ? deps.getBoostOrdersForAccount(accountId, undefined, includeLegacyPersonal ? user.id : undefined)
            : (deps.boostOrdersByUser.get(user.id) ?? []).filter((order) =>
                order.accountId === accountId || (includeLegacyPersonal && !order.accountId),
            );
        const targetIndex = current.findIndex((order) => order.id === orderId);
        if (targetIndex < 0) return c.json({ ok: false, error: 'Boost no encontrado' }, 404);

        const target = deps.normalizeBoostOrder(current[targetIndex]);
        if (target.vertical === 'agenda') return c.json({ ok: false, error: 'Los boosts de SimpleAgenda estarán disponibles más adelante.' }, 404);
        const nextStatus = parsed.data.status;

        if (target.status === 'ended') {
            return c.json({ ok: false, error: 'El boost ya está finalizado' }, 409);
        }

        const makeUpdated = (source: any) => {
            const now = Date.now();
            if (nextStatus === 'ended') return { ...source, status: 'ended', endAt: now, updatedAt: now };
            if (nextStatus === 'paused') return { ...source, status: 'paused', updatedAt: now };
            return deps.normalizeBoostOrder({ ...source, status: 'active', updatedAt: now });
        };

        const write = await runAccountMemberWrite(
            deps.db,
            { userId: user.id, accountId },
            async (tx, currentRole) => {
                const [row] = await tx.select().from(boostOrders)
                    .where(eq(boostOrders.id, orderId))
                    .limit(1)
                    .for('update');
                if (!row
                    || (row.accountId !== accountId && !(includeLegacyPersonal && row.accountId == null && row.userId === user.id))) {
                    return { error: 'Boost no encontrado', status: 404 as const };
                }
                if (!canManageAccountRole(currentRole) && row.userId !== user.id) {
                    return { error: 'No tienes permisos para modificar este boost.', status: 403 as const };
                }
                if (row.status === 'ended') {
                    return { error: 'El boost ya está finalizado', status: 409 as const };
                }

                const source = deps.normalizeBoostOrder({
                    ...target,
                    accountId: row.accountId ?? null,
                    userId: row.userId,
                    status: row.status,
                    startAt: row.startsAt?.getTime() ?? target.startAt,
                    endAt: row.endsAt?.getTime() ?? target.endAt,
                });
                const updated = makeUpdated(source);
                const [saved] = await tx.update(boostOrders).set({
                    status: updated.status,
                    startsAt: new Date(updated.startAt),
                    endsAt: new Date(updated.endAt),
                    updatedAt: new Date(updated.updatedAt),
                }).where(eq(boostOrders.id, row.id)).returning({ id: boostOrders.id });
                if (!saved) return { error: 'Boost no encontrado', status: 404 as const };
                return { order: updated };
            },
        );
        if (!write.ok) {
            return c.json({ ok: false, error: 'Tus permisos o tu espacio activo cambiaron. Actualiza la página e inténtalo nuevamente.' }, 403);
        }
        if ('error' in write.value) return c.json({ ok: false, error: write.value.error }, write.value.status);
        deps.upsertBoostOrderInCache(write.value.order);
        return c.json({ ok: true, order: write.value.order });
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
