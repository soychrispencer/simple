'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[simpleagenda] Global error:', error);
    }, [error]);

    return (
        <html lang="es">
            <body>
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        background: '#0b0b0b',
                        color: '#f5f5f5',
                    }}
                >
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Algo salió muy mal
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#a0a0a0', marginBottom: '2rem', maxWidth: '24rem' }}>
                        Ocurrió un error inesperado. Si el problema persiste, contáctanos.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: '0.75rem',
                            background: '#0d9488',
                            color: '#fff',
                            border: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Reintentar
                    </button>
                    {error.digest ? (
                        <p style={{ marginTop: '1.5rem', fontSize: '0.625rem', fontFamily: 'monospace', color: '#666' }}>
                            ref: {error.digest}
                        </p>
                    ) : null}
                </div>
            </body>
        </html>
    );
}
