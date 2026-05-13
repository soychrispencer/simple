'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { BrandLogo, PanelButton, PanelNotice } from '@simple/ui';

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
                setMessage('Tu correo quedo confirmado. Redirigiendo...');
                window.setTimeout(() => {
                    sessionStorage.removeItem('auth.returnTo');
                    window.location.replace(nextReturnTo);
                }, 1000);
            } catch {
                setStatus('error');
                setMessage('No pudimos confirmar tu correo.');
            }
        })();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 text-center shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {status === 'loading' ? (
                    <>
                        <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--accent)' }} />
                        <BrandLogo appId="simpleserenatas" size="md" />
                        <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>{message}</p>
                    </>
                ) : null}

                {status === 'success' ? (
                    <>
                        <ResultIcon tone="success"><IconCheck size={24} /></ResultIcon>
                        <h1 className="mt-4 text-xl font-semibold" style={{ color: 'var(--fg)' }}>Correo confirmado</h1>
                        <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{message}</p>
                    </>
                ) : null}

                {status === 'error' ? (
                    <>
                        <ResultIcon tone="error"><IconX size={24} /></ResultIcon>
                        <h1 className="mt-4 text-xl font-semibold" style={{ color: 'var(--fg)' }}>No pudimos confirmar tu correo</h1>
                        <PanelNotice tone="error" className="mt-4 text-left">{message}</PanelNotice>
                        <PanelButton className="mt-5 w-full" onClick={() => router.push(returnTo)}>Volver</PanelButton>
                    </>
                ) : null}
            </div>
        </div>
    );
}

function ResultIcon({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
    return (
        <div className="mx-auto flex size-12 items-center justify-center rounded-full" style={{
            background: tone === 'success' ? 'color-mix(in oklab, var(--accent) 14%, transparent)' : 'color-mix(in oklab, var(--danger) 14%, transparent)',
            color: tone === 'success' ? 'var(--accent)' : 'var(--danger)',
        }}>
            {children}
        </div>
    );
}
