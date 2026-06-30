'use client';

import { useEffect, useMemo } from 'react';
import { IconLock, IconShieldCheck } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelButton, PanelCard, PanelNotice } from '@simple/ui/panel';
import { BrandLogo } from '@simple/ui/brand';
import { AdminShell } from '@/components/admin-shell';
import type { AdminSessionUser } from '@/lib/api';

export function AdminProtectedPage(props: { children: (user: AdminSessionUser) => React.ReactNode }) {
    const { user, authLoading, openAuth, logout } = useAuth();

    const isAdmin = useMemo(
        () => !!user && (user.role === 'admin' || user.role === 'superadmin') && user.status === 'verified',
        [user],
    );

    useEffect(() => {
        if (!authLoading && !user) openAuth('login');
    }, [authLoading, openAuth, user]);

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
                <PanelCard className="w-full max-w-sm text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--fg)]" />
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando acceso administrativo...</p>
                </PanelCard>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
                <PanelCard className="w-full max-w-md text-center">
                    <div className="mb-6 flex justify-center">
                        <BrandLogo appId="simpleadmin" />
                    </div>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-subtle)] text-[var(--fg)]">
                        <IconLock size={22} stroke={1.8} />
                    </div>
                    <h1 className="type-section-title">Acceso administrativo</h1>
                    <p className="type-page-subtitle mt-2">
                        Ingresa con una cuenta autorizada. Este panel no permite crear cuentas desde aquí.
                    </p>
                    <PanelButton className="mt-6 w-full" onClick={() => openAuth('login')}>
                        Iniciar sesión
                    </PanelButton>
                </PanelCard>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
                <PanelCard className="w-full max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-subtle)] text-[var(--fg)]">
                        <IconShieldCheck size={22} stroke={1.8} />
                    </div>
                    <h1 className="type-section-title">Permisos insuficientes</h1>
                    <PanelNotice tone="warning" className="mt-4 text-left">
                        Tu cuenta inició sesión correctamente, pero no tiene rol de administrador verificado.
                    </PanelNotice>
                    <PanelButton variant="secondary" className="mt-6 w-full" onClick={() => void logout()}>
                        Cerrar sesión
                    </PanelButton>
                </PanelCard>
            </div>
        );
    }

    return <AdminShell user={user as AdminSessionUser}>{props.children(user as AdminSessionUser)}</AdminShell>;
}
