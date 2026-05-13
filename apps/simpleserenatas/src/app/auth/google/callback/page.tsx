'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { API_BASE } from '@simple/config';
import { BrandLogo, PanelButton, PanelNotice } from '@simple/ui';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const { refreshSession } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Estamos verificando tu acceso con Google.');
    const [returnTo, setReturnTo] = useState('/');

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        const googleError = search.get('google_error');
        const code = search.get('code') ?? '';
        const state = search.get('state') ?? '';
        const nextReturnTo = search.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/';
        setReturnTo(nextReturnTo);

        if (googleError) {
            setStatus('error');
            setMessage(googleError);
            return;
        }
        if (!code || !state) {
            setStatus('error');
            setMessage('No recibimos una respuesta valida de Google.');
            return;
        }

        void (async () => {
            try {
                const response = await fetch(`${API_BASE}/api/auth/google/callback`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, state }),
                });
                const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
                if (!response.ok || !data?.ok) {
                    setStatus('error');
                    setMessage(data?.error || 'No pudimos iniciar sesion con Google.');
                    return;
                }

                await refreshSession();
                setStatus('success');
                setMessage('Acceso confirmado. Redirigiendo...');
                window.setTimeout(() => {
                    sessionStorage.removeItem('auth.returnTo');
                    window.location.replace(nextReturnTo);
                }, 800);
            } catch {
                setStatus('error');
                setMessage('No pudimos iniciar sesion con Google.');
            }
        })();
    }, [refreshSession]);

    return (
        <AuthResultShell>
            {status === 'loading' ? (
                <div className="text-center">
                    <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--accent)' }} />
                    <BrandLogo appId="simpleserenatas" size="md" />
                    <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>{message}</p>
                </div>
            ) : null}

            {status === 'success' ? (
                <ResultContent icon={<IconCheck size={24} />} title="Google conectado" message={message} tone="success" />
            ) : null}

            {status === 'error' ? (
                <div className="text-center">
                    <ResultIcon tone="error"><IconX size={24} /></ResultIcon>
                    <h1 className="mt-4 text-xl font-semibold" style={{ color: 'var(--fg)' }}>No pudimos conectar Google</h1>
                    <PanelNotice tone="error" className="mt-4 text-left">{message}</PanelNotice>
                    <PanelButton className="mt-5 w-full" onClick={() => router.push(returnTo)}>Volver</PanelButton>
                </div>
            ) : null}
        </AuthResultShell>
    );
}

function AuthResultShell({ children }: { children: ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {children}
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

function ResultContent({ icon, title, message, tone }: { icon: ReactNode; title: string; message: string; tone: 'success' | 'error' }) {
    return (
        <div className="text-center">
            <ResultIcon tone={tone}>{icon}</ResultIcon>
            <h1 className="mt-4 text-xl font-semibold" style={{ color: 'var(--fg)' }}>{title}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{message}</p>
        </div>
    );
}
