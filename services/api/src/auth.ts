import { getCookie } from 'hono/cookie';
import type { Context } from 'hono';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { users } from './db/schema.js';

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

const SESSION_COOKIE = 'simple_session';
// Read lazily so env is guaranteed loaded at call time
function getSessionSecret(): string {
    return asString(process.env.SESSION_SECRET);
}

export type VerticalType = 'autos' | 'propiedades' | 'agenda' | 'serenatas';

export type AppUser = {
    id: string;
    email: string;
    passwordHash?: string;
    name: string;
    phone?: string | null;
    role: 'user' | 'admin' | 'superadmin';
    status: 'active' | 'verified' | 'suspended';
    primaryVertical?: VerticalType | null;
    avatar?: string;
    provider?: string;
    providerId?: string;
    lastLoginAt?: Date | null;
};

function mapUserRowToAppUser(user: typeof users.$inferSelect): AppUser {
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash ?? undefined,
        name: user.name,
        phone: user.phone ?? null,
        role: user.role as AppUser['role'],
        status: user.status as AppUser['status'],
        primaryVertical: (user.primaryVertical as VerticalType | null | undefined) ?? null,
        avatar: user.avatarUrl ?? undefined,
        provider: user.provider ?? undefined,
        providerId: user.providerId ?? undefined,
        lastLoginAt: user.lastLoginAt ?? null,
    };
}

async function getUserById(id: string): Promise<AppUser | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (result.length === 0) return null;
    return mapUserRowToAppUser(result[0]);
}

function canAuthenticateUser(user: AppUser): boolean {
    return user.status !== 'suspended';
}

function localDevForcesSuperadmin(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_FORCE_SUPERADMIN === 'true';
}

function applyRuntimeRole(user: AppUser): AppUser {
    if (!localDevForcesSuperadmin()) return user;
    if (user.role === 'superadmin') return user;
    return { ...user, role: 'superadmin' };
}

export async function authUser(c: Context): Promise<AppUser | null> {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return null;

    let userId: string | null = null;
    try {
        const payload = jwt.verify(token, getSessionSecret()) as jwt.JwtPayload;
        userId = typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
        userId = null;
    }

    if (!userId) return null;

    const user = await getUserById(userId);
    if (!user || !canAuthenticateUser(user)) return null;

    return applyRuntimeRole(user);
}
