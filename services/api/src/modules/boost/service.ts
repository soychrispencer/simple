import { randomUUID } from 'node:crypto';
import { boostOrdersByUser } from '../cache/domain-maps.js';
import type { BoostOrder as DomainBoostOrder } from '../../lib/domain-types.js';
import type { BoostSection, BoostOrder, BoostPlanRecord, BoostTargetRecord, VerticalType, BoostTargetType } from './types.js';
import { BOOST_PLAN_TEMPLATES, BOOST_PRICE_BY_VERTICAL_SECTION, MAX_BOOST_SLOTS_PER_SECTION } from './types.js';

export function inferBoostTargetType(vertical: VerticalType): BoostTargetType {
    if (vertical === 'serenatas') return 'serenata_group';
    if (vertical === 'agenda') return 'operator_profile';
    return 'listing';
}

export const boostListingsSeed: BoostTargetRecord[] = [];

export function isBoostSectionAllowed(vertical: VerticalType, section: BoostSection): boolean {
    if (vertical === 'serenatas' || vertical === 'agenda') {
        return section === 'marketplace' || section === 'landing';
    }
    if (vertical === 'autos') {
        return section === 'sale' || section === 'rent' || section === 'auction' || section === 'products' || section === 'services';
    }
    if (vertical === 'propiedades') {
        return section === 'sale' || section === 'rent' || section === 'project' || section === 'products' || section === 'services';
    }
    return false;
}

export function getSectionsForVertical(vertical: VerticalType): BoostSection[] {
    if (vertical === 'serenatas' || vertical === 'agenda') return ['marketplace', 'landing'];
    if (vertical === 'autos') return ['sale', 'rent', 'auction', 'products', 'services'];
    if (vertical === 'propiedades') return ['sale', 'rent', 'project', 'products', 'services'];
    return [];
}

export function parseBoostSection(raw: string | undefined, vertical: VerticalType): BoostSection {
    if (vertical === 'serenatas' || vertical === 'agenda') {
        return raw === 'landing' ? 'landing' : 'marketplace';
    }
    const normalized = raw === 'rent' || raw === 'auction' || raw === 'project' || raw === 'products' || raw === 'services'
        ? raw
        : 'sale';
    return isBoostSectionAllowed(vertical, normalized) ? normalized : getSectionsForVertical(vertical)[0] ?? 'sale';
}

export function getBoostPlans(vertical: VerticalType, section: BoostSection): BoostPlanRecord[] {
    const safeSection = isBoostSectionAllowed(vertical, section)
        ? section
        : (getSectionsForVertical(vertical)[0] ?? 'marketplace');
    const sectionPricing = BOOST_PRICE_BY_VERTICAL_SECTION[vertical][safeSection];
    return BOOST_PLAN_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        days: template.days,
        visibilityLift: template.visibilityLift,
        price: sectionPricing[template.id],
    }));
}

export function getBoostListingById(vertical: VerticalType, listingId: string): BoostTargetRecord | null {
    const item = boostListingsSeed.find((entry) => entry.vertical === vertical && entry.id === listingId);
    if (!item) return null;
    return { ...item, targetType: item.targetType ?? 'listing' };
}

export function getBoostListingsByOwner(vertical: VerticalType, ownerId: string): BoostTargetRecord[] {
    return boostListingsSeed
        .filter((item) => item.vertical === vertical && item.ownerId === ownerId)
        .map((item) => ({ ...item, targetType: item.targetType ?? 'listing' }));
}

export function normalizeBoostOrder(order: BoostOrder, now = Date.now()): BoostOrder {
    if (order.status === 'paused' || order.status === 'ended') {
        if (order.status === 'ended') return { ...order, status: 'ended' };
        if (now >= order.endAt) return { ...order, status: 'ended' };
        return order;
    }

    if (now >= order.endAt) return { ...order, status: 'ended' };
    if (now < order.startAt) return { ...order, status: 'scheduled' };
    return { ...order, status: 'active' };
}

export function getAllBoostOrdersNormalized(now = Date.now()): BoostOrder[] {
    const all: BoostOrder[] = [];
    for (const [userId, orders] of boostOrdersByUser.entries()) {
        const normalized = orders.map((order) => normalizeBoostOrder(order as BoostOrder, now));
        boostOrdersByUser.set(userId, normalized as DomainBoostOrder[]);
        all.push(...normalized);
    }
    return all;
}

export function getBoostOrdersForUser(userId: string, vertical?: VerticalType): BoostOrder[] {
    const normalized = (boostOrdersByUser.get(userId) ?? []).map((order) => normalizeBoostOrder(order as BoostOrder));
    boostOrdersByUser.set(userId, normalized as DomainBoostOrder[]);
    const filtered = vertical ? normalized.filter((item) => item.vertical === vertical) : normalized;
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
}

export function sectionLabel(section: BoostSection): string {
    if (section === 'marketplace') return 'Directorio';
    if (section === 'landing') return 'Portada';
    if (section === 'rent') return 'Arriendos';
    if (section === 'auction') return 'Subastas';
    if (section === 'project') return 'Proyectos';
    if (section === 'products') return 'Productos';
    if (section === 'services') return 'Servicios';
    return 'Ventas';
}

export function makeBoostOrderId(): string {
    return randomUUID();
}

export function countReservedSlots(vertical: VerticalType, section: BoostSection): number {
    return getAllBoostOrdersNormalized().filter((order) => {
        if (order.vertical !== vertical) return false;
        if (order.section !== section) return false;
        return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
    }).length;
}

export function countFreeBoostsUsedThisMonth(userId: string, vertical: VerticalType): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const orders = getBoostOrdersForUser(userId, vertical);
    return orders.filter((order) => order.createdAt >= monthStart && order.price === 0).length;
}

export function createBoostOrderRecord(input: {
    userId: string;
    vertical: VerticalType;
    target: BoostTargetRecord;
    section: BoostSection;
    plan: BoostPlanRecord;
    startAt?: number;
}): { ok: boolean; order?: BoostOrder; error?: string } {
    const targetType = input.target.targetType ?? 'listing';
    const targetId = input.target.id;
    const ownOrders = getBoostOrdersForUser(input.userId);
    const hasRunningForTarget = ownOrders.some((order) => {
        const orderTargetId = order.targetId ?? order.listingId;
        if (order.vertical !== input.vertical || orderTargetId !== targetId) return false;
        return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
    });

    if (hasRunningForTarget) {
        return { ok: false, error: 'Ya tienes un boost vigente para este recurso' };
    }

    const reserved = countReservedSlots(input.vertical, input.section);
    if (reserved >= MAX_BOOST_SLOTS_PER_SECTION) {
        return { ok: false, error: 'No quedan cupos en esta sección para el periodo seleccionado' };
    }

    const startAt = input.startAt && Number.isFinite(input.startAt) ? input.startAt : Date.now();
    const endAt = startAt + input.plan.days * 24 * 60 * 60 * 1000;
    const createdAt = Date.now();

    const nextOrder = normalizeBoostOrder({
        id: makeBoostOrderId(),
        userId: input.userId,
        targetType,
        targetId,
        listingId: targetType === 'listing' ? targetId : '',
        vertical: input.vertical,
        section: input.section,
        planId: input.plan.id,
        planName: input.plan.name,
        days: input.plan.days,
        price: input.plan.price,
        startAt,
        endAt,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
    });

    const existing = boostOrdersByUser.get(input.userId) ?? [];
    boostOrdersByUser.set(input.userId, [nextOrder as DomainBoostOrder, ...existing]);

    return { ok: true, order: nextOrder };
}

export function setBoostOrdersByUser(userId: string, orders: BoostOrder[]) {
    boostOrdersByUser.set(userId, orders as DomainBoostOrder[]);
}

export function getBoostOrdersByUser(userId: string): BoostOrder[] {
    return (boostOrdersByUser.get(userId) ?? []).map((order) => {
        const targetType = order.targetType ?? inferBoostTargetType(order.vertical);
        const targetId = order.targetId ?? order.listingId ?? '';
        return {
            ...order,
            targetType,
            targetId,
            listingId: targetType === 'listing' ? targetId : (order.listingId ?? ''),
        } as BoostOrder;
    });
}
