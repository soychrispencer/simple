'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@simple/config';

/** Solo se cachea una clave obtenida con éxito; los fallos de red se reintentan. */
let cachedKeySuccess: string | undefined;

function envBrowserKey(): string {
    return (
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
        || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        || ''
    ).trim();
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

/**
 * Clave de Maps para Places en el navegador.
 * Usa NEXT_PUBLIC_* si existen; si no, la pide a GET /api/public/maps-browser-key.
 */
export function useGoogleMapsBrowserKey(): string | undefined {
    const [key, setKey] = useState<string | undefined>(() => envBrowserKey() || cachedKeySuccess);

    useEffect(() => {
        const fromEnv = envBrowserKey();
        if (fromEnv) {
            setKey(fromEnv);
            return;
        }

        if (cachedKeySuccess) {
            setKey(cachedKeySuccess);
            return;
        }

        const base = API_BASE.replace(/\/+$/, '');
        let active = true;
        let attempt = 0;

        const load = async () => {
            while (active && attempt < 12) {
                attempt += 1;
                try {
                    const response = await fetch(`${base}/api/public/maps-browser-key`, { credentials: 'include' });
                    const data = await response.json().catch(() => null) as { ok?: boolean; key?: string } | null;
                    if (!active) return;
                    const resolved = data?.ok && data.key?.trim() ? data.key.trim() : '';
                    if (resolved) {
                        cachedKeySuccess = resolved;
                        setKey(resolved);
                        return;
                    }
                } catch {
                    // API aún no disponible en dev:all — reintentar
                }
                if (!active) return;
                await sleep(Math.min(400 * attempt, 2500));
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, []);

    return key;
}
