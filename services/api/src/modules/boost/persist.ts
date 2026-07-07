import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { boostOrders } from '../../db/schema.js';
import { boostOrdersByUser } from '../cache/domain-maps.js';
import type { BoostOrder as DomainBoostOrder } from '../../lib/domain-types.js';
import { BOOST_PLAN_TEMPLATES, type BoostOrder, type BoostTargetType } from './types.js';
import { inferBoostTargetType } from './service.js';

export function mapBoostOrderRow(row: typeof boostOrders.$inferSelect): BoostOrder {
    const planTemplate = BOOST_PLAN_TEMPLATES.find((plan) => plan.id === row.planId);
    const targetType = (row.targetType ?? 'listing') as BoostTargetType;
    const targetId = row.targetId ?? row.listingId ?? '';
    return {
        id: row.id,
        accountId: row.accountId ?? null,
        userId: row.userId,
        targetType,
        targetId,
        listingId: targetType === 'listing' ? targetId : (row.listingId ?? ''),
        vertical: row.vertical as BoostOrder['vertical'],
        section: row.section as BoostOrder['section'],
        planId: row.planId as BoostOrder['planId'],
        planName: planTemplate?.name ?? row.planId,
        days: row.days,
        price: Number(row.price),
        startAt: row.startsAt?.getTime() ?? 0,
        endAt: row.endsAt?.getTime() ?? 0,
        status: row.status as BoostOrder['status'],
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}

export function upsertBoostOrderInCache(order: BoostOrder): void {
    const domainOrder = order as DomainBoostOrder;
    const existing = boostOrdersByUser.get(order.userId) ?? [];
    const index = existing.findIndex((item) => item.id === order.id);
    if (index < 0) {
        boostOrdersByUser.set(order.userId, [domainOrder, ...existing]);
        return;
    }
    const next = [...existing];
    next[index] = domainOrder;
    boostOrdersByUser.set(order.userId, next);
}

export async function insertBoostOrderRow(
    order: BoostOrder,
    accountId?: string | null,
): Promise<void> {
    const now = new Date();
    await db.insert(boostOrders).values({
        id: order.id,
        accountId: accountId ?? null,
        userId: order.userId,
        targetType: order.targetType ?? inferBoostTargetType(order.vertical),
        targetId: order.targetId ?? order.listingId,
        listingId: order.targetType === 'listing' ? (order.targetId ?? order.listingId) : null,
        vertical: order.vertical,
        section: order.section,
        planId: order.planId,
        days: order.days,
        price: String(order.price),
        status: order.status,
        startsAt: new Date(order.startAt),
        endsAt: new Date(order.endAt),
        createdAt: new Date(order.createdAt || now.getTime()),
        updatedAt: new Date(order.updatedAt || now.getTime()),
    });
    upsertBoostOrderInCache(order);
}

export async function updateBoostOrderRow(order: BoostOrder): Promise<void> {
    await db
        .update(boostOrders)
        .set({
            status: order.status,
            startsAt: new Date(order.startAt),
            endsAt: new Date(order.endAt),
            updatedAt: new Date(order.updatedAt),
        })
        .where(eq(boostOrders.id, order.id));
    upsertBoostOrderInCache(order);
}
