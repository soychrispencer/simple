import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '@simple/logger';
import { isCloudflareR2Url, parsePrivateMediaUrl } from '../listings/media-delivery.js';
import { createR2S3Client, readR2Credentials } from '../../storage-providers/r2-config.js';

let r2S3Client: S3Client | null = null;
let privateR2S3Client: S3Client | null = null;

export function getR2S3Client(): S3Client | null {
    if (r2S3Client) return r2S3Client;

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
    const credentials = readR2Credentials('public');

    if (!accountId || !credentials) {
        logger.warn('[MediaProxy] R2 credentials not configured');
        return null;
    }

    r2S3Client = createR2S3Client(accountId, credentials);

    return r2S3Client;
}

export function getPrivateR2S3Client(): S3Client | null {
    const privateAccess = process.env.CLOUDFLARE_R2_PRIVATE_ACCESS_KEY_ID?.trim();
    const privateSecret = process.env.CLOUDFLARE_R2_PRIVATE_SECRET_ACCESS_KEY?.trim();
    if (!privateAccess && !privateSecret) return getR2S3Client();
    if (!privateAccess || !privateSecret) {
        logger.warn('[MediaProxy] R2 private credentials are incomplete');
        return null;
    }
    if (privateR2S3Client) return privateR2S3Client;

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
    const credentials = readR2Credentials('private');
    if (!accountId || !credentials) {
        logger.warn('[MediaProxy] R2 private credentials not configured');
        return null;
    }

    privateR2S3Client = createR2S3Client(accountId, credentials);
    return privateR2S3Client;
}

export function getS3ClientForUrl(url: string): { client: S3Client | null; bucketName: string } {
    const privateMedia = parsePrivateMediaUrl(url);
    if (privateMedia?.storage === 'r2') {
        return {
            client: getPrivateR2S3Client(),
            bucketName: process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME || '',
        };
    }
    if (isCloudflareR2Url(url)) {
        return {
            client: getR2S3Client(),
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media',
        };
    }
    return { client: null, bucketName: '' };
}

export function getMediaProxyS3Client(): S3Client | null {
    return getR2S3Client();
}
