'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@simple/auth';
import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { AdminAuthFrame } from '@/components/admin-auth-frame';
import { confirmAdminPasswordReset } from '@/lib/api';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => setToken(new URLSearchParams(window.location.search).get('token') ?? ''), []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (!token) return setError('El enlace de recuperación es inválido o expiró.');
        if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
        if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');

        setSubmitting(true);
        try {
            await confirmAdminPasswordReset({ token, password });
            setSuccess('Tu contraseña fue actualizada. Redirigiendo...');
            window.setTimeout(() => window.location.replace('/'), 800);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos restablecer tu contraseña.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AdminAuthFrame title="Restablecer contraseña" description="Elige una nueva contraseña para tu cuenta de SimpleAdmin.">
            {error ? <PanelNotice tone="error" className="mb-3">{error}</PanelNotice> : null}
            {success ? <PanelNotice tone="success" className="mb-3">{success}</PanelNotice> : null}
            <form onSubmit={handleSubmit} className="space-y-3">
                <PasswordInput id="reset-password" plain value={password} onChange={setPassword} placeholder="Nueva contraseña" autoComplete="new-password" minLength={8} required />
                <PasswordInput id="reset-password-confirm" plain value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} required />
                <PanelButton type="submit" className="w-full justify-center" disabled={submitting} loading={submitting}>Guardar contraseña</PanelButton>
            </form>
            <PanelButton type="button" variant="secondary" className="mt-3 w-full justify-center" onClick={() => router.push('/')} disabled={submitting}>Volver</PanelButton>
        </AdminAuthFrame>
    );
}
