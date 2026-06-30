'use client';

import type { ReactNode } from 'react';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { useAuth } from './auth-context';
import { EmailVerificationGate } from './email-verification-gate';

type PanelAuthGuardProps = {
    children: ReactNode;
    appLabel: string;
    /** Solo Agenda: superadmin puede entrar sin verificar correo. */
    allowUnverifiedSuperadmin?: boolean;
};

export function PanelAuthGuard({ children, appLabel, allowUnverifiedSuperadmin = false }: PanelAuthGuardProps) {
    const { isLoggedIn, authLoading, openAuth, user, logout, refreshSession } = useAuth();

    if (authLoading) {
        return null;
    }

    if (!isLoggedIn) {
        return (
            <div className="container-app py-20 text-center">
                <div
                    className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                >
                    <IconLock size={22} />
                </div>
                <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                    Acceso restringido
                </h2>
                <p className="mb-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Necesitas iniciar sesión para acceder a esta sección.
                </p>
                <PanelButton onClick={() => openAuth('login')} variant="primary" className="h-11 px-6 text-sm">
                    Iniciar sesión
                </PanelButton>
            </div>
        );
    }

    const canBypassVerification = allowUnverifiedSuperadmin && user?.role === 'superadmin';
    if (!canBypassVerification && user?.status !== 'verified') {
        return (
            <EmailVerificationGate
                appLabel={appLabel}
                email={user?.email ?? ''}
                logout={logout}
                refreshSession={refreshSession}
            />
        );
    }

    return <>{children}</>;
}
