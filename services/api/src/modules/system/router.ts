import { Hono } from 'hono';
import type { Context } from 'hono';
import fs from 'fs/promises';
import path from 'path';

export interface SystemRouterDeps {
    serviceName: string;
    apiRootDir: string;
    env: {
        NODE_ENV?: string;
        STORAGE_PROVIDER?: string;
        LOCAL_STORAGE_URL?: string;
        CLOUDFLARE_R2_BUCKET_NAME?: string;
        CLOUDFLARE_R2_PUBLIC_URL?: string;
    };
}

export function createSystemRouter(deps: SystemRouterDeps) {
    const { serviceName, apiRootDir, env } = deps;

    const app = new Hono();

    // Root endpoint
    app.get('/', (c) =>
        c.json({
            ok: true,
            service: serviceName,
            status: 'running',
        })
    );

    // Health check handler
    const handleHealthcheck = (c: Context) =>
        c.json({
            ok: true,
            service: serviceName,
            timestamp: new Date().toISOString(),
        });

    // Health endpoints
    app.get('/health', handleHealthcheck);
    app.get('/api/health', handleHealthcheck);

    /** Clave de Maps para el navegador (Places). Pública por diseño (referrer-restricted en GCP). */
    app.get('/api/public/maps-browser-key', (c) => {
        const key =
            process.env.GOOGLE_MAPS_BROWSER_KEY?.trim()
            || process.env.GOOGLE_MAPS_API_KEY?.trim()
            || '';
        if (!key) {
            return c.json({ ok: false, key: null, error: 'maps_key_not_configured' }, 200);
        }
        return c.json({ ok: true, key });
    });

    // Debug environment endpoint
    app.get('/api/debug/env', (c) => {
        return c.json({
            cwd: process.cwd(),
            env: {
                NODE_ENV: env.NODE_ENV,
                STORAGE_PROVIDER: env.STORAGE_PROVIDER,
                LOCAL_STORAGE_URL: env.LOCAL_STORAGE_URL,
                CLOUDFLARE_R2_BUCKET_NAME: env.CLOUDFLARE_R2_BUCKET_NAME,
            },
            api_root: apiRootDir,
        });
    });

    app.get('/uploads/*', async (c) => {
        const pathname = new URL(c.req.url).pathname;
        const relativePath = pathname.replace(/^\/uploads\//, '');
        if (!relativePath) {
            return c.text('Not found', 404);
        }

        const r2PublicBase = env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, '');
        if (env.STORAGE_PROVIDER === 'cloudflare-r2' && r2PublicBase) {
            const objectKey = `uploads/${relativePath}`;
            return c.redirect(`${r2PublicBase}/${objectKey}`, 302);
        }

        if (env.STORAGE_PROVIDER !== 'local' && env.NODE_ENV !== 'development') {
            return c.text('Not found', 404);
        }

        const diskPath = path.join(process.cwd(), 'uploads', ...relativePath.split('/'));
        try {
            const stat = await fs.stat(diskPath);
            if (!stat.isFile()) {
                return c.text('Not found', 404);
            }

            const blob = await fs.readFile(diskPath);
            let contentType = 'application/octet-stream';
            if (diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (diskPath.endsWith('.png')) contentType = 'image/png';
            else if (diskPath.endsWith('.webp')) contentType = 'image/webp';
            else if (diskPath.endsWith('.gif')) contentType = 'image/gif';

            return c.body(blob, 200, { 'Content-Type': contentType });
        } catch {
            return c.text('Not found', 404);
        }
    });

    return app;
}
