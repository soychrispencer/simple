import {
    createDefaultPublicProfileBusinessHours,
    createDefaultPublicProfileSocialLinks,
    normalizePublicProfileSlug,
} from './normalize.js';
import type {
    PublicProfileAccountKind,
    PublicProfileRecord,
    PublicProfileTeamMemberRecord,
    VerticalType,
} from './types.js';

export function accountKindLabel(kind: PublicProfileAccountKind, vertical: VerticalType): string {
    if (kind === 'company') return vertical === 'autos' ? 'Automotora o empresa' : 'Inmobiliaria o empresa';
    if (kind === 'independent') return vertical === 'autos' ? 'Vendedor independiente' : 'Corredor independiente';
    return vertical === 'autos' ? 'Vendedor particular' : 'Propietario o vendedor';
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
    getPublicProfileRecord: (userId: string, vertical: VerticalType) => PublicProfileRecord | null;
    getEditablePublicProfileTeamMembers: (userId: string, vertical: VerticalType) => PublicProfileTeamMemberRecord[];
    getPublicProfileTeamMembers: (userId: string, vertical: VerticalType) => PublicProfileTeamMemberRecord[];
    getEffectivePlanId: (user: ProfileUser, vertical: VerticalType) => string;
    getCurrentPlanLabel: (user: ProfileUser, vertical: VerticalType) => string;
    userCanUsePublicProfile: (user: ProfileUser, vertical: VerticalType) => boolean;
    countFollowers: (followeeUserId: string, vertical: VerticalType) => number;
    extractListingMediaUrls: (listing: ProfileListing) => string[];
    isPublicListingVisible: (listing: ProfileListing) => boolean;
    listingToPublicResponse: (listing: ProfileListing) => unknown;
    listingsById: Map<string, ProfileListing>;
};

export function createPublicProfilePresentation(deps: PublicProfilePresentationDeps) {
    const {
        usernameFromName,
        getDefaultPublicProfileAccountKind,
        getDefaultPublicProfileAddress,
        getPublicProfileRecord,
        getEditablePublicProfileTeamMembers,
        getPublicProfileTeamMembers,
        getEffectivePlanId,
        getCurrentPlanLabel,
        userCanUsePublicProfile,
        countFollowers,
        extractListingMediaUrls,
        isPublicListingVisible,
        listingToPublicResponse,
        listingsById,
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
            coverImageUrl: null,
            avatarImageUrl: user.avatar ?? null,
            socialLinks: createDefaultPublicProfileSocialLinks(),
            businessHours: createDefaultPublicProfileBusinessHours(),
            specialties: [],
            scheduleNote: null,
            alwaysOpen: false,
        };
    }

    function buildEditablePublicProfile(user: ProfileUser, vertical: VerticalType) {
        const stored = getPublicProfileRecord(user.id, vertical);
        const teamMembers = getEditablePublicProfileTeamMembers(user.id, vertical);
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
        return {
            id: stored?.id ?? null,
            userId: user.id,
            vertical,
            slug: base.slug,
            isPublished: base.isPublished,
            accountKind: base.accountKind,
            displayName: base.displayName,
            headline: base.headline,
            bio: base.bio,
            companyName: base.companyName,
            website: base.website,
            publicEmail: base.publicEmail,
            publicPhone: base.publicPhone,
            publicWhatsapp: base.publicWhatsapp,
            addressLine: base.addressLine,
            city: base.city,
            region: base.region,
            coverImageUrl: base.coverImageUrl,
            avatarImageUrl: base.avatarImageUrl,
            socialLinks: base.socialLinks,
            businessHours: base.businessHours,
            specialties: base.specialties,
            teamMembers: teamMembers.map((item) => ({
                id: item.id,
                name: item.name,
                roleTitle: item.roleTitle,
                bio: item.bio,
                email: item.email,
                phone: item.phone,
                whatsapp: item.whatsapp,
                avatarImageUrl: item.avatarImageUrl,
                socialLinks: item.socialLinks,
                specialties: item.specialties,
                isPublished: item.isPublished,
            })),
            scheduleNote: base.scheduleNote,
            alwaysOpen: base.alwaysOpen,
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
        const teamMembers = getPublicProfileTeamMembers(user.id, vertical);
        const listings = Array.from(listingsById.values())
            .filter((listing) => listing.ownerId === user.id)
            .filter((listing) => listing.vertical === vertical)
            .filter((listing) => isPublicListingVisible(listing))
            .sort((a, b) => b.updatedAt - a.updatedAt);

        const displayName = profile.displayName || user.name;
        const firstListing = listings[0] ?? null;
        const coverImageUrl = profile.coverImageUrl || (firstListing ? extractListingMediaUrls(firstListing)[0] ?? null : null);
        const avatarImageUrl = profile.avatarImageUrl || user.avatar || null;
        const locationParts = [profile.city, profile.region].filter(Boolean);

        return {
            profile: {
                id: profile.id,
                ownerUserId: user.id,
                name: displayName,
                username: profile.slug,
                vertical,
                accountKind: profile.accountKind,
                accountKindLabel: accountKindLabel(profile.accountKind, vertical),
                subscriptionPlanId: getEffectivePlanId(user, vertical),
                subscriptionPlanName: getCurrentPlanLabel(user, vertical),
                headline: profile.headline,
                bio: profile.bio,
                companyName: profile.companyName,
                website: profile.website,
                email: profile.publicEmail || user.email,
                phone: profile.publicPhone || user.phone || null,
                whatsapp: profile.publicWhatsapp || profile.publicPhone || user.phone || null,
                addressLine: profile.addressLine,
                city: profile.city,
                region: profile.region,
                locationLabel: locationParts.join(', ') || null,
                coverImageUrl,
                avatarImageUrl,
                socialLinks: profile.socialLinks,
                businessHours: profile.businessHours,
                scheduleNote: profile.scheduleNote,
                alwaysOpen: profile.alwaysOpen,
                specialties: profile.specialties,
                teamMembers: teamMembers.map((item) => ({
                    id: item.id,
                    name: item.name,
                    roleTitle: item.roleTitle,
                    bio: item.bio,
                    email: item.email,
                    phone: item.phone,
                    whatsapp: item.whatsapp,
                    avatarImageUrl: item.avatarImageUrl,
                    socialLinks: item.socialLinks,
                    specialties: item.specialties,
                })),
                teamCount: teamMembers.length,
                activeListings: listings.length,
                totalViews: listings.reduce((sum, listing) => sum + listing.views, 0),
                totalFavorites: listings.reduce((sum, listing) => sum + listing.favs, 0),
                followers: countFollowers(user.id, vertical),
            },
            listings: listings.map((listing) => listingToPublicResponse(listing)),
        };
    }

    function buildAccountPublicProfileResponse(user: ProfileUser, vertical: VerticalType) {
        return {
            ok: true,
            featureEnabled: userCanUsePublicProfile(user, vertical),
            currentPlanId: getEffectivePlanId(user, vertical),
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
