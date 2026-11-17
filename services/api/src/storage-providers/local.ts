import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider, StorageUploadInput, StorageUploadResult } from '@simple/config';
import { readUploadBuffer } from './file-buffer.js';
import { createPrivateMediaUrl } from '../modules/listings/media-delivery.js';

const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const DEFAULT_BASE_URL = process.env.LOCAL_STORAGE_URL?.replace(/\/+$/, '') || 'http://localhost:4000/uploads';

function sanitizeFileName(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, '');
}

function sanitizePathSegment(segment: string): string {
    return segment
        .replace(/[/\\]/g, '-')
        .replace(/\.\./g, '-')
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
        const userId = sanitizePathSegment(input.userId);
        const listingId = input.listingId ? sanitizePathSegment(input.listingId) : 'temp';
        const privateUploadDir = path.resolve(process.cwd(), 'private-uploads');
        const uploadRoot = input.isPrivate ? privateUploadDir : this.uploadDir;
        const folder = path.join(uploadRoot, userId, listingId);
        await fs.mkdir(folder, { recursive: true });

        const fileName = `${now}-${sanitizeFileName(input.fileName || 'file')}`;
        const storagePath = path.join(folder, fileName);

        const buffer = await readUploadBuffer(input.file);

        await fs.writeFile(storagePath, buffer);

        const relativePath = path.relative(uploadRoot, storagePath).split(path.sep).join('/');
        const fileUrl = input.isPrivate
            ? createPrivateMediaUrl('local', relativePath)
            : `${this.baseUrl}/${relativePath}`;

        return {
            fileId: input.isPrivate ? `__private_local__/${relativePath}` : relativePath,
            url: fileUrl,
            publicUrl: fileUrl,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: buffer.length,
            uploadedAt: now,
        };
    }

    async delete(fileId: string): Promise<void> {
        const isPrivateLocal = fileId.startsWith('__private_local__/');
        if (fileId.startsWith('__private_r2__/')) return;
        const uploadRoot = isPrivateLocal ? path.resolve(process.cwd(), 'private-uploads') : this.uploadDir;
        const relativePath = isPrivateLocal ? fileId.slice('__private_local__/'.length) : fileId;
        const fullPath = path.resolve(uploadRoot, ...relativePath.split(/[\\/]+/));
        if (!fullPath.startsWith(`${uploadRoot}${path.sep}`)) return;
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
