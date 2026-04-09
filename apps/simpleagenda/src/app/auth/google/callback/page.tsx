'use client';

import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';

export default function GoogleCallback() {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // Step 2: app received redirect from finalize with one-time token — exchange it for a session
        const oauthToken = urlParams.get('_oauth');
        if (oauthToken) {
            // Remove token from URL immediately
            window.history.replaceState({}, '', window.location.pathname);
            exchangeToken(oauthToken);
            return;
        }

        // Step 1: Google redirected here with code+state — forward to finalize endpoint
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

        // Navigate to finalize through the same-origin proxy (relative URL)
        const params = new URLSearchParams({ code, state });
        window.location.replace(`/api/auth/google/finalize?${params.toString()}`);
    }, []);

    async function exchangeToken(token: string) {
        try {
            // Fetch through same-origin proxy so the session cookie is stored on our domain
            const res = await fetch(`/api/auth/google/exchange?token=${encodeURIComponent(token)}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error((data as { error?: string }).error || 'Error al iniciar sesión');
            }
            // Navigate to the user's intended destination
            const returnTo = sessionStorage.getItem('auth.returnTo') || '/panel';
            sessionStorage.removeItem('auth.returnTo');
            setTimeout(() => {
                window.location.replace(returnTo);
            }, 100);
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
