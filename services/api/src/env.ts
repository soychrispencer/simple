import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const apiRootDir = path.resolve(__dirname, '..');

for (const candidate of [
    path.join(apiRootDir, '.env'),
    path.join(apiRootDir, '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
]) {
    try {
        if (existsSync(candidate)) {
            process.loadEnvFile?.(candidate);
        }
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
export const isProduction = env.NODE_ENV === 'production';
