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
                if (data?.ok) {
                    setSuccess('Correo de verificación enviado. Revisa tu bandeja de entrada.');
                } else if (data?.alreadyVerified) {
                    setSuccess('Tu cuenta ya está verificada. Recarga la página.');
                } else {
                    setError(data?.error ?? 'Error al enviar el correo de verificación.');
                }
            } catch (err) {
                setError('Error de conexión. Inténtalo de nuevo.');
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="container-app py-20 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                    <IconLock size={22} />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Verifica tu cuenta</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
                    Necesitas verificar tu correo electrónico para continuar. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.
                </p>
                {error && <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>{error}</p>}
                {success && <p className="text-sm mb-4" style={{ color: 'var(--success)' }}>{success}</p>}
                <div className="flex flex-col gap-3">
                    <PanelButton onClick={handleResend} disabled={submitting} variant="primary" className="h-11 px-6 text-sm">
                        {submitting ? 'Enviando...' : 'Reenviar correo de verificación'}
                    </PanelButton>
                    <PanelButton onClick={logout} variant="ghost" className="h-11 px-6 text-sm">Cerrar sesión</PanelButton>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}