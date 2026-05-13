'use client';

import { useState } from 'react';
import { useAuth } from '@simple/auth';
import { IconLock } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui';
import { API_BASE } from '@simple/config';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, authLoading, openAuth, user, logout } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
                <PanelButton onClick={() => openAuth('login')} variant="primary" className="h-11 px-6 text-sm">Iniciar sesión</PanelButton>
            </div>
        );
    }

    if (user?.status !== 'verified') {
        const userEmail = user?.email ?? '';

        const handleResend = async () => {
            setError('');
            setSuccess('');
            setSubmitting(true);
            try {
                const response = await fetch(`${API_BASE}/api/auth/email-verification/request`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail }),
                });
                const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; alreadyVerified?: boolean } | null;
                if (!response.ok || !data?.ok) {
                    setError(data?.error || 'No pudimos reenviar el correo de verificacion.');
                    return;
                }
                setSuccess(data.alreadyVerified ? 'Tu correo ya estaba verificado. Recarga la pagina.' : 'Te reenviamos el correo de verificacion. Revisa tu bandeja de entrada.');
            } catch {
                setError('No pudimos reenviar el correo de verificacion.');
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="container-app max-w-xl py-20 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}>
                    <IconLock size={22} />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Verifica tu correo para entrar al panel</h2>
                <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
                    Tu cuenta existe, pero el panel de SimpleAutos se desbloquea solo cuando confirmas tu correo.
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                    Te enviamos el enlace a <strong>{userEmail}</strong>.
                </p>
                {error ? <p className="text-sm mb-3" style={{ color: '#dc2626' }}>{error}</p> : null}
                {success ? <p className="text-sm mb-3" style={{ color: '#16a34a' }}>{success}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <PanelButton onClick={() => void handleResend()} variant="primary" className="h-11 px-6 text-sm" disabled={submitting}>
                        {submitting ? 'Reenviando...' : 'Reenviar verificacion'}
                    </PanelButton>
                    <PanelButton onClick={() => void logout()} variant="secondary" className="h-11 px-6 text-sm" disabled={submitting}>
                        Cerrar sesion
                    </PanelButton>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
