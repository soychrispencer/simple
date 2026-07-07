/** Tipos MIME y extensiones aceptadas para imágenes de perfil, logo y portada. */

export const IMAGE_FILE_ACCEPT = 'image/*,.heic,.heif,.HEIC,.HEIF';

/** Máximo del archivo original en KB (40 MB), alineado con `/api/media/upload`. */
export const RAW_IMAGE_MAX_SIZE_KB = 40 * 1024;

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif|tiff?)$/i;

export function isLikelyImageFile(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    return IMAGE_EXTENSION_RE.test(file.name);
}

export function formatImageMaxSizeKb(kb: number): string {
    if (kb >= 1024) {
        const mb = kb / 1024;
        return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
    }
    return `${kb} KB`;
}
