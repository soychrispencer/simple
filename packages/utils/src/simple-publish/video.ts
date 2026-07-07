/** Tamaño máximo del archivo ya optimizado en storage. */
export const PUBLISH_VIDEO_MAX_SIZE_MB = 50;
export const PUBLISH_VIDEO_MAX_BYTES = PUBLISH_VIDEO_MAX_SIZE_MB * 1024 * 1024;
/** Tamaño máximo del archivo original del teléfono (se comprime en servidor). */
export const PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB = 250;
export const PUBLISH_VIDEO_MAX_SOURCE_BYTES = PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB * 1024 * 1024;
/** Margen para el cuerpo multipart en proxy/API (sobre el original). */
export const PUBLISH_VIDEO_MAX_UPLOAD_BYTES = PUBLISH_VIDEO_MAX_SOURCE_BYTES + 4 * 1024 * 1024;
export const PUBLISH_VIDEO_MAX_DURATION_SECONDS = 60;

export type PublishVideoValidationResult =
    | { ok: true }
    | { ok: false; error: string };

function formatPublishVideoSizeMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
}

/** Valida duración y tamaño de origen antes de aceptar un clip en el wizard. */
export async function validatePublishVideoFile(file: File): Promise<PublishVideoValidationResult> {
    if (file.size > PUBLISH_VIDEO_MAX_SOURCE_BYTES) {
        return {
            ok: false,
            error: `El video pesa ${formatPublishVideoSizeMb(file.size)} MB. El máximo de origen es ${PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB} MB (se comprimirá automáticamente al subir).`,
        };
    }

    if (typeof document === 'undefined') {
        return { ok: true };
    }

    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';

        const finish = (result: PublishVideoValidationResult) => {
            URL.revokeObjectURL(objectUrl);
            resolve(result);
        };

        video.onloadedmetadata = () => {
            const duration = video.duration;
            if (Number.isFinite(duration) && duration > PUBLISH_VIDEO_MAX_DURATION_SECONDS + 0.25) {
                finish({
                    ok: false,
                    error: `El video dura ${Math.ceil(duration)} s. El máximo permitido es ${PUBLISH_VIDEO_MAX_DURATION_SECONDS} segundos.`,
                });
                return;
            }
            finish({ ok: true });
        };

        video.onerror = () => finish({ ok: true });
        video.src = objectUrl;
    });
}

/** YouTube o Vimeo — alternativa al clip subido en la misma publicación. */
export function isSupportedExternalVideoUrl(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return true;
    try {
        const url = new URL(trimmed);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();
        return host === 'youtube.com'
            || host === 'youtu.be'
            || host === 'm.youtube.com'
            || host === 'vimeo.com'
            || host.endsWith('.vimeo.com');
    } catch {
        return false;
    }
}

export function listingHasPublishVideo(input: {
    uploadPreviewUrl?: string | null;
    externalUrl?: string | null;
}): boolean {
    return Boolean(input.uploadPreviewUrl?.trim() || input.externalUrl?.trim());
}
