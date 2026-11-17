import { and, eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { youtubeAccounts } from '../../db/schema.js';
import type { YouTubeAccountRecord, YouTubeAccountStatus } from '../../lib/domain-types.js';
import { asString } from '../shared/index.js';
import { integrationAccountKey, integrationWorkspaceKey } from '../integrations/oauth-cookie.js';
import { lockSocialIntegrationWriteAccess, requireSocialIntegrationAccountId } from '../integrations/social-write-access.js';

export type YouTubeAccountStoreMaps = {
    youtubeAccountByUserVertical: Map<string, YouTubeAccountRecord>;
};

export type YouTubeAccountStoreDeps = YouTubeAccountStoreMaps & {
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getPersonalAccountIdForUser: (userId: string) => string | null;
};

export function mapYouTubeAccountRow(row: typeof youtubeAccounts.$inferSelect): YouTubeAccountRecord {
    return {
        id: row.id,
        accountId: row.accountId ?? null,
        userId: row.userId,
        vertical: row.vertical as VerticalType,
        channelId: row.channelId,
        channelTitle: row.channelTitle,
        channelHandle: row.channelHandle ?? null,
        avatarUrl: row.avatarUrl ?? null,
        accessToken: row.accessToken,
        refreshToken: row.refreshToken ?? null,
        tokenExpiresAt: row.tokenExpiresAt?.getTime() ?? null,
        scopes: Array.isArray(row.scopes) ? row.scopes.map((item) => asString(item)).filter(Boolean) : [],
        status: row.status as YouTubeAccountStatus,
        lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
        lastPublishedAt: row.lastPublishedAt?.getTime() ?? null,
        lastError: row.lastError ?? null,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}

export function createYouTubeAccountStore(deps: YouTubeAccountStoreDeps) {
    function getYouTubeAccount(userId: string, vertical: VerticalType, accountId?: string | null): YouTubeAccountRecord | null {
        const legacyRecord = deps.youtubeAccountByUserVertical.get(integrationAccountKey(userId, vertical));
        if (accountId === undefined) return legacyRecord?.accountId == null ? legacyRecord ?? null : null;

        const personalAccountId = deps.getPersonalAccountIdForUser(userId);
        const scopedAccountId = accountId ?? personalAccountId;
        if (!scopedAccountId) return null;
        const workspaceRecord = deps.youtubeAccountByUserVertical.get(integrationWorkspaceKey(scopedAccountId, vertical));
        if (workspaceRecord) return workspaceRecord;
        if (legacyRecord?.accountId === scopedAccountId) return legacyRecord;
        if (scopedAccountId === personalAccountId && legacyRecord?.accountId == null) return legacyRecord ?? null;
        return null;
    }

    function cacheYouTubeAccount(account: YouTubeAccountRecord): void {
        if (account.accountId) {
            deps.youtubeAccountByUserVertical.set(integrationWorkspaceKey(account.accountId, account.vertical), account);
        } else {
            deps.youtubeAccountByUserVertical.set(integrationAccountKey(account.userId, account.vertical), account);
        }
    }

    function youtubeAccountToResponse(account: YouTubeAccountRecord | null) {
        if (!account) return null;
        return {
            id: account.id,
            vertical: account.vertical,
            channelId: account.channelId,
            channelTitle: account.channelTitle,
            channelHandle: account.channelHandle,
            avatarUrl: account.avatarUrl,
            scopes: account.scopes,
            status: account.status,
            lastSyncedAt: account.lastSyncedAt,
            lastPublishedAt: account.lastPublishedAt,
            lastError: account.lastError,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
        };
    }

    async function upsertYouTubeAccountRecord(input: {
        userId: string;
        vertical: VerticalType;
        channelId: string;
        channelTitle: string;
        channelHandle: string | null;
        avatarUrl: string | null;
        accessToken: string;
        refreshToken: string | null;
        tokenExpiresAt: number | null;
        scopes: string[];
        status?: YouTubeAccountStatus;
        accountId?: string | null;
        lastSyncedAt?: number | null;
        lastPublishedAt?: number | null;
        lastError?: string | null;
    }): Promise<YouTubeAccountRecord> {
        const accountId = requireSocialIntegrationAccountId(
            input.accountId === undefined
                ? await deps.getPrimaryAccountIdForUser(input.userId)
                : input.accountId ?? deps.getPersonalAccountIdForUser(input.userId),
        );
        const now = new Date();
        const mapped = await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId: input.userId, accountId });
            const [existing] = await tx.select().from(youtubeAccounts).where(and(
                eq(youtubeAccounts.accountId, accountId),
                eq(youtubeAccounts.vertical, input.vertical),
            )).limit(1).for('update');

            if (existing) {
                const [row] = await tx.update(youtubeAccounts).set({
                    channelId: input.channelId,
                    channelTitle: input.channelTitle,
                    channelHandle: input.channelHandle,
                    avatarUrl: input.avatarUrl,
                    accessToken: input.accessToken,
                    refreshToken: input.refreshToken ?? existing.refreshToken,
                    tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
                    scopes: input.scopes,
                    status: input.status ?? 'connected',
                    lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : now,
                    lastPublishedAt: input.lastPublishedAt ? new Date(input.lastPublishedAt) : existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null,
                    lastError: input.lastError ?? null,
                    updatedAt: now,
                }).where(eq(youtubeAccounts.id, existing.id)).returning();
                return mapYouTubeAccountRow(row);
            }

            const [row] = await tx.insert(youtubeAccounts).values({
                accountId,
                userId: input.userId,
                vertical: input.vertical,
                channelId: input.channelId,
                channelTitle: input.channelTitle,
                channelHandle: input.channelHandle,
                avatarUrl: input.avatarUrl,
                accessToken: input.accessToken,
                refreshToken: input.refreshToken,
                tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
                scopes: input.scopes,
                status: input.status ?? 'connected',
                lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : now,
                lastPublishedAt: input.lastPublishedAt ? new Date(input.lastPublishedAt) : null,
                lastError: input.lastError ?? null,
            }).returning();
            return mapYouTubeAccountRow(row);
        });

        cacheYouTubeAccount(mapped);
        return mapped;
    }

    async function updateYouTubeAccountRecord(
        userId: string,
        vertical: VerticalType,
        patch: Partial<Pick<YouTubeAccountRecord, 'accessToken' | 'refreshToken' | 'tokenExpiresAt' | 'status' | 'lastPublishedAt' | 'lastSyncedAt' | 'lastError' | 'scopes'>>,
        accountId?: string | null,
    ): Promise<YouTubeAccountRecord | null> {
        const existing = getYouTubeAccount(userId, vertical, accountId);
        if (!existing) return null;

        const [row] = await db.update(youtubeAccounts).set({
            accessToken: patch.accessToken ?? existing.accessToken,
            refreshToken: patch.refreshToken === undefined ? existing.refreshToken : patch.refreshToken,
            tokenExpiresAt: patch.tokenExpiresAt === undefined
                ? (existing.tokenExpiresAt ? new Date(existing.tokenExpiresAt) : null)
                : (patch.tokenExpiresAt ? new Date(patch.tokenExpiresAt) : null),
            status: patch.status ?? existing.status,
            lastPublishedAt: patch.lastPublishedAt === undefined
                ? (existing.lastPublishedAt ? new Date(existing.lastPublishedAt) : null)
                : (patch.lastPublishedAt ? new Date(patch.lastPublishedAt) : null),
            lastSyncedAt: patch.lastSyncedAt === undefined
                ? (existing.lastSyncedAt ? new Date(existing.lastSyncedAt) : new Date())
                : (patch.lastSyncedAt ? new Date(patch.lastSyncedAt) : null),
            lastError: patch.lastError === undefined ? existing.lastError : patch.lastError,
            scopes: patch.scopes ?? existing.scopes,
            updatedAt: new Date(),
        }).where(eq(youtubeAccounts.id, existing.id)).returning();

        const mapped = mapYouTubeAccountRow(row);
        cacheYouTubeAccount(mapped);
        return mapped;
    }

    async function disconnectYouTubeAccount(userId: string, vertical: VerticalType, accountId?: string | null): Promise<void> {
        const workspaceId = requireSocialIntegrationAccountId(accountId);
        await db.transaction(async (tx: any) => {
            await lockSocialIntegrationWriteAccess(tx, { userId, accountId: workspaceId });
            await tx.delete(youtubeAccounts).where(and(
                eq(youtubeAccounts.accountId, workspaceId),
                eq(youtubeAccounts.vertical, vertical),
            ));
        });
        for (const [key, account] of deps.youtubeAccountByUserVertical.entries()) {
            if (account.accountId === workspaceId && account.vertical === vertical) deps.youtubeAccountByUserVertical.delete(key);
        }
    }

    return {
        getYouTubeAccount,
        youtubeAccountToResponse,
        upsertYouTubeAccountRecord,
        updateYouTubeAccountRecord,
        disconnectYouTubeAccount,
    };
}
