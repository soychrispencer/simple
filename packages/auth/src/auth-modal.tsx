'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconX, IconBrandGoogle, IconMail, IconLock, IconUser, IconMailCheck, IconPhone, IconShieldCheck } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { PanelButton } from '@simple/ui/panel';
import { PanelIconButton, PanelNotice } from '@simple/ui/panel';
import GoogleLoginButton from './google-login-button';
import { useAuth } from './auth-context';

type Mode = 'login' | 'register' | 'recovery' | 'verify-email';

declare global {
    interface Window {
        grecaptcha?: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

type AuthModalProps = {
    allowRegister?: boolean;
    registerIntro?: ReactNode;
    canSubmitRegister?: boolean;
    registerDisabledMessage?: string;
};

export function AuthModal({
    allowRegister = true,
    registerIntro,
    canSubmitRegister = true,
    registerDisabledMessage = 'Completa los datos requeridos para crear tu cuenta.',
}: AuthModalProps = {}) {
    const { authOpen, authInitialMode, closeAuth, login, register, logout } = useAuth();
    const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [rememberEmail, setRememberEmail] = useState(false);
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
        setPhone('');
        setTermsAccepted(false);
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
        const el = document.createElement('div');
        document.body.appendChild(el);
        setPortalElement(el);

        const recaptchaStyle = document.createElement('style');
        recaptchaStyle.dataset.simpleRecaptchaStyle = 'true';
        recaptchaStyle.textContent = '.grecaptcha-badge{visibility:hidden!important;}';
        document.head.appendChild(recaptchaStyle);

        return () => {
            document.body.removeChild(el);
            document.head.removeChild(recaptchaStyle);
            setPortalElement(null);
        };
    }, []);

    useEffect(() => {
        if (!authOpen) return;
        setMode(allowRegister ? authInitialMode : 'login');
        try {
            const savedEmail = window.localStorage.getItem('simple:auth:remembered-email') ?? '';
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberEmail(true);
            }
        } catch {
            // ignore storage errors
        }
        const timeoutId = window.setTimeout(() => {
            dialogRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [allowRegister, authInitialMode, authOpen]);

    useEffect(() => {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (!authOpen || !siteKey || document.querySelector('script[data-simple-recaptcha="true"]')) return;
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
        script.async = true;
        script.defer = true;
        script.dataset.simpleRecaptcha = 'true';
        document.head.appendChild(script);
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

    const phoneDigits = useMemo(() => phone.replace(/\D/g, '').slice(0, 8), [phone]);
    const normalizedPhone = useMemo(() => (phoneDigits.length === 8 ? `+569${phoneDigits}` : ''), [phoneDigits]);

    const handlePhoneChange = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const withoutPrefix = digits.startsWith('569') ? digits.slice(3) : digits;
        setPhone(withoutPrefix.slice(0, 8));
    };

    const getCaptchaToken = async () => {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (!siteKey) return null;
        if (!window.grecaptcha) {
            await new Promise<void>((resolve) => {
                const existing = document.querySelector<HTMLScriptElement>('script[data-simple-recaptcha="true"]');
                const script = existing ?? document.createElement('script');
                if (!existing) {
                    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
                    script.async = true;
                    script.defer = true;
                    script.dataset.simpleRecaptcha = 'true';
                    document.head.appendChild(script);
                }
                script.addEventListener('load', () => resolve(), { once: true });
                script.addEventListener('error', () => resolve(), { once: true });
                window.setTimeout(() => resolve(), 2500);
            });
        }
        if (!window.grecaptcha) return null;
        return new Promise<string | null>((resolve) => {
            window.grecaptcha?.ready(() => {
                window.grecaptcha?.execute(siteKey, { action: 'register' })
                    .then(resolve)
                    .catch(() => resolve(null));
            });
        });
    };

    if (!authOpen || !portalElement) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        const result = await login(email, password);
        setSubmitting(false);
        if (!result.ok || !result.user) {
            setError(result.error || 'Correo electrónico o contraseña incorrectos.');
            return;
        }
        if (result.user.status !== 'verified') {
            setRegisteredEmail(result.user.email);
            setSuccess('');
            setMode('verify-email');
        }
        try {
            if (rememberEmail) window.localStorage.setItem('simple:auth:remembered-email', email.trim().toLowerCase());
            else window.localStorage.removeItem('simple:auth:remembered-email');
        } catch {
            // ignore storage errors
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!canSubmitRegister) {
            setError(registerDisabledMessage);
            return;
        }
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (!/^\+569\d{8}$/.test(normalizedPhone)) {
            setError('Ingresa tu WhatsApp con formato +569 y 8 dígitos.');
            return;
        }
        if (!termsAccepted) {
            setError('Debes aceptar los términos y condiciones para registrarte.');
            return;
        }
        setSubmitting(true);
        const captchaToken = await getCaptchaToken();
        const result = await register({
            name,
            phone: normalizedPhone,
            email,
            password,
            termsAccepted,
            captchaToken,
        });
        setSubmitting(false);
        if (!result.ok || !result.user) {
            setError(result.error || 'No pudimos completar el registro.');
        } else {
            if (result.user.status === 'verified') {
                handleClose();
                return;
            }
            setRegisteredEmail(result.user.email);
            setSuccess('');
            setMode('verify-email');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setName('');
            setPhone('');
            setTermsAccepted(false);
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

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                tabIndex={-1}
                className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    aria-label="Cerrar modal"
                    disabled={submitting}
                    type="button"
                    className="absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 bg-transparent border-none"
                    style={{
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        color: 'var(--fg)',
                        opacity: submitting ? 0.5 : 1,
                    }}
                >
                    <IconX size={24} strokeWidth={2.5} />
                </button>

                <div className="p-5 sm:p-6">
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
                        <form onSubmit={handleLogin} className="grid gap-4" aria-label="Formulario de inicio de sesión">
                            <div className="relative flex items-center">
                                <IconMail size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="Correo electrónico" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            <div className="relative flex items-center">
                                <IconLock size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Contraseña" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            <div className="flex items-center justify-between gap-3 -mt-1">
                                <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
                                    <input
                                        type="checkbox"
                                        checked={rememberEmail}
                                        onChange={(event) => setRememberEmail(event.target.checked)}
                                        className="h-4 w-4 rounded"
                                    />
                                    Recordar cuenta
                                </label>
                                <button type="button" onClick={() => { setMode('recovery'); setError(''); }} className="text-xs font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                    Recuperar contraseña
                                </button>
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
                            <span style={{ color: 'var(--fg-muted)' }}>¿No tienes cuenta?</span>
                            {allowRegister ? (
                                <button onClick={() => { setMode('register'); setError(''); }} className="font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                    Registrarse
                                </button>
                            ) : null}
                        </div>
                    </>
                )}

                {allowRegister && mode === 'register' && (
                    <>
                        <h2 id="auth-modal-title" className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                            Registrarse
                        </h2>
                        <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                            Crea tu cuenta en Simple
                        </p>
                        {error ? (
                            <PanelNotice tone="error" className="mb-3">
                                {error}
                            </PanelNotice>
                        ) : null}
                        {registerIntro ? <div className="mb-4">{registerIntro}</div> : null}
                        <form onSubmit={handleRegister} className="grid gap-4" aria-label="Formulario de registro">
                            <div className="relative flex items-center">
                                <IconUser size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Nombre completo" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            <div className="relative flex items-center">
                                <IconPhone size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <span className="pointer-events-none absolute text-sm font-medium" style={{ color: 'var(--fg)', left: '40px' }}>
                                    +569
                                </span>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={phoneDigits}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    className="form-input"
                                    placeholder="12345678"
                                    required
                                    pattern="[0-9]{8}"
                                    maxLength={8}
                                    autoComplete="tel"
                                    style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '82px' }}
                                />
                            </div>
                            <div className="relative flex items-center">
                                <IconMail size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="Correo electrónico" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            <div className="relative flex items-center">
                                <IconLock size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Contraseña (mínimo 8 caracteres)" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            {password ? (
                                <p className="text-xs" style={{ color: passwordStrength === 'Débil' ? '#dc2626' : 'var(--fg-muted)' }}>
                                    Fortaleza: {passwordStrength}
                                </p>
                            ) : null}
                            <div className="relative flex items-center">
                                <IconLock size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" placeholder="Confirmar contraseña" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            <label className="flex items-start gap-2 text-xs leading-relaxed cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(event) => setTermsAccepted(event.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded shrink-0"
                                    required
                                />
                                <span>
                                    Acepto los{' '}
                                    <a href="https://simpleplataforma.app/terminos" target="_blank" rel="noreferrer" className="font-medium underline" style={{ color: 'var(--fg)' }}>Términos</a>
                                    {' '}y la{' '}
                                    <a href="https://simpleplataforma.app/privacidad" target="_blank" rel="noreferrer" className="font-medium underline" style={{ color: 'var(--fg)' }}>Política de privacidad</a>.
                                </span>
                            </label>
                            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                <IconShieldCheck size={13} />
                                Protegido por reCAPTCHA cuando está configurado.
                            </p>
                            <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting || !canSubmitRegister}>
                                {submitting ? 'Creando...' : 'Registrarse'}
                            </PanelButton>
                        </form>
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
                        <form onSubmit={handleRecovery} className="space-y-0" aria-label="Formulario de recuperación de contraseña">
                            <div className="relative flex items-center">
                                <IconMail size={16} className="pointer-events-none absolute" style={{ color: 'var(--fg-muted)', left: '12px' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="Correo electrónico" required style={{ background: 'var(--surface)', color: 'var(--fg)', borderColor: 'var(--border)', paddingLeft: '40px' }} />
                            </div>
                            <PanelButton type="submit" variant="primary" className="w-full mt-4" disabled={submitting || recoveryCooldown > 0}>
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
                        <button
                            type="button"
                            onClick={() => void logout().finally(() => handleClose())}
                            className="mt-3 w-full text-sm font-medium py-2.5 rounded-lg transition-colors"
                            style={{
                                background: 'transparent',
                                color: 'var(--fg-muted)',
                                border: '1px solid var(--border)',
                            }}
                            disabled={submitting}
                        >
                            Cerrar sesión
                        </button>
                    </>
                )}
                </div>
            </div>
        </div>,
        portalElement
    );
}
