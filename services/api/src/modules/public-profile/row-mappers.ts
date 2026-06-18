import { publicProfiles, publicProfileTeamMembers } from '../../db/schema.js';
import { asString } from '../shared/helpers.js';
import {
    normalizePublicProfileBusinessHours,
    normalizePublicProfileSocialLinks,
    normalizePublicProfileTeamMemberSpecialties,
    normalizePublicProfileTeamSocialLinks,
} from './normalize.js';
import type {
    PublicProfileAccountKind,
    PublicProfileRecord,
    PublicProfileTeamMemberRecord,
    VerticalType,
} from './types.js';

export function mapPublicProfileRow(profile: typeof publicProfiles.$inferSelect): PublicProfileRecord {
    return {
        id: profile.id,
        accountId: profile.accountId ?? null,
        userId: profile.userId,
        vertical: profile.vertical as VerticalType,
        slug: profile.slug,
        isPublished: Boolean(profile.isPublished),
        accountKind: profile.accountKind as PublicProfileAccountKind,
        displayName: profile.displayName,
        headline: profile.headline ?? null,
        bio: profile.bio ?? null,
        companyName: profile.companyName ?? null,
        website: profile.website ?? null,
        publicEmail: profile.publicEmail ?? null,
        publicPhone: profile.publicPhone ?? null,
        publicWhatsapp: profile.publicWhatsapp ?? null,
        addressLine: profile.addressLine ?? null,
        city: profile.city ?? null,
        region: profile.region ?? null,
        coverImageUrl: profile.coverImageUrl ?? null,
        avatarImageUrl: profile.avatarImageUrl ?? null,
        socialLinks: normalizePublicProfileSocialLinks(profile.socialLinks),
        businessHours: normalizePublicProfileBusinessHours(profile.businessHours),
        specialties: Array.isArray(profile.specialties) ? profile.specialties.map((item) => asString(item)).filter(Boolean) : [],
        scheduleNote: profile.scheduleNote ?? null,
        alwaysOpen: Boolean(profile.alwaysOpen),
        createdAt: profile.createdAt.getTime(),
        updatedAt: profile.updatedAt.getTime(),
    };
}

export function mapPublicProfileTeamMemberRow(member: typeof publicProfileTeamMembers.$inferSelect): PublicProfileTeamMemberRecord {
    return {
        id: member.id,
        userId: member.userId,
        vertical: member.vertical as VerticalType,
        name: member.name,
        roleTitle: member.roleTitle ?? null,
        bio: member.bio ?? null,
        email: member.email ?? null,
        phone: member.phone ?? null,
        whatsapp: member.whatsapp ?? null,
        avatarImageUrl: member.avatarImageUrl ?? null,
        socialLinks: normalizePublicProfileTeamSocialLinks(member.socialLinks),
        specialties: normalizePublicProfileTeamMemberSpecialties(member.specialties),
        isPublished: Boolean(member.isPublished),
        position: member.position,
        createdAt: member.createdAt.getTime(),
        updatedAt: member.updatedAt.getTime(),
    };
}
