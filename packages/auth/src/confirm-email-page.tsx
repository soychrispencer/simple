'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { API_BASE, getSimpleAppBrand, type SimpleAppId } from '@simple/config';
import { BrandLogo } from '@simple/ui/brand';
import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { useAuth } from './auth-context';
import { resolveSafeInternalPath } from './core';

export type ConfirmEmailPageProps = {
    appId: SimpleAppId;
    /** Destino si no viene `returnTo` en la URL ni en sessionStorage. */
    defaultReturnTo?: string;
};

export function ConfirmEmailPage({ appId, defaultReturnTo = '/panel' }: ConfirmEmailPageProps) {
    const router = useRouter();
    const { refreshSession } = useAuth();
    const brand = getSimpleAppBrand(appId);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Estamos confirmando tu correo.');
    const [returnTo, setReturnTo] = useState(defaultReturnTo);

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        const token = search.get('token') ?? '';
        const requestedReturnTo = search.get('returnTo') || sessionStorage.getItem('auth.returnTo') || defaultReturnTo;
        const nextReturnTo = resolveSafeInternalPath(requestedReturnTo, defaultReturnTo);
        setReturnTo(nextReturnTo);

        if (!token) {
            setStatus('error');
            setMessage('El enlace de confirmación es inválido o ya no está disponible.');
            return;
        }

        void (async () => {
            try {
                const response = await fetch(`${API_BASE}/api/auth/email-verification/confirm`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const data = (await response.json().catch(() => null)) as {
                    ok?: boolean;
                    error?: string;
                    user?: { status?: string };
                } | null;

                if (!response.ok || !data?.ok) {
                    setStatus('error');
                    setMessage(data?.error || 'No pudimos confirmar tu correo.');
                    return;
                }

                await refreshSession();

                setStatus('success');
                setMessage(`Tu correo quedó confirmado. Redirigiendo a ${brand.name}…`);
                window.setTimeout(() => {
                    sessionStorage.removeItem('auth.returnTo');
                    window.location.replace(nextReturnTo);
                }, 1200);
            } catch {
                setStatus('error');
                setMessage('No pudimos confirmar tu correo.');
            }
        })();
    }, [defaultReturnTo, brand.name, refreshSession]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className="w-full max-w-md rounded-2xl p-6 sm:p-8"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
                {status === 'loading' ? (
                    <div className="text-center">
                        <div
                            className="mx-auto mb-4 size-12 animate-spin rounded-full border-b-2"
                            style={{ borderColor: 'var(--accent)' }}
                        />
                        <div className="flex justify-center">
                            <BrandLogo appId={appId} size="md" />
                        </div>
                        <h1 className="mt-4 text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                            Confirmando correo
                        </h1>
                        <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {message}
                        </p>
                    </div>
                ) : null}

                {status === 'success' ? (
                    <div className="text-center">
                        <div
                            className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
                            style={{
                                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                color: 'var(--accent)',
                            }}
                        >
                            <IconCheck size={22} />
                        </div>
                        <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                            Correo confirmado
                        </h1>
                        <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {message}
                        </p>
                    </div>
                ) : null}

                {status === 'error' ? (
                    <div className="text-center">
                        <div
                            className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
                            style={{
                                background: 'color-mix(in srgb, var(--color-error, #dc2626) 15%, transparent)',
                                color: 'var(--color-error, #dc2626)',
                            }}
                        >
                            <IconX size={22} />
                        </div>
                        <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                            No pudimos confirmar tu correo
                        </h1>
                        <PanelNotice tone="error" className="mt-4 text-left">
                            {message}
                        </PanelNotice>
                        <PanelButton
                            type="button"
                            onClick={() => router.push(returnTo)}
                            variant="primary"
                            className="mt-5 w-full"
                        >
                            Volver a {brand.name}
                        </PanelButton>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
