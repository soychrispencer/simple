'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';

/** Cierra sesión y lleva al inicio (`/`). */
export function useLogoutAndGoHome() {
    const { logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname() ?? '/';

    return useCallback(async () => {
        await logout();
        if (pathname !== '/') {
            router.replace('/');
        }
    }, [logout, pathname, router]);
}
