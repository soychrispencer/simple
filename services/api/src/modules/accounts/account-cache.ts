import { asc, desc, eq } from 'drizzle-orm';
import type {
    AccountRecord,
    AccountRole,
    AccountType,
    AccountUserRecord,
    AppUser,
} from '../../lib/domain-types.js';
import { db } from '../../db/index.js';
import { accounts, accountUsers } from '../../db/schema.js';

export type AccountCacheMaps = {
    accountsById: Map<string, AccountRecord>;
    accountUsersByUserId: Map<string, AccountUserRecord[]>;
    defaultAccountIdByUserId: Map<string, string>;
    usersById: Map<string, AppUser>;
};

export function createAccountCache(maps: AccountCacheMaps) {
    const { accountsById, accountUsersByUserId, defaultAccountIdByUserId, usersById } = maps;

    function mapAccountRow(account: typeof accounts.$inferSelect): AccountRecord {
        return {
            id: account.id,
            name: account.name,
            type: account.type as AccountType,
            ownerUserId: account.ownerUserId,
            isPersonal: Boolean(account.isPersonal),
            createdAt: account.createdAt.getTime(),
            updatedAt: account.updatedAt.getTime(),
        };
    }

    function mapAccountUserRow(membership: typeof accountUsers.$inferSelect): AccountUserRecord {
        return {
            id: membership.id,
            accountId: membership.accountId,
            userId: membership.userId,
            role: membership.role as AccountRole,
            isDefault: Boolean(membership.isDefault),
            createdAt: membership.createdAt.getTime(),
            updatedAt: membership.updatedAt.getTime(),
        };
    }

    function upsertAccountCache(account: AccountRecord): AccountRecord {
        accountsById.set(account.id, account);
        return account;
    }

    function upsertAccountUserCache(membership: AccountUserRecord): AccountUserRecord {
        const current = accountUsersByUserId.get(membership.userId) ?? [];
        const next = [membership, ...current.filter((item) => item.id !== membership.id)];
        accountUsersByUserId.set(membership.userId, next);
        if (membership.isDefault) {
            defaultAccountIdByUserId.set(membership.userId, membership.accountId);
            const existingUser = usersById.get(membership.userId);
            if (existingUser) {
                usersById.set(membership.userId, {
                    ...existingUser,
                    primaryAccountId: membership.accountId,
                });
            }
        }
        return membership;
    }

    function getAccountMembershipsForUser(userId: string): AccountUserRecord[] {
        return [...(accountUsersByUserId.get(userId) ?? [])];
    }

    function getPrimaryAccountIdForUserSync(userId: string): string | null {
        return defaultAccountIdByUserId.get(userId) ?? null;
    }

    async function getPrimaryAccountIdForUser(userId: string): Promise<string | null> {
        const cached = getPrimaryAccountIdForUserSync(userId);
        if (cached) return cached;

        const membershipRows = await db
            .select()
            .from(accountUsers)
            .where(eq(accountUsers.userId, userId))
            .orderBy(desc(accountUsers.isDefault), asc(accountUsers.createdAt))
            .limit(1);

        const membership = membershipRows[0] ? upsertAccountUserCache(mapAccountUserRow(membershipRows[0])) : null;
        return membership?.accountId ?? null;
    }

    function buildPersonalAccountName(user: Pick<AppUser, 'name' | 'email'>): string {
        return user.name.trim() || user.email.split('@')[0] || 'Cuenta personal';
    }

    async function ensurePrimaryAccountForUser(user: AppUser, accountType: AccountType = 'general'): Promise<AccountRecord> {
        const existingId = await getPrimaryAccountIdForUser(user.id);
        if (existingId) {
            const existing = accountsById.get(existingId);
            if (existing) return existing;

            const rows = await db.select().from(accounts).where(eq(accounts.id, existingId)).limit(1);
            if (rows[0]) {
                return upsertAccountCache(mapAccountRow(rows[0]));
            }
        }

        const now = new Date();
        const [accountRow] = await db.insert(accounts).values({
            name: buildPersonalAccountName(user),
            type: accountType,
            ownerUserId: user.id,
            isPersonal: true,
            createdAt: now,
            updatedAt: now,
        }).returning();
        const account = upsertAccountCache(mapAccountRow(accountRow));

        const [membershipRow] = await db.insert(accountUsers).values({
            accountId: account.id,
            userId: user.id,
            role: 'owner',
            isDefault: true,
            createdAt: now,
            updatedAt: now,
        }).returning();
        upsertAccountUserCache(mapAccountUserRow(membershipRow));

        return account;
    }

    return {
        mapAccountRow,
        mapAccountUserRow,
        upsertAccountCache,
        upsertAccountUserCache,
        getAccountMembershipsForUser,
        getPrimaryAccountIdForUserSync,
        getPrimaryAccountIdForUser,
        buildPersonalAccountName,
        ensurePrimaryAccountForUser,
    };
}
