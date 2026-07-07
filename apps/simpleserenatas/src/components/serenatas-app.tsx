'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { useAuth, EmailVerificationGate } from '@simple/auth';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { useSerenata } from '@/context/serenata-context';
import { ScreenShell } from '@/components/layout/screen-shell';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { PublicLanding } from '@/components/auth/public-landing';

/**
 * Shell público y landing fuera de `/panel/*`.
 * El panel usa `panel/layout.tsx` + páginas dedicadas por sección.
 */
export function SerenatasApp() {
    const { isLoggedIn, authLoading, user, mode, profiles } = useSerenata();
    const { openAuth, refreshSession } = useAuth();
    const logoutAndGoHome = useLogoutAndGoHome();
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const searchParams = useSearchParams();

    useEffect(() => {
        if (authLoading || isLoggedIn) return;
        const authAction = searchParams.get('auth');
        if (authAction !== 'register' && authAction !== 'login') return;
        openAuth(authAction);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('auth');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [authLoading, isLoggedIn, openAuth, pathname, router, searchParams]);

    if (!isLoggedIn) {
        return (
            <ScreenShell>
                <PublicLanding
                    onLogin={() => openAuth('login')}
                    onRegister={() => openAuth('register')}
                />
            </ScreenShell>
        );
    }

    if (user && user.status !== 'verified') {
        return (
            <ScreenShell>
                <EmailVerificationGate
                    appLabel="SimpleSerenatas"
                    email={user.email}
                    logout={logoutAndGoHome}
                    refreshSession={refreshSession}
                />
            </ScreenShell>
        );
    }

    return (
        <ScreenShell>
            <PublicLanding
                isLoggedIn
                header={<SerenatasChromeHeader mode={mode} profiles={profiles} />}
                onLogin={() => openAuth('login')}
                onRegister={() => openAuth('register')}
            />
        </ScreenShell>
    );
}
