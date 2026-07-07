import type { StorageUploadResult } from '@simple/config';
import { API_BASE } from '@simple/config';
import { PUBLISH_VIDEO_MAX_SIZE_MB, PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB } from './simple-publish/video.js';

export type MediaUploadOptions = {
    fileType: 'image' | 'video' | 'document';
    listingId?: string;
    /** `avatar` recorta a 512px; `logo` igual que avatar; `cover` a 16:9; el API convierte imágenes a WebP. */
    purpose?: 'avatar' | 'logo' | 'cover' | 'default';
    /** Llamado cuando los bytes ya se enviaron y el servidor procesa (p. ej. FFmpeg en videos). */
    onProcessing?: () => void;
    onProgress?: (progress: number) => void;
};

export type MediaUploadPurpose = NonNullable<MediaUploadOptions['purpose']>;

/**
 * Sube un archivo al endpoint unificado `/api/media/upload`.
 * Las imágenes se optimizan en servidor (WebP). Los videos de publicación se comprimen a MP4 vertical (H.264).
 */
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
        if (options.purpose) {
            formData.append('purpose', options.purpose);
        }

        const xhr = new XMLHttpRequest();

        if (options.onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    options.onProgress?.(progress);
                }
            });
        }

        if (options.onProcessing) {
            xhr.upload.addEventListener('loadend', () => {
                options.onProcessing?.();
            });
        }

        return new Promise((resolve) => {
            const tooLargeMessage = options.fileType === 'video'
                ? `El video es demasiado grande. Máximo ${PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB} MB de origen (se comprime a ${PUBLISH_VIDEO_MAX_SIZE_MB} MB).`
                : 'El archivo es demasiado grande para subir.';

            xhr.addEventListener('load', () => {
                if (xhr.status === 413) {
                    resolve({ ok: false, error: tooLargeMessage });
                    return;
                }
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
                resolve({
                    ok: false,
                    error: options.fileType === 'video'
                        ? `No se pudo subir el video. Revisa tu conexión o que no supere ${PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB} MB de origen.`
                        : 'Error de red al subir el archivo.',
                });
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

/** Sube logo, portada o avatar; el API convierte cualquier imagen soportada a WebP. */
export async function uploadBrandImage(
    file: File,
    purpose: Extract<MediaUploadPurpose, 'avatar' | 'logo' | 'cover'>,
): Promise<{ ok: boolean; url?: string; error?: string }> {
    const result = await uploadMediaFile(file, { fileType: 'image', purpose });
    const url = result.result?.publicUrl ?? result.result?.url;
    if (!result.ok || !url) {
        return { ok: false, error: result.error ?? 'No se pudo subir la imagen.' };
    }
    return { ok: true, url };
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
