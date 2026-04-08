'use client';

import { useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function GoogleCallback() {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const returnTo = urlParams.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/panel';

        if (!code || !state) {
            window.location.replace('/');
            return;
        }

        // Redirect to API so it can set the session cookie via a navigation response
        // (avoids cross-origin fetch cookie restrictions in Safari/Firefox/Chrome)
        const finalizeUrl = new URL(`${API_BASE}/api/auth/google/finalize`);
        finalizeUrl.searchParams.set('code', code);
        finalizeUrl.searchParams.set('state', state);
        finalizeUrl.searchParams.set('returnTo', returnTo);

        window.location.replace(finalizeUrl.toString());
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md mx-4 rounded-xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} />
                    <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                        Conectando con Google...
                    </h2>
                    <p style={{ color: 'var(--fg-muted)' }}>
                        Un momento por favor
                    </p>
                </div>
            </div>
        </div>
    );
}
