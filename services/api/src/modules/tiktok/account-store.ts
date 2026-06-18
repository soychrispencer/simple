import { eq } from 'drizzle-orm';
import type { VerticalType } from '@simple/types';
import { db } from '../../db/index.js';
import { tiktokAccounts } from '../../db/schema.js';
import type { TikTokAccountRecord, TikTokAccountStatus } from '../../lib/domain-types.js';
import { asString } from '../shared/index.js';
import { integrationAccountKey } from '../integrations/oauth-cookie.js';

export type TikTokAccountStoreMaps = {
    tiktokAccountByUserVertical: Map<string, TikTokAccountRecord>;
};

export type TikTokAccountStoreDeps = TikTokAccountStoreMaps & {
    getPrimaryAccountIdForUser: (userId: string) => Promise<string>;
};

export function mapTikTokAccountRow(row: typeof tiktokAccounts.$inferSelect): TikTokAccountRecord {
    return {
        id: row.id,
        accountId: row.accountId ?? null,
        userId: row.userId,
        vertical: row.vertical as VerticalType,
        openId: row.openId,
        username: row.username,
        displayName: row.displayName ?? null,
        avatarUrl: row.avatarUrl ?? null,
        accessToken: row.accessToken,
        refreshToken: row.refreshToken ?? null,
        tokenExpiresAt: row.tokenExpiresAt?.getTime() ?? null,
        scopes: Array.isArray(row.scopes) ? row.scopes.map((item) => asString(item)).filter(Boolean) : [],
        status: row.status as TikTokAccountStatus,
        lastSyncedAt: row.lastSyncedAt?.getTime() ?? null,
        lastPublishedAt: row.lastPublishedAt?.getTime() ?? null,
        lastError: row.lastError ?? null,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
    };
}

export function createTikTokAccountStore(deps: TikTokAccountStoreDeps) {
    function getTikTokAccount(userId: string, vertical: VerticalType): TikTokAccountRecord | null {
        return deps.tiktokAccountByUserVertical.get(integrationAccountKey(userId, vertical)) ?? null;
    }

    function tiktokAccountToResponse(account: TikTokAccountRecord | null) {
        if (!account) return null;
        return {
            id: account.id,
            vertical: account.vertical,
            openId: account.openId,
            username: account.username,
            displayName: account.displayName,
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

    async function upsertTikTokAccountRecord(input: {
        userId: string;
        vertical: VerticalType;
        openId: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        accessToken: string;
        refreshToken: string | null;
        tokenExpiresAt: number | null;
        scopes: string[];
        status?: TikTokAccountStatus;
        lastSyncedAt?: number | null;
        lastPublishedAt?: number | null;
        lastError?: string | null;
    }): Promise<TikTokAccountRecord> {
        const existing = getTikTokAccount(input.userId, input.vertical);
        const now = new Date();
        const accountId = await deps.getPrimaryAccountIdForUser(input.userId);

        if (existing) {
            const [row] = await db.update(tiktokAccounts).set({
                openId: input.openId,
                username: input.username,
                displayName: input.displayName,
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
            }).where(eq(tiktokAccounts.id, existing.id)).returning();
            const mapped = mapTikTokAccountRow(row);
            deps.tiktokAccountByUserVertical.set(integrationAccountKey(mapped.userId, mapped.vertical), mapped);
            return mapped;
        }

        const [row] = await db.insert(tiktokAccounts).values({
            accountId,
            userId: input.userId,
            vertical: input.vertical,
            openId: input.openId,
            username: input.username,
            displayName: input.displayName,
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

        const mapped = mapTikTokAccountRow(row);
        deps.tiktokAccountByUserVertical.set(integrationAccountKey(mapped.userId, mapped.vertical), mapped);
        return mapped;
    }

    async function updateTikTokAccountRecord(
        userId: string,
        vertical: VerticalType,
        patch: Partial<Pick<TikTokAccountRecord, 'accessToken' | 'refreshToken' | 'tokenExpiresAt' | 'status' | 'lastPublishedAt' | 'lastSyncedAt' | 'lastError' | 'scopes'>>,
    ): Promise<TikTokAccountRecord | null> {
        const existing = getTikTokAccount(userId, vertical);
        if (!existing) return null;

        const [row] = await db.update(tiktokAccounts).set({
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
        }).where(eq(tiktokAccounts.id, existing.id)).returning();

        const mapped = mapTikTokAccountRow(row);
        deps.tiktokAccountByUserVertical.set(integrationAccountKey(mapped.userId, mapped.vertical), mapped);
        return mapped;
    }

    async function disconnectTikTokAccount(userId: string, vertical: VerticalType): Promise<void> {
        const existing = getTikTokAccount(userId, vertical);
        if (!existing) return;
        await db.delete(tiktokAccounts).where(eq(tiktokAccounts.id, existing.id));
        deps.tiktokAccountByUserVertical.delete(integrationAccountKey(userId, vertical));
    }

    return {
        getTikTokAccount,
        tiktokAccountToResponse,
        upsertTikTokAccountRecord,
        updateTikTokAccountRecord,
        disconnectTikTokAccount,
    };
}
