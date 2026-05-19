import {
    publicProfileUserVerticalKey,
    publicProfileVerticalSlugKey,
} from './normalize.js';
import type { PublicProfileRecord, PublicProfileTeamMemberRecord, VerticalType } from './types.js';

export function createPublicProfileCache() {
    const publicProfilesByUserVertical = new Map<string, PublicProfileRecord>();
    const publicProfilesByVerticalSlug = new Map<string, PublicProfileRecord>();
    const publicProfileTeamMembersByUserVertical = new Map<string, PublicProfileTeamMemberRecord[]>();

    function upsertPublicProfileCache(record: PublicProfileRecord): PublicProfileRecord {
        publicProfilesByUserVertical.set(publicProfileUserVerticalKey(record.userId, record.vertical), record);
        publicProfilesByVerticalSlug.set(publicProfileVerticalSlugKey(record.vertical, record.slug), record);
        return record;
    }

    function upsertPublicProfileTeamMemberCache(record: PublicProfileTeamMemberRecord): PublicProfileTeamMemberRecord {
        const key = publicProfileUserVerticalKey(record.userId, record.vertical);
        const current = publicProfileTeamMembersByUserVertical.get(key) ?? [];
        const next = current.filter((item) => item.id !== record.id);
        next.push(record);
        next.sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
        publicProfileTeamMembersByUserVertical.set(key, next);
        return record;
    }

    function replacePublicProfileTeamMemberCache(userId: string, vertical: VerticalType, items: PublicProfileTeamMemberRecord[]) {
        const key = publicProfileUserVerticalKey(userId, vertical);
        publicProfileTeamMembersByUserVertical.set(
            key,
            [...items].sort((left, right) => left.position - right.position || left.createdAt - right.createdAt),
        );
    }

    function getPublicProfileRecord(userId: string, vertical: VerticalType): PublicProfileRecord | null {
        return publicProfilesByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? null;
    }

    function getPublicProfileTeamMembers(userId: string, vertical: VerticalType): PublicProfileTeamMemberRecord[] {
        return (publicProfileTeamMembersByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? [])
            .filter((item) => item.isPublished)
            .sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
    }

    function getEditablePublicProfileTeamMembers(userId: string, vertical: VerticalType): PublicProfileTeamMemberRecord[] {
        return (publicProfileTeamMembersByUserVertical.get(publicProfileUserVerticalKey(userId, vertical)) ?? [])
            .slice()
            .sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
    }

    function getPublishedPublicProfileBySlug(vertical: VerticalType, slug: string): PublicProfileRecord | null {
        const record = publicProfilesByVerticalSlug.get(publicProfileVerticalSlugKey(vertical, slug)) ?? null;
        if (!record || !record.isPublished) return null;
        return record;
    }

    return {
        publicProfilesByUserVertical,
        publicProfilesByVerticalSlug,
        publicProfileTeamMembersByUserVertical,
        upsertPublicProfileCache,
        upsertPublicProfileTeamMemberCache,
        replacePublicProfileTeamMemberCache,
        getPublicProfileRecord,
        getPublicProfileTeamMembers,
        getEditablePublicProfileTeamMembers,
        getPublishedPublicProfileBySlug,
    };
}
