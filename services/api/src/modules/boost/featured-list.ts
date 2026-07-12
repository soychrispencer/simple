import type { BoostSection } from './types.js';

export type ListFeaturedBoostedDeps = {
    getAllBoostOrdersNormalized: () => Array<{
        vertical: string;
        section: BoostSection;
        status: string;
        listingId: string;
        targetId?: string;
        targetType?: string;
        userId: string;
        planName: string;
        endAt: number;
        createdAt: number;
    }>;
    getBoostTargetById: (
        vertical: string,
        targetType: string,
        targetId: string,
    ) => Promise<{
        id: string;
        href: string;
        title: string;
        subtitle: string;
        price: string;
        location: string;
        imageUrl?: string;
        imageUrls?: string[];
        section: BoostSection;
        targetType?: string;
    } | null>;
    getUserById: (id: string) => Promise<{ id: string } | null>;
    listingsById: Map<string, { id: string; rawData?: unknown; locationData?: unknown; location?: string; vertical?: string; section?: string }>;
    extractListingMediaUrls: (record: { rawData?: unknown }) => string[];
    extractListingSummary?: (record: { id: string; rawData?: unknown; vertical?: string; section?: string }) => string[];
    extractAutosCondition?: (record: { id: string; rawData?: unknown; vertical?: string; section?: string }) => string | null;
    extractPublicOfferPricing?: (record: { id: string; rawData?: unknown; vertical?: string; section?: string }) => {
        priceOriginal: string | null;
        discountPercent: number | null;
    };
    buildLocationPublicLabel: (locationData: unknown) => string;
    humanizePublicLocationFallback: (location: string) => string;
    sanitizeUser: (user: { id: string }) => unknown;
    usersById: Map<string, { id: string }>;
    toPublicMediaUrl: (value: unknown) => string;
    getPublishedSellerProfile: (
        userId: string,
        vertical: string,
    ) => { avatarImageUrl?: string | null } | null;
};

export function createListFeaturedBoosted(deps: ListFeaturedBoostedDeps) {
    function resolveOwnerAvatar(owner: { id: string; avatar?: string }, vertical: string): string | undefined {
        const profile = deps.getPublishedSellerProfile(owner.id, vertical);
        // Solo logo del negocio/perfil público; sin fallback a avatar personal.
        return deps.toPublicMediaUrl(profile?.avatarImageUrl) || undefined;
    }

    function buildOwnerPayload(owner: { id: string; avatar?: string }, vertical: string) {
        const sanitized = deps.sanitizeUser(owner) as { avatar?: string } & Record<string, unknown>;
        const avatar = resolveOwnerAvatar(owner, vertical);
        return { ...sanitized, avatar };
    }

    return async function listFeaturedBoosted(
        vertical: string,
        section: BoostSection,
        limit: number,
    ) {
        const boosted = deps
            .getAllBoostOrdersNormalized()
            .filter((order) => order.vertical === vertical && order.section === section && order.status === 'active')
            .sort((a, b) => b.createdAt - a.createdAt);

        const items = (
            await Promise.all(
                boosted.map(async (order) => {
                    const targetType = order.targetType ?? 'listing';
                    const targetId = order.targetId ?? order.listingId;
                    const target = await deps.getBoostTargetById(order.vertical, targetType, targetId);
                    if (!target) return null;
                    const owner = await deps.getUserById(order.userId);
                    const sourceListing = targetType === 'listing' ? deps.listingsById.get(target.id) : null;
                    const listingImageUrls = sourceListing
                        ? deps.extractListingMediaUrls(sourceListing)
                        : (target.imageUrls ?? []);
                    const imageUrl = listingImageUrls.length > 0
                        ? listingImageUrls[0]
                        : (target.imageUrl ?? '');
                    const location = sourceListing
                        ? deps.buildLocationPublicLabel(sourceListing.locationData)
                            || deps.humanizePublicLocationFallback(sourceListing.location ?? '')
                            || deps.humanizePublicLocationFallback(target.location)
                            || 'Chile'
                        : deps.humanizePublicLocationFallback(target.location) || 'Chile';
                    const summary = sourceListing && deps.extractListingSummary
                        ? deps.extractListingSummary(sourceListing)
                        : target.subtitle
                            .split(/\s*[•|;]\s*/)
                            .map((part) => part.trim())
                            .filter(Boolean);
                    const condition = sourceListing && deps.extractAutosCondition
                        ? deps.extractAutosCondition(sourceListing)
                        : null;
                    const offerPricing = sourceListing && deps.extractPublicOfferPricing
                        ? deps.extractPublicOfferPricing(sourceListing)
                        : { priceOriginal: null, discountPercent: null };
                    return {
                        id: target.id,
                        href: target.href,
                        title: target.title,
                        subtitle: summary.length > 0 ? summary.join(' • ') : target.subtitle,
                        summary,
                        condition,
                        price: target.price,
                        priceOriginal: offerPricing.priceOriginal,
                        discountPercent: offerPricing.discountPercent,
                        location,
                        imageUrl,
                        imageUrls: listingImageUrls,
                        section: target.section,
                        boosted: true,
                        planName: order.planName,
                        boostEndsAt: order.endAt,
                        owner: owner ? buildOwnerPayload(owner as { id: string; avatar?: string }, order.vertical) : null,
                    };
                }),
            )
        ).filter((item) => item != null);

        const uniqueIds = new Set<string>();
        const uniqueBoosted = items.filter((item) => {
            if (uniqueIds.has(item.id)) return false;
            uniqueIds.add(item.id);
            return true;
        });

        return uniqueBoosted.slice(0, limit);
    };
}
