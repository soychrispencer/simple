import type { StorageUploadResult } from '@simple/config';
import { API_BASE } from '@simple/config';

export type MediaUploadOptions = {
    fileType: 'image' | 'video' | 'document';
    listingId?: string;
    onProgress?: (progress: number) => void;
};

export async function uploadMediaFile(
    file: File,
    options: MediaUploadOptions
): Promise<{ ok: boolean; result?: StorageUploadResult; error?: string }> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', options.fileType);
        if (options.listingId) {
            formData.append('listingId', options.listingId);
        }

        const xhr = new XMLHttpRequest();

        // Track upload progress if callback provided
        if (options.onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    options.onProgress?.(progress);
                }
            });
        }

        return new Promise((resolve, reject) => {
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText) as {
                            ok: boolean;
                            result?: StorageUploadResult;
                            error?: string;
                        };
                        resolve(response);
                    } catch {
                        resolve({ ok: false, error: 'Invalid response from server' });
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText) as { error?: string };
                        resolve({ ok: false, error: error.error || `Upload failed: ${xhr.status}` });
                    } catch {
                        resolve({ ok: false, error: `Upload failed: ${xhr.status}` });
                    }
                }
            });

            xhr.addEventListener('error', () => {
                resolve({ ok: false, error: 'Network error' });
            });

            xhr.addEventListener('abort', () => {
                resolve({ ok: false, error: 'Upload cancelled' });
            });

            xhr.open('POST', `${API_BASE}/api/media/upload`);
            xhr.withCredentials = true;
            xhr.send(formData);
        });
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Upload multiple files in sequence
 */
export async function uploadMultipleMedia(
    files: File[],
    options: Omit<MediaUploadOptions, 'onProgress'>
): Promise<{
    ok: boolean;
    results?: StorageUploadResult[];
    errors?: Array<{ fileName: string; error: string }>;
}> {
    const results: StorageUploadResult[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
        const result = await uploadMediaFile(file, options);
        if (result.ok && result.result) {
            results.push(result.result);
        } else {
            errors.push({
                fileName: file.name,
                error: result.error || 'Unknown error',
            });
        }
    }

    return {
        ok: errors.length === 0,
        results: results.length > 0 ? results : undefined,
        errors: errors.length > 0 ? errors : undefined,
    };
}
