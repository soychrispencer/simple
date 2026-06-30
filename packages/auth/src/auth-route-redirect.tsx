'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
    target: string;
};

/** Conserva query string al redirigir rutas legacy de auth (p. ej. verify-email → confirmar-correo). */
export function AuthRouteRedirect({ target }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const query = searchParams.toString();
        router.replace(query ? `${target}?${query}` : target);
    }, [router, searchParams, target]);

    return (
        <p className="p-8 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>
            Redirigiendo…
        </p>
    );
}
