import type { StorageProvider } from '@simple/config';
import { logger } from '@simple/logger';
import { BackblazeB2Provider } from './backblaze-b2';
import { BackblazeS3Provider } from './backblaze-s3';
import { CloudflareR2Provider } from './cloudflare-r2';
import { LocalStorageProvider } from './local';

function isDev(): boolean {
    return process.env.NODE_ENV !== 'production';
}

function useLocalDevFallback(reason: string): StorageProvider {
    logger.warn('[storage] Usando almacenamiento local en desarrollo', { reason });
    return new LocalStorageProvider();
}

function hasBackblazeS3Config(): boolean {
    return Boolean(
        process.env.BACKBLAZE_S3_ENDPOINT
        && process.env.BACKBLAZE_S3_ACCESS_KEY
        && process.env.BACKBLAZE_S3_SECRET_KEY
        && process.env.BACKBLAZE_BUCKET_NAME
        && process.env.BACKBLAZE_DOWNLOAD_URL
    );
}

function hasCloudflareR2Config(): boolean {
    return Boolean(
        process.env.CLOUDFLARE_R2_ACCOUNT_ID
        && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
        && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
        && process.env.CLOUDFLARE_R2_BUCKET_NAME
        && process.env.CLOUDFLARE_R2_PUBLIC_URL
    );
}

export function createStorageProvider(): StorageProvider {
    const storageType = process.env.STORAGE_PROVIDER || (isDev() ? 'local' : 'cloudflare-r2');

    if (storageType === 'local') {
        return new LocalStorageProvider();
    }

    // Cloudflare R2 (recomendado - más barato, mejor integración)
    if (storageType === 'cloudflare-r2' || storageType === 'r2') {
        const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
        const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
        const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
        const workerUrl = process.env.CLOUDFLARE_WORKER_URL || '';

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            if (isDev()) {
                return useLocalDevFallback('CLOUDFLARE_R2 sin credenciales completas');
            }
            throw new Error(
                'Faltan variables de Cloudflare R2: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, ' +
                'CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME, CLOUDFLARE_R2_PUBLIC_URL. ' +
                'En desarrollo usa STORAGE_PROVIDER=local.'
            );
        }

        return new CloudflareR2Provider(accountId, accessKeyId, secretAccessKey, bucketName, publicUrl, workerUrl);
    }

    if (storageType === 'backblaze-b2') {
        const appKeyId = process.env.BACKBLAZE_APP_KEY_ID;
        const appKey = process.env.BACKBLAZE_APP_KEY;
        const bucketId = process.env.BACKBLAZE_BUCKET_ID;
        const bucketName = process.env.BACKBLAZE_BUCKET_NAME;
        const downloadUrl = process.env.BACKBLAZE_DOWNLOAD_URL;

        if (!appKeyId || !appKey || !bucketId || !bucketName || !downloadUrl) {
            if (isDev()) {
                return useLocalDevFallback('backblaze-b2 sin credenciales completas');
            }
            throw new Error(
                'Faltan variables de Backblaze B2: BACKBLAZE_APP_KEY_ID, BACKBLAZE_APP_KEY, BACKBLAZE_BUCKET_ID, ' +
                'BACKBLAZE_BUCKET_NAME, BACKBLAZE_DOWNLOAD_URL. En desarrollo usa STORAGE_PROVIDER=local.'
            );
        }

        return new BackblazeB2Provider(appKeyId, appKey, bucketId, bucketName, downloadUrl);
    }

    if (storageType === 'backblaze-s3' || storageType === 's3') {
        const endpoint = process.env.BACKBLAZE_S3_ENDPOINT;
        const region = process.env.BACKBLAZE_S3_REGION || 'us-east-1';
        const accessKey = process.env.BACKBLAZE_S3_ACCESS_KEY;
        const secretKey = process.env.BACKBLAZE_S3_SECRET_KEY;
        const bucketName = process.env.BACKBLAZE_BUCKET_NAME;
        const downloadUrl = process.env.BACKBLAZE_DOWNLOAD_URL;

        if (!endpoint || !accessKey || !secretKey || !bucketName || !downloadUrl) {
            if (isDev()) {
                return useLocalDevFallback('backblaze-s3 sin credenciales completas');
            }
            throw new Error(
                'Faltan variables de Backblaze S3: BACKBLAZE_S3_ENDPOINT, BACKBLAZE_S3_ACCESS_KEY, ' +
                'BACKBLAZE_S3_SECRET_KEY, BACKBLAZE_BUCKET_NAME, BACKBLAZE_DOWNLOAD_URL'
            );
        }

        return new BackblazeS3Provider(endpoint, region, accessKey, secretKey, bucketName, downloadUrl);
    }

    throw new Error(`Unknown storage provider: ${storageType}. Valid options: local, cloudflare-r2, backblaze-b2, backblaze-s3`);
}

let storageProviderInstance: StorageProvider | null = null;

export function resetStorageProviderForTests(): void {
    storageProviderInstance = null;
}

export function getStorageProvider(): StorageProvider {
    if (!storageProviderInstance) {
        storageProviderInstance = createStorageProvider();
        if (isDev()) {
            const type = process.env.STORAGE_PROVIDER || 'local';
            if (type === 'cloudflare-r2' && !hasCloudflareR2Config()) {
                logger.warn('[storage] STORAGE_PROVIDER=cloudflare-r2 pero faltan credenciales; revisa .env.local');
            }
            if ((type === 'backblaze-s3' || type === 's3') && !hasBackblazeS3Config()) {
                logger.warn('[storage] STORAGE_PROVIDER=backblaze-s3 pero faltan credenciales; revisa .env.local');
            }
        }
    }
    return storageProviderInstance;
}
