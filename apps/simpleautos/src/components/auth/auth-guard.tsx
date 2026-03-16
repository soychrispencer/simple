'use client';

import { useAuth } from '@/context/auth-context';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, authLoading, openAuth } = useAuth();

    if (authLoading) {
        return (
            <div className="container-app py-20 text-center">
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando sesión...</p>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="container-app py-20 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                    <IconLock size={22} />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Acceso restringido</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>Necesitas iniciar sesión para acceder a esta sección.</p>
                <PanelButton onClick={openAuth} variant="primary" className="h-11 px-6 text-sm">Iniciar sesión</PanelButton>
            </div>
        );
    }

    return <>{children}</>;
}
