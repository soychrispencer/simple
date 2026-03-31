import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '@simple/config';

const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const DEFAULT_BASE_URL = process.env.LOCAL_STORAGE_URL?.replace(/\/+$/, '') || 'http://localhost:4000/uploads';

function sanitizeFileName(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, '');
}

export class LocalStorageProvider implements StorageProvider {
    private uploadDir: string;
    private baseUrl: string;

    constructor(uploadDir = DEFAULT_UPLOAD_DIR, baseUrl = DEFAULT_BASE_URL) {
        this.uploadDir = uploadDir;
        this.baseUrl = baseUrl;
    }

    async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
        const now = Date.now();
        const folder = path.join(this.uploadDir, input.userId, input.listingId || 'temp');
        await fs.mkdir(folder, { recursive: true });

        const fileName = `${now}-${sanitizeFileName(input.fileName || 'file')}`;
        const storagePath = path.join(folder, fileName);

        let buffer: Buffer;
        if (Buffer.isBuffer(input.file)) {
            buffer = input.file;
        } else if (typeof (input.file as any).arrayBuffer === 'function') {
            buffer = Buffer.from(await (input.file as any).arrayBuffer());
        } else if (input.file instanceof Uint8Array) {
            buffer = Buffer.from(input.file);
        } else {
            throw new Error('Unsupported file type for local storage');
        }

        await fs.writeFile(storagePath, buffer);

        const relativePath = path.relative(this.uploadDir, storagePath).split(path.sep).join('/');
        const fileUrl = `${this.baseUrl}/${relativePath}`;

        return {
            fileId: relativePath,
            url: fileUrl,
            publicUrl: fileUrl,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: buffer.length,
            uploadedAt: now,
        };
    }

    async delete(fileId: string): Promise<void> {
        const fullPath = path.join(this.uploadDir, fileId);
        await fs.unlink(fullPath).catch(() => undefined);
    }

    getUrl(fileId: string): string {
        const normalized = fileId.replace(/^\/+/, '');
        return `${this.baseUrl}/${normalized}`;
    }

    async health(): Promise<boolean> {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            return true;
        } catch {
            return false;
        }
    }
}
