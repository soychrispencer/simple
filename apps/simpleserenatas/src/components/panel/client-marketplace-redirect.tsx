'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CLIENT_MARKETPLACE_HREF } from '@/lib/client-marketplace';

/** El catálogo de mariachis vive en `/mariachis`, no dentro del panel. */
export function ClientMarketplaceRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace(CLIENT_MARKETPLACE_HREF);
    }, [router]);

    return null;
}
