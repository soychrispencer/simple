import { Hono } from 'hono';
import type { Context } from 'hono';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export interface MediaRouterDeps {
    authUser: (c: Context) => Promise<any>;
    requireVerifiedSession: (c: Context, next: () => Promise<void>) => Promise<Response | void>;
    asString: (v: any) => string;
    logDebug: (msg: string) => void;
    getStorageProvider: () => {
        upload: (opts: {
            file: any;
            fileName: string;
            mimeType: string;
            fileType: 'image' | 'video' | 'document';
            userId: string;
            listingId?: string;
        }) => Promise<any>;
        health: () => Promise<boolean>;
    };
    getMediaProxyS3Client: () => any;
    isBackblazeUrl: (url: string) => boolean;
    isCloudflareR2Url: (url: string) => boolean;
    isStorageUrl: (url: string) => boolean;
    extractBackblazeObjectKey: (url: string) => string | null;
    extractR2ObjectKey: (url: string) => string | null;
    extractStorageObjectKey: (url: string) => string | null;
    env: {
        BACKBLAZE_BUCKET_NAME?: string;
        CLOUDFLARE_R2_BUCKET_NAME?: string;
        STORAGE_PROVIDER?: string;
        BACKBLAZE_APP_KEY_ID?: string;
        BACKBLAZE_APP_KEY?: string;
        BACKBLAZE_BUCKET_ID?: string;
        BACKBLAZE_DOWNLOAD_URL?: string;
    };
}

export function createMediaRouter(deps: MediaRouterDeps) {
    const {
        authUser,
        requireVerifiedSession,
        asString,
        logDebug,
        getStorageProvider,
        getMediaProxyS3Client,
        isBackblazeUrl,
        isCloudflareR2Url,
        isStorageUrl,
        extractBackblazeObjectKey,
        extractR2ObjectKey,
        extractStorageObjectKey,
        env,
    } = deps;

    const app = new Hono();

    // Proxy para imágenes desde Backblaze B2 o Cloudflare R2
    app.get('/proxy', async (c) => {
        const src = asString(c.req.query('src'));
        if (!src) {
            return c.json({ ok: false, error: 'Falta src.' }, 400);
        }

        if (!isStorageUrl(src)) {
            return c.json({ ok: false, error: 'Origen no soportado. Solo Backblaze B2 y Cloudflare R2.' }, 400);
        }

        // Determine bucket name based on storage type
        const bucketName = isCloudflareR2Url(src) 
            ? (env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media')
            : (env.BACKBLAZE_BUCKET_NAME || 'simple-media');
        
        const key = extractStorageObjectKey(src);
        if (!key) {
            return c.json({ ok: false, error: 'No pudimos resolver el archivo.' }, 404);
        }

        const client = getMediaProxyS3Client();
        if (!client) {
            return c.json({ ok: false, error: 'El proxy de medios no está configurado.' }, 503);
        }

        try {
            const object = await client.send(new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            }));
            const body = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : Buffer.alloc(0);
            return c.body(body, 200, {
                'Content-Type': object.ContentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo descargar el archivo.';
            return c.json({ ok: false, error: message }, 404);
        }
    });

    // Subir archivos (requiere autenticación)
    app.post('/upload', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) {
            logDebug(`[AUTH FAIL] /api/media/upload - user not found`);
            return c.json({ ok: false, error: 'No autenticado' }, 401);
        }

        logDebug(`[UPLOAD START] User: ${user.email} (${user.id})`);

        try {
            const formData = await c.req.formData();
            const file = formData.get('file') as any;
            const fileType = formData.get('fileType') as string | null;
            const listingId = formData.get('listingId') as string | null;

            logDebug(`[UPLOAD META] file: ${file ? (file.name || 'blob') : 'null'}, type: ${fileType}, listingId: ${listingId}`);

            if (!file) return c.json({ ok: false, error: 'No file provided' }, 400);
            if (!fileType || !['image', 'video', 'document'].includes(fileType)) {
                return c.json({ ok: false, error: 'Invalid file type' }, 400);
            }

            logDebug(`[UPLOAD STORAGE START] Provider initialization...`);
            const storage = getStorageProvider();

            logDebug(`[UPLOAD CALL] Calling storage.upload...`);
            const result = await storage.upload({
                file,
                fileName: file.name || 'unnamed-file',
                mimeType: file.type || 'application/octet-stream',
                fileType: fileType as 'image' | 'video' | 'document',
                userId: user.id,
                listingId: listingId || undefined,
            });

            logDebug(`[UPLOAD SUCCESS] Result: ${JSON.stringify(result)}`);
            return c.json({ ok: true, result }, 200);
        } catch (error: any) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : '';
            logDebug(`[UPLOAD ERROR] ${errMsg}\nStack: ${stack}`);
            console.error('[API] Upload error:', error);
            return c.json(
                { ok: false, error: error instanceof Error ? error.message : 'Upload failed' },
                500
            );
        }
    });

    return app;
}

export interface StorageRouterDeps {
    getStorageProvider: () => {
        health: () => Promise<boolean>;
    };
    env: {
        STORAGE_PROVIDER?: string;
        BACKBLAZE_APP_KEY_ID?: string;
        BACKBLAZE_APP_KEY?: string;
        BACKBLAZE_BUCKET_ID?: string;
        BACKBLAZE_BUCKET_NAME?: string;
        BACKBLAZE_DOWNLOAD_URL?: string;
    };
}

export function createStorageRouter(deps: StorageRouterDeps) {
    const { getStorageProvider, env } = deps;

    const app = new Hono();

    app.get('/health', async (c) => {
        try {
            const storage = getStorageProvider();
            const isHealthy = await storage.health();

            // Debug info
            console.log('[STORAGE HEALTH] Provider type:', env.STORAGE_PROVIDER);
            console.log('[STORAGE HEALTH] B2 App Key ID:', env.BACKBLAZE_APP_KEY_ID ? 'Set' : 'Not set');
            console.log('[STORAGE HEALTH] B2 App Key:', env.BACKBLAZE_APP_KEY ? 'Set' : 'Not set');
            console.log('[STORAGE HEALTH] B2 Bucket ID:', env.BACKBLAZE_BUCKET_ID ? 'Set' : 'Not set');
            console.log('[STORAGE HEALTH] B2 Bucket Name:', env.BACKBLAZE_BUCKET_NAME ? 'Set' : 'Not set');
            console.log('[STORAGE HEALTH] B2 Download URL:', env.BACKBLAZE_DOWNLOAD_URL ? 'Set' : 'Not set');

            return c.json({ ok: true, healthy: isHealthy }, 200);
        } catch (error) {
            console.error('[API] Storage health check error:', error);
            return c.json(
                { ok: false, error: error instanceof Error ? error.message : 'Storage health check failed' },
                500
            );
        }
    });

    return app;
}
