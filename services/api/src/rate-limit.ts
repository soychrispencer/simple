import type { Context } from 'hono';

type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

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

export function rateLimit(opts: RateLimitOptions) {
    return async (c: Context, next: () => Promise<void>) => {
        const now = Date.now();
        sweep(now);
        const key = `${opts.name}:${clientIp(c)}`;
        const bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        } else {
            bucket.count += 1;
            if (bucket.count > opts.limit) {
                const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
                c.header('Retry-After', String(retryAfter));
                return c.json(
                    { ok: false, error: 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.' },
                    429
                );
            }
        }
        await next();
    };
}
