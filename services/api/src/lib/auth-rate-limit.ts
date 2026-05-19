/**
 * Rate limit en memoria para rutas de auth (`/api/auth/*`).
 * No comparte contadores con `lib/rate-limit.ts` (middleware Agenda, etc.).
 * En multi-réplica el límite efectivo se multiplica por instancia; usar proxy en producción.
 *
 * Para rate limit compartido entre réplicas, definir `REDIS_URL` — usado por `lib/rate-limit.ts`
 * (middleware Hono). Ver docs/COOLIFY_DEPLOYMENT.md y `.env.example`.
 */
const authRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = authRateLimitBuckets.get(key);
    if (!current || current.resetAt <= now) {
        authRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfterSeconds: 0 };
    }
    if (current.count >= limit) {
        return {
            ok: false,
            retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
    }
    current.count += 1;
    authRateLimitBuckets.set(key, current);
    return { ok: true, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string): void {
    authRateLimitBuckets.delete(key);
}
