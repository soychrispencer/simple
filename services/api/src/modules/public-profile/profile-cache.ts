import {
    publicProfileUserVerticalKey,
    publicProfileVerticalSlugKey,
} from './normalize.js';
import type { PublicProfileRecord, VerticalType } from './types.js';

export function createPublicProfileCache() {
    const publicProfilesByUserVertical = new Map<string, PublicProfileRecord>();
    const publicProfilesByVerticalSlug = new Map<string, PublicProfileRecord>();

    function upsertPublicProfileCache(record: PublicProfileRecord): PublicProfileRecord {
        publicProfilesByUserVertical.set(publicProfileUserVerticalKey(record.userId, record.vertical), record);
        publicProfilesByVerticalSlug.set(publicProfileVerticalSlugKey(record.vertical, record.slug), record);
        return record;
    }

    function getPublicProfileRecord(userId: string, vertical: VerticalType): PublicProfileRecord | null {
        return publicProfilesByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? null;
    }

    function getPublishedPublicProfileBySlug(vertical: VerticalType, slug: string): PublicProfileRecord | null {
        const record = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, slug)) ?? null;
        if (!record || !record.isPublished) return null;
        return record;
    }

    return {
        publicProfilesByUserVertical,
        publicProfilesByVerticalSlug,
        upsertPublicProfileCache,
        getPublicProfileRecord,
        getPublishedPublicProfileBySlug,
    };
}
