'use client';

import { useMemo } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { useAuth } from '@simple/auth';
import { AdminSessionUser } from '@/lib/api';

export function AdminProtectedPage(props: { children: (user: AdminSessionUser) => React.ReactNode }) {
    const { user, authLoading, requireAuth, logout } = useAuth();

    const isAdmin = useMemo(
        () => !!user && (user.role === 'admin' || user.role === 'superadmin'),
        [user],
    );

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--fg)' }} />
                    <p style={{ color: 'var(--fg-muted)' }}>Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        requireAuth();

        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <p style={{ color: 'var(--fg-muted)' }}>Abre el modal para iniciar sesión.</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="text-center">
                    <p style={{ color: 'var(--fg-muted)' }}>Requiere permisos de administrador.</p>
                    <button
                        className="mt-4 rounded-md border border-gray-300 px-4 py-2"
                        onClick={() => logout()}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    const adminUser = user as AdminSessionUser;
    return <AdminShell user={adminUser}>{props.children(adminUser)}</AdminShell>;
}
