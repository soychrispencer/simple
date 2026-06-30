import { eq, and, desc } from 'drizzle-orm';
import type { adCampaigns } from '../../db/schema.js';
import {
    isAdPlacementSectionAllowed,
    isValidHttpDestinationUrl,
    normalizeAdCampaigns,
} from './service.js';
import type {
    AdCampaignRecord,
    AdDestinationType,
    AdDurationDays,
    AdFormat,
    AdOverlayAlign,
    AdPaymentStatus,
    AdPlacementSection,
    AdStatus,
    VerticalType,
} from './types.js';

export function mapAdCampaignRow(campaign: typeof adCampaigns.$inferSelect): AdCampaignRecord {
    return {
        id: campaign.id,
        accountId: campaign.accountId ?? null,
        userId: campaign.userId,
        vertical: campaign.vertical as VerticalType,
        name: campaign.name,
        format: campaign.format as AdFormat,
        status: campaign.status as AdStatus,
        paymentStatus: campaign.paymentStatus as AdPaymentStatus,
        destinationType: campaign.destinationType as AdDestinationType,
        destinationUrl: campaign.destinationUrl ?? null,
        listingHref: campaign.listingHref ?? null,
        profileSlug: campaign.profileSlug ?? null,
        desktopImageDataUrl: campaign.desktopImageDataUrl,
        mobileImageDataUrl: campaign.mobileImageDataUrl ?? null,
        overlayEnabled: campaign.overlayEnabled,
        overlayTitle: campaign.overlayTitle ?? null,
        overlaySubtitle: campaign.overlaySubtitle ?? null,
        overlayCta: campaign.overlayCta ?? null,
        overlayAlign: campaign.overlayAlign as AdOverlayAlign,
        placementSection: (campaign.placementSection as AdPlacementSection | null) ?? null,
        startAt: campaign.startAt.getTime(),
        endAt: campaign.endAt.getTime(),
        durationDays: campaign.durationDays as AdDurationDays,
        paidAt: campaign.paidAt?.getTime() ?? null,
        createdAt: campaign.createdAt.getTime(),
        updatedAt: campaign.updatedAt.getTime(),
    };
}

export function adCampaignToResponse(record: AdCampaignRecord) {
    return {
        id: record.id,
        accountId: record.accountId,
        userId: record.userId,
        vertical: record.vertical,
        name: record.name,
        format: record.format,
        status: record.status,
        paymentStatus: record.paymentStatus,
        destinationType: record.destinationType,
        destinationUrl: record.destinationUrl,
        listingHref: record.listingHref,
        profileSlug: record.profileSlug,
        desktopImageDataUrl: record.desktopImageDataUrl,
        mobileImageDataUrl: record.mobileImageDataUrl,
        overlayEnabled: record.overlayEnabled,
        overlayTitle: record.overlayTitle,
        overlaySubtitle: record.overlaySubtitle,
        overlayCta: record.overlayCta,
        overlayAlign: record.overlayAlign,
        placementSection: record.placementSection,
        startAt: new Date(record.startAt).toISOString(),
        endAt: new Date(record.endAt).toISOString(),
        durationDays: record.durationDays,
        paidAt: record.paidAt ? new Date(record.paidAt).toISOString() : null,
        createdAt: new Date(record.createdAt).toISOString(),
        updatedAt: new Date(record.updatedAt).toISOString(),
    };
}

export function createAdCampaignStore(db: any, adCampaignsTable: typeof adCampaigns) {
    async function listAdCampaignRecords(options: {
        userId?: string;
        vertical?: VerticalType;
        paymentStatus?: AdPaymentStatus;
        onlyPublicActive?: boolean;
    } = {}): Promise<AdCampaignRecord[]> {
        const conditions: any[] = [];
        if (options.userId) conditions.push(eq(adCampaignsTable.userId, options.userId));
        if (options.vertical) conditions.push(eq(adCampaignsTable.vertical, options.vertical));
        if (options.paymentStatus) conditions.push(eq(adCampaignsTable.paymentStatus, options.paymentStatus));

        let query = db.select().from(adCampaignsTable).$dynamic();
        if (conditions.length === 1) {
            query = query.where(conditions[0]);
        } else if (conditions.length > 1) {
            query = query.where(and(...conditions));
        }

        query = query.orderBy(desc(adCampaignsTable.createdAt));
        const rows = await query;
        const normalized = normalizeAdCampaigns(rows.map(mapAdCampaignRow));
        if (!options.onlyPublicActive) return normalized;
        return normalized.filter((item) => item.paymentStatus === 'paid' && item.status === 'active');
    }

    async function getAdCampaignRecordById(id: string): Promise<AdCampaignRecord | null> {
        const rows = await db.select().from(adCampaignsTable).where(eq(adCampaignsTable.id, id)).limit(1);
        if (rows.length === 0) return null;
        return normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0] ?? null;
    }

    async function getAdCampaignRecordForUser(userId: string, id: string): Promise<AdCampaignRecord | null> {
        const rows = await db
            .select()
            .from(adCampaignsTable)
            .where(and(eq(adCampaignsTable.id, id), eq(adCampaignsTable.userId, userId)))
            .limit(1);
        if (rows.length === 0) return null;
        return normalizeAdCampaigns([mapAdCampaignRow(rows[0])])[0] ?? null;
    }

    return {
        listAdCampaignRecords,
        getAdCampaignRecordById,
        getAdCampaignRecordForUser,
    };
}

export function sanitizeAdCampaignWriteInput(
    input: {
        name: string;
        destinationType: AdDestinationType;
        destinationUrl?: string | null;
        listingHref?: string | null;
        profileSlug?: string | null;
        desktopImageDataUrl: string;
        mobileImageDataUrl?: string | null;
        overlayEnabled: boolean;
        overlayTitle?: string | null;
        overlaySubtitle?: string | null;
        overlayCta?: string | null;
        overlayAlign: AdOverlayAlign;
    },
    options: {
        vertical: VerticalType;
        format: AdFormat;
        placementSection?: AdPlacementSection | null;
    },
) {
    const destinationType = input.destinationType;
    const destinationUrl = destinationType === 'custom_url' ? (input.destinationUrl?.trim() || null) : null;
    const listingHref = destinationType === 'listing' ? (input.listingHref?.trim() || null) : null;
    const profileSlug = destinationType === 'profile' ? (input.profileSlug?.trim() || null) : null;
    const placementSection = options.format === 'inline'
        ? (options.placementSection ?? null)
        : null;

    if (destinationType === 'custom_url') {
        if (!destinationUrl || !isValidHttpDestinationUrl(destinationUrl)) {
            throw new Error('La URL de destino no es válida.');
        }
    }
    if (destinationType === 'listing' && !listingHref) {
        throw new Error('Debes elegir una publicación como destino.');
    }
    if (destinationType === 'profile' && !profileSlug) {
        throw new Error('Debes ingresar el slug del perfil.');
    }

    if (options.format === 'inline') {
        if (!placementSection || !isAdPlacementSectionAllowed(options.vertical, placementSection)) {
            throw new Error('La sección objetivo de la campaña inline no es válida.');
        }
    }

    return {
        name: input.name.trim(),
        destinationType,
        destinationUrl,
        listingHref,
        profileSlug,
        desktopImageDataUrl: input.desktopImageDataUrl.trim(),
        mobileImageDataUrl: input.mobileImageDataUrl?.trim() || null,
        overlayEnabled: input.overlayEnabled,
        overlayTitle: input.overlayEnabled ? (input.overlayTitle?.trim() || null) : null,
        overlaySubtitle: input.overlayEnabled ? (input.overlaySubtitle?.trim() || null) : null,
        overlayCta: input.overlayEnabled ? (input.overlayCta?.trim() || null) : null,
        overlayAlign: input.overlayAlign,
        placementSection,
    };
}
