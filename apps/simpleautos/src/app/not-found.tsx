'use client';

import Link from 'next/link';
import { ErrorView } from '@simple/ui';

export default function NotFound() {
    return (
        <ErrorView
            code="404"
            title="Página no encontrada"
            description="La publicación o página que buscas no existe o fue removida."
            primaryAction={
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                >
                    Volver al inicio
                </Link>
            }
            secondaryAction={
                <Link
                    href="/ventas"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                    Ver publicaciones
                </Link>
            }
        />
    );
}
