'use client';

import { useEffect, useState } from 'react';
import { IconX, IconCheck } from '@tabler/icons-react';

export default function GoogleCallback() {
    const [error, setError] = useState<string | null>(null);
    const [welcome, setWelcome] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const googleError = urlParams.get('google_error');

        if (googleError) {
            setError(googleError);
            return;
        }

        if (!code || !state) {
            setError('Parámetros de autenticación inválidos');
            return;
        }

        window.history.replaceState({}, '', window.location.pathname);
        handleGoogleCallback(code, state);
    }, []);

    async function handleGoogleCallback(code: string, state: string) {
        try {
            const res = await fetch('/api/auth/google/callback', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state }),
            });
            const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; isNewUser?: boolean };
            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Error al iniciar sesión con Google');
            }

            const returnTo = sessionStorage.getItem('auth.returnTo') || '/panel';
            sessionStorage.removeItem('auth.returnTo');

            if (data.isNewUser) {
                setWelcome(true);
                setTimeout(() => {
                    window.location.replace(returnTo);
                }, 2000);
            } else {
                window.location.replace(returnTo);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
        }
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                <div className="w-full max-w-md mx-4 rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                        <IconX size={22} />
                    </div>
                    <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Error de conexión</h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>{error}</p>
                    <button
                        onClick={() => window.location.replace('/')}
                        className="btn btn-primary"
                        style={{ borderRadius: '10px' }}
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }

    if (welcome) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                <div className="w-full max-w-md mx-4 rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                        <IconCheck size={28} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Cuenta creada</h2>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Bienvenido a SimpleAgenda. Redirigiendo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md mx-4 rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} />
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>Conectando con Google...</h2>
                <p style={{ color: 'var(--fg-muted)' }}>Un momento por favor</p>
            </div>
        </div>
    );
}
