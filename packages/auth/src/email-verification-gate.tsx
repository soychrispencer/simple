'use client';

import { useState } from 'react';
import { IconMail, IconLoader2, IconRefresh, IconLogout } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { PanelButton } from '@simple/ui/panel';

type EmailVerificationGateProps = {
    appLabel: string;
    email: string;
    logout: () => Promise<void>;
    refreshSession: () => Promise<unknown>;
};

export function EmailVerificationGate({ appLabel, email, logout, refreshSession }: EmailVerificationGateProps) {
    const [refreshing, setRefreshing] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleRefresh() {
        setRefreshing(true);
        setError('');
        await refreshSession();
        setRefreshing(false);
    }

    async function handleResend() {
        setError('');
        setSuccess('');
        setResending(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/email-verification/request`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = (await response.json().catch(() => null)) as {
                ok?: boolean;
                error?: string;
                alreadyVerified?: boolean;
            } | null;
            if (!response.ok || !data?.ok) {
                if (response.status === 429) {
                    setError('Demasiados reenvíos. Espera unos minutos y revisa Spam o Promociones.');
                    return;
                }
                setError(data?.error ?? 'No pudimos enviar el correo de verificación.');
                return;
            }
            if (data.alreadyVerified) {
                setSuccess('Tu cuenta ya está verificada. Pulsa «Ya verifiqué mi correo».');
                return;
            }
            setSuccess('Correo de verificación enviado. Revisa tu bandeja de entrada.');
        } catch {
            setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            setResending(false);
        }
    }

    return (
        <div className="container-app flex min-h-[400px] max-w-xl flex-col items-center justify-center py-20 text-center">
            <div
                className="mb-6 flex size-16 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
                <IconMail size={32} />
            </div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                Verifica tu correo para entrar al panel
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                Tu cuenta existe en {appLabel}, pero el panel se desbloquea cuando confirmas tu correo.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                Te enviamos el enlace a <strong>{email}</strong>.
            </p>
            {error ? (
                <p className="mt-4 text-sm" style={{ color: 'var(--color-error, #dc2626)' }}>
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="mt-4 text-sm" style={{ color: 'var(--color-success, #16a34a)' }}>
                    {success}
                </p>
            ) : null}
            <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
                <PanelButton onClick={() => void handleRefresh()} disabled={refreshing}>
                    {refreshing ? <IconLoader2 size={16} className="animate-spin" /> : <IconRefresh size={16} />}
                    Ya verifiqué mi correo
                </PanelButton>
                <PanelButton variant="secondary" onClick={() => void handleResend()} disabled={resending}>
                    {resending ? 'Enviando…' : 'Reenviar correo de verificación'}
                </PanelButton>
                <PanelButton variant="secondary" onClick={() => void logout()}>
                    <IconLogout size={16} />
                    Cerrar sesión
                </PanelButton>
            </div>
            <p className="mt-6 max-w-sm text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                ¿No llegó? Revisa Spam, Promociones o Correo no deseado. El enlace vence en 3 días; puedes pedir uno nuevo con el botón de arriba.
            </p>
        </div>
    );
}
