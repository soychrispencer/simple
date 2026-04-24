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
        BACKBLAZE_DOWNLOAD_URL?: string;
        BACKBLAZE_BUCKET_NAME?: string;
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

    // Debug environment endpoint
    app.get('/api/debug/env', (c) => {
        return c.json({
            cwd: process.cwd(),
            env: {
                NODE_ENV: env.NODE_ENV,
                STORAGE_PROVIDER: env.STORAGE_PROVIDER,
                LOCAL_STORAGE_URL: env.LOCAL_STORAGE_URL,
                BACKBLAZE_DOWNLOAD_URL: env.BACKBLAZE_DOWNLOAD_URL,
                BACKBLAZE_BUCKET_NAME: env.BACKBLAZE_BUCKET_NAME,
            },
            api_root: apiRootDir,
        });
    });

    // Development-only file server for local uploads
    app.get('/uploads/*', async (c) => {
        if (env.STORAGE_PROVIDER !== 'local' && env.NODE_ENV !== 'development') {
            return c.text('Not found', 404);
        }

        const pathname = new URL(c.req.url).pathname;
        const relativePath = pathname.replace(/^\/uploads\//, '');
        if (!relativePath) {
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
