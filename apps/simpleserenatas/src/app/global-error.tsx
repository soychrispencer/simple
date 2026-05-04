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
        console.error('[simpleserenatas] Global error:', error);
    }, [error]);

    return (
        <html lang="es-CL">
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
                        background: 'rgb(11, 11, 11)',
                        color: 'rgb(245, 245, 245)',
                    }}
                >
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Algo salió muy mal
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: 'rgb(160, 160, 160)', marginBottom: '2rem', maxWidth: '24rem' }}>
                        Ocurrió un error inesperado. Si el problema persiste, contáctanos.
                    </p>
                    <button
                        type="button"
                        onClick={reset}
                        style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: '0.75rem',
                            background: 'rgb(225, 29, 72)',
                            color: 'rgb(255, 255, 255)',
                            border: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Reintentar
                    </button>
                    {error.digest ? (
                        <p style={{ marginTop: '1.5rem', fontSize: '0.625rem', fontFamily: 'monospace', color: 'rgb(102, 102, 102)' }}>
                            ref: {error.digest}
                        </p>
                    ) : null}
                </div>
            </body>
        </html>
    );
}
