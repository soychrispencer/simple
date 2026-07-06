'use client';

import { ErrorView, ErrorHomeLink } from '@simple/ui/feedback';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La agenda que buscas no existe o fue desactivada por el profesional."
            primaryAction={<ErrorHomeLink />}
        />
    );
}
