import type { StorageProvider } from '@simple/config';
import { BackblazeB2Provider } from './backblaze-b2';

export function createStorageProvider(): StorageProvider {
    const storageType = process.env.STORAGE_PROVIDER || 'backblaze-b2';

    if (storageType === 'backblaze-b2') {
        const appKeyId = process.env.BACKBLAZE_APP_KEY_ID;
        const appKey = process.env.BACKBLAZE_APP_KEY;
        const bucketId = process.env.BACKBLAZE_BUCKET_ID;
        const bucketName = process.env.BACKBLAZE_BUCKET_NAME;
        const downloadUrl = process.env.BACKBLAZE_DOWNLOAD_URL;

        if (!appKeyId || !appKey || !bucketId || !bucketName || !downloadUrl) {
            throw new Error(
                'Missing required Backblaze B2 environment variables: ' +
                'BACKBLAZE_APP_KEY_ID, BACKBLAZE_APP_KEY, BACKBLAZE_BUCKET_ID, BACKBLAZE_BUCKET_NAME, BACKBLAZE_DOWNLOAD_URL'
            );
        }

        return new BackblazeB2Provider(appKeyId, appKey, bucketId, bucketName, downloadUrl);
    }

    throw new Error(`Unknown storage provider: ${storageType}`);
}

let storageProviderInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
    if (!storageProviderInstance) {
        storageProviderInstance = createStorageProvider();
    }
    return storageProviderInstance;
}
