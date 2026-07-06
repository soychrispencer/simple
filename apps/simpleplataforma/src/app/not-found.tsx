'use client';

import { ErrorView, ErrorHomeLink } from '@simple/ui/feedback';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La página que buscas no existe en SimplePlataforma."
            primaryAction={<ErrorHomeLink />}
        />
    );
}
