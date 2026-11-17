import { eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { socialPublications } from '../../db/schema.js';
import type { SocialPublicationContentType, SocialPublicationRecord, SocialPublicationStatus, SocialPlatform } from '../../lib/domain-types.js';
import { asString } from '../shared/index.js';

export type SocialPublicationStoreMaps = {
    socialPublicationsByUser: Map<string, SocialPublicationRecord[]>;
};

export type SocialPublicationStoreDeps = SocialPublicationStoreMaps & {
    getPrimaryAccountIdForUser: (userId: string) => Promise<string>;
    getPersonalAccountIdForUser: (userId: string) => string | null;
};

export function mapSocialPublicationRow(row: typeof socialPublications.$inferSelect): SocialPublicationRecord {
    return {
        id: row.id,
        accountId: row.accountId ?? null,
        userId: row.userId,
        vertical: row.vertical as VerticalType,
        listingId: row.listingId,
        listingTitle: row.listingTitle,
        platform: row.platform as SocialPlatform,
        contentType: (row.contentType as SocialPublicationContentType) || 'link',
        externalId: row.externalId ?? null,
        permalink: row.permalink ?? null,
        caption: row.caption,
        mediaUrl: row.mediaUrl ?? null,
        status: row.status as SocialPublicationStatus,
        errorMessage: row.errorMessage ?? null,
        sourceUpdatedAt: row.sourceUpdatedAt?.getTime() ?? null,
        publishedAt: row.publishedAt?.getTime() ?? null,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}

export function createSocialPublicationStore(deps: SocialPublicationStoreDeps) {
    function getSocialPublicationsForUser(userId: string, vertical?: VerticalType, accountId?: string | null): SocialPublicationRecord[] {
        const personalAccountId = deps.getPersonalAccountIdForUser(userId);
        const scopedAccountId = accountId === undefined ? null : accountId ?? personalAccountId;
        if (!scopedAccountId) return [];
        const includeLegacyPersonal = scopedAccountId === personalAccountId;
        const items = [...deps.socialPublicationsByUser.values()].flat().filter((item) => (
            item.accountId === scopedAccountId
            || (includeLegacyPersonal && item.userId === userId && item.accountId == null)
        ));
        const filtered = vertical ? items.filter((item) => item.vertical === vertical) : items;
        return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    }

    function getLatestSocialPublicationForListing(
        userId: string,
        vertical: VerticalType,
        listingId: string,
        platform: SocialPlatform,
        contentType?: SocialPublicationContentType,
        accountId?: string | null,
    ): SocialPublicationRecord | null {
        const items = getSocialPublicationsForUser(userId, vertical, accountId)
            .filter((item) => item.listingId === listingId && item.platform === platform);
        if (contentType) {
            const match = items.find((item) => item.contentType === contentType);
            if (match) return match;
        }
        return items[0] ?? null;
    }

    function socialPublicationToResponse(publication: SocialPublicationRecord) {
        return {
            id: publication.id,
            vertical: publication.vertical,
            listingId: publication.listingId,
            listingTitle: publication.listingTitle,
            platform: publication.platform,
            contentType: publication.contentType,
            externalId: publication.externalId,
            permalink: publication.permalink,
            caption: publication.caption,
            mediaUrl: publication.mediaUrl,
            status: publication.status,
            errorMessage: publication.errorMessage,
            sourceUpdatedAt: publication.sourceUpdatedAt,
            publishedAt: publication.publishedAt,
            createdAt: publication.createdAt,
            updatedAt: publication.updatedAt,
        };
    }

    async function createSocialPublicationRecord(
        input: Omit<SocialPublicationRecord, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<SocialPublicationRecord> {
        const now = new Date();
        const accountId = input.accountId === undefined
            ? await deps.getPrimaryAccountIdForUser(input.userId)
            : input.accountId ?? deps.getPersonalAccountIdForUser(input.userId);
        if (!accountId) throw new Error('No encontramos el espacio personal para guardar el historial social.');
        const [row] = await db.insert(socialPublications).values({
            accountId,
            userId: input.userId,
            vertical: input.vertical,
            listingId: input.listingId,
            listingTitle: input.listingTitle,
            platform: input.platform,
            contentType: input.contentType,
            externalId: input.externalId,
            permalink: input.permalink,
            caption: input.caption,
            mediaUrl: input.mediaUrl,
            status: input.status,
            errorMessage: input.errorMessage,
            sourceUpdatedAt: input.sourceUpdatedAt ? new Date(input.sourceUpdatedAt) : null,
            publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
            createdAt: now,
            updatedAt: now,
        }).returning();

        const mapped = mapSocialPublicationRow(row);
        const current = deps.socialPublicationsByUser.get(mapped.userId) ?? [];
        deps.socialPublicationsByUser.set(mapped.userId, [mapped, ...current].sort((a, b) => b.createdAt - a.createdAt));
        return mapped;
    }

    async function deleteSocialPublicationsForUser(userId: string): Promise<void> {
        await db.delete(socialPublications).where(eq(socialPublications.userId, userId));
        deps.socialPublicationsByUser.delete(userId);
    }

    return {
        getSocialPublicationsForUser,
        getLatestSocialPublicationForListing,
        socialPublicationToResponse,
        createSocialPublicationRecord,
        deleteSocialPublicationsForUser,
    };
}
