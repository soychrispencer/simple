'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { legacyQueryToPanelPath } from '@/lib/panel-routes';
import { isAccountTab } from '@/lib/account-tab';

/** En `/`, redirige `?section=` legacy a rutas `/panel/*`. */
export function LegacySectionRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const section = searchParams.get('section');
        if (!section) return;

        const target = legacyQueryToPanelPath(searchParams.toString());
        if (!target) return;

        const tab = searchParams.get('account_tab');
        if (isAccountTab(tab)) localStorage.setItem('account_tab', tab);

        router.replace(target, { scroll: false });
    }, [router, searchParams]);

    return null;
}
