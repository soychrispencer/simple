import { eq } from 'drizzle-orm';
import type { AppUser } from '../../lib/domain-types.js';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';

export type MapUserRowToAppUser = (user: typeof users.$inferSelect) => AppUser;

export async function getUserByEmail(
    email: string,
    mapUserRowToAppUser: MapUserRowToAppUser,
): Promise<AppUser | undefined> {
    const normalized = email.trim().toLowerCase();
    const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (result.length === 0) return undefined;
    return mapUserRowToAppUser(result[0]);
}

export function canAuthenticateUser(user: AppUser): boolean {
    return user.status !== 'suspended';
}

export async function touchUserLastLoginAt(userId: string): Promise<void> {
    await db.update(users).set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
    }).where(eq(users.id, userId));
}
