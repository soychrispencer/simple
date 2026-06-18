'use client';

import { useAuth, EmailVerificationGate } from '@simple/auth';
import { useLogoutAndGoHome } from '@/hooks/use-logout-and-go-home';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, authLoading, openAuth, user, refreshSession } = useAuth();
    const logoutAndGoHome = useLogoutAndGoHome();

    if (authLoading) {
        return (
            <div className="container-app py-20 text-center">
                <p className="auth-text-muted text-sm">Cargando sesión…</p>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="container-app py-20 text-center">
                <div className="auth-icon-muted mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                    <IconLock size={22} />
                </div>
                <h2 className="auth-title mb-2 text-xl font-semibold">Acceso restringido</h2>
                <p className="auth-text-muted mb-6 text-sm">
                    Necesitas iniciar sesión para acceder a esta sección.
                </p>
                <PanelButton onClick={() => openAuth('login')} variant="primary" className="h-11 px-6 text-sm">
                    Iniciar sesión
                </PanelButton>
            </div>
        );
    }

    if (user?.status !== 'verified') {
        return (
            <EmailVerificationGate
                appLabel="SimpleSerenatas"
                email={user?.email ?? ''}
                logout={logoutAndGoHome}
                refreshSession={refreshSession}
            />
        );
    }

    return <>{children}</>;
}
