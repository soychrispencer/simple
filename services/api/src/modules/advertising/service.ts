import type {
    VerticalType,
    AdFormat,
    AdDurationDays,
    AdPlacementSection,
    AdCampaignRecord,
    AdPaymentStatus,
    PaymentOrderStatus,
    SubscriptionPlanRecord
} from './types.js';
import {
    AD_PRICING_BY_VERTICAL,
    SUBSCRIPTION_PLANS_BY_VERTICAL,
    MAX_ACTIVE_HERO_CAMPAIGNS
} from './types.js';

// Utility functions
export function getAdvertisingPrice(vertical: VerticalType, format: AdFormat, durationDays: AdDurationDays): number {
    return AD_PRICING_BY_VERTICAL[vertical][format][durationDays];
}

export function isAdPlacementSectionAllowed(vertical: VerticalType, section: AdPlacementSection): boolean {
    if (section === 'home') return true;
    if (vertical === 'autos') return section === 'ventas' || section === 'arriendos' || section === 'subastas';
    return section === 'ventas' || section === 'arriendos' || section === 'proyectos';
}

export function normalizeAdCampaignStatus(record: AdCampaignRecord, now = Date.now()): AdCampaignRecord {
    if (record.status === 'paused') {
        if (now >= record.endAt) return { ...record, status: 'ended' };
        return record;
    }
    if (now >= record.endAt) return { ...record, status: 'ended' };
    if (now < record.startAt) return { ...record, status: 'scheduled' };
    return { ...record, status: 'active' };
}

export function normalizeAdCampaigns(items: AdCampaignRecord[], now = Date.now()): AdCampaignRecord[] {
    const normalized = items.map((item) => normalizeAdCampaignStatus(item, now));

    const activeHeroCandidates = normalized
        .filter((item) => item.paymentStatus === 'paid' && item.format === 'hero' && item.status === 'active')
        .sort((a, b) => a.startAt - b.startAt || a.createdAt - b.createdAt);

    const allowedHeroIds = new Set(
        activeHeroCandidates.slice(0, MAX_ACTIVE_HERO_CAMPAIGNS).map((item) => item.id)
    );

    return normalized.map((item) => {
        if (item.paymentStatus !== 'paid') return item;
        if (item.format !== 'hero' || item.status !== 'active') return item;
        if (allowedHeroIds.has(item.id)) return item;
        return { ...item, status: 'scheduled' };
    });
}

export function getAdPaymentStatusFromOrderStatus(status: PaymentOrderStatus): AdPaymentStatus {
    if (status === 'approved' || status === 'authorized') return 'paid';
    if (status === 'rejected') return 'failed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

export function isValidHttpDestinationUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function getSubscriptionPlans(vertical: VerticalType): SubscriptionPlanRecord[] {
    return SUBSCRIPTION_PLANS_BY_VERTICAL[vertical];
}