'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@simple/config';
import {
    resolveGoogleMapsBrowserKey,
    resolveGoogleMapsBrowserKeyFromEnv,
} from './google-maps-browser-key-shared';

/** Solo se cachea una clave obtenida con éxito; los fallos de red se reintentan. */
let cachedKeySuccess: string | undefined;
let inflightFetch: Promise<string | undefined> | null = null;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function mapsBrowserKeyUrls(): string[] {
    const urls: string[] = [];
    const add = (url: string) => {
        const clean = url.trim();
        if (clean && !urls.includes(clean)) urls.push(clean);
    };

    add('/api/public/maps-browser-key');

    const base = API_BASE.replace(/\/+$/, '');
    if (base) {
        add(`${base}/api/public/maps-browser-key`);
    }

    if (typeof window !== 'undefined') {
        const internal = (process.env.API_INTERNAL_URL || '').replace(/\/+$/, '');
        if (internal) {
            add(`${internal}/api/public/maps-browser-key`);
        }
    }

    return urls;
}

async function fetchMapsBrowserKeyFromServer(): Promise<string | undefined> {
    if (cachedKeySuccess) return cachedKeySuccess;

    const fromEnv = resolveGoogleMapsBrowserKeyFromEnv();
    if (fromEnv) {
        cachedKeySuccess = fromEnv;
        return fromEnv;
    }

    if (inflightFetch) return inflightFetch;

    inflightFetch = (async () => {
        const urls = mapsBrowserKeyUrls();
        let attempt = 0;

        while (attempt < 6) {
            attempt += 1;

            for (const mapsKeyUrl of urls) {
                try {
                    const controller = new AbortController();
                    const timeout = window.setTimeout(() => controller.abort(), 20000);
                    const response = await fetch(mapsKeyUrl, {
                        credentials: 'include',
                        signal: controller.signal,
                    });
                    window.clearTimeout(timeout);

                    const data = await response.json().catch(() => null) as {
                        ok?: boolean;
                        key?: string;
                    } | null;

                    const resolved = data?.ok && data.key?.trim() ? data.key.trim() : '';
                    if (resolved) {
                        cachedKeySuccess = resolved;
                        return resolved;
                    }
                } catch {
                    // Siguiente URL o reintento
                }
            }

            if (attempt < 6) {
                await sleep(Math.min(500 * attempt, 3000));
            }
        }

        return undefined;
    })().finally(() => {
        inflightFetch = null;
    });

    return inflightFetch;
}

/**
 * Clave de Maps para Places en el navegador.
 * Usa NEXT_PUBLIC_* si existen; si no, la pide a GET /api/public/maps-browser-key.
 */
export function useGoogleMapsBrowserKey(): string | undefined {
    const [key, setKey] = useState<string | undefined>(() => (
        resolveGoogleMapsBrowserKey() || cachedKeySuccess
    ));

    useEffect(() => {
        const fromEnv = resolveGoogleMapsBrowserKeyFromEnv();
        if (fromEnv) {
            cachedKeySuccess = fromEnv;
            setKey(fromEnv);
            return;
        }

        if (cachedKeySuccess) {
            setKey(cachedKeySuccess);
            return;
        }

        let active = true;

        void fetchMapsBrowserKeyFromServer().then((resolved) => {
            if (!active) return;
            if (resolved) {
                setKey(resolved);
                return;
            }
            const envFallback = resolveGoogleMapsBrowserKeyFromEnv();
            setKey(envFallback || undefined);
        });

        return () => {
            active = false;
        };
    }, []);

    return key;
}
