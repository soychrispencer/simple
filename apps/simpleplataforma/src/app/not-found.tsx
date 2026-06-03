'use client';

import Link from 'next/link';
import { ErrorView } from '@simple/ui/feedback';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La página que buscas no existe en SimplePlataforma."
            primaryAction={
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    Volver al inicio
                </Link>
            }
        />
    );
}
