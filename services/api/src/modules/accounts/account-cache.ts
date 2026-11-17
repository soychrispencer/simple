import { and, asc, desc, eq, ne } from 'drizzle-orm';
import type {
    AccountRecord,
    AccountRole,
    AccountType,
    AccountUserRecord,
    AppUser,
} from '../../lib/domain-types.js';
import { db } from '../../db/index.js';
import { accounts, accountUsers, users } from '../../db/schema.js';

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
            businessLegalName: account.businessLegalName ?? null,
            businessTaxId: account.businessTaxId ?? null,
            billingAddressId: account.billingAddressId ?? null,
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

    function setDefaultAccountForUser(userId: string, accountId: string): void {
        const memberships = accountUsersByUserId.get(userId) ?? [];
        accountUsersByUserId.set(userId, memberships.map((membership) => ({
            ...membership,
            isDefault: membership.accountId === accountId,
        })));
        defaultAccountIdByUserId.set(userId, accountId);
        const existingUser = usersById.get(userId);
        if (existingUser) {
            usersById.set(userId, { ...existingUser, primaryAccountId: accountId });
        }
    }

    function removeAccountUserCache(userId: string, membershipId: string): void {
        const current = accountUsersByUserId.get(userId) ?? [];
        const removed = current.find((item) => item.id === membershipId);
        const remaining = current.filter((item) => item.id !== membershipId);
        accountUsersByUserId.set(userId, remaining);
        if (removed?.isDefault) {
            const nextDefault = remaining.find((item) => item.isDefault) ?? remaining[0] ?? null;
            if (nextDefault) setDefaultAccountForUser(userId, nextDefault.accountId);
            else {
                defaultAccountIdByUserId.delete(userId);
                const existingUser = usersById.get(userId);
                if (existingUser) usersById.set(userId, { ...existingUser, primaryAccountId: null });
            }
        }
    }

    function getPrimaryAccountIdForUserSync(userId: string): string | null {
        return defaultAccountIdByUserId.get(userId) ?? null;
    }

    async function getPrimaryAccountIdForUser(userId: string): Promise<string | null> {
        const membershipRows = await db
            .select()
            .from(accountUsers)
            .where(eq(accountUsers.userId, userId))
            .orderBy(desc(accountUsers.isDefault), asc(accountUsers.createdAt))
        const memberships = membershipRows.map(mapAccountUserRow);
        accountUsersByUserId.set(userId, memberships);

        const defaultMembership = memberships.find((membership) => membership.isDefault) ?? null;
        if (defaultMembership) {
            defaultAccountIdByUserId.set(userId, defaultMembership.accountId);
        } else {
            defaultAccountIdByUserId.delete(userId);
        }
        const existingUser = usersById.get(userId);
        if (existingUser) {
            usersById.set(userId, {
                ...existingUser,
                primaryAccountId: defaultMembership?.accountId ?? null,
            });
        }
        return defaultMembership?.accountId ?? null;
    }

    function buildPersonalAccountName(user: Pick<AppUser, 'name' | 'email'>): string {
        return user.name.trim() || user.email.split('@')[0] || 'Cuenta personal';
    }

    async function ensurePrimaryAccountForUser(user: AppUser, accountType: AccountType = 'general'): Promise<AccountRecord> {
        const existingId = await getPrimaryAccountIdForUser(user.id);
        const [personalAccount] = await db.select()
            .from(accounts)
            .where(and(eq(accounts.ownerUserId, user.id), eq(accounts.isPersonal, true)))
            .orderBy(asc(accounts.createdAt))
            .limit(1);
        const personalMembershipRows = personalAccount
            ? await db.select()
                .from(accountUsers)
                .where(and(eq(accountUsers.accountId, personalAccount.id), eq(accountUsers.userId, user.id)))
                .limit(1)
            : [];

        if (existingId && personalAccount && personalMembershipRows[0]?.role === 'owner') {
            const existing = accountsById.get(existingId);
            if (existing) return existing;

            const rows = await db.select().from(accounts).where(eq(accounts.id, existingId)).limit(1);
            if (rows[0]) {
                return upsertAccountCache(mapAccountRow(rows[0]));
            }
        }

        const ensured = await db.transaction(async (tx) => {
            await tx.select({ id: users.id })
                .from(users)
                .where(eq(users.id, user.id))
                .for('update');

            // Another request may have created an account or membership while we waited for the lock.
            const membershipRows = await tx.select()
                .from(accountUsers)
                .where(eq(accountUsers.userId, user.id))
                .orderBy(desc(accountUsers.isDefault), asc(accountUsers.createdAt));

            const personalAccountRows = await tx.select()
                .from(accounts)
                .where(and(eq(accounts.ownerUserId, user.id), eq(accounts.isPersonal, true)))
                .orderBy(asc(accounts.createdAt))
                .limit(1);
            let personalAccountRow = personalAccountRows[0];

            const now = new Date();
            if (!personalAccountRow) {
                const [createdPersonalAccount] = await tx.insert(accounts).values({
                    name: buildPersonalAccountName(user),
                    type: accountType,
                    ownerUserId: user.id,
                    isPersonal: true,
                    createdAt: now,
                    updatedAt: now,
                }).returning();
                personalAccountRow = createdPersonalAccount;
            }

            let personalMembershipRow = membershipRows.find((membership) => membership.accountId === personalAccountRow.id) ?? null;
            if (!personalMembershipRow) {
                const [createdPersonalMembership] = await tx.insert(accountUsers).values({
                    accountId: personalAccountRow.id,
                    userId: user.id,
                    role: 'owner',
                    isDefault: false,
                    createdAt: now,
                    updatedAt: now,
                }).returning();
                personalMembershipRow = createdPersonalMembership;
                membershipRows.push(createdPersonalMembership);
            } else if (personalMembershipRow.role !== 'owner') {
                const [differentOwner] = await tx.select({ id: accountUsers.id })
                    .from(accountUsers)
                    .where(and(
                        eq(accountUsers.accountId, personalAccountRow.id),
                        eq(accountUsers.role, 'owner'),
                        ne(accountUsers.userId, user.id),
                    ))
                    .limit(1);

                if (differentOwner) {
                    throw new Error('La cuenta personal tiene un dueño distinto a su titular y requiere revisión.');
                }

                const [correctedMembership] = await tx.update(accountUsers)
                    .set({ role: 'owner', updatedAt: now })
                    .where(eq(accountUsers.id, personalMembershipRow.id))
                    .returning();

                if (!correctedMembership) {
                    throw new Error('No se pudo corregir el rol del titular de su cuenta personal.');
                }
                personalMembershipRow = correctedMembership;
                const membershipIndex = membershipRows.findIndex((membership) => membership.id === correctedMembership.id);
                if (membershipIndex >= 0) membershipRows[membershipIndex] = correctedMembership;
            }

            let membershipRow = membershipRows.find((membership) => membership.isDefault) ?? null;
            if (!membershipRow) {
                const membershipToSelect = personalMembershipRow ?? membershipRows[0];
                if (!membershipToSelect) throw new Error('No se pudo crear la membresía personal del usuario.');

                await tx.update(accountUsers)
                    .set({ isDefault: false, updatedAt: now })
                    .where(eq(accountUsers.userId, user.id));
                const [selected] = await tx.update(accountUsers)
                    .set({ isDefault: true, updatedAt: now })
                    .where(eq(accountUsers.id, membershipToSelect.id))
                    .returning();
                membershipRow = selected;
                if (membershipRow.id === personalMembershipRow.id) personalMembershipRow = selected;
            }

            const accountRows = await tx.select()
                .from(accounts)
                .where(eq(accounts.id, membershipRow.accountId))
                .limit(1);
            if (!accountRows[0]) throw new Error('No se encontró el espacio predeterminado del usuario.');

            return {
                accountRow: accountRows[0],
                membershipRow,
                personalAccountRow,
                personalMembershipRow,
            };
        });

        upsertAccountCache(mapAccountRow(ensured.personalAccountRow));
        upsertAccountUserCache(mapAccountUserRow(ensured.personalMembershipRow));
        const account = upsertAccountCache(mapAccountRow(ensured.accountRow));
        upsertAccountUserCache(mapAccountUserRow(ensured.membershipRow));
        return account;
    }

    return {
        mapAccountRow,
        mapAccountUserRow,
        upsertAccountCache,
        upsertAccountUserCache,
        getAccountMembershipsForUser,
        setDefaultAccountForUser,
        removeAccountUserCache,
        getPrimaryAccountIdForUserSync,
        getPrimaryAccountIdForUser,
        buildPersonalAccountName,
        ensurePrimaryAccountForUser,
    };
}
