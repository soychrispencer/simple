'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@simple/auth';

/** Red de seguridad: si la sesión termina fuera de `/`, volver al inicio. */
export function LogoutHomeRedirect() {
    const { user, authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const hadSessionRef = useRef(false);

    useEffect(() => {
        if (authLoading) return;

        if (user) {
            hadSessionRef.current = true;
            return;
        }

        if (!hadSessionRef.current) return;
        hadSessionRef.current = false;

        if (pathname === '/') return;
        router.replace('/');
    }, [user, authLoading, pathname, router]);

    return null;
}
