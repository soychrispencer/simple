import { getStorageProvider } from '../../storage-providers/index.js';
import {
    extractR2ObjectKey,
    isCloudflareR2Url,
    isOwnedStorageUrl,
} from '../listings/media-delivery.js';

function extractLocalStorageKey(url: string): string | null {
    const base = (process.env.LOCAL_STORAGE_URL || 'http://localhost:4000/uploads').replace(/\/+$/, '');
    if (!url.startsWith(base)) return null;
    const key = url.slice(base.length).replace(/^\/+/, '');
    return key || null;
}

/** Clave de objeto en nuestro storage (R2 o local). Ignora URLs externas. */
export function extractOwnedMediaKey(url: string): string | null {
    if (!isOwnedStorageUrl(url)) return null;
    if (isCloudflareR2Url(url)) {
        const key = extractR2ObjectKey(url);
        return key || null;
    }
    return extractLocalStorageKey(url);
}

export { isOwnedStorageUrl };

/** Borra un objeto previamente subido a R2/local. Ignora URLs externas (p. ej. Google). */
export async function deleteStoredMediaByUrl(url: string | null | undefined): Promise<void> {
    const key = url ? extractOwnedMediaKey(url) : null;
    if (!key) return;

    try {
        await getStorageProvider().delete(key);
    } catch (error) {
        console.warn('[storage] No se pudo eliminar archivo:', key, error);
    }
}

/** Elimina el objeto anterior cuando una URL de media propia es reemplazada o borrada. */
export async function cleanupReplacedMediaUrl(
    previous: string | null | undefined,
    next: string | null | undefined,
): Promise<void> {
    if (previous && previous !== next) {
        await deleteStoredMediaByUrl(previous);
    }
}

export async function deleteStoredMediaUrls(urls: Iterable<string>): Promise<void> {
    const unique = [...new Set([...urls].filter(Boolean))];
    await Promise.allSettled(unique.map((url) => deleteStoredMediaByUrl(url)));
}

export function diffRemovedMediaUrls(previous: string[], next: string[]): string[] {
    const nextSet = new Set(next);
    return previous.filter((url) => url && !nextSet.has(url));
}
