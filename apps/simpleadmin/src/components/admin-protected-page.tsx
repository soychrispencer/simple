'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminAuthModal } from '@/components/auth/AdminAuthModal';
import { fetchAdminMe, loginAdmin, requestAdminPasswordReset, type AdminSessionUser } from '@/lib/api';

export function AdminProtectedPage(props: {
    children: (user: AdminSessionUser) => React.ReactNode;
}) {
    const [user, setUser] = useState<AdminSessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [authOpen, setAuthOpen] = useState(false);

    useEffect(() => {
        let active = true;
        const run = async () => {
            const result = await fetchAdminMe();
            if (!active) return;
            setUser(result.user);
            setAuthOpen(!result.user);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    if (loading) {
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
        return (
            <AdminAuthModal
                open={authOpen}
                onClose={() => {}}
                onLogin={async (email, password) => {
                    const ok = await loginAdmin(email, password);
                    if (!ok) return false;
                    const result = await fetchAdminMe();
                    if (!result.user) return false;
                    setUser(result.user);
                    setAuthOpen(false);
                    return true;
                }}
                onRequestPasswordReset={requestAdminPasswordReset}
            />
        );
    }

    return <AdminShell user={user}>{props.children(user)}</AdminShell>;
}
