import { S3Client } from '@aws-sdk/client-s3';

export type R2Credentials = {
    accessKeyId: string;
    secretAccessKey: string;
};

/** Read one complete R2 key pair. Private storage reuses the public pair only
 * when neither private override is set; a partial override fails closed. */
export function readR2Credentials(
    scope: 'public' | 'private',
    env: NodeJS.ProcessEnv = process.env,
): R2Credentials | null {
    const accessKeyId = (scope === 'private'
        ? env.CLOUDFLARE_R2_PRIVATE_ACCESS_KEY_ID
        : env.CLOUDFLARE_R2_ACCESS_KEY_ID)?.trim() || '';
    const secretAccessKey = (scope === 'private'
        ? env.CLOUDFLARE_R2_PRIVATE_SECRET_ACCESS_KEY
        : env.CLOUDFLARE_R2_SECRET_ACCESS_KEY)?.trim() || '';

    if (scope === 'private' && !accessKeyId && !secretAccessKey) {
        return readR2Credentials('public', env);
    }

    return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : null;
}

export function createR2S3Client(accountId: string, credentials: R2Credentials): S3Client {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId.trim()}.r2.cloudflarestorage.com`,
        credentials,
        forcePathStyle: false,
    });
}
