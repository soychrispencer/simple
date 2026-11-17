import { and, eq } from 'drizzle-orm';
import { accountUsers, accounts } from '../../db/schema.js';
import { canManageAccountRole } from './permissions.js';

/**
 * Revalidates management rights while the membership and account rows are
 * locked, so concurrent role changes cannot race writes and workspace-level
 * updates are serialized.
 */
export async function runAccountWorkspaceWrite<T>(
    db: any,
    input: { userId: string; accountId: string | null | undefined },
    authorize: (role: unknown) => boolean,
    write: (tx: any, role: string) => Promise<T>,
): Promise<{ ok: true; value: T; role: string } | { ok: false }> {
    const accountId = input.accountId;
    if (!accountId) return { ok: false };

    return db.transaction(async (tx: any) => {
        const [membership] = await tx.select({ role: accountUsers.role, isDefault: accountUsers.isDefault })
            .from(accountUsers)
            .where(and(
                eq(accountUsers.accountId, accountId),
                eq(accountUsers.userId, input.userId),
            ))
            .limit(1)
            .for('update');

        if (!membership?.isDefault || !authorize(membership.role)) return { ok: false as const };
        const [account] = await tx.select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1)
            .for('update');
        if (!account) return { ok: false as const };

        return { ok: true as const, value: await write(tx, membership.role), role: membership.role };
    });
}

export async function runAccountMemberWrite<T>(
    db: any,
    input: { userId: string; accountId: string | null | undefined },
    write: (tx: any, role: string) => Promise<T>,
): Promise<{ ok: true; value: T; role: string } | { ok: false }> {
    return runAccountWorkspaceWrite(db, input, () => true, write);
}

export async function runAccountManagerWrite<T>(
    db: any,
    input: { userId: string; accountId: string | null | undefined },
    write: (tx: any) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
    const result = await runAccountWorkspaceWrite(db, input, canManageAccountRole, (tx) => write(tx));
    if (!result.ok) return result;
    return { ok: true, value: result.value };
}
