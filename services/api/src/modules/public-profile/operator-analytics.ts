import { resolveOperationTagLabels } from '@simple/utils';
import type { VerticalType } from '@simple/types';
import { accountKindLabel } from './presentation.js';
import type { PublicProfileRecord } from './types.js';

type ListingLike = {
    id: string;
    ownerId: string;
    vertical: string;
    section: string;
    title: string;
    status: string;
    views: number;
    favs: number;
    leads: number;
    href: string;
    updatedAt: number;
};

const SECTION_LABELS: Record<string, string> = {
    sale: 'Venta',
    rent: 'Arriendo',
    auction: 'Subasta',
    project: 'Proyecto',
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    active: 'Activa',
    paused: 'Pausada',
    sold: 'Vendida',
    archived: 'Archivada',
    closed: 'Cerrada',
};

export type MarketplaceOperatorAnalytics = {
    operator: {
        accountKind: PublicProfileRecord['accountKind'];
        operatorSubtype: string | null;
        operatorLabel: string;
        displayName: string;
        isPublished: boolean;
        publicUrl: string | null;
        followers: number;
        operationTags: string[];
    };
    summary: {
        totalListings: number;
        activeListings: number;
        views: number;
        favorites: number;
        leads: number;
        conversionRate: number | null;
    };
    bySection: Array<{
        section: string;
        label: string;
        count: number;
        views: number;
        favorites: number;
        leads: number;
    }>;
    byStatus: Array<{
        status: string;
        label: string;
        count: number;
    }>;
    topListings: Array<{
        id: string;
        title: string;
        section: string;
        sectionLabel: string;
        status: string;
        views: number;
        favorites: number;
        leads: number;
        href: string;
    }>;
};

export type BuildMarketplaceOperatorAnalyticsDeps = {
    listingsById: Map<string, ListingLike>;
    listingIdsByUser: Map<string, string[]>;
    getPublicProfileRecord: (userId: string, vertical: VerticalType) => PublicProfileRecord | null;
    countFollowers: (followeeUserId: string, vertical: VerticalType) => number;
    getDefaultDisplayName: (userId: string) => string;
};

export function buildMarketplaceOperatorAnalytics(
    userId: string,
    vertical: VerticalType,
    deps: BuildMarketplaceOperatorAnalyticsDeps,
): MarketplaceOperatorAnalytics {
    const listingIds = deps.listingIdsByUser.get(userId) ?? [];
    const listings = listingIds
        .map((id) => deps.listingsById.get(id))
        .filter((item): item is ListingLike => Boolean(item && item.vertical === vertical));

    const profile = deps.getPublicProfileRecord(userId, vertical);
    const accountKind = profile?.accountKind ?? 'individual';
    const operatorSubtype = profile?.operatorSubtype ?? null;
    const displayName = profile?.displayName ?? deps.getDefaultDisplayName(userId);
    const specialties = profile?.specialties ?? [];

    const views = listings.reduce((sum, item) => sum + item.views, 0);
    const favorites = listings.reduce((sum, item) => sum + item.favs, 0);
    const leads = listings.reduce((sum, item) => sum + item.leads, 0);
    const activeListings = listings.filter((item) => item.status === 'active' || item.status === 'paused').length;

    const sectionMap = new Map<string, { count: number; views: number; favorites: number; leads: number }>();
    for (const listing of listings) {
        const current = sectionMap.get(listing.section) ?? { count: 0, views: 0, favorites: 0, leads: 0 };
        sectionMap.set(listing.section, {
            count: current.count + 1,
            views: current.views + listing.views,
            favorites: current.favorites + listing.favs,
            leads: current.leads + listing.leads,
        });
    }

    const statusMap = new Map<string, number>();
    for (const listing of listings) {
        statusMap.set(listing.status, (statusMap.get(listing.status) ?? 0) + 1);
    }

    const slug = profile?.slug ?? null;
    const isPublished = Boolean(profile?.isPublished);
    const operationTags = (vertical === 'autos' || vertical === 'propiedades')
        ? resolveOperationTagLabels(vertical, specialties)
        : specialties;

    return {
        operator: {
            accountKind,
            operatorSubtype,
            operatorLabel: accountKindLabel(
                accountKind,
                vertical,
                operatorSubtype,
                profile?.operatorSubtypeCustom ?? null,
            ),
            displayName,
            isPublished,
            publicUrl: isPublished && slug ? `/perfil/${slug}` : null,
            followers: deps.countFollowers(userId, vertical),
            operationTags,
        },
        summary: {
            totalListings: listings.length,
            activeListings,
            views,
            favorites,
            leads,
            conversionRate: views > 0 ? Math.round((leads / views) * 1000) / 10 : null,
        },
        bySection: Array.from(sectionMap.entries())
            .map(([section, stats]) => ({
                section,
                label: SECTION_LABELS[section] ?? section,
                count: stats.count,
                views: stats.views,
                favorites: stats.favorites,
                leads: stats.leads,
            }))
            .sort((a, b) => b.views - a.views),
        byStatus: Array.from(statusMap.entries())
            .map(([status, count]) => ({
                status,
                label: STATUS_LABELS[status] ?? status,
                count,
            }))
            .sort((a, b) => b.count - a.count),
        topListings: listings
            .slice()
            .sort((a, b) => b.views - a.views)
            .slice(0, 5)
            .map((item) => ({
                id: item.id,
                title: item.title,
                section: item.section,
                sectionLabel: SECTION_LABELS[item.section] ?? item.section,
                status: item.status,
                views: item.views,
                favorites: item.favs,
                leads: item.leads,
                href: item.href,
            })),
    };
}
