export type MarketplaceEntitlementVertical = 'autos' | 'propiedades';
export type MarketplaceEntitlementAccountKind = 'individual' | 'independent' | 'company';

export type MarketplaceEntitlementPlan = {
    id: string;
    name: string;
    maxListings: number;
    maxImagesPerListing: number;
    maxFreeBoostsPerMonth: number;
    analyticsEnabled: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
};

export type MarketplaceSubscriptionEntitlementsInput = {
    vertical: MarketplaceEntitlementVertical;
    accountId: string | null;
    accountKind: MarketplaceEntitlementAccountKind;
    plan: MarketplaceEntitlementPlan;
    usage: { activeListings: number; teamMembers?: number };
    launchMode?: boolean;
};

export type MarketplaceSubscriptionEntitlements = {
    vertical: MarketplaceEntitlementVertical;
    accountId: string | null;
    accountKind: MarketplaceEntitlementAccountKind;
    plan: { id: string; name: string };
    status: 'launch' | 'free' | 'active';
    launchMode: boolean;
    capabilities: {
        publicProfile: boolean;
        instagramPublishing: boolean;
        analytics: boolean;
        prioritySupport: boolean;
        customBranding: boolean;
        apiAccess: boolean;
    };
    limits: {
        activeListings: number | null;
        imagesPerListing: number | null;
        freeBoostsPerMonth: number | null;
        teamMembers: null;
    };
    usage: { activeListings: number; teamMembers: number };
    canCreateActiveListing: boolean;
    listingLimitReason: string | null;
    canAddTeamMember: true;
    teamMemberLimitReason: null;
};

function normalizeLimit(value: number): number | null {
    return value < 0 ? null : value;
}

export function resolveMarketplaceSubscriptionEntitlements(
    input: MarketplaceSubscriptionEntitlementsInput,
): MarketplaceSubscriptionEntitlements {
    const launchMode = input.launchMode === true;
    const activeListingLimit = launchMode ? null : normalizeLimit(input.plan.maxListings);
    // Los espacios de empresa no tienen tope de integrantes por ahora.
    const teamMemberUsage = Math.max(0, input.usage.teamMembers ?? 0);
    const canCreateActiveListing = activeListingLimit === null
        || input.usage.activeListings < activeListingLimit;

    return {
        vertical: input.vertical,
        accountId: input.accountId,
        accountKind: input.accountKind,
        plan: { id: input.plan.id, name: input.plan.name },
        status: launchMode ? 'launch' : input.plan.id === 'free' ? 'free' : 'active',
        launchMode,
        capabilities: {
            publicProfile: launchMode || input.plan.id !== 'free',
            instagramPublishing: launchMode || input.plan.id !== 'free',
            analytics: launchMode || input.plan.analyticsEnabled,
            prioritySupport: launchMode || input.plan.prioritySupport,
            customBranding: launchMode || input.plan.customBranding,
            apiAccess: launchMode || input.plan.apiAccess,
        },
        limits: {
            activeListings: activeListingLimit,
            imagesPerListing: launchMode ? null : normalizeLimit(input.plan.maxImagesPerListing),
            freeBoostsPerMonth: launchMode ? null : normalizeLimit(input.plan.maxFreeBoostsPerMonth),
            teamMembers: null,
        },
        usage: {
            activeListings: Math.max(0, input.usage.activeListings),
            teamMembers: teamMemberUsage,
        },
        canCreateActiveListing,
        listingLimitReason: canCreateActiveListing || launchMode || activeListingLimit === null
            ? null
            : 'Has alcanzado el límite de ' + activeListingLimit + ' publicaciones de tu plan. Cierra una para liberar espacio.',
        canAddTeamMember: true,
        teamMemberLimitReason: null,
    };
}
