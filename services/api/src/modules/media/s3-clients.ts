import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '@simple/logger';
import { isBackblazeUrl, isCloudflareR2Url } from '../listings/media-delivery.js';

let backblazeS3Client: S3Client | null = null;
let r2S3Client: S3Client | null = null;

export function getBackblazeS3Client(): S3Client | null {
    if (backblazeS3Client) return backblazeS3Client;

    const endpoint = process.env.BACKBLAZE_S3_ENDPOINT;
    const region = process.env.BACKBLAZE_S3_REGION;
    const accessKeyId = process.env.BACKBLAZE_S3_ACCESS_KEY;
    const secretAccessKey = process.env.BACKBLAZE_S3_SECRET_KEY;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
        logger.warn('[MediaProxy] Backblaze S3 credentials not configured');
        return null;
    }

    backblazeS3Client = new S3Client({
        endpoint,
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: false,
    });

    return backblazeS3Client;
}

export function getR2S3Client(): S3Client | null {
    if (r2S3Client) return r2S3Client;

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        logger.warn('[MediaProxy] R2 credentials not configured');
        return null;
    }

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    r2S3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: false,
    });

    return r2S3Client;
}

export function getS3ClientForUrl(url: string): { client: S3Client | null; bucketName: string } {
    if (isCloudflareR2Url(url)) {
        return {
            client: getR2S3Client(),
            bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media',
        };
    }
    if (isBackblazeUrl(url)) {
        return {
            client: getBackblazeS3Client(),
            bucketName: process.env.BACKBLAZE_BUCKET_NAME || 'simple-media',
        };
    }
    return { client: null, bucketName: '' };
}

/** Legacy: devuelve cualquier cliente S3 configurado. */
export function getMediaProxyS3Client(): S3Client | null {
    return getR2S3Client() || getBackblazeS3Client();
}
