import {
    publicProfileUserVerticalKey,
    publicProfileVerticalSlugKey,
} from './normalize.js';
import type { PublicProfileRecord, VerticalType } from './types.js';

export function publicProfileAccountVerticalKey(accountId: string, vertical: string): string {
    return `${accountId}:${vertical}`;
}

export function createPublicProfileCache(
    getDefaultAccountIdForUser?: (userId: string) => string | null,
    getPersonalAccountIdForUser?: (userId: string) => string | null,
) {
    const publicProfilesByUserVertical = new Map<string, PublicProfileRecord>();
    const publicProfilesByAccountVertical = new Map<string, PublicProfileRecord>();
    const publicProfilesByVerticalSlug = new Map<string, PublicProfileRecord>();

    function upsertPublicProfileCache(record: PublicProfileRecord): PublicProfileRecord {
        for (const [key, cached] of publicProfilesByUserVertical.entries()) {
            if (cached.id === record.id) publicProfilesByUserVertical.delete(key);
        }
        for (const [key, cached] of publicProfilesByAccountVertical.entries()) {
            if (cached.id === record.id) publicProfilesByAccountVertical.delete(key);
        }
        for (const [key, cached] of publicProfilesByVerticalSlug.entries()) {
            if (cached.id === record.id) publicProfilesByVerticalSlug.delete(key);
        }

        if (record.accountId) {
            publicProfilesByAccountVertical.set(publicProfileAccountVerticalKey(record.accountId, record.vertical), record);
        } else {
            publicProfilesByUserVertical.set(publicProfileUserVerticalKey(record.userId, record.vertical), record);
        }
        publicProfilesByVerticalSlug.set(publicProfileVerticalSlugKey(record.vertical, record.slug), record);
        return record;
    }

    function getPublicProfileRecord(userId: string, vertical: VerticalType, accountId?: string | null): PublicProfileRecord | null {
        const resolvedAccountId = accountId === undefined
            ? getDefaultAccountIdForUser?.(userId) ?? getPersonalAccountIdForUser?.(userId) ?? null
            : accountId ?? getPersonalAccountIdForUser?.(userId) ?? null;
        if (!resolvedAccountId) return null;

        const accountProfile = publicProfilesByAccountVertical.get(
            publicProfileAccountVerticalKey(resolvedAccountId, vertical),
        );
        if (accountProfile) return accountProfile;

        // Legacy profiles have no accountId. They belong only to the owner's
        // personal account and must never become the fallback for a company.
        if (resolvedAccountId !== getPersonalAccountIdForUser?.(userId)) return null;
        return publicProfilesByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? null;
    }

    function getPublishedPublicProfileBySlug(vertical: VerticalType, slug: string): PublicProfileRecord | null {
        const record = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, slug)) ?? null;
        if (!record || !record.isPublished) return null;
        return record;
    }

    return {
        publicProfilesByUserVertical,
        publicProfilesByAccountVertical,
        publicProfilesByVerticalSlug,
        upsertPublicProfileCache,
        getPublicProfileRecord,
        getPublishedPublicProfileBySlug,
    };
}
