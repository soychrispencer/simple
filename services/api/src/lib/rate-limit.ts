/**
 * Rate limit en memoria por proceso (Map local).
 *
 * En producción con varias réplicas API el límite efectivo se multiplica por instancia.
 * Complementar con rate limit en edge/proxy — ver docs/COOLIFY_DEPLOYMENT.md § «Rate limiting en proxy».
 *
 * Si `REDIS_URL` está definida, se intenta usar ioredis para contadores compartidos (best-effort).
 * Sin Redis o si falla la conexión, se usa el Map en memoria de este proceso.
 */
import type { Context } from 'hono';

type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

type RedisLike = {
    incr: (key: string) => Promise<number>;
    pexpire: (key: string, ms: number) => Promise<number>;
};

let redisClient: RedisLike | null | undefined;

async function getRedisClient(): Promise<RedisLike | null> {
    if (redisClient !== undefined) return redisClient;
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
        redisClient = null;
        return null;
    }
    try {
        const mod = await import('ioredis');
        const IORedis = mod.default as unknown as new (
            url: string,
            opts?: { maxRetriesPerRequest?: number; lazyConnect?: boolean },
        ) => { connect(): Promise<void>; incr(key: string): Promise<number>; pexpire(key: string, ms: number): Promise<number> };
        const client = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
        await client.connect();
        redisClient = {
            incr: (key) => client.incr(key),
            pexpire: (key, ms) => client.pexpire(key, ms),
        };
    } catch {
        redisClient = null;
    }
    return redisClient;
}

// Best-effort cleanup so the map doesn't grow unbounded.
// Fires at most once per minute, only when a request comes in.
let lastSweep = 0;
function sweep(now: number) {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

function clientIp(c: Context): string {
    const xff = c.req.header('x-forwarded-for');
    if (xff) return xff.split(',')[0]!.trim();
    const real = c.req.header('x-real-ip');
    if (real) return real.trim();
    return 'unknown';
}

export type RateLimitOptions = {
    name: string;
    limit: number;
    windowMs: number;
};

async function isRateLimited(key: string, limit: number, windowMs: number): Promise<{ limited: boolean; retryAfter: number }> {
    const now = Date.now();
    const redis = await getRedisClient();
    if (redis) {
        const redisKey = `rl:${key}`;
        const count = await redis.incr(redisKey);
        if (count === 1) await redis.pexpire(redisKey, windowMs);
        if (count > limit) {
            return { limited: true, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
        }
        return { limited: false, retryAfter: 0 };
    }

    sweep(now);
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, retryAfter: 0 };
    }
    bucket.count += 1;
    if (bucket.count > limit) {
        return { limited: true, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }
    return { limited: false, retryAfter: 0 };
}

export function rateLimit(opts: RateLimitOptions) {
    return async (c: Context, next: () => Promise<void>) => {
        const key = `${opts.name}:${clientIp(c)}`;
        const { limited, retryAfter } = await isRateLimited(key, opts.limit, opts.windowMs);
        if (limited) {
            c.header('Retry-After', String(retryAfter));
            return c.json(
                { ok: false, error: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.' },
                429,
            );
        }
        await next();
    };
}
