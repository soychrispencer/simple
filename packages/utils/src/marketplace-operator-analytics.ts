import { apiFetch } from './api-client.js';
import type { PublicProfileVertical } from './public-profile-settings.js';

export type MarketplaceOperatorAnalytics = {
    operator: {
        accountKind: 'individual' | 'independent' | 'company';
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

type AnalyticsResponse = {
    ok: boolean;
    analytics?: MarketplaceOperatorAnalytics;
    error?: string;
};

export async function fetchMarketplaceOperatorAnalytics(
    vertical: PublicProfileVertical,
): Promise<MarketplaceOperatorAnalytics | null> {
    const { data } = await apiFetch<AnalyticsResponse>(
        `/api/account/public-profile/analytics?vertical=${vertical}`,
        { method: 'GET' },
    );
    if (!data?.ok || !data.analytics) return null;
    return data.analytics;
}
