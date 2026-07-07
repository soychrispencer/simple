'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { IconPencil } from '@tabler/icons-react';
import type { StructuredLocation } from '@simple/types';
import { API_BASE } from '@simple/config';
import { resolveAccountAvatarUrl } from '@simple/utils';
import { AvatarUpload } from '../avatar-upload';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelField } from './panel-display.js';
import { PanelPersonalDataList, PanelPersonalDataRow } from './panel-personal-data-list.js';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge } from './panel-primitives.js';

export type PanelAccountPersonalDataUser = {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    status?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
    pendingEmail?: string | null;
    provider?: string | null;
    hasPassword?: boolean | null;
    currentApp?: string | null;
    platformAccesses?: PanelAccountPlatformAccess[] | null;
    timezone?: string | null;
    residence?: StructuredLocation | null;
    residenceCountryCode?: string | null;
    residenceRegionId?: string | null;
    residenceRegionName?: string | null;
    residenceLocalityId?: string | null;
    residenceLocalityName?: string | null;
};

export type PanelAccountPlatformAccess = {
    app: string;
    label: string;
    status?: string | null;
    role?: string | null;
    origin?: string | null;
    firstSeenAt?: string | null;
    activatedAt?: string | null;
    lastLoginAt?: string | null;
};

export type PanelAccountPersonalDataSaveInput = {
    name: string;
    phone: string;
    avatarUrl?: string | null;
};

export type PanelAccountPersonalDataSaveResult = {
    ok: boolean;
    unauthorized?: boolean;
    error?: string;
    pendingEmail?: string;
    disconnected?: boolean;
    url?: string;
};

export type PanelAccountPersonalDataSectionProps = {
    activeSection?: 'personal' | 'security';
    user?: PanelAccountPersonalDataUser | null;
    roleLabel?: string;
    appLabel?: string;
    onSave: (input: PanelAccountPersonalDataSaveInput) => Promise<PanelAccountPersonalDataSaveResult>;
    onUploadAvatar?: (file: File) => Promise<PanelAccountPersonalDataSaveResult>;
    onRequestEmailChange?: (email: string) => Promise<PanelAccountPersonalDataSaveResult>;
    onCancelEmailChange?: () => Promise<PanelAccountPersonalDataSaveResult>;
    onChangePassword?: (input: {
        currentPassword?: string;
        newPassword: string;
        confirmPassword: string;
    }) => Promise<PanelAccountPersonalDataSaveResult>;
    onDisconnectGoogle?: () => Promise<PanelAccountPersonalDataSaveResult>;
    onActivatePlatform?: (app?: string) => Promise<PanelAccountPersonalDataSaveResult>;
    onDeleteAccount?: (input: {
        password?: string;
        confirmPhrase?: string;
    }) => Promise<PanelAccountPersonalDataSaveResult>;
    onSaved?: () => Promise<unknown> | unknown;
    onAfterDelete?: () => Promise<unknown> | unknown;
    onUnauthorized?: () => void;
    /** Ruta a Seguridad para cambiar el correo (apps con rutas separadas). */
    emailSecurityHref?: string;
    /** Navegación in-app a Seguridad (p. ej. Serenatas con pestañas). */
    onEditEmail?: () => void;
};

type NoticeState = { tone: 'success' | 'warning' | 'error'; text: string } | null;

function splitDisplayName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function normalizeChileMobilePhone(phone: string) {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('569')) return `+${cleaned}`;
    if (cleaned.startsWith('9')) return `+56${cleaned}`;
    return cleaned;
}

function isValidChileMobilePhone(phone: string) {
    return phone === '' || /^\+569\d{8}$/.test(phone);
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function platformRoleLabel(role?: string | null) {
    if (role === 'professional') return 'Profesional';
    if (role === 'publisher') return 'Publicador';
    if (role === 'owner') return 'Dueño';
    if (role === 'musician') return 'Músico';
    return 'Usuario';
}

function formatShortDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

async function startGoogleLink() {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.sessionStorage.setItem('auth.returnTo', returnTo);
    const response = await fetch(
        `${API_BASE}/api/auth/google?mode=link&returnTo=${encodeURIComponent(returnTo)}`,
        { credentials: 'include' },
    );
    const data = (await response.json().catch(() => null)) as { authUrl?: string; error?: string } | null;
    if (!response.ok || !data?.authUrl) {
        throw new Error(data?.error || 'No pudimos iniciar la conexión con Google.');
    }
    window.location.href = data.authUrl;
}

function AccountModal({
    title,
    children,
    onClose,
}: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
            <button className="absolute inset-0" type="button" aria-label="Cerrar" onClick={onClose} />
            <div
                className="relative w-full max-w-md rounded-card border p-5 shadow-xl"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-[var(--fg)]">{title}</h2>
                    <button
                        type="button"
                        className="rounded-button border px-3 py-1.5 text-sm text-[var(--fg-secondary)]"
                        style={{ borderColor: 'var(--border)' }}
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function PanelAccountPersonalDataSection({
    activeSection = 'personal',
    user,
    roleLabel,
    appLabel = 'Simple',
    onSave,
    onUploadAvatar,
    onRequestEmailChange,
    onCancelEmailChange,
    onChangePassword,
    onDisconnectGoogle,
    onActivatePlatform,
    onDeleteAccount,
    onSaved,
    onAfterDelete,
    onUnauthorized,
    emailSecurityHref = '/panel/mi-cuenta/seguridad',
    onEditEmail,
}: PanelAccountPersonalDataSectionProps) {
    const initialName = user?.name ?? '';
    const initialPhone = user?.phone ?? '';
    const initialSplitName = useMemo(() => splitDisplayName(initialName), [initialName]);
    const [firstName, setFirstName] = useState(initialSplitName.firstName);
    const [lastName, setLastName] = useState(initialSplitName.lastName);
    const [phone, setPhone] = useState(initialPhone);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar || '');
    const [saving, setSaving] = useState(false);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [notice, setNotice] = useState<NoticeState>(null);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [nextEmail, setNextEmail] = useState('');
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deletePhrase, setDeletePhrase] = useState('');

    const isVerified = user?.status === 'verified';
    const hasPassword = user?.hasPassword !== false;
    const googleConnected = user?.provider === 'google';
    const pendingEmail = user?.pendingEmail?.trim() || '';
    const accountRole = roleLabel ?? user?.role ?? undefined;
    const platformAccesses = user?.platformAccesses ?? [];
    const currentApp = user?.currentApp ?? null;
    const currentPlatform = platformAccesses.find((platform) => platform.app === currentApp);
    const currentPlatformNeedsActivation = Boolean(
        currentApp
        && currentPlatform
        && currentPlatform.status !== 'active'
        && onActivatePlatform,
    );
    const showPersonalSection = activeSection === 'personal';
    const showSecuritySection = activeSection === 'security';
    const canEditEmail = Boolean(onRequestEmailChange) && (Boolean(onEditEmail) || Boolean(emailSecurityHref));

    const emailEditControl = canEditEmail ? (
        onEditEmail ? (
            <button
                type="button"
                onClick={onEditEmail}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg)"
                aria-label="Cambiar correo en Seguridad"
            >
                <IconPencil size={16} />
            </button>
        ) : (
            <Link
                href={emailSecurityHref}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg)"
                aria-label="Cambiar correo en Seguridad"
            >
                <IconPencil size={16} />
            </Link>
        )
    ) : null;
    const displayAvatarUrl = resolveAccountAvatarUrl(avatarUrl);

    useEffect(() => {
        const nextName = splitDisplayName(user?.name ?? '');
        setFirstName(nextName.firstName);
        setLastName(nextName.lastName);
        setPhone(user?.phone ?? '');
        setAvatarUrl(user?.avatarUrl || user?.avatar || '');
    }, [user?.avatar, user?.avatarUrl, user?.name, user?.phone]);

    const profileDirty = useMemo(() => {
        const normalizedName = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' ');
        const normalizedPhone = normalizeChileMobilePhone(phone);
        return normalizedName !== (user?.name ?? '').trim()
            || normalizedPhone !== normalizeChileMobilePhone(user?.phone ?? '');
    }, [firstName, lastName, phone, user?.name, user?.phone]);

    const canSavePersonal = profileDirty;

    const handleResult = async (
        result: PanelAccountPersonalDataSaveResult,
        successText: string,
        refresh = true,
    ) => {
        if (!result.ok) {
            if (result.unauthorized) onUnauthorized?.();
            setNotice({ tone: 'error', text: result.error || 'No se pudo completar la acción.' });
            return false;
        }
        if (refresh) await onSaved?.();
        setNotice({ tone: 'success', text: successText });
        return true;
    };

    const saveProfile = async () => {
        const normalizedName = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' ');
        const normalizedPhone = normalizeChileMobilePhone(phone);

        if (normalizedName.length < 2) {
            setNotice({ tone: 'error', text: 'Ingresa tu nombre para guardar los cambios.' });
            return;
        }
        if (!isValidChileMobilePhone(normalizedPhone)) {
            setNotice({ tone: 'error', text: 'Ingresa un teléfono válido con formato +569XXXXXXXX.' });
            return;
        }

        setSaving(true);
        setNotice(null);
        const result = await onSave({ name: normalizedName, phone: normalizedPhone, avatarUrl: avatarUrl || null });
        if (!result.ok) {
            setSaving(false);
            if (result.unauthorized) onUnauthorized?.();
            setNotice({ tone: 'error', text: result.error || 'No se pudo completar la acción.' });
            return;
        }

        setSaving(false);
        await onSaved?.();
        setNotice({ tone: 'success', text: 'Datos personales actualizados.' });
        setPhone(normalizedPhone);
    };

    const submitEmailChange = async () => {
        const email = nextEmail.trim().toLowerCase();
        if (!isValidEmail(email)) {
            setNotice({ tone: 'error', text: 'Ingresa un correo válido.' });
            return;
        }
        if (!onRequestEmailChange) return;
        setBusyAction('email-change');
        const result = await onRequestEmailChange(email);
        setBusyAction(null);
        if (await handleResult(result, `Enviamos un enlace de confirmación a ${result.pendingEmail || email}.`)) {
            setEmailModalOpen(false);
            setNextEmail('');
        }
    };

    const resendPendingEmail = async () => {
        if (!pendingEmail || !onRequestEmailChange) return;
        setBusyAction('email-resend');
        const result = await onRequestEmailChange(pendingEmail);
        setBusyAction(null);
        await handleResult(result, `Reenviamos el enlace a ${result.pendingEmail || pendingEmail}.`);
    };

    const cancelPendingEmail = async () => {
        if (!onCancelEmailChange) return;
        setBusyAction('email-cancel');
        const result = await onCancelEmailChange();
        setBusyAction(null);
        await handleResult(result, 'Cambio de correo cancelado.');
    };

    const handleGoogleAction = async () => {
        setBusyAction('google');
        setNotice(null);
        if (googleConnected) {
            if (!onDisconnectGoogle) return;
            const result = await onDisconnectGoogle();
            setBusyAction(null);
            await handleResult(result, result.disconnected ? 'Google desconectado.' : 'Google ya estaba desconectado.');
            return;
        }
        try {
            await startGoogleLink();
        } catch (error) {
            setBusyAction(null);
            setNotice({
                tone: 'error',
                text: error instanceof Error ? error.message : 'No pudimos iniciar la conexión con Google.',
            });
        }
    };

    const handleActivatePlatform = async (app?: string | null) => {
        if (!onActivatePlatform || !app) return;
        setBusyAction(`platform-${app}`);
        setNotice(null);
        const result = await onActivatePlatform(app);
        setBusyAction(null);
        await handleResult(result, 'Plataforma activada en tu cuenta.');
    };

    const submitPasswordChange = async () => {
        if (!onChangePassword) return;
        if (newPassword.length < 8) {
            setNotice({ tone: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        setBusyAction('password');
        const result = await onChangePassword({ currentPassword, newPassword, confirmPassword });
        setBusyAction(null);
        if (await handleResult(result, hasPassword ? 'Contraseña actualizada.' : 'Contraseña creada.')) {
            setPasswordModalOpen(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const submitDeleteAccount = async () => {
        if (!onDeleteAccount) return;
        setBusyAction('delete');
        const result = await onDeleteAccount({
            password: deletePassword,
            confirmPhrase: deletePhrase,
        });
        setBusyAction(null);
        if (!result.ok) {
            setNotice({ tone: 'error', text: result.error || 'No se pudo eliminar la cuenta.' });
            return;
        }
        setDeleteModalOpen(false);
        await onAfterDelete?.();
    };

    return (
        <div className="flex flex-col gap-6">
            {showPersonalSection ? (
            <PanelCard>
                <PanelBlockHeader
                    title="Datos personales"
                    description="Nombre, contacto y foto de tu Cuenta Simple. Tu residencia y direcciones están en la pestaña Ubicación."
                    actions={
                        <PanelStatusBadge
                            label={isVerified ? 'Correo verificado' : 'Correo pendiente'}
                            tone={isVerified ? 'success' : 'warning'}
                            size="sm"
                        />
                    }
                />

                <div className="flex flex-col gap-5">
                    <div
                        className="flex w-full items-start gap-3 rounded-xl border p-2.5"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <AvatarUpload
                            currentUrl={displayAvatarUrl}
                            variant="overlay"
                            config={{
                                maxSize: 5120,
                                maxWidth: 512,
                                maxHeight: 512,
                                displaySize: 64,
                                shape: 'panel',
                                onUpload: async (file, croppedBlob) => {
                                    if (!onUploadAvatar) throw new Error('Subida de avatar no configurada.');
                                    const uploadFile = new File([croppedBlob], file.name || 'avatar.webp', { type: 'image/webp' });
                                    const result = await onUploadAvatar(uploadFile);
                                    if (!result.ok || !result.url) throw new Error(result.error || 'No pudimos subir tu foto.');
                                    setAvatarUrl(result.url);
                                    await onSaved?.();
                                    return { url: result.url };
                                },
                            }}
                            onSuccess={(url) => {
                                setAvatarUrl(url);
                                if (!url) void onSave({
                                    name: [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' '),
                                    phone,
                                    avatarUrl: null,
                                }).then((result) => handleResult(result, 'Foto eliminada.'));
                            }}
                            onError={(error) => setNotice({ tone: 'error', text: error })}
                        />
                        <div className="min-w-0 flex-1 pt-0.5">
                            <p className="truncate text-sm font-medium text-[var(--fg)]">{user?.name || 'Usuario Simple'}</p>
                            <p className="truncate text-xs text-[var(--fg-muted)]">{accountRole || 'Usuario'}</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-[var(--fg-muted)]">
                                JPG, PNG o WebP · máx. 5&nbsp;MB · cuadrada hasta 512×512&nbsp;px.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <PanelField label="Nombre" required>
                            <input
                                className="form-input"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                placeholder="Nombre"
                                autoComplete="given-name"
                            />
                        </PanelField>
                        <PanelField label="Apellido">
                            <input
                                className="form-input"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                placeholder="Apellido"
                                autoComplete="family-name"
                            />
                        </PanelField>
                        <PanelField label="Teléfono">
                            <input
                                className="form-input"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value.replace(/[^\d+]/g, ''))}
                                onBlur={() => setPhone((current) => normalizeChileMobilePhone(current))}
                                placeholder="+56912345678"
                                inputMode="tel"
                                autoComplete="tel"
                            />
                        </PanelField>
                        <PanelField label="Correo">
                            <div className="relative">
                                <div
                                    className={`form-input flex min-h-11 items-center truncate text-(--fg) ${canEditEmail ? 'pr-10' : ''}`}
                                >
                                    {user?.email || 'Sin correo'}
                                </div>
                                {emailEditControl}
                            </div>
                            {pendingEmail ? (
                                <p className="mt-1 text-xs text-(--fg-muted)">
                                    Cambio pendiente a {pendingEmail}. Confírmalo desde{' '}
                                    {onEditEmail ? (
                                        <button
                                            type="button"
                                            onClick={onEditEmail}
                                            className="font-medium text-(--accent) underline-offset-2 hover:underline"
                                        >
                                            Seguridad
                                        </button>
                                    ) : (
                                        <Link
                                            href={emailSecurityHref}
                                            className="font-medium text-(--accent) underline-offset-2 hover:underline"
                                        >
                                            Seguridad
                                        </Link>
                                    )}
                                    .
                                </p>
                            ) : canEditEmail ? (
                                <p className="mt-1 text-xs text-(--fg-muted)">
                                    El correo se cambia con confirmación por enlace en Seguridad.
                                </p>
                            ) : null}
                        </PanelField>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <PanelButton variant="accent" onClick={() => void saveProfile()} disabled={saving || !canSavePersonal}>
                        {saving ? 'Guardando...' : 'Guardar datos personales'}
                    </PanelButton>
                    {notice ? (
                        <PanelNotice tone={notice.tone} className="sm:max-w-md">
                            {notice.text}
                        </PanelNotice>
                    ) : null}
                </div>
            </PanelCard>
            ) : null}

            {showSecuritySection ? (
            <>
            {notice ? (
                <PanelNotice tone={notice.tone}>
                    {notice.text}
                </PanelNotice>
            ) : null}
            <PanelCard>
                <PanelBlockHeader
                    title="Inicio de sesión"
                    description="Gestiona cómo entras a tu cuenta."
                />
                <PanelPersonalDataList>
                    <PanelPersonalDataRow
                        label="Correo"
                        value={pendingEmail || user?.email || 'Sin correo'}
                        valueHint={
                            pendingEmail
                                ? `Correo actual: ${user?.email}. Confirma el enlace en el buzón nuevo.`
                                : undefined
                        }
                        valueStatus={pendingEmail ? 'warning' : isVerified ? 'success' : 'warning'}
                        actions={
                            pendingEmail
                                ? [
                                    {
                                        label: 'Reenviar',
                                        onClick: () => void resendPendingEmail(),
                                        loading: busyAction === 'email-resend',
                                        disabled: Boolean(busyAction),
                                    },
                                    {
                                        label: 'Cancelar',
                                        onClick: () => void cancelPendingEmail(),
                                        loading: busyAction === 'email-cancel',
                                        disabled: Boolean(busyAction),
                                    },
                                ]
                                : [
                                    {
                                        label: 'Cambiar',
                                        onClick: () => {
                                            setNextEmail('');
                                            setEmailModalOpen(true);
                                        },
                                        disabled: !onRequestEmailChange,
                                    },
                                ]
                        }
                    />
                    <PanelPersonalDataRow
                        label="Google"
                        value={googleConnected ? 'Conectado' : 'No vinculado'}
                        valueStatus={googleConnected ? 'success' : 'neutral'}
                        valueHint={
                            !googleConnected && user?.email
                                ? `Elige en Google la cuenta ${user.email}.`
                                : undefined
                        }
                        actions={[
                            {
                                label: googleConnected ? 'Desconectar' : 'Conectar',
                                onClick: () => void handleGoogleAction(),
                                loading: busyAction === 'google',
                                disabled: Boolean(busyAction) || (googleConnected && !onDisconnectGoogle),
                            },
                        ]}
                    />
                    <PanelPersonalDataRow
                        label="Contraseña"
                        value={hasPassword ? 'Configurada' : 'Sin configurar'}
                        valueStatus={hasPassword ? 'success' : 'warning'}
                        valueHint={googleConnected && !hasPassword ? 'Recomendado para entrar sin Google.' : undefined}
                        actions={[
                            {
                                label: hasPassword ? 'Cambiar' : 'Crear',
                                onClick: () => {
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setPasswordModalOpen(true);
                                },
                                disabled: !onChangePassword,
                            },
                        ]}
                    />
                </PanelPersonalDataList>
            </PanelCard>

            {platformAccesses.length > 0 ? (
                <PanelCard>
                    <PanelBlockHeader
                        title="Plataformas del ecosistema"
                        description="Tu Cuenta Simple puede usarse en otras plataformas solo cuando tú las activas."
                    />
                    {currentPlatformNeedsActivation ? (
                        <PanelNotice tone="warning" className="mb-4">
                            Ya tienes una Cuenta Simple. Activa esta plataforma para usarla con la misma cuenta, o cierra sesión si prefieres entrar con otro correo.
                        </PanelNotice>
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-2">
                        {platformAccesses.map((platform) => {
                            const isActive = platform.status === 'active';
                            const isCurrent = platform.app === currentApp;
                            const activatedDate = formatShortDate(platform.activatedAt);
                            const lastLoginDate = formatShortDate(platform.lastLoginAt);
                            return (
                                <div
                                    key={platform.app}
                                    className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-[var(--fg)]">{platform.label}</p>
                                            {isCurrent ? (
                                                <PanelStatusBadge label="Actual" tone="neutral" size="sm" />
                                            ) : null}
                                            <PanelStatusBadge
                                                label={isActive ? 'Activa' : 'No activada'}
                                                tone={isActive ? 'success' : 'neutral'}
                                                size="sm"
                                            />
                                        </div>
                                        <p className="mt-1 text-sm text-[var(--fg-muted)]">
                                            {platformRoleLabel(platform.role)}
                                            {activatedDate ? ` · Activada ${activatedDate}` : ''}
                                            {!activatedDate && lastLoginDate ? ` · Último ingreso ${lastLoginDate}` : ''}
                                        </p>
                                    </div>
                                    {!isActive && isCurrent && onActivatePlatform ? (
                                        <PanelButton
                                            type="button"
                                            variant="secondary"
                                            className="w-full sm:w-auto"
                                            onClick={() => void handleActivatePlatform(platform.app)}
                                            disabled={Boolean(busyAction)}
                                        >
                                            {busyAction === `platform-${platform.app}` ? 'Activando...' : 'Activar aquí'}
                                        </PanelButton>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </PanelCard>
            ) : null}

            <PanelCard className="border-[rgba(185,28,28,0.25)]">
                <PanelBlockHeader
                    title="Eliminar cuenta"
                    description="Borra tu usuario y la información asociada a tu cuenta. Esta acción no se puede deshacer."
                />
                <PanelNotice tone="warning">
                    Antes de eliminarla, revisa si tienes publicaciones, reservas o suscripciones activas.
                </PanelNotice>
                <PanelButton
                    type="button"
                    variant="danger"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => {
                        setDeletePassword('');
                        setDeletePhrase('');
                        setDeleteModalOpen(true);
                    }}
                    disabled={!onDeleteAccount}
                >
                    Eliminar mi cuenta
                </PanelButton>
            </PanelCard>
            </>
            ) : null}

            {emailModalOpen ? (
                <AccountModal title="Cambiar correo" onClose={() => setEmailModalOpen(false)}>
                    <PanelField label="Nuevo correo">
                        <input
                            className="form-input"
                            value={nextEmail}
                            onChange={(event) => setNextEmail(event.target.value)}
                            placeholder="correo@ejemplo.com"
                            type="email"
                        />
                    </PanelField>
                    <PanelButton
                        className="mt-4 w-full"
                        onClick={() => void submitEmailChange()}
                        disabled={busyAction === 'email-change'}
                    >
                        {busyAction === 'email-change' ? 'Enviando...' : 'Enviar confirmación'}
                    </PanelButton>
                </AccountModal>
            ) : null}

            {passwordModalOpen ? (
                <AccountModal title={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'} onClose={() => setPasswordModalOpen(false)}>
                    <div className="space-y-3">
                        {hasPassword ? (
                            <PanelField label="Contraseña actual">
                                <input
                                    className="form-input"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    autoComplete="current-password"
                                />
                            </PanelField>
                        ) : null}
                        <PanelField label="Nueva contraseña">
                            <input
                                className="form-input"
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                autoComplete="new-password"
                            />
                        </PanelField>
                        <PanelField label="Confirmar contraseña">
                            <input
                                className="form-input"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                autoComplete="new-password"
                            />
                        </PanelField>
                    </div>
                    <PanelButton
                        className="mt-4 w-full"
                        onClick={() => void submitPasswordChange()}
                        disabled={busyAction === 'password'}
                    >
                        {busyAction === 'password' ? 'Guardando...' : hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
                    </PanelButton>
                </AccountModal>
            ) : null}

            {deleteModalOpen ? (
                <AccountModal title="Eliminar cuenta" onClose={() => setDeleteModalOpen(false)}>
                    <PanelNotice tone="warning">
                        Esta acción elimina tu cuenta de Simple. Para confirmar, completa el campo requerido.
                    </PanelNotice>
                    <div className="mt-4 space-y-3">
                        {hasPassword ? (
                            <PanelField label="Contraseña">
                                <input
                                    className="form-input"
                                    type="password"
                                    value={deletePassword}
                                    onChange={(event) => setDeletePassword(event.target.value)}
                                    autoComplete="current-password"
                                />
                            </PanelField>
                        ) : (
                            <PanelField label="Escribe ELIMINAR">
                                <input
                                    className="form-input"
                                    value={deletePhrase}
                                    onChange={(event) => setDeletePhrase(event.target.value)}
                                    placeholder="ELIMINAR"
                                />
                            </PanelField>
                        )}
                    </div>
                    <PanelButton
                        className="mt-4 w-full"
                        variant="danger"
                        onClick={() => void submitDeleteAccount()}
                        disabled={busyAction === 'delete'}
                    >
                        {busyAction === 'delete' ? 'Eliminando...' : 'Eliminar definitivamente'}
                    </PanelButton>
                </AccountModal>
            ) : null}
        </div>
    );
}
