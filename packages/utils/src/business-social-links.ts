import type { PublicProfileSocialLinks } from './public-profile-settings.js';

export type BusinessSocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'twitter';

export type BusinessSocialLink = { platform: BusinessSocialPlatform; username: string };

export const BUSINESS_SOCIAL_PLATFORM_META: Record<
    BusinessSocialPlatform,
    { label: string; shortBase: string; base: string; placeholder: string }
> = {
    instagram: { label: 'Instagram', shortBase: 'instagram.com/', base: 'https://instagram.com/', placeholder: 'tu_usuario' },
    facebook: { label: 'Facebook', shortBase: 'facebook.com/', base: 'https://facebook.com/', placeholder: 'tu_pagina' },
    linkedin: { label: 'LinkedIn', shortBase: 'linkedin.com/in/', base: 'https://linkedin.com/in/', placeholder: 'tu_perfil' },
    tiktok: { label: 'TikTok', shortBase: 'tiktok.com/@', base: 'https://tiktok.com/@', placeholder: 'tu_usuario' },
    youtube: { label: 'YouTube', shortBase: 'youtube.com/@', base: 'https://youtube.com/@', placeholder: 'tu_canal' },
    twitter: { label: 'X / Twitter', shortBase: 'x.com/', base: 'https://x.com/', placeholder: 'tu_usuario' },
};

export const ALL_BUSINESS_SOCIAL_PLATFORMS = Object.keys(BUSINESS_SOCIAL_PLATFORM_META) as BusinessSocialPlatform[];

const MARKETPLACE_SOCIAL_KEY_BY_PLATFORM: Record<BusinessSocialPlatform, keyof PublicProfileSocialLinks> = {
    instagram: 'instagram',
    facebook: 'facebook',
    linkedin: 'linkedin',
    tiktok: 'tiktok',
    youtube: 'youtube',
    twitter: 'x',
};

export function businessSocialUrlToUsername(url: string | null | undefined, base: string): string {
    if (!url) return '';
    return url.replace(base, '').replace(/^@/, '').replace(/\/$/, '');
}

export function buildAgendaSocialPayload(socialLinks: BusinessSocialLink[]): Record<string, string | null> {
    const payload: Record<string, string | null> = {
        instagramUrl: null,
        facebookUrl: null,
        linkedinUrl: null,
        tiktokUrl: null,
        youtubeUrl: null,
        twitterUrl: null,
    };
    for (const link of socialLinks) {
        const info = BUSINESS_SOCIAL_PLATFORM_META[link.platform];
        payload[`${link.platform}Url`] = link.username.trim() ? `${info.base}${link.username.trim()}` : null;
    }
    return payload;
}

export function loadAgendaSocialLinksFromProfile(profile: Record<string, unknown>): BusinessSocialLink[] {
    const loaded: BusinessSocialLink[] = [];
    for (const platform of ALL_BUSINESS_SOCIAL_PLATFORMS) {
        const username = businessSocialUrlToUsername(
            profile[`${platform}Url`] as string | null | undefined,
            BUSINESS_SOCIAL_PLATFORM_META[platform].base,
        );
        if (username) loaded.push({ platform, username });
    }
    if (loaded.length === 0) loaded.push({ platform: 'instagram', username: '' });
    return loaded;
}

export function loadMarketplaceSocialLinks(socialLinks: PublicProfileSocialLinks): BusinessSocialLink[] {
    const loaded: BusinessSocialLink[] = [];
    for (const platform of ALL_BUSINESS_SOCIAL_PLATFORMS) {
        const key = MARKETPLACE_SOCIAL_KEY_BY_PLATFORM[platform];
        const raw = socialLinks[key];
        if (!raw?.trim()) continue;
        const username = businessSocialUrlToUsername(raw, BUSINESS_SOCIAL_PLATFORM_META[platform].base) || raw.trim();
        loaded.push({ platform, username });
    }
    if (loaded.length === 0) loaded.push({ platform: 'instagram', username: '' });
    return loaded;
}

export function marketplaceSocialLinksFromPicker(links: BusinessSocialLink[]): PublicProfileSocialLinks {
    const next: PublicProfileSocialLinks = {
        instagram: null,
        facebook: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
        x: null,
    };
    for (const link of links) {
        const key = MARKETPLACE_SOCIAL_KEY_BY_PLATFORM[link.platform];
        const info = BUSINESS_SOCIAL_PLATFORM_META[link.platform];
        next[key] = link.username.trim() ? `${info.base}${link.username.trim()}` : null;
    }
    return next;
}
