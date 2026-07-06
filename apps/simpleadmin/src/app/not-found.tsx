'use client';

import { ErrorView, ErrorHomeLink } from '@simple/ui/feedback';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La sección que buscas no existe en el panel."
            primaryAction={<ErrorHomeLink />}
        />
    );
}
