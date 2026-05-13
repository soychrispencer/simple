import type { BoostSection, BoostOrder, BoostPlanRecord, BoostListingRecord, VerticalType, BoostPlan } from './types.js';
import { BOOST_PLAN_TEMPLATES, BOOST_PRICE_BY_VERTICAL_SECTION, MAX_BOOST_SLOTS_PER_SECTION } from './types.js';

// State
const boostOrdersByUser = new Map<string, BoostOrder[]>();
const boostListingsSeed: BoostListingRecord[] = [];

// Utility functions
export function isBoostSectionAllowed(vertical: VerticalType, section: BoostSection): boolean {
    if (vertical === 'autos') return section === 'sale' || section === 'rent' || section === 'auction';
    return section === 'sale' || section === 'rent' || section === 'project';
}

export function getSectionsForVertical(vertical: VerticalType): BoostSection[] {
    return vertical === 'autos' ? ['sale', 'rent', 'auction'] : ['sale', 'rent', 'project'];
}

export function parseBoostSection(raw: string | undefined, vertical: VerticalType): BoostSection {
    const normalized = raw === 'rent' || raw === 'auction' || raw === 'project' ? raw : 'sale';
    return isBoostSectionAllowed(vertical, normalized) ? normalized : 'sale';
}

export function getBoostPlans(vertical: VerticalType, section: BoostSection): BoostPlanRecord[] {
    const safeSection = isBoostSectionAllowed(vertical, section) ? section : 'sale';
    const sectionPricing = BOOST_PRICE_BY_VERTICAL_SECTION[vertical][safeSection];
    return BOOST_PLAN_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        days: template.days,
        visibilityLift: template.visibilityLift,
        price: sectionPricing[template.id],
    }));
}

export function getBoostListingById(vertical: VerticalType, listingId: string): BoostListingRecord | null {
    return boostListingsSeed.find((item) => item.vertical === vertical && item.id === listingId) ?? null;
}

export function getBoostListingsByOwner(vertical: VerticalType, ownerId: string): BoostListingRecord[] {
    return boostListingsSeed.filter((item) => item.vertical === vertical && item.ownerId === ownerId);
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
        const normalized = orders.map((order) => normalizeBoostOrder(order, now));
        boostOrdersByUser.set(userId, normalized);
        all.push(...normalized);
    }
    return all;
}

export function getBoostOrdersForUser(userId: string, vertical?: VerticalType): BoostOrder[] {
    const normalized = (boostOrdersByUser.get(userId) ?? []).map((order) => normalizeBoostOrder(order));
    boostOrdersByUser.set(userId, normalized);
    const filtered = vertical ? normalized.filter((item) => item.vertical === vertical) : normalized;
    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
}

export function sectionLabel(section: BoostSection): string {
    if (section === 'rent') return 'Arriendos';
    if (section === 'auction') return 'Subastas';
    if (section === 'project') return 'Proyectos';
    return 'Ventas';
}

export function makeBoostOrderId(): string {
    return `boost-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

export function countReservedSlots(vertical: VerticalType, section: BoostSection): number {
    return getAllBoostOrdersNormalized().filter((order) => {
        if (order.vertical !== vertical) return false;
        if (order.section !== section) return false;
        return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
    }).length;
}

// Placeholder functions - need to be implemented with proper dependencies
export function countFreeBoostsUsedThisMonth(userId: string, vertical: VerticalType): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const orders = getBoostOrdersForUser(userId, vertical);
    return orders.filter((order) => order.createdAt >= monthStart && order.price === 0).length;
}

export function getFreeBoostQuota(user: any, vertical: VerticalType): { max: number; used: number; remaining: number } {
    if (user.role === 'superadmin') {
        return { max: -1, used: 0, remaining: -1 }; // -1 = ilimitado
    }
    // TODO: Implement proper plan lookup
    const max = 5; // Default quota
    const used = countFreeBoostsUsedThisMonth(user.id, vertical);
    return { max, used, remaining: Math.max(0, max - used) };
}

export function createBoostOrderRecord(input: {
    userId: string;
    vertical: VerticalType;
    listing: BoostListingRecord;
    section: BoostSection;
    plan: BoostPlanRecord;
    startAt?: number;
}): { ok: boolean; order?: BoostOrder; error?: string } {
    const ownOrders = getBoostOrdersForUser(input.userId);
    const hasRunningForListing = ownOrders.some((order) => {
        if (order.vertical !== input.vertical || order.listingId !== input.listing.id) return false;
        return order.status === 'active' || order.status === 'scheduled' || order.status === 'paused';
    });

    if (hasRunningForListing) {
        return { ok: false, error: 'Ya tienes un boost vigente para esta publicación' };
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
        vertical: input.vertical,
        listingId: input.listing.id,
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
    boostOrdersByUser.set(input.userId, [nextOrder, ...existing]);

    return { ok: true, order: nextOrder };
}

// State management
export function setBoostOrdersByUser(userId: string, orders: BoostOrder[]) {
    boostOrdersByUser.set(userId, orders);
}

export function getBoostOrdersByUser(userId: string): BoostOrder[] {
    return boostOrdersByUser.get(userId) ?? [];
}