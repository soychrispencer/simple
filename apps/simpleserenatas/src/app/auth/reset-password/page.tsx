'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconLock } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { BrandLogo, PanelButton, PanelField, PanelNotice } from '@simple/ui';

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
        setReturnTo(search.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/');
    }, []);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError('El enlace de recuperacion es invalido o expiro.');
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
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconLock size={22} />
                    </div>
                    <div>
                        <BrandLogo appId="simpleserenatas" size="sm" />
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>Restablece tu contraseña.</p>
                    </div>
                </div>

                {error ? <PanelNotice tone="error" className="mb-3">{error}</PanelNotice> : null}
                {success ? <PanelNotice tone="success" className="mb-3">{success}</PanelNotice> : null}

                <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
                    <PanelField label="Nueva contraseña">
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="form-input"
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                            required
                        />
                    </PanelField>
                    <PanelField label="Confirmar contraseña">
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="form-input"
                            placeholder="Repite la contraseña"
                            autoComplete="new-password"
                            required
                        />
                    </PanelField>
                    <PanelButton type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Guardar contraseña'}
                    </PanelButton>
                </form>

                <PanelButton type="button" variant="secondary" className="mt-3 w-full" disabled={submitting} onClick={() => router.push(returnTo)}>
                    Volver
                </PanelButton>
            </div>
        </div>
    );
}
