import {
    createDefaultPublicProfileBusinessHours,
    createDefaultPublicProfileSocialLinks,
    normalizePublicProfileSlug,
} from './normalize.js';
import { resolveOperatorDisplayLabel, formatStructuredLocationLabel, structuredLocationFromPublicProfileFields, resolvePublicProfileAddressFields, buildPublicBusinessPaymentMethods, type BankTransferData } from '@simple/utils';
import type {
    PublicProfileAccountKind,
    PublicProfileRecord,
    VerticalType,
} from './types.js';
import type { AddressBookEntry } from '../../lib/domain-types.js';

export function accountKindLabel(
    kind: PublicProfileAccountKind,
    vertical: VerticalType,
    operatorSubtype?: string | null,
    operatorSubtypeCustom?: string | null,
): string {
    if (vertical !== 'autos' && vertical !== 'propiedades') {
        return kind === 'company' ? 'Empresa' : kind === 'independent' ? 'Profesional' : 'Particular';
    }
    return resolveOperatorDisplayLabel(vertical, kind, operatorSubtype ?? null, operatorSubtypeCustom ?? null);
}

type ProfileUser = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string;
    role?: string;
    status?: string;
};

type ProfileListing = {
    ownerId: string;
    vertical: VerticalType;
    updatedAt: number;
    views: number;
    favs: number;
    status: string;
    rawData?: unknown;
};

export type PublicProfilePresentationDeps = {
    usernameFromName: (name: string) => string;
    getDefaultPublicProfileAccountKind: (user: ProfileUser, vertical: VerticalType) => PublicProfileAccountKind;
    getDefaultPublicProfileAddress: (userId: string) => {
        addressLine1?: string | null;
        communeName?: string | null;
        regionName?: string | null;
    } | null;
    getAddressBookEntryById: (userId: string, addressId: string) => AddressBookEntry | null;
    getPublicProfileRecord: (userId: string, vertical: VerticalType) => PublicProfileRecord | null;
    getEffectivePlanId: (user: ProfileUser, vertical: VerticalType) => string;
    getCurrentPlanLabel: (user: ProfileUser, vertical: VerticalType) => string;
    userCanUsePublicProfile: (user: ProfileUser, vertical: VerticalType) => boolean;
    countFollowers: (followeeUserId: string, vertical: VerticalType) => number;
    extractListingMediaUrls: (listing: ProfileListing) => string[];
    isPublicListingVisible: (listing: ProfileListing) => boolean;
    listingToPublicResponse: (listing: ProfileListing) => unknown;
    listingsById: Map<string, ProfileListing>;
    fetchPublishedOperatorCatalog?: (profileId: string) => Promise<{
        services: unknown[];
        packs: unknown[];
        promotions: unknown[];
        products?: unknown[];
    }>;
};

export function createPublicProfilePresentation(deps: PublicProfilePresentationDeps) {
    const {
        usernameFromName,
        getDefaultPublicProfileAccountKind,
        getDefaultPublicProfileAddress,
        getAddressBookEntryById,
        getPublicProfileRecord,
        getEffectivePlanId,
        getCurrentPlanLabel,
        userCanUsePublicProfile,
        countFollowers,
        extractListingMediaUrls,
        isPublicListingVisible,
        listingToPublicResponse,
        listingsById,
        fetchPublishedOperatorCatalog,
    } = deps;

    function getPublicProfileDefaultValues(
        user: ProfileUser,
        vertical: VerticalType,
    ): Omit<PublicProfileRecord, 'id' | 'createdAt' | 'updatedAt'> {
        const address = getDefaultPublicProfileAddress(user.id);
        const defaultSlug = normalizePublicProfileSlug(usernameFromName(user.name));
        return {
            userId: user.id,
            vertical,
            slug: defaultSlug || `cuenta-${user.id.slice(0, 8)}`,
            isPublished: false,
            accountKind: getDefaultPublicProfileAccountKind(user, vertical),
            operatorSubtype: null,
            operatorSubtypeCustom: null,
            displayName: user.name,
            headline: vertical === 'autos'
                ? 'Atención directa y publicaciones activas verificadas.'
                : 'Atención inmobiliaria con publicaciones activas verificadas.',
            bio: null,
            companyName: null,
            website: null,
            publicEmail: user.email,
            publicPhone: user.phone ?? null,
            publicWhatsapp: user.phone ?? null,
            addressLine: address?.addressLine1 ?? null,
            city: address?.communeName ?? null,
            region: address?.regionName ?? null,
            countryCode: 'CL',
            regionId: null,
            localityId: null,
            coverImageUrl: null,
            avatarImageUrl: null,
            socialLinks: createDefaultPublicProfileSocialLinks(),
            businessHours: createDefaultPublicProfileBusinessHours(),
            specialties: [],
            scheduleNote: null,
            alwaysOpen: false,
            weeklyBreakStart: null,
            weeklyBreakEnd: null,
            scheduleBlockedSlots: [],
            requiresAdvancePayment: false,
            advancePaymentInstructions: null,
            acceptsTransfer: false,
            acceptsMp: false,
            acceptsPaymentLink: false,
            paymentLinkUrl: null,
            bankTransferData: null,
            mpAccessToken: null,
            mpUserId: null,
            trialEndsAt: null,
            primaryAddressId: null,
            timezone: 'America/Santiago',
            bookingTermsText: null,
        };
    }

    function resolveStoredProfileAddress(profile: PublicProfileRecord, userId: string) {
        const primaryEntry = profile.primaryAddressId
            ? getAddressBookEntryById(userId, profile.primaryAddressId)
            : null;
        return resolvePublicProfileAddressFields(profile, primaryEntry);
    }

    function buildEditablePublicProfile(user: ProfileUser, vertical: VerticalType) {
        const stored = getPublicProfileRecord(user.id, vertical);
        const defaults = getPublicProfileDefaultValues(user, vertical);
        const base = stored ? {
            ...defaults,
            ...stored,
            socialLinks: {
                ...defaults.socialLinks,
                ...stored.socialLinks,
            },
            businessHours: stored.businessHours.length > 0 ? stored.businessHours : defaults.businessHours,
            specialties: stored.specialties.length > 0 ? stored.specialties : defaults.specialties,
        } : {
            id: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...defaults,
        };
        const resolvedAddress = stored ? resolveStoredProfileAddress(base as PublicProfileRecord, user.id) : null;
        return {
            id: stored?.id ?? null,
            userId: user.id,
            vertical,
            slug: base.slug,
            isPublished: base.isPublished,
            accountKind: base.accountKind,
            operatorSubtype: base.operatorSubtype ?? null,
            operatorSubtypeCustom: base.operatorSubtypeCustom ?? null,
            displayName: base.displayName,
            headline: base.headline,
            bio: base.bio,
            companyName: base.companyName,
            website: base.website,
            publicEmail: base.publicEmail,
            publicPhone: base.publicPhone,
            publicWhatsapp: base.publicWhatsapp,
            primaryAddressId: base.primaryAddressId ?? null,
            addressLine: resolvedAddress?.addressLine ?? base.addressLine,
            city: base.city,
            region: base.region,
            countryCode: base.countryCode ?? 'CL',
            regionId: base.regionId ?? null,
            localityId: base.localityId ?? null,
            timezone: base.timezone ?? 'America/Santiago',
            coverImageUrl: base.coverImageUrl,
            avatarImageUrl: base.avatarImageUrl,
            socialLinks: base.socialLinks,
            businessHours: base.businessHours,
            specialties: base.specialties,
            scheduleNote: base.scheduleNote,
            alwaysOpen: base.alwaysOpen,
            weeklyBreakStart: base.weeklyBreakStart ?? null,
            weeklyBreakEnd: base.weeklyBreakEnd ?? null,
            scheduleBlockedSlots: base.scheduleBlockedSlots ?? [],
            publicUrl: stored?.isPublished ? `/perfil/${base.slug}` : null,
        };
    }

    function getPublishedSellerProfile(userId: string, vertical: VerticalType): PublicProfileRecord | null {
        const record = getPublicProfileRecord(userId, vertical);
        if (!record || !record.isPublished) return null;
        return record;
    }

    async function buildPublicProfileResponse(
        user: { id: string; name: string; email: string; phone?: string | null; avatar?: string },
        vertical: VerticalType,
        profile: PublicProfileRecord,
    ) {
        const listings = Array.from(listingsById.values())
            .filter((listing) => listing.ownerId === user.id)
            .filter((listing) => listing.vertical === vertical)
            .filter((listing) => isPublicListingVisible(listing))
            .sort((a, b) => b.updatedAt - a.updatedAt);

        const displayName = profile.displayName || user.name;
        const firstListing = listings[0] ?? null;
        const coverImageUrl = profile.coverImageUrl || (firstListing ? extractListingMediaUrls(firstListing)[0] ?? null : null);
        const avatarImageUrl = profile.avatarImageUrl || null;
        const locationLabel = formatStructuredLocationLabel(structuredLocationFromPublicProfileFields(profile));
        const publicAddress = resolveStoredProfileAddress(profile, user.id);

        const catalog = fetchPublishedOperatorCatalog
            ? await fetchPublishedOperatorCatalog(profile.id)
            : { services: [], packs: [], promotions: [], products: [] };

        return {
            profile: {
                id: profile.id,
                ownerUserId: user.id,
                name: displayName,
                username: profile.slug,
                vertical,
                accountKind: profile.accountKind,
                accountKindLabel: accountKindLabel(
                    profile.accountKind,
                    vertical,
                    profile.operatorSubtype,
                    profile.operatorSubtypeCustom,
                ),
                operatorSubtype: profile.operatorSubtype,
                operatorSubtypeCustom: profile.operatorSubtypeCustom,
                subscriptionPlanId: getEffectivePlanId(user, vertical),
                subscriptionPlanName: getCurrentPlanLabel(user, vertical),
                headline: null,
                bio: profile.bio,
                companyName: null,
                website: profile.website,
                email: profile.publicEmail || user.email,
                phone: profile.publicPhone || user.phone || null,
                whatsapp: profile.publicWhatsapp || profile.publicPhone || user.phone || null,
                addressLine: publicAddress.addressLine,
                city: publicAddress.city,
                region: publicAddress.region,
                locationLabel: locationLabel || null,
                coverImageUrl,
                avatarImageUrl,
                socialLinks: profile.socialLinks,
                businessHours: profile.businessHours,
                scheduleNote: profile.scheduleNote,
                alwaysOpen: profile.alwaysOpen,
                weeklyBreakStart: profile.weeklyBreakStart ?? null,
                weeklyBreakEnd: profile.weeklyBreakEnd ?? null,
                scheduleBlockedSlots: profile.scheduleBlockedSlots ?? [],
                specialties: [],
                activeListings: listings.length,
                totalViews: listings.reduce((sum, listing) => sum + listing.views, 0),
                totalFavorites: listings.reduce((sum, listing) => sum + listing.favs, 0),
                followers: countFollowers(user.id, vertical),
                paymentMethods: buildPublicBusinessPaymentMethods({
                    requiresAdvancePayment: profile.requiresAdvancePayment,
                    advancePaymentInstructions: profile.advancePaymentInstructions,
                    acceptsTransfer: profile.acceptsTransfer,
                    acceptsMp: profile.acceptsMp,
                    acceptsPaymentLink: profile.acceptsPaymentLink,
                    paymentLinkUrl: profile.paymentLinkUrl,
                    bankTransferData: profile.bankTransferData as BankTransferData | null,
                    mpConnected: Boolean(profile.mpAccessToken),
                }),
            },
            listings: listings.map((listing) => listingToPublicResponse(listing)),
            services: catalog.services,
            packs: catalog.packs,
            promotions: catalog.promotions,
            products: catalog.products ?? [],
        };
    }

    function buildAccountPublicProfileResponse(user: ProfileUser, vertical: VerticalType) {
        const paidPlanId = getEffectivePlanId(user, vertical);
        return {
            ok: true,
            featureEnabled: userCanUsePublicProfile(user, vertical),
            currentPlanId: paidPlanId,
            currentPlanName: getCurrentPlanLabel(user, vertical),
            profile: buildEditablePublicProfile(user, vertical),
        };
    }

    return {
        getPublicProfileDefaultValues,
        buildEditablePublicProfile,
        getPublishedSellerProfile,
        buildPublicProfileResponse,
        buildAccountPublicProfileResponse,
    };
}
