import { eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { youtubeAccounts } from '../../db/schema.js';
import type { YouTubeAccountRecord, YouTubeAccountStatus } from '../../lib/domain-types.js';
import { asString } from '../shared/index.js';
import { integrationAccountKey } from '../integrations/oauth-cookie.js';

export type YouTubeAccountStoreMaps = {
    youtubeAccountByUserVertical: Map<string, YouTubeAccountRecord>;
};

export type YouTubeAccountStoreDeps = YouTubeAccountStoreMaps & {
    getPrimaryAccountIdForUser: (userId: string) => Promise<string>;
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
    function getYouTubeAccount(userId: string, vertical: VerticalType): YouTubeAccountRecord | null {
        return deps.youtubeAccountByUserVertical.get(integrationAccountKey(userId, vertical)) ?? null;
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
        lastSyncedAt?: number | null;
        lastPublishedAt?: number | null;
        lastError?: string | null;
    }): Promise<YouTubeAccountRecord> {
        const existing = getYouTubeAccount(input.userId, input.vertical);
        const now = new Date();
        const accountId = await deps.getPrimaryAccountIdForUser(input.userId);

        if (existing) {
            const [row] = await db.update(youtubeAccounts).set({
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
            const mapped = mapYouTubeAccountRow(row);
            deps.youtubeAccountByUserVertical.set(integrationAccountKey(mapped.userId, mapped.vertical), mapped);
            return mapped;
        }

        const [row] = await db.insert(youtubeAccounts).values({
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

        const mapped = mapYouTubeAccountRow(row);
        deps.youtubeAccountByUserVertical.set(integrationAccountKey(mapped.userId, mapped.vertical), mapped);
        return mapped;
    }

    async function updateYouTubeAccountRecord(
        userId: string,
        vertical: VerticalType,
        patch: Partial<Pick<YouTubeAccountRecord, 'accessToken' | 'refreshToken' | 'tokenExpiresAt' | 'status' | 'lastPublishedAt' | 'lastSyncedAt' | 'lastError' | 'scopes'>>,
    ): Promise<YouTubeAccountRecord | null> {
        const existing = getYouTubeAccount(userId, vertical);
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
        deps.youtubeAccountByUserVertical.set(integrationAccountKey(mapped.userId, mapped.vertical), mapped);
        return mapped;
    }

    async function disconnectYouTubeAccount(userId: string, vertical: VerticalType): Promise<void> {
        const existing = getYouTubeAccount(userId, vertical);
        if (!existing) return;
        await db.delete(youtubeAccounts).where(eq(youtubeAccounts.id, existing.id));
        deps.youtubeAccountByUserVertical.delete(integrationAccountKey(userId, vertical));
    }

    return {
        getYouTubeAccount,
        youtubeAccountToResponse,
        upsertYouTubeAccountRecord,
        updateYouTubeAccountRecord,
        disconnectYouTubeAccount,
    };
}
