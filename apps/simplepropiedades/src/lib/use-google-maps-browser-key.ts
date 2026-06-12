'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@simple/config';

let cachedKey: string | null | undefined;

function envBrowserKey(): string {
    return (
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
        || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        || ''
    ).trim();
}

/**
 * Clave de Maps para Places en el navegador.
 * Usa NEXT_PUBLIC_* si existen; si no, la pide a la API (misma sesión / same-origin).
 */
export function useGoogleMapsBrowserKey(): string | undefined {
    const [key, setKey] = useState<string | undefined>(() => envBrowserKey() || undefined);

    useEffect(() => {
        const fromEnv = envBrowserKey();
        if (fromEnv) {
            setKey(fromEnv);
            return;
        }

        if (cachedKey !== undefined) {
            setKey(cachedKey || undefined);
            return;
        }

        const base = API_BASE.replace(/\/+$/, '');
        let active = true;
        void fetch(`${base}/api/public/maps-browser-key`, { credentials: 'include' })
            .then((response) => response.json().catch(() => null))
            .then((data: { ok?: boolean; key?: string } | null) => {
                if (!active) return;
                const resolved = data?.ok && data.key?.trim() ? data.key.trim() : null;
                cachedKey = resolved;
                setKey(resolved || undefined);
            })
            .catch(() => {
                if (!active) return;
                cachedKey = null;
                setKey(undefined);
            });

        return () => {
            active = false;
        };
    }, []);

    return key;
}
