'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const search = new URLSearchParams(window.location.search);
        setToken(search.get('token') ?? '');
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
                window.location.replace('/');
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
                    Elige una nueva contraseña para tu cuenta de SimpleAutos.
                </p>
                {error ? <p className="text-sm mb-3" style={{ color: '#dc2626' }}>{error}</p> : null}
                {success ? <p className="text-sm mb-3" style={{ color: '#16a34a' }}>{success}</p> : null}
                <form onSubmit={handleSubmit} className="space-y-3">
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
                    <button type="submit" className="btn-primary w-full" disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Guardar contraseña'}
                    </button>
                </form>
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-full mt-3 rounded-lg px-4 py-2"
                    style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
                    disabled={submitting}
                >
                    Volver
                </button>
            </div>
        </div>
    );
}
