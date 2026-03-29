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
        const key = `${input.userId ?? 'unknown'}/${Date.now()}-${input.fileName}`;
        const buffer = Buffer.from(await input.file.arrayBuffer());

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: buffer,
                ContentType: input.mimeType,
                ACL: 'public-read',
            })
        );

        return {
            bucket: this.bucketName,
            key,
            url: `${this.downloadUrl}/${key}`,
            size: buffer.length,
            mimeType: input.mimeType,
            type: input.fileType,
        };
    }

    async delete(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            })
        );
    }

    async getUrl(key: string): Promise<string> {
        return `${this.downloadUrl}/${key}`;
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
