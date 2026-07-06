'use client';

import { useEffect } from 'react';
import { ErrorView, ErrorHomeLink, ErrorRetryButton } from '@simple/ui/feedback';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[simpleplataforma] Unhandled error:', error);
    }, [error]);

    return (
        <ErrorView
            title="Algo salió mal"
            description="No pudimos cargar esta sección. Puedes reintentar o volver al inicio."
            errorDigest={error.digest}
            primaryAction={<ErrorRetryButton onClick={reset} />}
            secondaryAction={<ErrorHomeLink />}
        />
    );
}
