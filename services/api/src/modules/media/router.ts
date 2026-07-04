import { Hono } from 'hono';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@simple/logger';
import { readUploadBuffer } from '../../storage-providers/file-buffer.js';
import { optimizeImageForStorage, type ImageUploadPurpose } from './image-optimize.js';

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
    getS3ClientForUrl: (url: string) => { client: any; bucketName: string };
    isStorageUrl: (url: string) => boolean;
    extractStorageObjectKey: (url: string) => string | null;
    env: {
        CLOUDFLARE_R2_BUCKET_NAME?: string;
        STORAGE_PROVIDER?: string;
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
        getS3ClientForUrl,
        isStorageUrl,
        extractStorageObjectKey,
        env,
    } = deps;

    const app = new Hono();

    // Proxy para medios en Cloudflare R2 (cuando la URL no es pública directa)
    app.get('/proxy', async (c) => {
        const src = asString(c.req.query('src'));
        if (!src) {
            return c.json({ ok: false, error: 'Falta src.' }, 400);
        }

        if (!isStorageUrl(src)) {
            return c.json({ ok: false, error: 'Origen no soportado. Solo almacenamiento Simple (R2).' }, 400);
        }

        // Get the appropriate S3 client and bucket for this URL
        const { client, bucketName } = getS3ClientForUrl(src);
        
        if (!client) {
            return c.json({ 
                ok: false, 
                error: 'El proxy de medios no está configurado para este tipo de almacenamiento.' 
            }, 503);
        }

        const key = extractStorageObjectKey(src);
        if (!key) {
            return c.json({ ok: false, error: 'No pudimos resolver el archivo.' }, 404);
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

    // Subir archivos (requiere autenticación) — 50MB limit para videos
    app.post('/upload', bodyLimit({ limit: 50 * 1024 * 1024 }), requireVerifiedSession, async (c) => {
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
            const purposeRaw = asString(formData.get('purpose'));
            const imagePurpose: ImageUploadPurpose =
                purposeRaw === 'avatar' ? 'avatar'
                : purposeRaw === 'logo' ? 'logo'
                : purposeRaw === 'cover' ? 'cover'
                : 'default';

            logDebug(`[UPLOAD META] file: ${file ? (file.name || 'blob') : 'null'}, type: ${fileType}, listingId: ${listingId}`);

            if (!file) return c.json({ ok: false, error: 'No se envió ningún archivo.' }, 400);
            if (!fileType || !['image', 'video', 'document'].includes(fileType)) {
                return c.json({ ok: false, error: 'Tipo de archivo inválido.' }, 400);
            }

            // Validar tamaño máximo según tipo
            const MAX_VIDEO_SIZE_MB = 50; // 50MB máximo para videos de 30 seg
            const MAX_IMAGE_SIZE_MB = 10; // 10MB para imágenes
            const MAX_DOCUMENT_SIZE_MB = 20; // 20MB para documentos
            
            const fileSizeMB = (file.size || 0) / (1024 * 1024);
            
            if (fileType === 'video' && fileSizeMB > MAX_VIDEO_SIZE_MB) {
                return c.json({ 
                    ok: false, 
                    error: `Video demasiado grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_VIDEO_SIZE_MB}MB para videos de máximo 30 segundos.` 
                }, 400);
            }
            if (fileType === 'image' && fileSizeMB > MAX_IMAGE_SIZE_MB) {
                return c.json({ 
                    ok: false, 
                    error: `Imagen demasiado grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_IMAGE_SIZE_MB}MB.` 
                }, 400);
            }
            if (fileType === 'document' && fileSizeMB > MAX_DOCUMENT_SIZE_MB) {
                return c.json({ 
                    ok: false, 
                    error: `Documento demasiado grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_DOCUMENT_SIZE_MB}MB.` 
                }, 400);
            }

            logDebug(`[UPLOAD STORAGE START] Provider initialization...`);
            const storage = getStorageProvider();

            let uploadFile: Blob | File = file;
            let uploadFileName = file.name || 'unnamed-file';
            let uploadMimeType = file.type || 'application/octet-stream';

            if (fileType === 'image') {
                const sourceBuffer = await readUploadBuffer(file);
                const optimized = await optimizeImageForStorage(sourceBuffer, imagePurpose, uploadFileName);
                uploadFile = new Blob([new Uint8Array(optimized.buffer)], { type: optimized.mimeType });
                uploadFileName = optimized.fileName;
                uploadMimeType = optimized.mimeType;
            }

            logDebug(`[UPLOAD CALL] Calling storage.upload...`);
            const result = await storage.upload({
                file: uploadFile,
                fileName: uploadFileName,
                mimeType: uploadMimeType,
                fileType: fileType as 'image' | 'video' | 'document',
                userId: user.id,
                listingId: listingId || undefined,
            });

            logDebug(`[UPLOAD SUCCESS] Result: ${JSON.stringify(result)}`);
            // Medios sensibles (documentos privados, etc.): preferir servir vía GET /api/media/proxy?src=<url>
            // en lugar de exponer la URL pública del bucket directamente al cliente.
            return c.json({ ok: true, result }, 200);
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : '';
            logDebug(`[UPLOAD ERROR] ${errMsg}\nStack: ${stack}`);
            console.error('[API] Upload error:', error);

            const isConfigError =
                /faltan variables|Missing required|Unknown storage provider/i.test(errMsg);
            const status = isConfigError ? 503 : 500;
            const clientMessage = isConfigError
                ? `${errMsg} En desarrollo local puedes definir STORAGE_PROVIDER=local en services/api/.env.local.`
                : errMsg || 'No pudimos subir el archivo.';

            return c.json({ ok: false, error: clientMessage }, status);
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
        CLOUDFLARE_R2_BUCKET_NAME?: string;
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
            logger.info('[STORAGE HEALTH] provider configuration', {
                provider: env.STORAGE_PROVIDER,
                r2Bucket: env.CLOUDFLARE_R2_BUCKET_NAME ? 'Set' : 'Not set',
            });

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
