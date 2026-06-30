import type { StorageProvider } from '@simple/config';
import { logger } from '@simple/logger';
import { CloudflareR2Provider } from './cloudflare-r2.js';
import { LocalStorageProvider } from './local';

function isDev(): boolean {
    return process.env.NODE_ENV !== 'production';
}

function useLocalDevFallback(reason: string): StorageProvider {
    logger.warn('[storage] Usando almacenamiento local en desarrollo', { reason });
    return new LocalStorageProvider();
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

    throw new Error(
        `Unknown storage provider: ${storageType}. Valid options: local, cloudflare-r2 (o r2).`
    );
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
        }
    }
    return storageProviderInstance;
}
