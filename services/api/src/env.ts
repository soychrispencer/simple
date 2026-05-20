import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const apiRootDir = path.resolve(__dirname, '..');

function applyEnvFile(filePath: string, override: boolean): void {
    if (!existsSync(filePath)) return;
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!override && process.env[key] !== undefined) continue;
        process.env[key] = value;
    }
}

// .env base; .env.local gana en desarrollo (STORAGE_PROVIDER, etc.).
for (const candidate of [
    path.join(apiRootDir, '.env'),
    path.resolve(process.cwd(), '.env'),
]) {
    try {
        applyEnvFile(candidate, false);
    } catch {
        // Local development can run without every env file.
    }
}
for (const candidate of [
    path.join(apiRootDir, '.env.local'),
    path.resolve(process.cwd(), '.env.local'),
]) {
    try {
        applyEnvFile(candidate, true);
    } catch {
        // Local development can run without every env file.
    }
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_HOST: z.string().min(1).default('0.0.0.0'),
    DATABASE_URL: z.string().trim().optional(),
    PGHOST: z.string().trim().optional(),
    PGPORT: z.coerce.number().int().positive().optional(),
    PGDATABASE: z.string().trim().optional(),
    PGUSER: z.string().trim().optional(),
    PGPASSWORD: z.string().optional(),
    SESSION_SECRET: z.string().trim().optional(),
    AUTH_COOKIE_SAMESITE: z.string().trim().optional(),
    STORAGE_PROVIDER: z.preprocess((raw) => {
        if (typeof raw !== 'string') return raw;
        if (raw !== 'backblaze-s3' && raw !== 'backblaze-b2') return raw;
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                `[simple-api] STORAGE_PROVIDER=${raw} is no longer supported. ` +
                'Use STORAGE_PROVIDER=cloudflare-r2 (or local). See docs/archive/MIGRATION_BACKBLAZE_TO_CLOUDFLARE.md'
            );
        }
        console.warn(
            `[simple-api] STORAGE_PROVIDER=${raw} is deprecated; using "local" in development. ` +
            'Update services/api/.env.local to STORAGE_PROVIDER=local or cloudflare-r2.'
        );
        return 'local';
    }, z.enum(['local', 'cloudflare-r2', 'r2']).optional()),
}).superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
        if (!value.DATABASE_URL && !value.PGPASSWORD) {
            ctx.addIssue({
                code: 'custom',
                path: ['DATABASE_URL'],
                message: 'DATABASE_URL or PGPASSWORD is required in production',
            });
        }
        if (!value.SESSION_SECRET) {
            ctx.addIssue({
                code: 'custom',
                path: ['SESSION_SECRET'],
                message: 'SESSION_SECRET is required in production',
            });
        }
    }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const details = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
        .join('; ');
    throw new Error(`[simple-api] Invalid environment: ${details}`);
}

export const env = parsed.data;
// Propagar valores normalizados (p. ej. backblaze-* → local en dev) al resto del proceso.
if (env.STORAGE_PROVIDER) {
    process.env.STORAGE_PROVIDER = env.STORAGE_PROVIDER;
}
export const isProduction = env.NODE_ENV === 'production';
