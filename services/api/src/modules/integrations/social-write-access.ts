import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { accountUsers, accounts } from '../../db/schema.js';
import { canManageAccountRole } from '../accounts/permissions.js';

export class SocialIntegrationAccessError extends Error {
    constructor(message = 'Tus permisos cambiaron. Solo quien administra este espacio puede gestionar la cuenta social.') {
        super(message);
        this.name = 'SocialIntegrationAccessError';
    }
}

export function isSocialIntegrationAccessError(error: unknown): error is SocialIntegrationAccessError {
    return error instanceof SocialIntegrationAccessError;
}

/**
 * Revalidates a workspace social connection at the write boundary.
 * The membership lock makes a concurrent role change or removal wait until
 * the token write commits; the account lock serializes connects from different
 * administrators so the workspace keeps one integration per product.
 */
export async function lockSocialIntegrationWriteAccess(
    tx: any,
    input: { userId: string; accountId: string },
): Promise<void> {
    const [membership] = await tx.select({ role: accountUsers.role })
        .from(accountUsers)
        .where(and(
            eq(accountUsers.accountId, input.accountId),
            eq(accountUsers.userId, input.userId),
        ))
        .limit(1)
        .for('update');

    if (!membership || !canManageAccountRole(membership.role)) {
        throw new SocialIntegrationAccessError();
    }

    const [account] = await tx.select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, input.accountId))
        .limit(1)
        .for('update');

    if (!account) {
        throw new Error('No encontramos el espacio de trabajo al guardar la conexión social.');
    }
}

export function requireSocialIntegrationAccountId(accountId: string | null | undefined): string {
    if (!accountId) {
        throw new Error('No encontramos el espacio de trabajo para guardar la conexión social.');
    }
    return accountId;
}
