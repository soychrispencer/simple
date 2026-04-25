'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ErrorView } from '@simple/ui';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[simpleadmin] Unhandled error:', error);
    }, [error]);

    return (
        <ErrorView
            title="Algo salió mal"
            description="Hubo un problema en el panel. Puedes reintentar o volver al inicio."
            errorDigest={error.digest}
            primaryAction={
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                >
                    Reintentar
                </button>
            }
            secondaryAction={
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                    Volver al inicio
                </Link>
            }
        />
    );
}
