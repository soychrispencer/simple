'use client';

import Link from 'next/link';
import { ErrorView } from '@simple/ui/feedback';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La página que buscas no existe o fue removida."
            primaryAction={
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-color)' }}
                >
                    Volver al inicio
                </Link>
            }
            secondaryAction={
                <Link
                    href="/mariachis"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-(--bg-subtle)"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                    Explorar mariachis
                </Link>
            }
        />
    );
}
