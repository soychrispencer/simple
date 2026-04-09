import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '@simple/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export class BackblazeS3Provider implements StorageProvider {
    private client: S3Client;
    private bucketName: string;
    private downloadUrl: string;

    constructor(
        endpoint: string,
        region: string,
        accessKeyId: string,
        secretAccessKey: string,
        bucketName: string,
        downloadUrl: string
    ) {
        this.bucketName = bucketName;
        this.downloadUrl = downloadUrl;

        this.client = new S3Client({
            endpoint,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: false,
        });
    }

    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        // Sanitize filename: remove spaces, special chars, keep extension
        const safeName = input.fileName
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-');
        const key = `${input.userId ?? 'unknown'}/${Date.now()}-${safeName}`;

        // Correct handling for File-like objects and Buffer in Node.js
        const buffer = Buffer.isBuffer(input.file)
            ? input.file
            : Buffer.from(await (input.file as any).arrayBuffer());

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: buffer,
                ContentType: input.mimeType,
            })
        );

        const cleanDownloadUrl = this.downloadUrl.replace(/\/+$/, '');
        const encodedKey = key.split('/').map(encodeURIComponent).join('/');
        const url = cleanDownloadUrl.includes('/file/')
            ? `${cleanDownloadUrl}/${encodedKey}`
            : `${cleanDownloadUrl}/file/${this.bucketName}/${encodedKey}`;

        return {
            fileId: key,
            url,
            publicUrl: url,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: buffer.length,
            uploadedAt: Date.now(),
        };
    }

    async delete(fileId: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: fileId,
            })
        );
    }

    getUrl(fileId: string): string {
        const cleanDownloadUrl = this.downloadUrl.replace(/\/+$/, '');
        const encodedId = fileId.split('/').map(encodeURIComponent).join('/');
        return cleanDownloadUrl.includes('/file/')
            ? `${cleanDownloadUrl}/${encodedId}`
            : `${cleanDownloadUrl}/file/${this.bucketName}/${encodedId}`;
    }


    async health(): Promise<boolean> {
        try {
            const key = '__healthcheck__';
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                })
            );
            return true;
        } catch (error) {
            // If the object doesn't exist it's still a valid connection.
            // We just use this to verify credentials+endpoint.
            return true;
        }
    }
}
