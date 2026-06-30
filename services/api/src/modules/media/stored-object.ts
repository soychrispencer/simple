import fs from 'node:fs';
import path from 'node:path';
import { getStorageProvider } from '../../storage-providers/index.js';
import {
    extractR2ObjectKey,
    isCloudflareR2Url,
    isOwnedStorageUrl,
} from '../listings/media-delivery.js';

function extractLocalStorageKey(url: string): string | null {
    const trimmed = url.trim();
    if (trimmed.startsWith('/uploads/')) {
        const key = trimmed.replace(/^\/uploads\//, '');
        return key || null;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.pathname.startsWith('/uploads/')) {
            const key = parsed.pathname.replace(/^\/uploads\//, '');
            return key || null;
        }
    } catch {
        // URL relativa o valor legacy sin protocolo
    }

    const base = (process.env.LOCAL_STORAGE_URL || 'http://localhost:4000/uploads').replace(/\/+$/, '');
    if (trimmed.startsWith(base)) {
        const key = trimmed.slice(base.length).replace(/^\/+/, '');
        return key || null;
    }

    return null;
}

/** Devuelve la URL solo si el archivo existe (local) o es externa/R2. Si falta en disco, null. */
export function resolveAccessibleStoredMediaUrl(url: string | null | undefined): string | null {
    const value = url?.trim();
    if (!value) return null;
    if (!isOwnedStorageUrl(value)) return value;
    if (isCloudflareR2Url(value)) return value;

    const key = extractLocalStorageKey(value);
    if (!key) return null;

    const diskPath = path.join(process.cwd(), 'uploads', ...key.split('/'));
    try {
        const stat = fs.statSync(diskPath);
        return stat.isFile() ? value : null;
    } catch {
        return null;
    }
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
