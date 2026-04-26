import type { StorageProvider } from '@simple/config';
import { BackblazeB2Provider } from './backblaze-b2';
import { BackblazeS3Provider } from './backblaze-s3';
import { CloudflareR2Provider } from './cloudflare-r2';
import { LocalStorageProvider } from './local';

export function createStorageProvider(): StorageProvider {
    const storageType = process.env.STORAGE_PROVIDER || (process.env.NODE_ENV === 'development' ? 'local' : 'cloudflare-r2');

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
            throw new Error(
                'Missing required Cloudflare R2 environment variables: ' +
                'CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, ' +
                'CLOUDFLARE_R2_BUCKET_NAME, CLOUDFLARE_R2_PUBLIC_URL. ' +
                'Para development puedes usar STORAGE_PROVIDER=local.'
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
            throw new Error(
                'Missing required Backblaze B2 environment variables: ' +
                'BACKBLAZE_APP_KEY_ID, BACKBLAZE_APP_KEY, BACKBLAZE_BUCKET_ID, BACKBLAZE_BUCKET_NAME, BACKBLAZE_DOWNLOAD_URL. ' +
                'Para development puedes usar STORAGE_PROVIDER=local y opcionalmente LOCAL_STORAGE_URL.'
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
            throw new Error(
                'Missing required Backblaze S3 environment variables: ' +
                'BACKBLAZE_S3_ENDPOINT, BACKBLAZE_S3_ACCESS_KEY, BACKBLAZE_S3_SECRET_KEY, BACKBLAZE_BUCKET_NAME, BACKBLAZE_DOWNLOAD_URL'
            );
        }

        return new BackblazeS3Provider(endpoint, region, accessKey, secretKey, bucketName, downloadUrl);
    }

    throw new Error(`Unknown storage provider: ${storageType}. Valid options: local, cloudflare-r2, backblaze-b2, backblaze-s3`);
}

let storageProviderInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
    if (!storageProviderInstance) {
        storageProviderInstance = createStorageProvider();
    }
    return storageProviderInstance;
}
