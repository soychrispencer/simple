'use client';

import { useEffect } from 'react';
import { PanelButton } from '../panel/panel-button';

export type GlobalErrorPageProps = {
    error: Error & { digest?: string };
    reset: () => void;
    appLabel?: string;
};

export function GlobalErrorPage({ error, reset, appLabel }: GlobalErrorPageProps) {
    useEffect(() => {
        console.error(appLabel ? `[${appLabel}] Global error:` : '[app] Global error:', error);
    }, [appLabel, error]);

    return (
        <div className="global-error-page">
            <div className="global-error-page__inner">
                <h1 className="global-error-page__title">Algo salió muy mal</h1>
                <p className="global-error-page__description">
                    Ocurrió un error inesperado. Si el problema persiste, contáctanos.
                </p>
                <PanelButton type="button" variant="accent" onClick={reset}>
                    Reintentar
                </PanelButton>
                {error.digest ? (
                    <p className="global-error-page__digest">ref: {error.digest}</p>
                ) : null}
            </div>
        </div>
    );
}
