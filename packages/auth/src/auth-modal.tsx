'use client';

import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { IconX, IconBrandGoogle, IconMail, IconLock, IconUser, IconMailCheck, IconPhone, IconShieldCheck } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { PanelButton } from '@simple/ui/panel';
import { PanelNotice } from '@simple/ui/panel';
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

const INPUT_CLASS = 'form-input form-input-has-leading-icon w-full';
const INPUT_STYLE: CSSProperties = {
    background: 'var(--surface)',
    color: 'var(--fg)',
    borderColor: 'var(--border)',
    height: '44px',
};
const ICON_STYLE: CSSProperties = { color: 'var(--fg-muted)', left: '14px', top: '50%', transform: 'translateY(-50%)' };
const LABEL_CLASS = 'text-xs font-medium';
const LABEL_STYLE: CSSProperties = { color: 'var(--fg-muted)' };
const BTN_CLASS = 'h-11 w-full';
const FORM_STACK_STYLE: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px' };

function Field({ label, htmlFor, icon, children }: { label: string; htmlFor: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={htmlFor} className={LABEL_CLASS} style={LABEL_STYLE}>
                {label}
            </label>
            <div className="relative w-full">
                <span className="pointer-events-none absolute flex" style={ICON_STYLE}>
                    {icon}
                </span>
                {children}
            </div>
        </div>
    );
}

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
    const [suggestGoogleLogin, setSuggestGoogleLogin] = useState(false);

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
        setSuggestGoogleLogin(false);
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
        setSuggestGoogleLogin(false);
        setSubmitting(true);
        const result = await login(email, password);
        setSubmitting(false);
        if (!result.ok || !result.user) {
            if (result.code === 'google_only') {
                setSuggestGoogleLogin(true);
                setPassword('');
                setError('');
                return;
            }
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-6 bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                tabIndex={-1}
                className="relative w-full max-w-[26rem] max-h-[92dvh] overflow-y-auto rounded-3xl shadow-2xl animate-scale-in"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    aria-label="Cerrar modal"
                    disabled={submitting}
                    type="button"
                    className="absolute top-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none transition-colors hover:bg-black/5"
                    style={{
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        color: 'var(--fg-muted)',
                        opacity: submitting ? 0.5 : 1,
                    }}
                >
                    <IconX size={20} strokeWidth={2.5} />
                </button>

                <div className="p-6 sm:p-7">
                {mode === 'login' && (
                    <>
                        <div className="pr-10 mb-5">
                            <h2 id="auth-modal-title" className="text-lg font-semibold leading-snug" style={{ color: 'var(--fg)' }}>
                                Iniciar sesión
                            </h2>
                            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                Si ya tienes cuenta en Simple, usa el mismo correo o Google.
                            </p>
                        </div>
                        {error ? (
                            <PanelNotice tone="error" className="mb-4">
                                {error}
                            </PanelNotice>
                        ) : null}
                        <GoogleLoginButton
                            disabled={submitting}
                            highlighted={suggestGoogleLogin}
                            onError={(message) => setError(message)}
                        >
                            <PanelButton variant="primary" className={BTN_CLASS} disabled={submitting}>
                                <IconBrandGoogle size={16} /> Continuar con Google
                            </PanelButton>
                        </GoogleLoginButton>
                        {suggestGoogleLogin ? (
                            <PanelNotice tone="info" className="mt-4 mb-1">
                                <p>Esta cuenta usa Google. Pulsa el botón de arriba para continuar.</p>
                            </PanelNotice>
                        ) : null}
                        <div className="flex items-center gap-3 my-6">
                            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                            <span className="text-xs shrink-0 px-1" style={{ color: 'var(--fg-muted)' }}>
                                o con correo
                            </span>
                            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                        </div>
                        <form onSubmit={handleLogin} style={FORM_STACK_STYLE} aria-label="Formulario de inicio de sesión">
                            <div className="relative w-full">
                                <IconMail size={16} className="pointer-events-none absolute" style={ICON_STYLE} />
                                <input
                                    id="auth-login-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={INPUT_CLASS}
                                    placeholder="Correo electrónico"
                                    required
                                    style={INPUT_STYLE}
                                />
                            </div>
                            <div className="relative w-full">
                                <IconLock size={16} className="pointer-events-none absolute" style={ICON_STYLE} />
                                <input
                                    id="auth-login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={INPUT_CLASS}
                                    placeholder="Contraseña"
                                    required
                                    style={INPUT_STYLE}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-0.5">
                                <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
                                    <input
                                        type="checkbox"
                                        checked={rememberEmail}
                                        onChange={(event) => setRememberEmail(event.target.checked)}
                                        className="h-4 w-4 rounded"
                                    />
                                    Recordar cuenta
                                </label>
                                <button type="button" onClick={() => { setMode('recovery'); setError(''); setSuccess(''); setSuggestGoogleLogin(false); }} className="text-xs font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                            <PanelButton type="submit" variant="secondary" className={BTN_CLASS} disabled={submitting}>
                                {submitting ? 'Ingresando...' : 'Iniciar sesión con correo'}
                            </PanelButton>
                        </form>
                        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4 text-sm" style={{ borderColor: 'var(--border)' }}>
                            <span style={{ color: 'var(--fg-muted)' }}>¿No tienes cuenta?</span>
                            {allowRegister ? (
                                <button onClick={() => { setMode('register'); setError(''); setSuggestGoogleLogin(false); }} className="font-semibold" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                    Crear cuenta
                                </button>
                            ) : null}
                        </div>
                    </>
                )}

                {allowRegister && mode === 'register' && (
                    <>
                        <div className="pr-10 mb-7">
                            <h2 id="auth-modal-title" className="text-xl font-semibold leading-tight" style={{ color: 'var(--fg)' }}>
                                Crear tu cuenta
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                Completa tus datos para crear tu cuenta.
                            </p>
                        </div>
                        {error ? (
                            <PanelNotice tone="error" className="mb-5">
                                {error}
                            </PanelNotice>
                        ) : null}
                        {registerIntro ? <div className="mb-5">{registerIntro}</div> : null}
                        <form onSubmit={handleRegister} className="grid gap-4" aria-label="Formulario de registro">
                            <Field label="Nombre completo" htmlFor="auth-register-name" icon={<IconUser size={16} />}>
                                <input id="auth-register-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder="Tu nombre y apellido" required style={INPUT_STYLE} />
                            </Field>
                            <div className="grid gap-1.5">
                                <label htmlFor="auth-register-phone" className={LABEL_CLASS} style={LABEL_STYLE}>
                                    WhatsApp
                                </label>
                                <div className="relative flex items-center">
                                    <span className="pointer-events-none absolute flex" style={ICON_STYLE}>
                                        <IconPhone size={16} />
                                    </span>
                                    <span className="pointer-events-none absolute text-sm font-medium" style={{ color: 'var(--fg)', left: '42px' }}>
                                        +569
                                    </span>
                                    <input
                                        id="auth-register-phone"
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
                                        style={{ ...INPUT_STYLE, paddingLeft: '84px' }}
                                    />
                                </div>
                            </div>
                            <Field label="Correo electrónico" htmlFor="auth-register-email" icon={<IconMail size={16} />}>
                                <input id="auth-register-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} placeholder="tucorreo@ejemplo.com" required style={INPUT_STYLE} />
                            </Field>
                            <div className="grid gap-1.5">
                                <Field label="Contraseña" htmlFor="auth-register-password" icon={<IconLock size={16} />}>
                                    <input id="auth-register-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_CLASS} placeholder="Mínimo 8 caracteres" required style={INPUT_STYLE} />
                                </Field>
                                {password ? (
                                    <p className="text-xs" style={{ color: passwordStrength === 'Débil' ? '#dc2626' : 'var(--fg-muted)' }}>
                                        Fortaleza: {passwordStrength}
                                    </p>
                                ) : null}
                            </div>
                            <Field label="Confirmar contraseña" htmlFor="auth-register-confirm" icon={<IconLock size={16} />}>
                                <input id="auth-register-confirm" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={INPUT_CLASS} placeholder="Repite tu contraseña" required style={INPUT_STYLE} />
                            </Field>
                            <label className="mt-2 flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
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
                            <PanelButton type="submit" variant="primary" className={`mt-2 ${BTN_CLASS}`} disabled={submitting || !canSubmitRegister}>
                                {submitting ? 'Creando...' : 'Crear cuenta'}
                            </PanelButton>
                        </form>
                        <div className="mt-7 flex items-center justify-center gap-1.5 border-t pt-5 text-sm" style={{ borderColor: 'var(--border)' }}>
                            <span style={{ color: 'var(--fg-muted)' }}>¿Ya tienes cuenta?</span>
                            <button onClick={() => { setMode('login'); setError(''); }} className="font-semibold" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                Iniciar sesión
                            </button>
                        </div>
                    </>
                )}

                {mode === 'recovery' && (
                    <>
                        <div className="pr-10 mb-7">
                            <h2 id="auth-modal-title" className="text-xl font-semibold leading-tight" style={{ color: 'var(--fg)' }}>
                                Recuperar contraseña
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                Te enviaremos un enlace para restablecer tu contraseña.
                            </p>
                        </div>
                        {error ? (
                            <PanelNotice tone="error" className="mb-5">
                                {error}
                            </PanelNotice>
                        ) : null}
                        {success ? (
                            <PanelNotice tone="success" className="mb-5">
                                {success}
                            </PanelNotice>
                        ) : null}
                        <form onSubmit={handleRecovery} className="grid gap-4" aria-label="Formulario de recuperación de contraseña">
                            <Field label="Correo electrónico" htmlFor="auth-recovery-email" icon={<IconMail size={16} />}>
                                <input id="auth-recovery-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} placeholder="tucorreo@ejemplo.com" required style={INPUT_STYLE} />
                            </Field>
                            <PanelButton type="submit" variant="primary" className={`mt-1 ${BTN_CLASS}`} disabled={submitting || recoveryCooldown > 0}>
                                {recoveryCooldown > 0 ? `Reintenta en ${recoveryCooldown}s` : 'Enviar enlace'}
                            </PanelButton>
                        </form>
                        <div className="mt-7 flex justify-center border-t pt-5 text-sm" style={{ borderColor: 'var(--border)' }}>
                            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="font-medium" style={{ color: 'var(--fg)' }} disabled={submitting}>
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </>
                )}

                {mode === 'verify-email' && (
                    <>
                        <div className="text-center mb-7">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                <IconMailCheck size={32} style={{ color: 'rgb(34, 197, 94)' }} />
                            </div>
                            <h2 id="auth-modal-title" className="text-xl font-semibold leading-tight" style={{ color: 'var(--fg)' }}>
                                Verifica tu email
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                Te hemos enviado un email a<br />
                                <span className="font-semibold" style={{ color: 'var(--fg)' }}>{registeredEmail}</span>
                            </p>
                        </div>

                        <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                                <strong>¿Qué hacer ahora?</strong><br />
                                1. Abre el email que recibiste<br />
                                2. Haz clic en el botón «Confirmar correo»<br />
                                3. ¡Listo! Tu cuenta estará verificada
                            </p>
                        </div>

                        {error ? (
                            <PanelNotice tone="error" className="mb-5">
                                {error}
                            </PanelNotice>
                        ) : null}
                        {success ? (
                            <PanelNotice tone="success" className="mb-5">
                                {success}
                            </PanelNotice>
                        ) : null}

                        <div className="grid gap-3">
                            <PanelButton variant="secondary" className={BTN_CLASS} onClick={handleResendVerificationEmail} disabled={submitting}>
                                {submitting ? 'Reenviando...' : 'Reenviar email de confirmación'}
                            </PanelButton>
                            <PanelButton
                                variant="ghost"
                                className={BTN_CLASS}
                                onClick={() => void logout().finally(() => handleClose())}
                                disabled={submitting}
                            >
                                Cerrar sesión
                            </PanelButton>
                        </div>

                        <div className="mt-7 flex items-center justify-center gap-1.5 border-t pt-5 text-sm" style={{ borderColor: 'var(--border)' }}>
                            <span style={{ color: 'var(--fg-muted)' }}>¿Problemas?</span>
                            <button
                                onClick={() => { setMode('login'); setError(''); setSuccess(''); setRegisteredEmail(''); }}
                                className="font-semibold"
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
        </div>,
        portalElement
    );
}
