import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '@simple/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readUploadBuffer } from './file-buffer.js';
import { createPrivateMediaUrl } from '../modules/listings/media-delivery.js';

function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, '') || 'file';
}

/**
 * Cloudflare R2 Storage Provider
 * Compatible con S3 API, más barato y mejor integración con Cloudflare Workers/Images
 */
export class CloudflareR2Provider implements StorageProvider {
    private publicClient: S3Client;
    private privateClient: S3Client | null;
    private bucketName: string;
    private privateBucketName: string | null;
    private publicUrl: string;
    private workerUrl: string; // URL del worker de overlays

    constructor(
        accountId: string,
        accessKeyId: string,
        secretAccessKey: string,
        bucketName: string,
        publicUrl: string,
        workerUrl: string,
        privateBucketName?: string,
        privateAccessKeyId?: string,
        privateSecretAccessKey?: string,
        privateCredentialsConfigured = Boolean(privateAccessKeyId || privateSecretAccessKey),
    ) {
        this.bucketName = bucketName.trim();
        this.privateBucketName = privateBucketName?.trim() || null;
        if (this.privateBucketName && this.privateBucketName === this.bucketName) {
            throw new Error('CLOUDFLARE_R2_PRIVATE_BUCKET_NAME debe ser distinto de CLOUDFLARE_R2_BUCKET_NAME para proteger los adjuntos privados.');
        }

        const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

        this.publicClient = new S3Client({
            region: 'auto', // R2 no usa regiones
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const privateAccess = privateAccessKeyId?.trim() || '';
        const privateSecret = privateSecretAccessKey?.trim() || '';
        if (privateCredentialsConfigured) {
            this.privateClient = privateAccess && privateSecret
                ? new S3Client({
                    region: 'auto',
                    endpoint,
                    credentials: { accessKeyId: privateAccess, secretAccessKey: privateSecret },
                })
                : null;
        } else {
            // Backward-compatible fallback for existing deployments.
            this.privateClient = this.publicClient;
        }

        this.publicUrl = publicUrl.trim().replace(/\/$/, ''); // Remove trailing slash
        this.workerUrl = workerUrl.replace(/\/$/, '');
    }

    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        const { file, fileName, mimeType, userId, listingId } = input;
        if (input.isPrivate && (!this.privateBucketName || !this.privateClient)) {
            throw new Error('Faltan la configuración del bucket o las credenciales R2 privadas para guardar adjuntos.');
        }
        const safeFileName = sanitizeFileName(fileName || 'file');
        
        // Generate storage key
        const key = input.isPrivate
            ? `attachments/${userId}/${Date.now()}_${safeFileName}`
            : listingId
            ? `listings/${listingId}/${Date.now()}_${safeFileName}`
            : `uploads/${userId}/${Date.now()}_${safeFileName}`;
        const bucketName = input.isPrivate ? this.privateBucketName! : this.bucketName;
        
        try {
            const buffer = await readUploadBuffer(file);
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
                Metadata: {
                    userId,
                    ...(listingId && { listingId }),
                },
            });

            await (input.isPrivate ? this.privateClient! : this.publicClient).send(command);

            const now = Date.now();
            
            return {
                fileId: input.isPrivate ? `__private_r2__/${key}` : key,
                url: input.isPrivate ? createPrivateMediaUrl('r2', key) : `${this.publicUrl}/${key}`,
                publicUrl: input.isPrivate ? createPrivateMediaUrl('r2', key) : `${this.publicUrl}/${key}`,
                fileName: safeFileName,
                mimeType,
                sizeBytes: buffer.length,
                uploadedAt: now,
            };
        } catch (error) {
            console.error('[R2Storage] Upload error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`No pudimos subir el archivo a R2: ${message}`, { cause: error });
        }
    }

    async delete(fileId: string): Promise<void> {
        try {
            const isPrivate = fileId.startsWith('__private_r2__/');
            if (fileId.startsWith('__private_local__/')) return;
            if (isPrivate && (!this.privateBucketName || !this.privateClient)) {
                throw new Error('Falta la configuración R2 privada para eliminar este adjunto.');
            }
            const key = isPrivate ? fileId.slice('__private_r2__/'.length) : fileId;
            const command = new DeleteObjectCommand({
                Bucket: isPrivate ? this.privateBucketName! : this.bucketName,
                Key: key,
            });

            await (isPrivate ? this.privateClient! : this.publicClient).send(command);
        } catch (error) {
            console.error('[R2Storage] Delete error:', error);
            throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
        }
    }

    /**
     * Get a public URL for a file (implements StorageProvider interface)
     */
    getUrl(key: string): string {
        return this.getPublicUrl(key);
    }

    /**
     * Health check - verify storage is accessible
     */
    async health(): Promise<boolean> {
        try {
            // Try to get bucket info
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: '.health-check', // Try to head a non-existent object
            });
            await this.publicClient.send(command);
            return true;
        } catch (error: any) {
            // 404 is expected (object doesn't exist), but connection worked
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return true;
            }
            console.error('[R2Storage] Health check failed:', error);
            return false;
        }
    }

    /**
     * Genera URL para la imagen con overlay de Instagram
     * Usa el Cloudflare Worker para componer la imagen
     */
    generateInstagramOverlayUrl(
        imageKey: string,
        variant: 'essential-watermark' | 'professional-centered' | 'signature-complete' | 'property-conversion',
        data: {
            title?: string;
            price?: string;
            location?: string;
            highlights?: string[];
            badges?: string[];
            brand?: string;
        }
    ): string {
        const params = new URLSearchParams({
            image: imageKey,
            variant,
            data: JSON.stringify(data),
        });
        
        return `${this.workerUrl}/overlay?${params.toString()}`;
    }

    /**
     * URL directa a la imagen sin procesar
     */
    getPublicUrl(key: string): string {
        return `${this.publicUrl}/${key}`;
    }

    /**
     * URL optimizada con Cloudflare Images
     */
    getOptimizedUrl(key: string, options?: {
        width?: number;
        height?: number;
        format?: 'webp' | 'avif' | 'jpeg';
        quality?: number;
    }): string {
        // Si tenemos Cloudflare Images configurado
        if (process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID) {
            const imageId = key; // En Images, el key es el image ID
            const variant = options ? 
                `w=${options.width || ''},h=${options.height || ''},q=${options.quality || 85},f=${options.format || 'webp'}` :
                'public';
            
            return `https://imagedelivery.net/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/${imageId}/${variant}`;
        }
        
        // Fallback a URL directa de R2
        return this.getPublicUrl(key);
    }
}
