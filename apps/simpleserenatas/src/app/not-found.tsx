'use client';

import { ErrorView, ErrorHomeLink, ErrorSecondaryLink } from '@simple/ui/feedback';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La página que buscas no existe o fue removida."
            primaryAction={<ErrorHomeLink />}
            secondaryAction={<ErrorSecondaryLink href="/mariachis">Explorar mariachis</ErrorSecondaryLink>}
        />
    );
}
