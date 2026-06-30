import type {
    PublicProfileBusinessHour,
    PublicProfileSocialLinks,
} from '../../lib/domain-types.js';
import { asString } from '../shared/helpers.js';
import type { PublicProfileDayId } from '../shared/types.js';

export type { PublicProfileSocialLinks, PublicProfileBusinessHour };

export const PUBLIC_PROFILE_DAYS: PublicProfileDayId[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const PUBLIC_PROFILE_SOCIAL_KEYS: Array<keyof PublicProfileSocialLinks> = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x'];

export function createDefaultPublicProfileSocialLinks(): PublicProfileSocialLinks {
    return {
        instagram: null,
        facebook: null,
        linkedin: null,
        youtube: null,
        tiktok: null,
        x: null,
    };
}

export function createDefaultPublicProfileBusinessHours(): PublicProfileBusinessHour[] {
    return PUBLIC_PROFILE_DAYS.map((day) => ({
        day,
        open: day === 'saturday' || day === 'sunday' ? null : '09:00',
        close: day === 'saturday' || day === 'sunday' ? null : '18:00',
        closed: day === 'saturday' || day === 'sunday',
    }));
}

export function normalizePublicProfileSocialLinks(value: unknown): PublicProfileSocialLinks {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const normalized = createDefaultPublicProfileSocialLinks();
    for (const key of PUBLIC_PROFILE_SOCIAL_KEYS) {
        const next = asString(source[key]);
        normalized[key] = next || null;
    }
    return normalized;
}

export function normalizePublicProfileBusinessHours(value: unknown): PublicProfileBusinessHour[] {
    const source = Array.isArray(value) ? value : [];
    const byDay = new Map<PublicProfileDayId, PublicProfileBusinessHour>();
    for (const item of source) {
        if (!item || typeof item !== 'object') continue;
        const day = asString((item as Record<string, unknown>).day) as PublicProfileDayId;
        if (!PUBLIC_PROFILE_DAYS.includes(day)) continue;
        const open = asString((item as Record<string, unknown>).open) || null;
        const close = asString((item as Record<string, unknown>).close) || null;
        const closed = Boolean((item as Record<string, unknown>).closed);
        byDay.set(day, {
            day,
            open: closed ? null : open,
            close: closed ? null : close,
            closed,
        });
    }
    return createDefaultPublicProfileBusinessHours().map((item) => byDay.get(item.day) ?? item);
}

export function toNullIfEmpty(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized ? normalized : null;
}

export function isValidAbsoluteUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function normalizeExternalUrlInput(value: string | null | undefined): string | null {
    const normalized = toNullIfEmpty(value);
    if (!normalized) return null;
    const candidate = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    return isValidAbsoluteUrl(candidate) ? candidate : normalized;
}

export function normalizePublicProfileSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .slice(0, 80);
}

export function isValidPublicProfileSlug(value: string): boolean {
    return /^[a-z0-9][a-z0-9._-]{2,79}$/.test(value);
}

export function publicProfileUserVerticalKey(userId: string, vertical: string): string {
    return `${userId}:${vertical}`;
}

export function publicProfileVerticalSlugKey(vertical: string, slug: string): string {
    return `${vertical}:${slug}`;
}
