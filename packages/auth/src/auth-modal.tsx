'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconX, IconBrandGoogle, IconMail, IconLock, IconUser, IconMailCheck } from '@tabler/icons-react';
import { PanelButton, PanelIconButton, PanelNotice } from '@simple/ui';
import GoogleLoginButton from './google-login-button';
import { useAuth } from './auth-context';

type Mode = 'login' | 'register' | 'recovery' | 'verify-email';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function AuthModal() {
    const { authOpen, closeAuth, login, register } = useAuth();
    const dialogRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [recoveryCooldown, setRecoveryCooldown] = useState(0);

    const resetLocalState = () => {
        setMode('login');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setError('');
        setSuccess('');
        setSubmitting(false);
        setRegisteredEmail('');
        setRecoveryCooldown(0);
    };

    const handleClose = () => {
        if (submitting) return;
        resetLocalState();
        closeAuth();
    };

    useEffect(() => {
        if (!authOpen) return;
        const timeoutId = window.setTimeout(() => {
            dialogRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [authOpen]);

    useEffect(() => {
        if (!authOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!submitting) handleClose();
                return;
            }
            if (event.key !== 'Tab') return;
            const root = dialogRef.current;
            if (!root) return;
            const focusable = root.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [authOpen, submitting]);

    useEffect(() => {
        if (!recoveryCooldown) return;
        const intervalId = window.setInterval(() => {
            setRecoveryCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => window.clearInterval(intervalId);
    }, [recoveryCooldown]);

    const passwordStrength = useMemo(() => {
        if (!password) return '';
        let score = 0;
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        if (score <= 1) return 'Débil';
        if (score <= 3) return 'Media';
        return 'Fuerte';
    }, [password]);

    if (!authOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const ok = await login(email, password);
        setSubmitting(false);
        if (!ok) setError('Correo electrónico o contraseña incorrectos.');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setSubmitting(true);
        const ok = await register(name, email, password);
        setSubmitting(false);
        if (!ok) {
            setError('Este correo electrónico ya está registrado.');
        } else {
            setRegisteredEmail(email);
            setMode('verify-email');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setName('');
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (!response.ok || !data?.ok) {
                if (response.status === 429) {
                    setError('Demasiados intentos. Espera un momento y vuelve a intentarlo.');
                    return;
                }
                setError(data?.error || 'No pudimos iniciar la recuperación. Inténtalo más tarde.');
                return;
            }
            setSuccess('Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.');
            setRecoveryCooldown(30);
        } catch {
            setError('No pudimos iniciar la recuperación. Inténtalo más tarde.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendVerificationEmail = async () => {
        setError('');
        setSuccess('');
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/email-verification/request`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: registeredEmail }),
            });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (!response.ok || !data?.ok) {
                setError(data?.error || 'No pudimos reenviar el email. Inténtalo más tarde.');
                return;
            }
            setSuccess('Te hemos reenviado el email de confirmación. Revisa tu bandeja de entrada.');
        } catch {
            setError('No pudimos reenviar el email. Inténtalo más tarde.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                tabIndex={-1}
                className="relative w-full max-w-md mx-4 rounded-xl p-6 animate-scale-in"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <PanelIconButton onClick={handleClose} label="Cerrar modal" variant="soft" size="md" className="absolute right-3 top-3 rounded-xl" disabled={submitting}>
                    <IconX size={16} />
                </PanelIconButton>

                {mode === 'login' && (
                    <>
                        <h2 id="auth-modal-title" className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                            Iniciar sesión
                        </h2>
                        <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                            Accede a tu cuenta Simple
                        </p>
                        {error ? (
                            <PanelNotice tone="error" className="mb-3">
                                {error}
                            </PanelNotice>
                        ) : null}
                        <form onSubmit={handleLogin} className="space-y-3" aria-label="Formulario de inicio de sesión">
                            <div className="relative">
                                <IconMail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Correo electrónico" required />
                            </div>
                            <div className="relative">
                                <IconLock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Contraseña" required />
                            </div>
                            <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting}>
                                {submitting ? 'Ingresando...' : 'Iniciar sesión'}
                            </PanelButton>
                        </form>
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                o
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                        </div>
                        <GoogleLoginButton disabled={submitting} onError={(message) => setError(message)}>
                            <PanelButton variant="secondary" className="w-full" disabled={submitting}>
                                <IconBrandGoogle size={15} /> Continuar con Google
                            </PanelButton>
                        </GoogleLoginButton>
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <button onClick={() => { setMode('recovery'); setError(''); }} style={{ color: 'var(--fg-muted)' }} disabled={submitting}>
                                ¿Olvidaste tu contraseña?
                            </button>
                            <button onClick={() => { setMode('register'); setError(''); }} className="font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                Crear cuenta
                            </button>
                        </div>
                    </>
                )}

                {mode === 'register' && (
                    <>
                        <h2 id="auth-modal-title" className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                            Crear cuenta
                        </h2>
                        <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                            Crea tu cuenta en Simple
                        </p>
                        {error ? (
                            <PanelNotice tone="error" className="mb-3">
                                {error}
                            </PanelNotice>
                        ) : null}
                        <form onSubmit={handleRegister} className="space-y-3" aria-label="Formulario de registro">
                            <div className="relative">
                                <IconUser size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Nombre completo" required />
                            </div>
                            <div className="relative">
                                <IconMail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Correo electrónico" required />
                            </div>
                            <div className="relative">
                                <IconLock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Contraseña (mínimo 8 caracteres)" required />
                            </div>
                            {password ? (
                                <p className="text-xs" style={{ color: passwordStrength === 'Débil' ? '#dc2626' : 'var(--fg-muted)' }}>
                                    Fortaleza: {passwordStrength}
                                </p>
                            ) : null}
                            <div className="relative">
                                <IconLock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Confirmar contraseña" required />
                            </div>
                            <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting}>
                                {submitting ? 'Creando...' : 'Crear cuenta'}
                            </PanelButton>
                        </form>
                        <GoogleLoginButton disabled={submitting} onError={(message) => setError(message)}>
                            <PanelButton variant="secondary" className="mt-3 w-full" disabled={submitting}>
                                <IconBrandGoogle size={15} /> Registrarse con Google
                            </PanelButton>
                        </GoogleLoginButton>
                        <div className="text-center mt-4 text-sm">
                            <span style={{ color: 'var(--fg-muted)' }}>¿Ya tienes cuenta? </span>
                            <button onClick={() => { setMode('login'); setError(''); }} className="font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                Iniciar sesión
                            </button>
                        </div>
                    </>
                )}

                {mode === 'recovery' && (
                    <>
                        <h2 id="auth-modal-title" className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                            Recuperar contraseña
                        </h2>
                        <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                            Te enviaremos un enlace para restablecer tu contraseña.
                        </p>
                        {error ? (
                            <PanelNotice tone="error" className="mb-3">
                                {error}
                            </PanelNotice>
                        ) : null}
                        {success ? (
                            <PanelNotice tone="success" className="mb-3">
                                {success}
                            </PanelNotice>
                        ) : null}
                        <form onSubmit={handleRecovery} className="space-y-3" aria-label="Formulario de recuperación de contraseña">
                            <div className="relative">
                                <IconMail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input form-input-has-leading-icon" placeholder="Correo electrónico" required />
                            </div>
                            <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting || recoveryCooldown > 0}>
                                {recoveryCooldown > 0 ? `Reintenta en ${recoveryCooldown}s` : 'Enviar enlace'}
                            </PanelButton>
                        </form>
                        <div className="text-center mt-4 text-sm">
                            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </>
                )}

                {mode === 'verify-email' && (
                    <>
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                <IconMailCheck size={32} style={{ color: 'rgb(34, 197, 94)' }} />
                            </div>
                            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                                Verifica tu email
                            </h2>
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Te hemos enviado un email a<br />
                                <span className="font-medium">{registeredEmail}</span>
                            </p>
                        </div>

                        <div className="bg-opacity-50 p-4 rounded-lg mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                            <p className="text-sm" style={{ color: 'var(--fg)' }}>
                                <strong>¿Qué hacer ahora?</strong><br />
                                1. Abre el email que recibiste<br />
                                2. Haz clic en el botón "Confirmar correo"<br />
                                3. ¡Listo! Tu cuenta estará verificada
                            </p>
                        </div>

                        {error ? (
                            <PanelNotice tone="error" className="mb-3">
                                {error}
                            </PanelNotice>
                        ) : null}
                        {success ? (
                            <PanelNotice tone="success" className="mb-3">
                                {success}
                            </PanelNotice>
                        ) : null}

                        <button
                            onClick={handleResendVerificationEmail}
                            disabled={submitting}
                            className="w-full text-sm font-medium py-2.5 rounded-lg transition-colors mb-3"
                            style={{
                                background: 'var(--surface-secondary)',
                                color: 'var(--fg)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            {submitting ? 'Reenviando...' : 'Reenviar email de confirmación'}
                        </button>

                        <div className="text-center mt-4 text-sm">
                            <span style={{ color: 'var(--fg-muted)' }}>¿Problemas? </span>
                            <button
                                onClick={() => { setMode('login'); setError(''); setSuccess(''); setRegisteredEmail(''); }}
                                className="font-medium"
                                style={{ color: 'var(--fg)' }}
                                disabled={submitting}
                            >
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
