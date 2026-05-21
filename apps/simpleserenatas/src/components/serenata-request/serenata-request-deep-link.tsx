'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@simple/auth';
import { panelPathFromSection } from '@/lib/panel-routes';
import {
    readMarketplaceRequestDraftFromSearch,
    writeMarketplaceRequestDraftRef,
} from '@/lib/marketplace-request-draft';
import { isReservedPublicSlug, publicMariachiPath } from '@/lib/public-mariachi-routes';
import { useSerenataRequestModal } from './serenata-request-modal-context';

const PUBLIC_SERVICIO_QUERY = 'servicio';

/** Abre el modal desde `/panel/solicitar` o `/{slug}?servicio=` y limpia la URL. */
export function SerenataRequestDeepLink() {
    const pathname = usePathname() ?? '';
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isLoggedIn, authLoading } = useAuth();
    const { openRequest } = useSerenataRequestModal();
    const handledRef = useRef<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        const search = searchParams.toString();
        const key = `${pathname}?${search}`;
        if (handledRef.current === key) return;

        const panelDraft =
            pathname === '/panel/solicitar' || pathname === '/panel/solicitar/'
                ? readMarketplaceRequestDraftFromSearch(search)
                : null;

        if (panelDraft) {
            handledRef.current = key;
            writeMarketplaceRequestDraftRef(panelDraft);

            if (!isLoggedIn) {
                const params = new URLSearchParams();
                params.set(PUBLIC_SERVICIO_QUERY, panelDraft.serviceId);
                const target = `${publicMariachiPath(panelDraft.groupSlug)}?${params.toString()}`;
                router.replace(target, { scroll: false });
                return;
            }

            openRequest(panelDraft);
            const fallback = panelPathFromSection('mariachis');
            router.replace(fallback, { scroll: false });
            return;
        }

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length !== 1 || isReservedPublicSlug(segments[0])) return;

        const serviceId = searchParams.get(PUBLIC_SERVICIO_QUERY)?.trim();
        if (!serviceId) return;

        handledRef.current = key;
        const groupSlug = decodeURIComponent(segments[0]);
        openRequest({ groupSlug, serviceId });

        const params = new URLSearchParams(search);
        params.delete(PUBLIC_SERVICIO_QUERY);
        const qs = params.toString();
        const nextPath = qs ? `${pathname}?${qs}` : pathname;
        router.replace(nextPath, { scroll: false });
    }, [authLoading, isLoggedIn, openRequest, pathname, router, searchParams]);

    return null;
}
