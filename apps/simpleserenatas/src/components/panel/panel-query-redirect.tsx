'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    resolveCanonicalMiNegocioRedirect,
    resolveGrupoQueryRedirect,
    resolveNestedPanelRedirect,
} from '@/lib/panel-routes';

/** Canonicaliza query params del panel antes del AuthGuard (sin sesión). */
export function PanelQueryRedirect() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const search = searchParams.toString();

        const nestedTarget = resolveNestedPanelRedirect(pathname);
        if (nestedTarget) {
            router.replace(nestedTarget, { scroll: false });
            return;
        }

        const miNegocioTarget = resolveCanonicalMiNegocioRedirect(pathname, search);
        if (miNegocioTarget) {
            router.replace(miNegocioTarget, { scroll: false });
            return;
        }

        const grupoTarget = resolveGrupoQueryRedirect(pathname, search);
        if (grupoTarget) {
            router.replace(grupoTarget, { scroll: false });
        }
    }, [pathname, router, searchParams]);

    return null;
}
