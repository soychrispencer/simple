import { and, eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { instagramAccounts, instagramPublications } from '../../db/schema.js';
import { asString } from '../shared/index.js';
import { defaultInstagramCaptionTemplate } from './listing-presentation.js';
import { integrationAccountKey, integrationWorkspaceKey } from '../integrations/oauth-cookie.js';
import { lockSocialIntegrationWriteAccess, requireSocialIntegrationAccountId } from '../integrations/social-write-access.js';

export type InstagramAccountStatus = 'connected' | 'error' | 'disconnected';
export type InstagramPublicationStatus = 'published' | 'failed';
export type InstagramPublicationContentType = 'image' | 'carousel' | 'reel';

export type InstagramAccountRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    instagramUserId: string;
    username: string;
    displayName: string | null;
    accountType: string | null;
    profilePictureUrl: string | null;
    accessToken: string;
    tokenExpiresAt: number | null;
    scopes: string[];
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
    publishStyle: Record<string, unknown> | null;
    status: InstagramAccountStatus;
    lastSyncedAt: number | null;
    lastPublishedAt: number | null;
    lastError: string | null;
    facebookPageId: string | null;
    facebookPageName: string | null;
    facebookPageAccessToken: string | null;
    createdAt: number;
    updatedAt: number;
};

type InstagramAccountSettingsPatch = Partial<Pick<InstagramAccountRecord,
    | 'autoPublishEnabled'
    | 'captionTemplate'
    | 'publishStyle'
    | 'status'
    | 'lastPublishedAt'
    | 'lastSyncedAt'
    | 'lastError'
    | 'accessToken'
    | 'tokenExpiresAt'
    | 'scopes'
>>;

export type InstagramPublicationRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    instagramAccountId: string;
    vertical: VerticalType;
    listingId: string;
    listingTitle: string;
    instagramMediaId: string | null;
    instagramPermalink: string | null;
    caption: string;
    imageUrl: string;
    contentType: InstagramPublicationContentType;
    status: InstagramPublicationStatus;
    errorMessage: string | null;
    sourceUpdatedAt: number | null;
    publishedAt: number | null;
    createdAt: number;
    updatedAt: number;
};

export type InstagramAccountStoreMaps = {
    instagramAccountByUserVertical: Map<string, InstagramAccountRecord>;
    instagramPublicationsByUser: Map<string, InstagramPublicationRecord[]>;
};

export type InstagramAccountStoreDeps = InstagramAccountStoreMaps & {
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getPersonalAccountIdForUser: (userId: string) => string | null;
};

export function mapInstagramAccountRow(account: typeof instagramAccounts.$inferSelect): InstagramAccountRecord {
    return {
        id: account.id,
        accountId: account.accountId ?? null,
        userId: account.userId,
        vertical: account.vertical as VerticalType,
        instagramUserId: account.instagramUserId,
        username: account.username,
        displayName: account.displayName ?? null,
        accountType: account.accountType ?? null,
        profilePictureUrl: account.profilePictureUrl ?? null,
        accessToken: account.accessToken,
        tokenExpiresAt: account.tokenExpiresAt?.getTime() ?? null,
        scopes: Array.isArray(account.scopes) ? account.scopes.map((item) => asString(item)).filter(Boolean) : [],
        autoPublishEnabled: Boolean(account.autoPublishEnabled),
        captionTemplate: account.captionTemplate ?? null,
        publishStyle: (account.publishStyle as Record<string, unknown> | null) ?? null,
        status: account.status as InstagramAccountStatus,
        lastSyncedAt: account.lastSyncedAt?.getTime() ?? null,
        lastPublishedAt: account.lastPublishedAt?.getTime() ?? null,
        lastError: account.lastError ?? null,
        facebookPageId: account.facebookPageId ?? null,
        facebookPageName: account.facebookPageName ?? null,
        facebookPageAccessToken: account.facebookPageAccessToken ?? null,
        createdAt: account.createdAt.getTime(),
        updatedAt: account.updatedAt.getTime(),
    };
}

export function mapInstagramPublicationRow(publication: typeof instagramPublications.$inferSelect): InstagramPublicationRecord {
    return {
        id: publication.id,
        accountId: publication.accountId ?? null,
        userId: publication.userId,
        instagramAccountId: publication.instagramAccountId,
        vertical: publication.vertical as VerticalType,
        listingId: publication.listingId,
        listingTitle: publication.listingTitle,
        instagramMediaId: publication.instagramMediaId ?? null,
        instagramPermalink: publication.instagramPermalink ?? null,
        caption: publication.caption,
        imageUrl: publication.imageUrl,
        contentType: (publication.contentType as InstagramPublicationContentType) || 'carousel',
        status: publication.status as InstagramPublicationStatus,
        errorMessage: publication.errorMessage ?? null,
        sourceUpdatedAt: publication.sourceUpdatedAt?.getTime() ?? null,
        publishedAt: publication.publishedAt?.getTime() ?? null,
        createdAt: publication.createdAt.getTime(),
        updatedAt: publication.updatedAt.getTime(),
    };
}

export function createInstagramAccountStore(deps: InstagramAccountStoreDeps) {
    function getInstagramAccount(userId: string, vertical: VerticalType, accountId?: string | null): InstagramAccountRecord | null {
        const legacyRecord = deps.instagramAccountByUserVertical.get(integrationAccountKey(userId, vertical));
        if (accountId === undefined) return legacyRecord?.accountId == null ? legacyRecord ?? null : null;

        const personalAccountId = deps.getPersonalAccountIdForUser(userId);
        const scopedAccountId = accountId ?? personalAccountId;
        if (!scopedAccountId) return null;
        const workspaceRecord = deps.instagramAccountByUserVertical.get(integrationWorkspaceKey(scopedAccountId, vertical));
        if (workspaceRecord) return workspaceRecord;
        if (legacyRecord?.accountId === scopedAccountId) return legacyRecord;
        if (scopedAccountId === personalAccountId && legacyRecord?.accountId == null) return legacyRecord ?? null;
        return null;
    }

    function cacheInstagramAccount(account: InstagramAccountRecord): void {
        if (account.accountId) {
            deps.instagramAccountByUserVertical.set(integrationWorkspaceKey(account.accountId, account.vertical), account);
        } else {
            deps.instagramAccountByUserVertical.set(integrationAccountKey(account.userId, account.vertical), account);
        }
    }

    function getInstagramPublicationsForUser(userId: string, vertical?: VerticalType, accountId?: string | null): InstagramPublicationRecord[] {
        const personalAccountId = deps.getPersonalAccountIdForUser(userId);
        const scopedAccountId = accountId === undefined ? null : accountId ?? personalAccountId;
        if (!scopedAccountId) return [];
        const includeLegacyPersonal = scopedAccountId === personalAccountId;
        const items = [...deps.instagramPublicationsByUser.values()].flat().filter((item) => (
            item.accountId === scopedAccountId
            || (includeLegacyPersonal && item.userId === userId && item.accountId == null)
        ));
        const filtered = vertical ? items.filter((item) => item.vertical === vertical) : items;
        return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    }

    function instagramAccountToResponse(account: InstagramAccountRecord | null) {
        if (!account) return null;
        return {
            id: account.id,
            vertical: account.vertical,
            instagramUserId: account.instagramUserId,
            username: account.username,
            displayName: account.displayName,
            accountType: account.accountType,
            profilePictureUrl: account.profilePictureUrl,
            scopes: account.scopes,
            autoPublishEnabled: account.autoPublishEnabled,
            captionTemplate: account.captionTemplate,
            publishStyle: account.publishStyle,
            status: account.status,
            lastSyncedAt: account.lastSyncedAt,
            lastPublishedAt: account.lastPublishedAt,
            lastError: account.lastError,
            facebookPage: account.facebookPageId
                ? { id: account.facebookPageId, name: account.facebookPageName }
                : null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        };
    }

    function instagramPublicationToResponse(publication: InstagramPublicationRecord) {
        return {
            id: publication.id,
            vertical: publication.vertical,
            listingId: publication.listingId,
            listingTitle: publication.listingTitle,
            instagramMediaId: publication.instagramMediaId,
            instagramPermalink: publication.instagramPermalink,
            caption: publication.caption,
            imageUrl: publication.imageUrl,
            contentType: publication.contentType,
            status: publication.status,
            errorMessage: publication.errorMessage,
            sourceUpdatedAt: publication.sourceUpdatedAt,
            publishedAt: publication.publishedAt,
            createdAt: publication.createdAt,
            updatedAt: publication.updatedAt,
        };
    }

    async function upsertInstagramAccountRecord(input: {
        userId: string;
        accountId?: string | null;
        vertical: VerticalType;
        instagramUserId: string;
        username: string;
        displayName: string | null;
        accountType: string | null;
        profilePictureUrl: string | null;
        accessToken: string;
        tokenExpiresAt: number | null;
        scopes: string[];
        autoPublishEnabled?: boolean;
        captionTemplate?: string | null;
        status?: InstagramAccountStatus;
        lastSyncedAt?: number | null;
        lastPublishedAt?: number | null;
        lastError?: string | null;
        facebookPageId?: string | null;
        facebookPageName?: string | null;
        facebookPageAccessToken?: string | null;
    }): Promise<InstagramAccountRecord> {
        const accountId = requireSocialIntegrationAccountId(
            input.accountId === undefined
                ? await deps.getPrimaryAccountIdForUser(input.userId)
                : input.accountId ?? deps.getPersonalAccountIdForUser(input.userId),
        );
        const now = new Date();
        const mapped = await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId: input.userId, accountId });
            const [existing] = await tx.select().from(instagramAccounts).where(and(
                eq(instagramAccounts.accountId, accountId),
                eq(instagramAccounts.vertical, input.vertical),
            )).limit(1).for('update');

            if (existing) {
                const [row] = await tx.update(instagramAccounts).set({
                    instagramUserId: input.instagramUserId,
                    username: input.username,
                    displayName: input.displayName,
                    accountType: input.accountType,
                    profilePictureUrl: input.profilePictureUrl,
                    accessToken: input.accessToken,
                    tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
                    scopes: input.scopes,
                    autoPublishEnabled: input.autoPublishEnabled ?? existing.autoPublishEnabled,
                    captionTemplate: input.captionTemplate === undefined ? existing.captionTemplate : input.captionTemplate,
                    status: input.status ?? 'connected',
                    lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : now,
                    lastPublishedAt: input.lastPublishedAt ? new Date(input.lastPublishedAt) : (existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null),
                    lastError: input.lastError ?? null,
                    facebookPageId: input.facebookPageId === undefined ? existing.facebookPageId : input.facebookPageId,
                    facebookPageName: input.facebookPageName === undefined ? existing.facebookPageName : input.facebookPageName,
                    facebookPageAccessToken: input.facebookPageAccessToken === undefined ? existing.facebookPageAccessToken : input.facebookPageAccessToken,
                    updatedAt: now,
                }).where(eq(instagramAccounts.id, existing.id)).returning();
                return mapInstagramAccountRow(row);
            }

            const [row] = await tx.insert(instagramAccounts).values({
                accountId,
                userId: input.userId,
                vertical: input.vertical,
                instagramUserId: input.instagramUserId,
                username: input.username,
                displayName: input.displayName,
                accountType: input.accountType,
                profilePictureUrl: input.profilePictureUrl,
                accessToken: input.accessToken,
                tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
                scopes: input.scopes,
                autoPublishEnabled: input.autoPublishEnabled ?? false,
                captionTemplate: input.captionTemplate ?? defaultInstagramCaptionTemplate(input.vertical),
                status: input.status ?? 'connected',
                lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : now,
                lastPublishedAt: input.lastPublishedAt ? new Date(input.lastPublishedAt) : null,
                lastError: input.lastError ?? null,
                facebookPageId: input.facebookPageId ?? null,
                facebookPageName: input.facebookPageName ?? null,
                facebookPageAccessToken: input.facebookPageAccessToken ?? null,
            }).returning();
            return mapInstagramAccountRow(row);
        });

        cacheInstagramAccount(mapped);
        return mapped;
    }

    async function updateInstagramAccountSettings(
        userId: string,
        vertical: VerticalType,
        patch: InstagramAccountSettingsPatch,
        accountId?: string | null,
    ): Promise<InstagramAccountRecord | null> {
        const existing = getInstagramAccount(userId, vertical, accountId);
        if (!existing) return null;

        const [row] = await db.update(instagramAccounts).set({
            autoPublishEnabled: patch.autoPublishEnabled ?? existing.autoPublishEnabled,
            captionTemplate: patch.captionTemplate === undefined ? existing.captionTemplate : patch.captionTemplate,
            publishStyle: patch.publishStyle === undefined ? existing.publishStyle : patch.publishStyle,
            status: patch.status ?? existing.status,
            lastPublishedAt: patch.lastPublishedAt === undefined
                ? (existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null)
                : (patch.lastPublishedAt ? new Date(patch.lastPublishedAt) : null),
            lastSyncedAt: patch.lastSyncedAt === undefined
                ? (existing.lastSyncedAt ? new Date(existing.lastSyncedAt) : new Date())
                : (patch.lastSyncedAt ? new Date(patch.lastSyncedAt) : null),
            lastError: patch.lastError === undefined ? existing.lastError : patch.lastError,
            accessToken: patch.accessToken ?? existing.accessToken,
            tokenExpiresAt: patch.tokenExpiresAt === undefined
                ? (existing.tokenExpiresAt ? new Date(existing.tokenExpiresAt) : null)
                : (patch.tokenExpiresAt ? new Date(patch.tokenExpiresAt) : null),
            scopes: patch.scopes ?? existing.scopes,
            updatedAt: new Date(),
        }).where(eq(instagramAccounts.id, existing.id)).returning();

        const mapped = mapInstagramAccountRow(row);
        cacheInstagramAccount(mapped);
        return mapped;
    }

    async function updateInstagramAccountSettingsForManager(
        userId: string,
        vertical: VerticalType,
        patch: InstagramAccountSettingsPatch,
        accountId?: string | null,
    ): Promise<InstagramAccountRecord | null> {
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        const mapped = await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId, accountId: workspaceId });
            const [existing] = await tx.select().from(instagramAccounts).where(and(
                eq(instagramAccounts.accountId, workspaceId),
                eq(instagramAccounts.vertical, vertical),
            )).limit(1).for('update');
            if (!existing) return null;

            const [row] = await tx.update(instagramAccounts).set({
                autoPublishEnabled: patch.autoPublishEnabled ?? existing.autoPublishEnabled,
                captionTemplate: patch.captionTemplate === undefined ? existing.captionTemplate : patch.captionTemplate,
                publishStyle: patch.publishStyle === undefined ? existing.publishStyle : patch.publishStyle,
                status: patch.status ?? existing.status,
                lastPublishedAt: patch.lastPublishedAt === undefined
                    ? (existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null)
                    : (patch.lastPublishedAt ? new Date(patch.lastPublishedAt) : null),
                lastSyncedAt: patch.lastSyncedAt === undefined
                    ? (existing.lastSyncedAt ? new Date(existing.lastSyncedAt) : new Date())
                    : (patch.lastSyncedAt ? new Date(patch.lastSyncedAt) : null),
                lastError: patch.lastError === undefined ? existing.lastError : patch.lastError,
                accessToken: patch.accessToken ?? existing.accessToken,
                tokenExpiresAt: patch.tokenExpiresAt === undefined
                    ? (existing.tokenExpiresAt ? new Date(existing.tokenExpiresAt) : null)
                    : (patch.tokenExpiresAt ? new Date(patch.tokenExpiresAt) : null),
                scopes: patch.scopes ?? existing.scopes,
                updatedAt: new Date(),
            }).where(eq(instagramAccounts.id, existing.id)).returning();
            return mapInstagramAccountRow(row);
        });

        if (mapped) cacheInstagramAccount(mapped);
        return mapped;
    }

    async function disconnectInstagramAccount(userId: string, vertical: VerticalType, accountId?: string | null): Promise<void> {
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId, accountId: workspaceId });
            await tx.delete(instagramPublications).where(and(
                eq(instagramPublications.accountId, workspaceId),
                eq(instagramPublications.vertical, vertical),
            ));
            await tx.delete(instagramAccounts).where(and(
                eq(instagramAccounts.accountId, workspaceId),
                eq(instagramAccounts.vertical, vertical),
            ));
        });
        for (const [key, account] of deps.instagramAccountByUserVertical.entries()) {
            if (account.accountId === workspaceId && account.vertical === vertical) deps.instagramAccountByUserVertical.delete(key);
        }
        for (const [publisherId, publications] of deps.instagramPublicationsByUser.entries()) {
            const remaining = publications.filter((publication) =>
                publication.accountId !== workspaceId || publication.vertical !== vertical,
            );
            if (remaining.length) deps.instagramPublicationsByUser.set(publisherId, remaining);
            else deps.instagramPublicationsByUser.delete(publisherId);
        }
    }

    async function createInstagramPublicationRecord(input: {
        userId: string;
        accountId?: string | null;
        instagramAccountId: string;
        vertical: VerticalType;
        listingId: string;
        listingTitle: string;
        instagramMediaId: string | null;
        instagramPermalink: string | null;
        caption: string;
        imageUrl: string;
        contentType?: InstagramPublicationContentType;
        status: InstagramPublicationStatus;
        errorMessage: string | null;
        sourceUpdatedAt: number | null;
        publishedAt: number | null;
    }): Promise<InstagramPublicationRecord> {
        const accountId = requireSocialIntegrationAccountId(
            input.accountId === undefined
                ? await deps.getPrimaryAccountIdForUser(input.userId)
                : input.accountId ?? deps.getPersonalAccountIdForUser(input.userId),
        );
        const [row] = await db.insert(instagramPublications).values({
            accountId,
            userId: input.userId,
            instagramAccountId: input.instagramAccountId,
            vertical: input.vertical,
            listingId: input.listingId,
            listingTitle: input.listingTitle,
            instagramMediaId: input.instagramMediaId,
            instagramPermalink: input.instagramPermalink,
            caption: input.caption,
            imageUrl: input.imageUrl,
            contentType: input.contentType ?? 'carousel',
            status: input.status,
            errorMessage: input.errorMessage,
            sourceUpdatedAt: input.sourceUpdatedAt ? new Date(input.sourceUpdatedAt) : null,
            publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
        }).returning();

        const mapped = mapInstagramPublicationRow(row);
        const current = deps.instagramPublicationsByUser.get(mapped.userId) ?? [];
        deps.instagramPublicationsByUser.set(mapped.userId, [mapped, ...current].sort((a, b) => b.createdAt - a.createdAt));
        return mapped;
    }

    function getLatestInstagramPublicationForListing(
        userId: string,
        vertical: VerticalType,
        listingId: string,
        contentType?: InstagramPublicationContentType,
        accountId?: string | null,
    ): InstagramPublicationRecord | null {
        const matches = getInstagramPublicationsForUser(userId, vertical, accountId)
            .filter((item) => item.listingId === listingId);
        if (contentType) {
            return matches.find((item) => item.contentType === contentType) ?? null;
        }
        return matches[0] ?? null;
    }

    return {
        getInstagramAccount,
        getInstagramPublicationsForUser,
        instagramAccountToResponse,
        instagramPublicationToResponse,
        upsertInstagramAccountRecord,
        updateInstagramAccountSettings,
        updateInstagramAccountSettingsForManager,
        disconnectInstagramAccount,
        createInstagramPublicationRecord,
        getLatestInstagramPublicationForListing,
    };
}
