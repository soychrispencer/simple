import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '@simple/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 Storage Provider
 * Compatible con S3 API, más barato y mejor integración con Cloudflare Workers/Images
 */
export class CloudflareR2Provider implements StorageProvider {
    private client: S3Client;
    private bucketName: string;
    private publicUrl: string;
    private workerUrl: string; // URL del worker de overlays

    constructor(
        accountId: string,
        accessKeyId: string,
        secretAccessKey: string,
        bucketName: string,
        publicUrl: string,
        workerUrl: string
    ) {
        // R2 usa endpoint específico por account ID
        const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
        
        this.client = new S3Client({
            region: 'auto', // R2 no usa regiones
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        
        this.bucketName = bucketName;
        this.publicUrl = publicUrl.replace(/\/$/, ''); // Remove trailing slash
        this.workerUrl = workerUrl.replace(/\/$/, '');
    }

    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        const { file, fileName, mimeType, userId, listingId } = input;
        
        // Generate storage key
        const key = listingId 
            ? `listings/${listingId}/${Date.now()}_${fileName}`
            : `uploads/${userId}/${Date.now()}_${fileName}`;
        
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file,
                ContentType: mimeType,
                Metadata: {
                    userId,
                    ...(listingId && { listingId }),
                },
            });

            await this.client.send(command);

            const now = Date.now();
            
            return {
                fileId: key,
                url: `${this.publicUrl}/${key}`,
                publicUrl: `${this.publicUrl}/${key}`,
                fileName,
                mimeType,
                sizeBytes: file.length || file.byteLength || 0,
                uploadedAt: now,
            };
        } catch (error) {
            console.error('[R2Storage] Upload error:', error);
            throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async delete(fileId: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: fileId,
            });

            await this.client.send(command);
        } catch (error) {
            console.error('[R2Storage] Delete error:', error);
            throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            await this.client.send(command);
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
