'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { BrandLogo, PanelButton, PanelNotice } from '@simple/ui';

export default function ConfirmEmailPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Estamos confirmando tu correo.');
    const [returnTo, setReturnTo] = useState('/');

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        const token = search.get('token') ?? '';
        const nextReturnTo = search.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/panel';
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

                setStatus('success');
                setMessage('Tu correo quedó confirmado. Redirigiendo a tu panel…');
                window.setTimeout(() => {
                    sessionStorage.removeItem('auth.returnTo');
                    const destination =
                        data.user?.status === 'verified' ? nextReturnTo : '/panel';
                    window.location.replace(destination.startsWith('/') ? destination : '/panel');
                }, 1000);
            } catch {
                setStatus('error');
                setMessage('No pudimos confirmar tu correo.');
            }
        })();
    }, []);

    return (
        <div className="auth-overlay fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="auth-surface w-full max-w-md rounded-2xl p-6 text-center shadow-2xl">
                {status === 'loading' ? (
                    <>
                        <div className="auth-spinner mx-auto mb-4 size-12 animate-spin rounded-full border-b-2" />
                        <BrandLogo appId="simpleserenatas" size="md" />
                        <p className="auth-text-muted mt-4 text-sm">{message}</p>
                    </>
                ) : null}

                {status === 'success' ? (
                    <>
                        <ResultIcon tone="success">
                            <IconCheck size={24} />
                        </ResultIcon>
                        <h1 className="auth-title mt-4 text-xl font-semibold">Correo confirmado</h1>
                        <p className="auth-text-muted mt-2 text-sm">{message}</p>
                    </>
                ) : null}

                {status === 'error' ? (
                    <>
                        <ResultIcon tone="error">
                            <IconX size={24} />
                        </ResultIcon>
                        <h1 className="auth-title mt-4 text-xl font-semibold">No pudimos confirmar tu correo</h1>
                        <PanelNotice tone="error" className="mt-4 text-left">
                            {message}
                        </PanelNotice>
                        <PanelButton className="mt-5 w-full" onClick={() => router.push(returnTo)}>
                            Volver
                        </PanelButton>
                    </>
                ) : null}
            </div>
        </div>
    );
}

function ResultIcon({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
    return (
        <div
            className={`mx-auto flex size-12 items-center justify-center rounded-full ${tone === 'success' ? 'auth-icon-success' : 'auth-icon-error'}`}
        >
            {children}
        </div>
    );
}
