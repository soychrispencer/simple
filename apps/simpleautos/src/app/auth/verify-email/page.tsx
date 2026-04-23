'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { PanelButton, PanelNotice } from '@simple/ui';
import { API_BASE } from '@simple/config';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Estamos confirmando tu correo.');
    const [returnTo, setReturnTo] = useState('/');

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        const token = search.get('token') ?? '';
        const nextReturnTo = search.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/';
        setReturnTo(nextReturnTo);

        if (!token) {
            setStatus('error');
            setMessage('El enlace de confirmacion es invalido o ya no esta disponible.');
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
                const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

                if (!response.ok || !data?.ok) {
                    setStatus('error');
                    setMessage(data?.error || 'No pudimos confirmar tu correo.');
                    return;
                }

                setStatus('success');
                setMessage('Tu correo ya quedo confirmado. Redirigiendo a SimpleAutos...');
                window.setTimeout(() => {
                    sessionStorage.removeItem('auth.returnTo');
                    window.location.replace(nextReturnTo);
                }, 1200);
            } catch {
                setStatus('error');
                setMessage('No pudimos confirmar tu correo.');
            }
        })();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md mx-4 rounded-xl p-8 animate-scale-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {status === 'loading' ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }} />
                        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                            Confirmando correo
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {message}
                        </p>
                    </div>
                ) : null}

                {status === 'success' ? (
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
                            <IconCheck size={22} />
                        </div>
                        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                            Correo confirmado
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            {message}
                        </p>
                    </div>
                ) : null}

                {status === 'error' ? (
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>
                            <IconX size={22} />
                        </div>
                        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                            No pudimos confirmar tu correo
                        </h1>
                        <PanelNotice tone="error" className="mb-4 text-left">
                            {message}
                        </PanelNotice>
                        <PanelButton
                            type="button"
                            onClick={() => router.push(returnTo)}
                            variant="primary"
                            className="w-full"
                        >
                            Volver a SimpleAutos
                        </PanelButton>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
