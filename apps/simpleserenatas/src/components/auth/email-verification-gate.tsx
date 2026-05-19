'use client';

import { useState } from 'react';
import { IconMail, IconLoader2, IconRefresh, IconLogout } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { PanelButton } from '@simple/ui';

type EmailVerificationGateProps = {
    email: string;
    logout: () => Promise<void>;
    refreshSession: () => Promise<unknown>;
};

export function EmailVerificationGate({ email, logout, refreshSession }: EmailVerificationGateProps) {
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
            if (data?.ok) {
                setSuccess('Correo de verificación enviado. Revisa tu bandeja de entrada.');
            } else if (data?.alreadyVerified) {
                setSuccess('Tu cuenta ya está verificada. Pulsa «Ya verifiqué mi correo».');
            } else {
                setError(data?.error ?? 'No pudimos enviar el correo de verificación.');
            }
        } catch {
            setError('Error de conexión. Inténtalo de nuevo.');
        } finally {
            setResending(false);
        }
    }

    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-6 flex size-20 items-center justify-center rounded-full panel-accent-soft">
                <IconMail size={40} />
            </div>
            <h2 className="auth-title text-2xl font-bold">
                Verifica tu correo
            </h2>
            <p className="auth-text-muted mt-2 max-w-sm text-sm">
                Hemos enviado un enlace de verificación a <strong>{email}</strong>. Revísalo para continuar.
            </p>
            {error ? (
                <p className="auth-text-danger mt-4 text-sm">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="auth-text-success mt-4 text-sm">
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
            <p className="auth-text-muted mt-6 text-xs">
                ¿No recibiste el correo? Revisa tu carpeta de spam o contacta a soporte.
            </p>
        </div>
    );
}
