'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelButton, PanelNotice } from '@simple/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [returnTo, setReturnTo] = useState('/');

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        setToken(search.get('token') ?? '');
        const nextReturnTo = search.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/';
        setReturnTo(nextReturnTo);
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError('El enlace de recuperación es inválido o expiró.');
            return;
        }
        if (password.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/password-reset/confirm`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (!response.ok || !data?.ok) {
                setError(data?.error || 'No pudimos restablecer tu contraseña.');
                return;
            }
            setSuccess('Tu contraseña fue actualizada. Redirigiendo...');
            window.setTimeout(() => {
                sessionStorage.removeItem('auth.returnTo');
                window.location.replace(returnTo);
            }, 1000);
        } catch {
            setError('No pudimos restablecer tu contraseña.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md mx-4 rounded-xl p-8 animate-scale-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                    Restablecer contraseña
                </h1>
                <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                    Elige una nueva contraseña para tu cuenta de SimplePropiedades.
                </p>
                {error ? <PanelNotice tone="error" className="mb-3">{error}</PanelNotice> : null}
                {success ? <PanelNotice tone="success" className="mb-3">{success}</PanelNotice> : null}
                <form onSubmit={handleSubmit} className="space-y-3" aria-label="Formulario de restablecer contraseña">
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="form-input"
                        placeholder="Nueva contraseña"
                        autoComplete="new-password"
                        required
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="form-input"
                        placeholder="Repite la contraseña"
                        autoComplete="new-password"
                        required
                    />
                    <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Guardar contraseña'}
                    </PanelButton>
                </form>
                <PanelButton
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(returnTo)}
                    className="w-full mt-3"
                    disabled={submitting}
                >
                    Volver
                </PanelButton>
            </div>
        </div>
    );
}
