'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSerenata } from '@/context/serenata-context';
import { legacyQueryToPanelPath } from '@/lib/panel-routes';
import { isAccountTab } from '@/lib/account-tab';

/** En `/`, redirige `?section=` legacy a rutas `/panel/*` o catálogo. */
export function LegacySectionRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { mode, ownerFeaturesEnabled, authLoading, isLoggedIn } = useSerenata();

    useEffect(() => {
        const section = searchParams.get('section');
        if (!section) return;

        const preferOwnerSolicitudes =
            !authLoading && isLoggedIn && mode === 'work' && ownerFeaturesEnabled;

        const target = legacyQueryToPanelPath(searchParams.toString(), { preferOwnerSolicitudes });
        if (!target) return;

        const tab = searchParams.get('account_tab');
        if (isAccountTab(tab)) localStorage.setItem('account_tab', tab);

        router.replace(target, { scroll: false });
    }, [authLoading, isLoggedIn, mode, ownerFeaturesEnabled, router, searchParams]);

    return null;
}
