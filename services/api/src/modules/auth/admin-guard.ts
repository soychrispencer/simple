import type { Context } from 'hono';
import { and, eq, or } from 'drizzle-orm';
import { asString } from '../shared/index.js';
import type { AppUser, UserRole, UserStatus, VerticalType } from '../../lib/domain-types.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';

export function isAdminRole(role: UserRole): boolean {
    return role === 'admin' || role === 'superadmin';
}

/** Autorización admin por vertical (superadmin global; admin con primaryVertical). */
export function isAdminForVertical(user: AppUser, vertical: VerticalType): boolean {
    if (user.role === 'superadmin') return true;
    if (user.role !== 'admin') return false;
    if (!user.primaryVertical) return true;
    return user.primaryVertical === vertical;
}

export function isAdminBootstrapEnabled(): boolean {
    return asString(process.env.ENABLE_ADMIN_BOOTSTRAP).toLowerCase() === 'true';
}

export function isActiveAdminStatus(status: UserStatus): boolean {
    return status === 'active' || status === 'verified';
}

export async function countActiveSuperadminUsers(): Promise<number> {
    const items = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.role, 'superadmin'),
                or(eq(users.status, 'active'), eq(users.status, 'verified')),
            ),
        );
    return items.length;
}

export async function requireAdminUser(
    c: Context,
    authUser: (ctx: Context) => Promise<AppUser | null>,
): Promise<AppUser | null> {
    const user = await authUser(c);
    if (!user) {
        c.status(401);
        return null;
    }
    if (!isAdminRole(user.role)) {
        c.status(403);
        return null;
    }
    return user;
}
