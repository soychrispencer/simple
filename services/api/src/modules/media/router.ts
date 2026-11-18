import { Hono } from 'hono';
import type { Context } from 'hono';
import fs from 'node:fs/promises';
import path from 'node:path';
import { bodyLimit } from 'hono/body-limit';
import {
    PUBLISH_VIDEO_MAX_BYTES,
    PUBLISH_VIDEO_MAX_SIZE_MB,
    PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB,
    PUBLISH_VIDEO_MAX_UPLOAD_BYTES,
} from '@simple/utils';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@simple/logger';
import { readUploadBuffer } from '../../storage-providers/file-buffer.js';
import { extractOwnedMediaKey, toProtectedMediaUrl } from './stored-object.js';
import { parsePrivateMediaUrl } from '../listings/media-delivery.js';
import { optimizeImageForStorage, type ImageUploadPurpose } from './image-optimize.js';
import { optimizeVideoForStorage } from './video-optimize.js';

export interface MediaRouterDeps {
    authUser: (c: Context) => Promise<any>;
    requireVerifiedSession: (c: Context, next: () => Promise<void>) => Promise<Response | void>;
    asString: (v: any) => string;
    logDebug: (msg: string) => void;
    getListingById: (id: string) => Promise<{
        id: string;
        ownerId: string;
        accountId?: string | null;
        vertical: import('@simple/types').VerticalType;
        [key: string]: unknown;
    } | null>;
    canManageListing: (
        user: { id: string; role?: string },
        listing: { id: string; ownerId: string; accountId?: string | null; vertical: import('@simple/types').VerticalType; [key: string]: unknown },
    ) => Promise<boolean>;
    canAccessProxyMedia: (user: { id: string; role?: string }, src: string) => Promise<boolean>;
    getStorageProvider: () => {
        upload: (opts: {
            file: any;
            fileName: string;
            mimeType: string;
            fileType: 'image' | 'video' | 'document';
            userId: string;
            listingId?: string;
            isPrivate?: boolean;
        }) => Promise<any>;
        health: () => Promise<boolean>;
    };
    getMediaProxyS3Client: () => any;
    getS3ClientForUrl: (url: string) => { client: any; bucketName: string };
    isStorageUrl: (url: string) => boolean;
    extractStorageObjectKey: (url: string) => string | null;
    env: {
        CLOUDFLARE_R2_BUCKET_NAME?: string;
        CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?: string;
        STORAGE_PROVIDER?: string;
    };
}

export function createMediaRouter(deps: MediaRouterDeps) {
    const {
        authUser,
        requireVerifiedSession,
        asString,
        logDebug,
        getListingById,
        canManageListing,
        canAccessProxyMedia,
        getStorageProvider,
        getMediaProxyS3Client,
        getS3ClientForUrl,
        isStorageUrl,
        env,
    } = deps;

    const app = new Hono();

    // Proxy para medios en Cloudflare R2 (cuando la URL no es pública directa)
    app.get('/proxy', requireVerifiedSession, async (c) => {
        const user = await authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const src = asString(c.req.query('src'));
        if (!src) {
            return c.json({ ok: false, error: 'Falta src.' }, 400);
        }

        if (!isStorageUrl(src)) {
            return c.json({ ok: false, error: 'Origen no soportado. Solo almacenamiento Simple (R2).' }, 400);
        }

        // Get the appropriate S3 client and bucket for this URL
        const { client, bucketName } = getS3ClientForUrl(src);
        const storedKey = extractOwnedMediaKey(src);
        const privateMedia = parsePrivateMediaUrl(src);
        const key = privateMedia
            ? storedKey?.replace(/^__private_(?:local|r2)__\//, '') ?? null
            : storedKey;
        if (!key) {
            return c.json({ ok: false, error: 'No pudimos resolver el archivo.' }, 404);
        }
        if (privateMedia?.storage === 'r2' && (!env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME || !client)) {
            return c.json({ ok: false, error: 'El almacenamiento privado no está configurado en este servidor.' }, 503);
        }
        if (!await canAccessProxyMedia(user, src)) {
            return c.json({ ok: false, error: 'No tienes permiso para ver este archivo.' }, 403);
        }

        try {
            let body: Buffer;
            let contentType = 'application/octet-stream';
            if (bucketName) {
                if (!client) {
                    return c.json({ ok: false, error: 'El proxy de medios no está configurado para este tipo de almacenamiento.' }, 503);
                }
                const object = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
                body = object.Body ? Buffer.from(await object.Body.transformToByteArray()) : Buffer.alloc(0);
                contentType = object.ContentType || contentType;
            } else {
                const uploadRoot = path.resolve(
                    process.cwd(),
                    privateMedia?.storage === 'local' ? 'private-uploads' : 'uploads',
                );
                const filePath = path.resolve(uploadRoot, ...key.split(/[\\/]+/));
                if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
                    return c.json({ ok: false, error: 'No pudimos resolver el archivo.' }, 404);
                }
                body = await fs.readFile(filePath);
                const extension = path.extname(filePath).toLowerCase();
                contentType = extension === '.pdf' ? 'application/pdf'
                    : extension === '.webp' ? 'image/webp'
                    : extension === '.png' ? 'image/png'
                    : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg'
                    : extension === '.gif' ? 'image/gif'
                    : contentType;
            }
            return c.body(new Uint8Array(body), 200, {
                'Content-Type': contentType,
                'Cache-Control': 'private, no-store',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo descargar el archivo.';
            return c.json({ ok: false, error: message }, 404);
        }
    });

    // Subir archivos (requiere autenticación) — límite alineado con clip de publicación
    app.post('/upload', bodyLimit({ maxSize: PUBLISH_VIDEO_MAX_UPLOAD_BYTES }), requireVerifiedSession, async (c) => {
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
            const listingIdRaw = formData.get('listingId');
            const listingId = typeof listingIdRaw === 'string' ? listingIdRaw.trim() : '';
            const purposeRaw = asString(formData.get('purpose'));
            const privateMedia = fileType === 'document' || purposeRaw === 'private_attachment';
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
            if (listingId) {
                const listing = await getListingById(listingId);
                if (!listing) return c.json({ ok: false, error: 'Publicación no encontrada.' }, 404);
                if (!await canManageListing(user, listing)) {
                    return c.json({ ok: false, error: 'No tienes permiso para agregar archivos a esta publicación.' }, 403);
                }
            }

            // Validar tamaño máximo según tipo
            const MAX_VIDEO_SOURCE_SIZE_MB = PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB;
            const MAX_VIDEO_STORED_SIZE_MB = PUBLISH_VIDEO_MAX_SIZE_MB;
            const MAX_RAW_IMAGE_SIZE_MB = 40; // entrada cruda (cámara); se optimiza a WebP antes de guardar
            const MAX_STORED_IMAGE_SIZE_MB = 10; // límite del archivo ya optimizado en storage
            const MAX_DOCUMENT_SIZE_MB = 20; // 20MB para documentos
            
            const fileSizeMB = (file.size || 0) / (1024 * 1024);
            
            if (fileType === 'video' && fileSizeMB > MAX_VIDEO_SOURCE_SIZE_MB) {
                return c.json({ 
                    ok: false, 
                    error: `Video demasiado grande (${fileSizeMB.toFixed(1)}MB). Máximo de origen: ${MAX_VIDEO_SOURCE_SIZE_MB}MB. Se comprimirá automáticamente al subir.` 
                }, 400);
            }
            if (fileType === 'image' && fileSizeMB > MAX_RAW_IMAGE_SIZE_MB) {
                return c.json({ 
                    ok: false, 
                    error: `Imagen demasiado grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_RAW_IMAGE_SIZE_MB}MB antes de optimizar.` 
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
                const optimizedSizeMB = optimized.buffer.length / (1024 * 1024);
                if (optimizedSizeMB > MAX_STORED_IMAGE_SIZE_MB) {
                    return c.json({
                        ok: false,
                        error: `La imagen optimizada sigue siendo demasiado grande (${optimizedSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_STORED_IMAGE_SIZE_MB}MB.`,
                    }, 400);
                }
                uploadFile = new Blob([new Uint8Array(optimized.buffer)], { type: optimized.mimeType });
                uploadFileName = optimized.fileName;
                uploadMimeType = optimized.mimeType;
            }

            if (fileType === 'video') {
                logDebug('[UPLOAD VIDEO] Optimizing clip for reel storage...');
                const sourceBuffer = await readUploadBuffer(file);
                const optimized = await optimizeVideoForStorage(sourceBuffer, uploadFileName);
                const optimizedSizeMB = optimized.buffer.length / (1024 * 1024);
                if (optimized.buffer.length > PUBLISH_VIDEO_MAX_BYTES) {
                    return c.json({
                        ok: false,
                        error: `El video optimizado sigue siendo demasiado grande (${optimizedSizeMB.toFixed(1)}MB). Máximo permitido: ${MAX_VIDEO_STORED_SIZE_MB}MB.`,
                    }, 400);
                }
                uploadFile = new Blob([new Uint8Array(optimized.buffer)], { type: optimized.mimeType });
                uploadFileName = optimized.fileName;
                uploadMimeType = optimized.mimeType;
                logDebug(`[UPLOAD VIDEO] Optimized to ${optimizedSizeMB.toFixed(1)}MB`);
            }

            logDebug(`[UPLOAD CALL] Calling storage.upload...`);
            const result = await storage.upload({
                file: uploadFile,
                fileName: uploadFileName,
                mimeType: uploadMimeType,
                fileType: fileType as 'image' | 'video' | 'document',
                userId: user.id,
                listingId: listingId || undefined,
                isPrivate: privateMedia,
            });

            logDebug(`[UPLOAD SUCCESS] Result: ${JSON.stringify(result)}`);
            const storageUrl = asString(result?.publicUrl) || asString(result?.url);
            const protectedUrl = toProtectedMediaUrl(storageUrl);
            const returnedResult = privateMedia
                ? {
                    fileName: result?.fileName,
                    mimeType: result?.mimeType,
                    sizeBytes: result?.sizeBytes,
                    uploadedAt: result?.uploadedAt,
                    url: protectedUrl,
                    publicUrl: protectedUrl,
                }
                : result;
            return c.json({ ok: true, result: returnedResult }, 200);
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
