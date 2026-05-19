'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconBrandGoogle,
    IconBuildingStore,
    IconCheck,
    IconLock,
    IconMail,
    IconMailCheck,
    IconUser,
    IconUsersGroup,
} from '@tabler/icons-react';
import { GoogleLoginButton, useAuth } from '@simple/auth';
import { API_BASE, getSimpleAppBrand } from '@simple/config';
import { PanelButton, PanelNotice } from '@simple/ui';
import { ensureOwnerProfileFromSignup } from '@/lib/owner-signup-bootstrap';
import { persistSignupDrafts } from '@/lib/active-provider-group';
import { persistSignupProfile } from '@/lib/signup-profile';
import { serenatasApi } from '@/lib/serenatas-api';

const TOTAL_STEPS = 3;

const brandBenefits = [
    'Gestiona músicos, grupos y agenda en un solo panel',
    'Marketplace para recibir solicitudes de clientes',
    'Mapa, rutas y operación del día desde el celular',
];

const brandStats = [
    { value: '1 min', label: 'Para registrarte' },
    { value: 'Gratis', label: 'Panel completo' },
    { value: 'Chile', label: 'Regiones y comunas' },
];

export function OwnerGroupRegisterPage() {
    const router = useRouter();
    const { user, isLoggedIn, authLoading, register, openAuth, refreshSession } = useAuth();
    const [step, setStep] = useState(1);
    const [groupName, setGroupName] = useState('');
    const [coordinatorName, setCoordinatorName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

    useEffect(() => {
        persistSignupProfile('owner');
        sessionStorage.setItem('auth.returnTo', '/para-duenos');
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!isLoggedIn || user?.status !== 'verified') return;

        let cancelled = false;
        void (async () => {
            const activated = await ensureOwnerProfileFromSignup({ refreshSession: () => refreshSession() });
            if (cancelled) return;
            const profilesResponse = await serenatasApi.profiles();
            const hasOwner = profilesResponse.ok && Boolean(profilesResponse.profiles.owner);
            if (activated || hasOwner) {
                router.replace('/panel');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, isLoggedIn, user?.status, router, refreshSession]);

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

    useEffect(() => {
        if (step >= 2) persistSignupDrafts(groupName, coordinatorName);
    }, [step, groupName, coordinatorName]);

    function goNext() {
        setError('');
        if (step === 1) {
            if (!groupName.trim()) {
                setError('Ingresa el nombre de tu grupo o mariachi.');
                return;
            }
            if (!coordinatorName.trim()) {
                setError('Ingresa tu nombre como dueño.');
                return;
            }
            persistSignupDrafts(groupName, coordinatorName);
            setStep(2);
            return;
        }
        if (step === 2) {
            if (!email.trim()) {
                setError('Ingresa tu correo electrónico.');
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
            setStep(3);
        }
    }

    function goBack() {
        setError('');
        if (step > 1) {
            setStep((prev) => prev - 1);
            return;
        }
        router.push('/');
    }

    async function handleCreateAccount(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        persistSignupDrafts(groupName, coordinatorName);
        setSubmitting(true);
        sessionStorage.setItem('auth.returnTo', '/para-duenos');
        const result = await register(coordinatorName.trim(), email.trim(), password);
        setSubmitting(false);
        if (!result.ok || !result.user) {
            setError(result.error || 'No pudimos completar el registro.');
            return;
        }
        if (result.user.status === 'verified') {
            const activated = await ensureOwnerProfileFromSignup({ refreshSession: () => refreshSession() });
            if (activated) {
                router.replace('/panel');
            }
            return;
        }
        setVerifyEmail(result.user.email);
    }

    async function handleResendVerification() {
        if (!verifyEmail) return;
        setError('');
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/email-verification/request`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail }),
            });
            const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
            if (!response.ok || !data?.ok) {
                setError(data?.error || 'No pudimos reenviar el correo. Inténtalo más tarde.');
                return;
            }
        } catch {
            setError('No pudimos reenviar el correo. Inténtalo más tarde.');
        } finally {
            setSubmitting(false);
        }
    }

    const appName = getSimpleAppBrand('simpleserenatas').name;
    const showForm = !verifyEmail;

    return (
        <div className="auth-register-page flex min-h-screen flex-col lg:flex-row">
            <div className="auth-register-form flex flex-1 flex-col bg-white dark:bg-[var(--surface)]">
                <div className="flex flex-1 flex-col px-5 py-6 sm:px-10 sm:py-8 lg:max-w-xl lg:px-14 lg:py-10">
                    <button
                        type="button"
                        onClick={goBack}
                        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium landing-text-secondary transition hover:landing-text-accent"
                    >
                        <IconArrowLeft size={18} />
                        Volver
                    </button>

                    <div className="mb-8 flex justify-center">
                        <Link href="/" className="inline-flex items-center gap-2 font-bold landing-text-fg">
                            <span className="auth-register-logo flex h-9 w-9 items-center justify-center rounded-xl text-white">
                                <IconUsersGroup size={20} stroke={1.75} />
                            </span>
                            <span className="text-lg">{appName}</span>
                        </Link>
                    </div>

                    {showForm ? (
                        <>
                            <RegisterProgress step={step} total={TOTAL_STEPS} />
                            <h1 className="mt-6 text-2xl font-bold tracking-tight landing-text-fg sm:text-3xl">
                                {step === 1
                                    ? 'Crea tu cuenta de dueño'
                                    : step === 2
                                      ? 'Datos de acceso'
                                      : 'Confirma y crea tu cuenta'}
                            </h1>
                            <p className="mt-2 text-sm landing-text-muted sm:text-base">
                                {step === 1
                                    ? 'Indica el nombre de tu mariachi o grupo y tu nombre como dueño.'
                                    : step === 2
                                      ? 'Usarás este correo para entrar al panel de dueño.'
                                      : 'Revisa los datos antes de activar tu prueba gratuita.'}
                            </p>

                            {error ? (
                                <PanelNotice tone="error" className="mt-4">
                                    {error}
                                </PanelNotice>
                            ) : null}

                            <form
                                className="mt-8 flex flex-1 flex-col"
                                onSubmit={
                                    step === 3
                                        ? handleCreateAccount
                                        : (e) => {
                                              e.preventDefault();
                                              goNext();
                                          }
                                }
                            >
                                <div className="flex-1 space-y-4">
                                    {step === 1 ? (
                                        <>
                                            <AuthField
                                                icon={IconBuildingStore}
                                                label="Nombre del mariachi o grupo"
                                                value={groupName}
                                                onChange={setGroupName}
                                                placeholder="Ej. Mariachi Los Andes"
                                                required
                                            />
                                            <AuthField
                                                icon={IconUser}
                                                label="Tu nombre (dueño)"
                                                value={coordinatorName}
                                                onChange={setCoordinatorName}
                                                placeholder="Nombre y apellido"
                                                required
                                            />
                                        </>
                                    ) : null}

                                    {step === 2 ? (
                                        <>
                                            <AuthField
                                                icon={IconMail}
                                                label="Correo electrónico"
                                                type="email"
                                                value={email}
                                                onChange={setEmail}
                                                placeholder="tu@correo.cl"
                                                required
                                            />
                                            <AuthField
                                                icon={IconLock}
                                                label="Contraseña"
                                                type="password"
                                                value={password}
                                                onChange={setPassword}
                                                placeholder="Mínimo 8 caracteres"
                                                minLength={8}
                                                required
                                            />
                                            {password ? (
                                                <p
                                                    className={`text-xs ${passwordStrength === 'Débil' ? 'auth-text-danger' : 'landing-text-muted'}`}
                                                >
                                                    Fortaleza: {passwordStrength}
                                                </p>
                                            ) : null}
                                            <AuthField
                                                icon={IconLock}
                                                label="Confirmar contraseña"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={setConfirmPassword}
                                                placeholder="Repite tu contraseña"
                                                minLength={8}
                                                required
                                            />
                                        </>
                                    ) : null}

                                    {step === 3 ? (
                                        <div className="space-y-3 rounded-xl border p-4 text-sm landing-border landing-bg-subtle">
                                            <SummaryRow label="Mariachi / grupo" value={groupName.trim()} />
                                            <SummaryRow label="Dueño" value={coordinatorName.trim()} />
                                            <SummaryRow label="Correo" value={email.trim()} />
                                            <p className="pt-1 text-xs landing-text-muted">
                                                Al crear tu cuenta activarás el perfil de dueño sin costo ni tarjeta.
                                            </p>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="mt-8 space-y-3 pb-4">
                                    <PanelButton
                                        type="submit"
                                        variant="primary"
                                        className="h-12 w-full text-base font-semibold"
                                        disabled={submitting}
                                    >
                                        {step === 3
                                            ? submitting
                                                ? 'Creando cuenta…'
                                                : 'Crear cuenta de dueño'
                                            : 'Siguiente'}
                                    </PanelButton>

                                    {step === 2 ? (
                                        <>
                                            <div className="flex items-center gap-3 py-1">
                                                <div className="h-px flex-1 bg-[var(--border)]" />
                                                <span className="text-xs landing-text-muted">o</span>
                                                <div className="h-px flex-1 bg-[var(--border)]" />
                                            </div>
                                            <GoogleLoginButton
                                                disabled={submitting}
                                                onError={(message) => setError(message)}
                                            >
                                                <PanelButton
                                                    type="button"
                                                    variant="secondary"
                                                    className="h-12 w-full"
                                                    disabled={submitting}
                                                >
                                                    <IconBrandGoogle size={16} />
                                                    Continuar con Google
                                                </PanelButton>
                                            </GoogleLoginButton>
                                        </>
                                    ) : null}

                                    <p className="text-center text-sm landing-text-muted">
                                        ¿Ya tienes cuenta?{' '}
                                        <button
                                            type="button"
                                            className="font-semibold landing-text-accent hover:underline"
                                            onClick={() => openAuth('login')}
                                        >
                                            Iniciar sesión
                                        </button>
                                    </p>
                                </div>
                            </form>
                        </>
                    ) : (
                        <VerifyEmailPanel
                            email={verifyEmail!}
                            error={error}
                            submitting={submitting}
                            onResend={() => void handleResendVerification()}
                            onLogin={() => openAuth('login')}
                        />
                    )}
                </div>
            </div>

            <AdminRegisterBrandPanel />
            <AdminRegisterBrandMobile />
        </div>
    );
}

function AdminRegisterBrandMobile() {
    return (
        <div className="auth-register-brand-mobile px-5 py-8 lg:hidden">
            <p className="text-lg font-bold">Administra tu mariachi como un negocio</p>
            <ul className="mt-4 space-y-2 text-sm opacity-90">
                {brandBenefits.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                        <IconCheck size={16} className="mt-0.5 shrink-0" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function RegisterProgress({ step, total }: { step: number; total: number }) {
    return (
        <div>
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] landing-text-muted">
                Paso {step} de {total}
            </p>
            <div className="mt-3 flex gap-2">
                {Array.from({ length: total }, (_, i) => (
                    <div
                        key={i}
                        className={`auth-register-progress-segment h-1 flex-1 rounded-full ${i < step ? 'auth-register-progress-active' : 'auth-register-progress-idle'}`}
                    />
                ))}
            </div>
        </div>
    );
}

function AuthField({
    icon: Icon,
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    required,
    minLength,
}: {
    icon: typeof IconUser;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
    minLength?: number;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium landing-text-fg">{label}</span>
            <div className="relative flex items-center">
                <Icon size={16} className="pointer-events-none absolute left-3 landing-text-muted" />
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="form-input w-full pl-10"
                    placeholder={placeholder}
                    required={required}
                    minLength={minLength}
                    style={{
                        background: 'var(--surface)',
                        color: 'var(--fg)',
                        borderColor: 'var(--border)',
                    }}
                />
            </div>
        </label>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0 landing-border">
            <span className="landing-text-muted">{label}</span>
            <span className="text-right font-semibold landing-text-fg">{value}</span>
        </div>
    );
}

function VerifyEmailPanel({
    email,
    error,
    submitting,
    onResend,
    onLogin,
}: {
    email: string;
    error: string;
    submitting: boolean;
    onResend: () => void;
    onLogin: () => void;
}) {
    return (
        <div className="mx-auto w-full max-w-md text-center">
            <div className="auth-icon-success mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full">
                <IconMailCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold landing-text-fg">Verifica tu correo</h1>
            <p className="mt-2 text-sm landing-text-muted">
                Enviamos un enlace a <span className="font-semibold landing-text-fg">{email}</span>. Confírmalo para
                entrar al panel de dueño.
            </p>
            {error ? (
                <PanelNotice tone="error" className="mt-4 text-left">
                    {error}
                </PanelNotice>
            ) : null}
            <PanelButton type="button" variant="secondary" className="mt-6 w-full" disabled={submitting} onClick={onResend}>
                {submitting ? 'Reenviando…' : 'Reenviar correo de confirmación'}
            </PanelButton>
            <button type="button" className="mt-4 text-sm font-medium landing-text-accent hover:underline" onClick={onLogin}>
                Volver a iniciar sesión
            </button>
        </div>
    );
}

function AdminRegisterBrandPanel() {
    return (
        <aside className="auth-register-brand relative hidden flex-[1.2] flex-col justify-between overflow-hidden px-10 py-12 text-white lg:flex xl:px-14">
            <div className="relative z-10">
                <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                    <IconUsersGroup size={36} stroke={1.5} />
                </div>
                <h2 className="max-w-md text-3xl font-bold leading-tight text-balance xl:text-4xl">
                    Administra tu mariachi como un negocio
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
                    SimpleSerenatas centraliza músicos, agenda, marketplace y logística para dueños de mariachis y
                    serenateros en Chile.
                </p>
                <ul className="mt-8 space-y-4">
                    {brandBenefits.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm font-medium sm:text-base">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                                <IconCheck size={14} stroke={2.5} />
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-8">
                {brandStats.map((stat) => (
                    <div key={stat.label}>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="mt-1 text-xs text-white/75">{stat.label}</p>
                    </div>
                ))}
            </div>
        </aside>
    );
}
