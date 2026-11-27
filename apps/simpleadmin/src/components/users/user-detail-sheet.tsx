'use client';

import { useEffect, useState } from 'react';
import {
    IconBrandWhatsapp,
    IconCheck,
    IconCopy,
    IconEdit,
    IconExternalLink,
    IconMail,
    IconShieldCheck,
    IconShieldOff,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { PanelButton, PanelNotice, PanelStatusBadge } from '@simple/ui/panel';
import {
    updateAdminUser,
    updateAdminUserSubscriptions,
    type AdminUserRole,
    type AdminUserSnapshot,
    type AdminUserStatus,
    type AdminVertical,
} from '@/lib/api';
import {
    activitySummary,
    dateInputToIso,
    formatDateTime,
    getSubscriptionSummary,
    PLAN_OPTIONS,
    PRIMARY_VERTICAL_OPTIONS,
    primaryPlanBadge,
    ROLE_OPTIONS,
    roleLabel,
    SERENATAS_PROFILE_OPTIONS,
    STATUS_OPTIONS,
    statusLabel,
    statusTone,
    SUBSCRIPTION_STATUS_OPTIONS,
    toDateInputValue,
    verticalLabel,
    type AdminCapabilities,
    type PrimaryVerticalValue,
    type SerenatasProfile,
} from './user-domain';

export type DetailTab = 'overview' | 'subscriptions' | 'platforms' | 'actions';

const TABS: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: 'Resumen' },
    { id: 'subscriptions', label: 'Suscripciones' },
    { id: 'platforms', label: 'Plataformas' },
    { id: 'actions', label: 'Acciones' },
];

type SubscriptionFields = { plan: string; status: string; expiresAt: string; trialEndsAt: string };
type SubscriptionForm = {
    agenda: { plan: string; status: string; expiresAt: string; whatsappExtraCredits: string };
    autos: { plan: string; status: string; expiresAt: string };
    propiedades: { plan: string; status: string; expiresAt: string };
    serenatas: { provider: SubscriptionFields; musician: SubscriptionFields };
};

function addMonthsIsoDate(months: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
}

function billingSourceLabel(status?: string | null, providerStatus?: string | null, cycle?: string | null) {
    if (status === 'trial') return 'Prueba gratuita (30 días)';
    if (providerStatus === 'manual') return 'Asignado manualmente (Admin)';
    if (providerStatus === 'authorized' || providerStatus === 'active') {
        return `Mercado Pago${cycle === 'annual' ? ' (anual)' : ' (mensual)'}`;
    }
    if (status === 'active') return `Activo${cycle === 'annual' ? ' (anual)' : ''}`;
    if (status === 'expired') return 'Vencido';
    return 'Gratis';
}

function subscriptionFormFor(user: AdminUserSnapshot, accountId: string): SubscriptionForm {
    const account = user.accounts.find((item) => item.id === accountId);
    const subscriptions = account?.subscriptions ?? (user.accounts.length === 0 ? user.subscriptions : undefined);
    const personalSubscriptions = user.accounts.find((item) => item.isPersonal)?.subscriptions;
    const serenatasProviderSubscription = personalSubscriptions?.serenatasProvider
        ?? user.subscriptions?.serenatasProvider
        ?? personalSubscriptions?.serenatas
        ?? user.subscriptions?.serenatas;
    const serenatasMusicianSubscription = personalSubscriptions?.serenatasMusician
        ?? user.subscriptions?.serenatasMusician;
    const serenatasFields = (
        subscription: typeof serenatasProviderSubscription,
        trialEndsAt?: string | null,
    ): SubscriptionFields => ({
        plan: subscription?.planId ?? 'free',
        status: subscription?.status ?? 'cancelled',
        expiresAt: toDateInputValue(subscription?.expiresAt),
        trialEndsAt: toDateInputValue(trialEndsAt),
    });
    return {
        agenda: {
            plan: subscriptions?.agenda?.plan === 'pro_plus' ? 'pro' : (subscriptions?.agenda?.plan ?? 'free'),
            status: subscriptions?.agenda?.status ?? 'free',
            expiresAt: toDateInputValue(subscriptions?.agenda?.expiresAt),
            whatsappExtraCredits: String(user.agendaProfile?.whatsappExtraCredits ?? 0),
        },
        autos: {
            plan: subscriptions?.autos?.planId ?? 'free',
            status: subscriptions?.autos?.status ?? 'cancelled',
            expiresAt: toDateInputValue(subscriptions?.autos?.expiresAt),
        },
        propiedades: {
            plan: subscriptions?.propiedades?.planId ?? 'free',
            status: subscriptions?.propiedades?.status ?? 'cancelled',
            expiresAt: toDateInputValue(subscriptions?.propiedades?.expiresAt),
        },
        serenatas: {
            provider: serenatasFields(serenatasProviderSubscription, user.serenatas?.trialEndsAt),
            musician: serenatasFields(serenatasMusicianSubscription, user.serenatas?.musicianTrialEndsAt),
        },
    };
}

export function UserDetailSheet({
    user,
    currentUserId,
    initialTab = 'overview',
    capabilities,
    onClose,
    onEmail,
    onToggleStatus,
    onDelete,
    onSerenatasProfile,
    onUserUpdated,
}: {
    user: AdminUserSnapshot;
    currentUserId: string;
    initialTab?: DetailTab;
    capabilities: AdminCapabilities;
    onClose: () => void;
    onEmail: () => void;
    onToggleStatus: (nextStatus: AdminUserStatus) => void;
    onDelete: () => void;
    onSerenatasProfile: (profile: SerenatasProfile) => void;
    onUserUpdated: () => Promise<void> | void;
}) {
    const [tab, setTab] = useState<DetailTab>(initialTab);
    const [copiedField, setCopiedField] = useState<'email' | 'slug' | null>(null);

    // Inline Profile Edit State
    const [editingProfile, setEditingProfile] = useState(false);
    const [name, setName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [rut, setRut] = useState(user.rut ?? '');
    const [role, setRole] = useState<AdminUserRole>(user.role);
    const [status, setStatus] = useState<AdminUserStatus>(user.status);
    const [primaryVertical, setPrimaryVertical] = useState<PrimaryVerticalValue>(user.primaryVertical ?? 'none');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileFeedback, setProfileFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    // Inline Subscriptions Control State
    const defaultAccountId = user.accounts.find((item) => item.isDefault)?.id ?? user.accounts[0]?.id ?? '';
    const [accountId, setAccountId] = useState(defaultAccountId);
    const [subForm, setSubForm] = useState<SubscriptionForm>(() => subscriptionFormFor(user, defaultAccountId));
    const [dirtyVerticals, setDirtyVerticals] = useState<Set<'agenda' | 'autos' | 'propiedades'>>(() => new Set());
    const [dirtySerenatas, setDirtySerenatas] = useState<Set<'provider' | 'musician'>>(() => new Set());
    const [savingSubs, setSavingSubs] = useState(false);
    const [subFeedback, setSubFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    // Sync local forms if snapshot updates after save
    useEffect(() => {
        setName(user.name);
        setPhone(user.phone ?? '');
        setRut(user.rut ?? '');
        setRole(user.role);
        setStatus(user.status);
        setPrimaryVertical(user.primaryVertical ?? 'none');
        const nextAcc = user.accounts.find((a) => a.id === accountId)?.id
            ?? user.accounts.find((a) => a.isDefault)?.id
            ?? user.accounts[0]?.id
            ?? '';
        setAccountId(nextAcc);
        setSubForm(subscriptionFormFor(user, nextAcc));
        setDirtyVerticals(new Set());
        setDirtySerenatas(new Set());
    }, [user, accountId]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const planBadge = primaryPlanBadge(user);
    const waDigits = (user.phone ?? '').replace(/\D/g, '');
    const agendaUrl = user.agendaProfile?.customDomain && user.agendaProfile.customDomainStatus === 'verified'
        ? `https://${user.agendaProfile.customDomain}`
        : user.agendaProfile?.slug
            ? `https://simpleagenda.app/${user.agendaProfile.slug}`
            : null;

    const selectedAccount = user.accounts.find((item) => item.id === accountId) ?? null;
    const selectedAccountSubs = selectedAccount?.subscriptions ?? (user.accounts.length === 0 ? user.subscriptions : undefined);

    const activeVerticalSet = new Set<AdminVertical>();
    for (const access of user.platformAccesses) activeVerticalSet.add(access.vertical);
    if (user.primaryVertical) activeVerticalSet.add(user.primaryVertical);
    if (user.agendaProfile || selectedAccountSubs?.agenda) activeVerticalSet.add('agenda');
    if (user.autosListings > 0 || (selectedAccountSubs?.autos && selectedAccountSubs.autos.planId !== 'free')) activeVerticalSet.add('autos');
    if (user.propiedadesListings > 0 || (selectedAccountSubs?.propiedades && selectedAccountSubs.propiedades.planId !== 'free')) activeVerticalSet.add('propiedades');
    if (user.serenatas?.owner || user.serenatas?.musician) activeVerticalSet.add('serenatas');
    if (activeVerticalSet.size === 0) activeVerticalSet.add('agenda');

    const copyText = async (value: string, key: 'email' | 'slug') => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(key);
            setTimeout(() => setCopiedField((current) => (current === key ? null : current)), 1600);
        } catch {
            // Ignore clipboard failure
        }
    };

    const handleSaveProfile = async () => {
        if (!name.trim() || savingProfile) return;
        setSavingProfile(true);
        setProfileFeedback(null);
        try {
            await updateAdminUser(user.id, {
                name: name.trim(),
                phone: phone.trim() || null,
                rut: rut.trim() || null,
                primaryVertical: primaryVertical === 'none' ? null : primaryVertical,
                role,
                status,
            });
            setEditingProfile(false);
            await onUserUpdated();
            setProfileFeedback({ type: 'success', message: 'Datos de usuario guardados.' });
        } catch (err) {
            setProfileFeedback({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo guardar el usuario.' });
        } finally {
            setSavingProfile(false);
        }
    };

    const changeWorkspace = (nextAccountId: string) => {
        setAccountId(nextAccountId);
        setSubForm(subscriptionFormFor(user, nextAccountId));
        setDirtyVerticals(new Set());
        setDirtySerenatas(new Set());
        setSubFeedback(null);
    };

    const setSubField = (vertical: 'agenda' | 'autos' | 'propiedades', field: string, value: string) => {
        setSubFeedback(null);
        setSubForm((current) => {
            const resetAgendaExpiration = vertical === 'agenda'
                && field === 'plan'
                && (value === 'pro' || value === 'enterprise')
                && current.agenda.plan !== value
                && !current.agenda.expiresAt;
            return {
                ...current,
                [vertical]: {
                    ...current[vertical],
                    [field]: value,
                    ...(resetAgendaExpiration ? { expiresAt: addMonthsIsoDate(1) } : {}),
                },
            };
        });
        setDirtyVerticals((current) => new Set(current).add(vertical));
    };

    const setSerenatasField = (profileType: 'provider' | 'musician', field: keyof SubscriptionFields, value: string) => {
        setSubFeedback(null);
        setSubForm((current) => ({
            ...current,
            serenatas: {
                ...current.serenatas,
                [profileType]: { ...current.serenatas[profileType], [field]: value },
            },
        }));
        setDirtySerenatas((current) => new Set(current).add(profileType));
    };

    const hasSubChanges = dirtyVerticals.size > 0 || dirtySerenatas.size > 0;

    const handleSaveSubscriptions = async () => {
        if (!hasSubChanges || savingSubs) return;
        setSavingSubs(true);
        setSubFeedback(null);
        try {
            const changes: Record<string, unknown> = {};
            for (const vertical of dirtyVerticals) {
                if (vertical === 'agenda') {
                    const creditsNum = Number(subForm.agenda.whatsappExtraCredits);
                    changes.agenda = {
                        plan: subForm.agenda.plan,
                        expiresAt: subForm.agenda.plan === 'free' ? null : dateInputToIso(subForm.agenda.expiresAt),
                        ...(Number.isFinite(creditsNum) && creditsNum >= 0 ? { whatsappExtraCredits: Math.trunc(creditsNum) } : {}),
                    };
                } else {
                    changes[vertical] = {
                        planId: subForm[vertical].plan,
                        status: subForm[vertical].plan === 'free' ? 'cancelled' : subForm[vertical].status,
                        expiresAt: dateInputToIso(subForm[vertical].expiresAt),
                    };
                }
            }
            for (const profileType of dirtySerenatas) {
                const fields = subForm.serenatas[profileType];
                const key = profileType === 'provider' ? 'serenatasProvider' : 'serenatasMusician';
                changes[key] = {
                    planId: fields.plan,
                    status: fields.plan === 'free' ? 'cancelled' : fields.status,
                    expiresAt: dateInputToIso(fields.expiresAt),
                    trialEndsAt: dateInputToIso(fields.trialEndsAt),
                };
            }
            await updateAdminUserSubscriptions(user.id, accountId || null, changes);
            await onUserUpdated();
            setDirtyVerticals(new Set());
            setDirtySerenatas(new Set());
            setSubFeedback({ type: 'success', message: 'Suscripción y créditos actualizados.' });
        } catch (err) {
            setSubFeedback({ type: 'error', message: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.' });
        } finally {
            setSavingSubs(false);
        }
    };

    const nextToggleStatus: AdminUserStatus = user.status === 'suspended' ? 'verified' : 'suspended';

    const renderVerticalSubscriptionCard = (vertical: 'agenda' | 'autos' | 'propiedades') => {
        const currentSub = selectedAccountSubs?.[vertical];
        const isAgenda = vertical === 'agenda';
        const selectedPlan = subForm[vertical].plan;
        const billingOrigin = isAgenda
            ? billingSourceLabel(selectedAccountSubs?.agenda?.status, selectedAccountSubs?.agenda?.providerStatus, selectedAccountSubs?.agenda?.billingCycle)
            : billingSourceLabel(currentSub?.status, currentSub?.providerStatus, currentSub?.billingCycle);

        return (
            <div key={vertical} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[var(--fg)]">{verticalLabel(vertical)}</h4>
                            <PanelStatusBadge label={billingOrigin} tone={currentSub?.status === 'active' ? 'success' : currentSub?.status === 'trial' ? 'info' : 'neutral'} size="sm" />
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                            Estado actual: {getSubscriptionSummary({ ...user, subscriptions: selectedAccountSubs }, vertical)}
                        </p>
                    </div>
                </div>

                {/* Pill plan selector */}
                <div className="space-y-1.5">
                    <span className="text-xs font-medium text-[var(--fg-muted)]">Plan asignado</span>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {PLAN_OPTIONS[vertical].map((opt) => {
                            const active = selectedPlan === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={!capabilities.manageSubscriptions || savingSubs}
                                    onClick={() => setSubField(vertical, 'plan', opt.value)}
                                    className={`rounded-xl border px-3 py-2 text-left text-xs transition-all disabled:opacity-60 ${
                                        active
                                            ? 'border-[var(--accent)] bg-[var(--accent-soft,var(--bg-subtle))] font-semibold text-[var(--fg)] ring-1 ring-[var(--accent)]'
                                            : 'border-[var(--border)] text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)]'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status + Expiration + Quick presets */}
                {(!isAgenda || selectedPlan !== 'free') ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {!isAgenda ? (
                            <Field label="Estado">
                                <ModernSelect
                                    value={subForm[vertical].status}
                                    onChange={(value) => setSubField(vertical, 'status', value)}
                                    options={SUBSCRIPTION_STATUS_OPTIONS}
                                    disabled={!capabilities.manageSubscriptions || selectedPlan === 'free' || savingSubs}
                                />
                            </Field>
                        ) : null}
                        <div className={isAgenda ? 'sm:col-span-2 space-y-2' : 'space-y-2'}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-medium text-[var(--fg-muted)]">Fecha de expiración</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: '+1 mes', value: addMonthsIsoDate(1) },
                                        { label: '+3 meses', value: addMonthsIsoDate(3) },
                                        { label: '+1 año', value: addMonthsIsoDate(12) },
                                        { label: 'Sin límite', value: '' },
                                    ].map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            disabled={!capabilities.manageSubscriptions || savingSubs}
                                            onClick={() => setSubField(vertical, 'expiresAt', preset.value)}
                                            className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)]"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                className="form-input"
                                type="date"
                                disabled={!capabilities.manageSubscriptions || savingSubs}
                                value={subForm[vertical].expiresAt}
                                onChange={(e) => setSubField(vertical, 'expiresAt', e.target.value)}
                            />
                        </div>
                    </div>
                ) : null}

                {/* Extra WhatsApp Credits for SimpleAgenda */}
                {isAgenda ? (
                    <div className="border-t border-[var(--border)] pt-3 flex flex-wrap items-end justify-between gap-3">
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-[var(--fg-muted)]">Créditos extra de WhatsApp (cortesía / soporte)</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    disabled={!capabilities.manageSubscriptions || savingSubs}
                                    value={subForm.agenda.whatsappExtraCredits}
                                    onChange={(e) => setSubField('agenda', 'whatsappExtraCredits', e.target.value)}
                                    className="form-input w-28"
                                />
                                <button
                                    type="button"
                                    disabled={!capabilities.manageSubscriptions || savingSubs}
                                    onClick={() => setSubField('agenda', 'whatsappExtraCredits', String((Number(subForm.agenda.whatsappExtraCredits) || 0) + 50))}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs font-medium hover:bg-[var(--bg-subtle)]"
                                >
                                    +50 WA
                                </button>
                                <button
                                    type="button"
                                    disabled={!capabilities.manageSubscriptions || savingSubs}
                                    onClick={() => setSubField('agenda', 'whatsappExtraCredits', String((Number(subForm.agenda.whatsappExtraCredits) || 0) + 100))}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs font-medium hover:bg-[var(--bg-subtle)]"
                                >
                                    +100 WA
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-[var(--fg-muted)] max-w-xs">
                            Se suman al cupo mensual del plan (Pro: 50/mes · Negocios: 120/mes).
                        </p>
                    </div>
                ) : null}
            </div>
        );
    };

    const primaryVerticals = (['agenda', 'autos', 'propiedades'] as const).filter((v) => activeVerticalSet.has(v));
    const secondaryVerticals = (['agenda', 'autos', 'propiedades'] as const).filter((v) => !activeVerticalSet.has(v));

    return (
        <div
            className="fixed inset-0 z-[75] flex justify-end bg-black/40 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-label={`Ficha de ${user.name}`}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="flex h-full w-full max-w-3xl flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* Sticky Top Header */}
                <header className="shrink-0 border-b border-[var(--border)] px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar user={user} size="lg" />
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate text-base font-semibold text-[var(--fg)]">{user.name}</h2>
                                    <PanelStatusBadge label={planBadge.label} tone={planBadge.tone} size="sm" />
                                    <PanelStatusBadge label={statusLabel(user.status)} tone={statusTone(user.status)} size="sm" />
                                    <PanelStatusBadge label={roleLabel(user.role)} size="sm" />
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
                                    <span className="truncate">{user.email}</span>
                                    <button
                                        type="button"
                                        onClick={() => void copyText(user.email, 'email')}
                                        className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] hover:bg-[var(--bg-subtle)]"
                                    >
                                        {copiedField === 'email' ? <IconCheck size={11} /> : <IconCopy size={11} />}
                                        {copiedField === 'email' ? 'Copiado' : 'Copiar'}
                                    </button>
                                    {waDigits ? (
                                        <a
                                            href={`https://wa.me/${waDigits}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
                                        >
                                            <IconBrandWhatsapp size={11} /> WhatsApp
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {capabilities.sendEmail ? (
                                <PanelButton size="sm" variant="secondary" onClick={onEmail}>
                                    <IconMail size={14} /> Correo
                                </PanelButton>
                            ) : null}
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar ficha"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
                            >
                                <IconX size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Secciones de la ficha">
                        {TABS.map((item) => {
                            const active = tab === item.id;
                            const badgeDot = item.id === 'subscriptions' && hasSubChanges;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setTab(item.id)}
                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        active
                                            ? 'bg-[var(--bg-subtle)] text-[var(--fg)] border border-[var(--border)]'
                                            : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                                    }`}
                                >
                                    {item.label}
                                    {badgeDot ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {tab === 'overview' ? (
                        <>
                            {profileFeedback ? (
                                <PanelNotice tone={profileFeedback.type === 'error' ? 'error' : 'success'}>
                                    {profileFeedback.message}
                                </PanelNotice>
                            ) : null}

                            <Section
                                title="Identidad y cuenta"
                                action={capabilities.manageUsers ? (
                                    editingProfile ? (
                                        <div className="flex gap-2">
                                            <PanelButton size="sm" variant="secondary" disabled={savingProfile} onClick={() => setEditingProfile(false)}>
                                                Cancelar
                                            </PanelButton>
                                            <PanelButton size="sm" loading={savingProfile} disabled={savingProfile || !name.trim()} onClick={() => void handleSaveProfile()}>
                                                Guardar datos
                                            </PanelButton>
                                        </div>
                                    ) : (
                                        <PanelButton size="sm" variant="secondary" onClick={() => setEditingProfile(true)}>
                                            <IconEdit size={13} /> Editar datos
                                        </PanelButton>
                                    )
                                ) : null}
                            >
                                {editingProfile ? (
                                    <div className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2">
                                        <Field label="Nombre"><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
                                        <Field label="Teléfono / WhatsApp"><input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+569..." /></Field>
                                        <Field label="RUT"><input className="form-input" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12345678-9" /></Field>
                                        <Field label="Plataforma base"><ModernSelect value={primaryVertical} onChange={(v) => setPrimaryVertical(v as PrimaryVerticalValue)} options={PRIMARY_VERTICAL_OPTIONS} /></Field>
                                        <Field label="Rol"><ModernSelect value={role} onChange={(v) => setRole(v as AdminUserRole)} options={ROLE_OPTIONS} disabled={user.id === currentUserId} /></Field>
                                        <Field label="Estado"><ModernSelect value={status} onChange={(v) => setStatus(v as AdminUserStatus)} options={STATUS_OPTIONS.filter((o) => o.value !== 'all') as Array<{ value: AdminUserStatus; label: string }>} disabled={user.id === currentUserId} /></Field>
                                    </div>
                                ) : (
                                    <dl className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <Info label="Teléfono / WhatsApp" value={user.phone || 'Sin teléfono'} />
                                        <Info label="RUT" value={user.rut || 'Sin RUT'} />
                                        <Info label="Acceso" value={user.provider === 'google' ? 'Google OAuth' : 'Correo y clave'} />
                                        <Info label="Plataforma base" value={verticalLabel(user.primaryVertical)} />
                                        <Info label="Actividad" value={activitySummary(user)} />
                                        <Info label="Registro" value={formatDateTime(user.createdAt)} />
                                        <Info label="Origen" value={user.signupSourceLabel || 'Directo'} />
                                        <Info label="ID" value={user.id} mono />
                                    </dl>
                                )}
                            </Section>

                            {user.agendaProfile ? (
                                <Section
                                    title="Perfil público en SimpleAgenda"
                                    action={agendaUrl ? (
                                        <a href={agendaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fg)] hover:underline">
                                            Abrir página <IconExternalLink size={12} />
                                        </a>
                                    ) : null}
                                >
                                    <dl className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <Info label="Nombre público" value={user.agendaProfile.displayName || user.name} />
                                        <div>
                                            <dt className="text-xs text-[var(--fg-muted)]">Enlace</dt>
                                            <dd className="mt-0.5 flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
                                                <span className="truncate">/{user.agendaProfile.slug}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => void copyText(user.agendaProfile!.slug, 'slug')}
                                                    className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] hover:bg-[var(--bg-subtle)]"
                                                >
                                                    {copiedField === 'slug' ? <IconCheck size={10} /> : <IconCopy size={10} />}
                                                </button>
                                            </dd>
                                        </div>
                                        <Info label="Estado web" value={user.agendaProfile.isPublished ? 'Publicado' : 'Privado'} />
                                        <Info
                                            label="Dominio propio"
                                            value={user.agendaProfile.customDomain
                                                ? `${user.agendaProfile.customDomain} (${user.agendaProfile.customDomainStatus})`
                                                : 'Sin dominio'}
                                        />
                                        <Info label="Créditos extra WA" value={`${user.agendaProfile.whatsappExtraCredits} disponibles`} />
                                    </dl>
                                </Section>
                            ) : null}

                            <Section title="Calidad de cuenta y señales">
                                <div className="rounded-2xl border border-[var(--border)] p-4 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[var(--fg)]">{user.realness.label}</p>
                                        <span className="text-xs font-medium text-[var(--fg-muted)]">Puntaje: {user.realness.score}/100</span>
                                    </div>
                                    {user.realness.reasons.length > 0 ? (
                                        <ul className="flex flex-wrap gap-1.5">
                                            {user.realness.reasons.map((reason) => (
                                                <li key={reason} className="rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-0.5 text-xs text-[var(--fg-secondary)]">
                                                    {reason}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            </Section>
                        </>
                    ) : null}

                    {tab === 'subscriptions' ? (
                        <>
                            {subFeedback ? (
                                <PanelNotice tone={subFeedback.type === 'error' ? 'error' : 'success'}>
                                    {subFeedback.message}
                                </PanelNotice>
                            ) : null}

                            {user.accounts.length > 1 ? (
                                <Section title="Espacio de trabajo">
                                    <ModernSelect
                                        value={accountId}
                                        onChange={changeWorkspace}
                                        options={user.accounts.map((acc) => ({
                                            value: acc.id,
                                            label: `${acc.name}${acc.isPersonal ? ' · Personal' : ' · Equipo / Empresa'}${acc.isDefault ? ' · Principal' : ''} (${acc.role})`,
                                        }))}
                                    />
                                </Section>
                            ) : selectedAccount ? (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--fg)]">{selectedAccount.name}</p>
                                        <p className="text-xs text-[var(--fg-muted)]">
                                            {selectedAccount.isPersonal ? 'Espacio personal' : `Espacio empresa (${selectedAccount.type})`} · Rol: {selectedAccount.role}
                                        </p>
                                    </div>
                                    {selectedAccount.isDefault ? <PanelStatusBadge label="Principal" tone="info" size="sm" /> : null}
                                </div>
                            ) : (
                                <PanelNotice tone="info">
                                    Este usuario aún no tiene un espacio de trabajo. Al asignar un plan pago, se creará automáticamente.
                                </PanelNotice>
                            )}

                            <Section title="Suscripciones activas del usuario">
                                <div className="space-y-3">
                                    {primaryVerticals.map((v) => renderVerticalSubscriptionCard(v))}
                                </div>
                            </Section>

                            {user.serenatas?.owner || user.serenatas?.musician ? (
                                <Section title="Suscripción SimpleSerenatas">
                                    <div className="space-y-3">
                                        {(['provider', 'musician'] as const).map((profileType) => {
                                            const exists = profileType === 'provider' ? user.serenatas?.owner : user.serenatas?.musician;
                                            if (!exists) return null;
                                            const fields = subForm.serenatas[profileType];
                                            return (
                                                <div key={profileType} className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                                                        Perfil {profileType === 'provider' ? 'Proveedor' : 'Músico'}
                                                    </h4>
                                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                        <Field label="Plan">
                                                            <ModernSelect value={fields.plan} onChange={(value) => setSerenatasField(profileType, 'plan', value)} options={PLAN_OPTIONS.serenatas} disabled={!capabilities.manageSubscriptions || savingSubs} />
                                                        </Field>
                                                        <Field label="Estado">
                                                            <ModernSelect value={fields.status} onChange={(value) => setSerenatasField(profileType, 'status', value)} options={SUBSCRIPTION_STATUS_OPTIONS} disabled={!capabilities.manageSubscriptions || fields.plan === 'free' || savingSubs} />
                                                        </Field>
                                                        <Field label="Expiración">
                                                            <input className="form-input" type="date" value={fields.expiresAt} disabled={!capabilities.manageSubscriptions || savingSubs} onChange={(e) => setSerenatasField(profileType, 'expiresAt', e.target.value)} />
                                                        </Field>
                                                        <Field label="Fin de prueba">
                                                            <input className="form-input" type="date" value={fields.trialEndsAt} disabled={!capabilities.manageSubscriptions || savingSubs} onChange={(e) => setSerenatasField(profileType, 'trialEndsAt', e.target.value)} />
                                                        </Field>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Section>
                            ) : null}

                            {secondaryVerticals.length > 0 ? (
                                <details className="group rounded-2xl border border-[var(--border)] p-4">
                                    <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                                        Otras plataformas del ecosistema ({secondaryVerticals.map((v) => verticalLabel(v)).join(', ')})
                                    </summary>
                                    <div className="mt-4 space-y-3">
                                        {secondaryVerticals.map((v) => renderVerticalSubscriptionCard(v))}
                                    </div>
                                </details>
                            ) : null}
                        </>
                    ) : null}

                    {tab === 'platforms' ? (
                        <>
                            <Section title="Plataformas activadas">
                                {user.platformAccesses.length ? (
                                    <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                                        {user.platformAccesses.map((access) => (
                                            <div key={access.app} className="flex items-center justify-between gap-3 px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-medium text-[var(--fg)]">{access.label}</p>
                                                    <p className="text-xs text-[var(--fg-muted)]">
                                                        Activada {formatDateTime(access.activatedAt)}
                                                        {access.lastLoginAt ? ` · Último acceso ${formatDateTime(access.lastLoginAt)}` : ''}
                                                    </p>
                                                </div>
                                                <PanelStatusBadge label={access.status === 'active' ? 'Activa' : access.status} tone={access.status === 'active' ? 'success' : 'neutral'} />
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-[var(--fg-muted)]">Sin plataformas activadas.</p>}
                            </Section>

                            <Section title="Actividad en catálogos y agenda">
                                <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] p-4 sm:grid-cols-4">
                                    <Info label="Total registros" value={String(user.totalListings)} />
                                    <Info label="Agenda" value={String(user.agendaListings)} />
                                    <Info label="Autos" value={String(user.autosListings)} />
                                    <Info label="Propiedades" value={String(user.propiedadesListings)} />
                                </dl>
                            </Section>

                            {capabilities.manageSerenatas ? (
                                <Section title="Perfiles en SimpleSerenatas">
                                    <div className="grid grid-cols-3 gap-2">
                                        {SERENATAS_PROFILE_OPTIONS.map((option) => {
                                            const active = Boolean(user.serenatas?.[option.value]);
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    disabled={active}
                                                    onClick={() => onSerenatasProfile(option.value)}
                                                    className="flex min-h-11 flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-default"
                                                    style={{
                                                        borderColor: active ? 'var(--success)' : 'var(--border)',
                                                        background: active ? 'var(--bg-subtle)' : 'var(--surface)',
                                                        color: 'var(--fg)',
                                                    }}
                                                >
                                                    <span>{option.label}</span>
                                                    <span className="text-[11px] font-normal text-[var(--fg-muted)]">{active ? 'Activo' : 'Agregar'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Section>
                            ) : null}
                        </>
                    ) : null}

                    {tab === 'actions' ? (
                        <>
                            <Section title="Acciones administrativas rápidas">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {capabilities.manageUsers ? (
                                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--fg)]">
                                                    {user.status === 'suspended' ? 'Reactivar cuenta' : 'Suspender cuenta'}
                                                </p>
                                                <p className="text-xs text-[var(--fg-muted)]">
                                                    {user.status === 'suspended'
                                                        ? 'Devuelve acceso como cuenta verificada.'
                                                        : 'Bloquea acceso al panel sin borrar datos.'}
                                                </p>
                                            </div>
                                            <PanelButton
                                                size="sm"
                                                variant="secondary"
                                                disabled={!capabilities.deleteUsers}
                                                onClick={() => onToggleStatus(nextToggleStatus)}
                                            >
                                                {user.status === 'suspended' ? <IconShieldCheck size={14} /> : <IconShieldOff size={14} />}
                                                {user.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                                            </PanelButton>
                                        </div>
                                    ) : null}
                                    {capabilities.sendEmail ? (
                                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--fg)]">Enviar correo directo</p>
                                                <p className="text-xs text-[var(--fg-muted)]">Usa plantillas oficiales de Simple.</p>
                                            </div>
                                            <PanelButton size="sm" variant="secondary" onClick={onEmail}>
                                                <IconMail size={14} /> Redactar
                                            </PanelButton>
                                        </div>
                                    ) : null}
                                </div>
                            </Section>

                            {capabilities.deleteUsers ? (
                                <Section title="Zona peligrosa">
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--fg)]">Eliminar cuenta permanentemente</p>
                                            <p className="text-xs text-[var(--fg-muted)]">Borra usuario, accesos, citas y datos en todas las plataformas.</p>
                                        </div>
                                        <PanelButton size="sm" variant="danger" onClick={onDelete}>
                                            <IconTrash size={14} /> Eliminar cuenta
                                        </PanelButton>
                                    </div>
                                </Section>
                            ) : null}
                        </>
                    ) : null}
                </div>

                {/* Sticky Footer when Subscription changes exist */}
                {tab === 'subscriptions' && hasSubChanges ? (
                    <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-subtle)] px-5 py-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-[var(--fg-secondary)]">
                            Tienes cambios de plan o créditos pendientes de guardar.
                        </p>
                        <div className="flex gap-2">
                            <PanelButton
                                size="sm"
                                variant="secondary"
                                disabled={savingSubs}
                                onClick={() => changeWorkspace(accountId)}
                            >
                                Descartar
                            </PanelButton>
                            <PanelButton
                                size="sm"
                                loading={savingSubs}
                                disabled={savingSubs}
                                onClick={() => void handleSaveSubscriptions()}
                            >
                                Guardar suscripción
                            </PanelButton>
                        </div>
                    </footer>
                ) : null}
            </div>
        </div>
    );
}

export function UserAvatar({ user, size = 'md' }: { user: AdminUserSnapshot; size?: 'md' | 'lg' }) {
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || user.email[0]?.toUpperCase() || 'U';
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full border font-semibold ${size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs'}`} style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
            {initials}
        </div>
    );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <dt className="text-xs text-[var(--fg-muted)]">{label}</dt>
            <dd className={`mt-0.5 break-all text-sm font-medium text-[var(--fg)] ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--fg-muted)]">{label}</span>
            {children}
        </label>
    );
}
