import type { BoostSection } from './types.js';

export type ListFeaturedBoostedDeps = {
    getAllBoostOrdersNormalized: () => Array<{
        accountId?: string | null;
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
        ownerId: string;
        href: string;
        title: string;
        subtitle: string;
        price: string;
        location: string;
        publicEmail?: string | null;
        publicPhone?: string | null;
        publicWhatsapp?: string | null;
        imageUrl?: string;
        imageUrls?: string[];
        section: BoostSection;
        targetType?: string;
        accountId?: string | null;
    } | null>;
    getUserById: (id: string) => Promise<{ id: string; name?: string | null } | null>;
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
    toPublicMediaUrl: (value: unknown) => string;
    getPublishedSellerProfile: (
        userId: string,
        vertical: string,
        accountId?: string | null,
    ) => {
        displayName?: string | null;
        slug?: string | null;
        publicEmail?: string | null;
        publicPhone?: string | null;
        publicWhatsapp?: string | null;
        avatarImageUrl?: string | null;
    } | null;
};

export function createListFeaturedBoosted(deps: ListFeaturedBoostedDeps) {
    function resolveOwnerAvatar(
        vertical: string,
        accountId?: string | null,
        ownerId?: string,
    ): string | undefined {
        if (!ownerId) return undefined;
        const profile = deps.getPublishedSellerProfile(ownerId, vertical, accountId);
        // Solo logo del negocio/perfil público; sin fallback a avatar personal.
        return deps.toPublicMediaUrl(profile?.avatarImageUrl) || undefined;
    }

    function buildOwnerPayload(
        owner: { id: string; name?: string | null },
        target: { targetType?: string; title: string; href: string; publicEmail?: string | null; publicPhone?: string | null; publicWhatsapp?: string | null },
        vertical: string,
        accountId?: string | null,
    ) {
        const profile = deps.getPublishedSellerProfile(owner.id, vertical, accountId);
        const contactEmail = target.publicEmail?.trim() || profile?.publicEmail?.trim() || undefined;
        const contactPhone = target.publicPhone?.trim()
            || target.publicWhatsapp?.trim()
            || profile?.publicPhone?.trim()
            || profile?.publicWhatsapp?.trim()
            || undefined;
        return {
            id: owner.id,
            name: profile?.displayName?.trim() || (target.targetType === 'serenata_group' ? target.title : owner.name?.trim()) || target.title,
            username: profile?.slug ?? undefined,
            profileHref: profile?.slug ? `/perfil/${profile.slug}` : undefined,
            email: contactEmail,
            phone: contactPhone,
            avatar: resolveOwnerAvatar(vertical, accountId, owner.id),
        };
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
                    const owner = await deps.getUserById(target.ownerId);
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
                        owner: owner
                            ? buildOwnerPayload(
                                owner,
                                target,
                                order.vertical,
                                target.accountId ?? order.accountId ?? null,
                            )
                            : null,
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
