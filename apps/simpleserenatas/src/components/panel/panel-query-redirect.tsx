'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { resolvePanelRedirect } from '@/lib/panel-redirects';

/** Canonicaliza query params del panel antes del AuthGuard (sin sesión). */
export function PanelQueryRedirect() {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const searchParams = useSearchParams();

    useEffect(() => {
        const target = resolvePanelRedirect(pathname, searchParams.toString());
        if (target) {
            router.replace(target, { scroll: false });
        }
    }, [pathname, router, searchParams]);

    return null;
}
