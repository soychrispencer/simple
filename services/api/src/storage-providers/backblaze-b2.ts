import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '@simple/config';

export class BackblazeB2Provider implements StorageProvider {
    private appKeyId: string;
    private appKey: string;
    private bucketId: string;
    private bucketName: string;
    private downloadUrl: string;
    private authToken: string | null = null;
    private apiUrl: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(
        appKeyId: string,
        appKey: string,
        bucketId: string,
        bucketName: string,
        downloadUrl: string
    ) {
        this.appKeyId = appKeyId;
        this.appKey = appKey;
        this.bucketId = bucketId;
        this.bucketName = bucketName;
        this.downloadUrl = downloadUrl;
    }

    private async authorize(): Promise<void> {
        // Check if token is still valid
        if (this.authToken && Date.now() < this.tokenExpiresAt) {
            return;
        }

        try {
            const credentials = Buffer.from(`${this.appKeyId}:${this.appKey}`).toString('base64');
            const response = await fetch('https://api001.backblazeb2.com/b2api/v3/auth/authorize', {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                },
            });

            if (!response.ok) {
                const responseText = await response.text();
                console.error('[B2Storage] Authorization failed:', response.status, response.statusText, responseText);
                throw new Error(`Authorization failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as {
                authorizationToken: string;
                apiUrl: string;
                downloadUrl: string;
            };

            this.authToken = data.authorizationToken;
            this.apiUrl = data.apiUrl;
            // Token expires in 24 hours, refresh after 23 hours
            this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
        } catch (error) {
            console.error('[B2Storage] Authorization error:', error);
            throw error;
        }
    }

    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        try {
            await this.authorize();

            if (!this.authToken || !this.apiUrl) {
                throw new Error('Failed to authorize with B2');
            }

            // Get upload URL
            const uploadUrlResponse = await fetch(`${this.apiUrl}/b2api/v3/b2_get_upload_url`, {
                method: 'POST',
                headers: {
                    'Authorization': this.authToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bucketId: this.bucketId,
                }),
            });

            if (!uploadUrlResponse.ok) {
                throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
            }

            const uploadUrlData = await uploadUrlResponse.json() as {
                uploadUrl: string;
                authorizationToken: string;
            };

            // Prepare file
            let fileBuffer: Buffer;
            if (Buffer.isBuffer(input.file)) {
                fileBuffer = input.file;
            } else {
                fileBuffer = Buffer.from(await (input.file as any).arrayBuffer());
            }

            // Build file path
            const now = Date.now();
            const fileName = `${input.userId}/${input.listingId || 'temp'}/${now}-${input.fileName}`;

            // Upload file
            const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': uploadUrlData.authorizationToken,
                    'X-Bz-File-Name': encodeURIComponent(fileName),
                    'X-Bz-Content-Type': input.mimeType,
                    'X-Bz-Content-Sha1': 'unverified',
                },
                body: new Uint8Array(fileBuffer),
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            const uploadResult = await uploadResponse.json() as {
                fileId: string;
                fileName: string;
                contentLength: number;
            };

            // Build public URL
            const publicUrl = `${this.downloadUrl}/file/${this.bucketName}/${fileName}`;

            return {
                fileId: uploadResult.fileId,
                url: publicUrl,
                publicUrl,
                fileName: input.fileName,
                mimeType: input.mimeType,
                sizeBytes: fileBuffer.length,
                uploadedAt: now,
            };
        } catch (error) {
            console.error('[B2Storage] Upload error:', error);
            throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async delete(fileId: string): Promise<void> {
        try {
            await this.authorize();

            if (!this.authToken || !this.apiUrl) {
                throw new Error('Failed to authorize with B2');
            }

            // Get file info first (required for delete)
            const getInfoResponse = await fetch(`${this.apiUrl}/b2api/v3/b2_get_file_info`, {
                method: 'POST',
                headers: {
                    'Authorization': this.authToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileId,
                }),
            });

            if (!getInfoResponse.ok) {
                throw new Error(`Failed to get file info: ${getInfoResponse.statusText}`);
            }

            const fileInfo = await getInfoResponse.json() as {
                fileName: string;
                uploadTimestamp: number;
            };

            // Delete file
            const deleteResponse = await fetch(`${this.apiUrl}/b2api/v3/b2_delete_file_version`, {
                method: 'POST',
                headers: {
                    'Authorization': this.authToken,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileId,
                    fileName: fileInfo.fileName,
                }),
            });

            if (!deleteResponse.ok) {
                throw new Error(`Delete failed: ${deleteResponse.statusText}`);
            }
        } catch (error) {
            console.error('[B2Storage] Delete error:', error);
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    getUrl(fileId: string): string {
        // Note: This returns a generic URL format. In production, track the actual file path.
        return `${this.downloadUrl}/${fileId}`;
    }

    async health(): Promise<boolean> {
        try {
            await this.authorize();
            return !!this.authToken;
        } catch {
            return false;
        }
    }
}
