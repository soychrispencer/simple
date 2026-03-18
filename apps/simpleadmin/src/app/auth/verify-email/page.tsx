'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Estamos confirmando tu correo.');

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        const token = search.get('token') ?? '';

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
                setMessage('Tu correo ya quedo confirmado. Redirigiendo a SimpleAdmin...');
                window.setTimeout(() => {
                    window.location.replace('/');
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
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7', color: '#16a34a' }}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
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
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fee2e2', color: '#dc2626' }}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                            No pudimos confirmar tu correo
                        </h1>
                        <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                            {message}
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="btn-primary w-full"
                        >
                            Volver a SimpleAdmin
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
