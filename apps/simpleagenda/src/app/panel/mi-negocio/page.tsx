'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    fetchAgendaLocations,
    fetchAgendaProfile,
    saveAgendaProfile,
    uploadAvatar,
    type AgendaLocation,
} from '@/lib/agenda-api';
import {
    buildSocialPayload,
    loadSocialLinksFromProfile,
    type SocialLink,
} from '@/lib/agenda-mi-negocio-social';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';
import {
    AGENDA_LOCATIONS_CHANGED_EVENT,
    fetchAccountWorkspace,
    fetchCurrentAccountContext,
    getOperatorSubtypes,
    getOperatorTierOptions,
    inferTimezoneFromStructuredLocation,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    normalizeStructuredLocation,
    normalizeTimezone,
    OPERATOR_SUBTYPE_OTHER_ID,
    RAW_IMAGE_MAX_SIZE_KB,
    requiresOperatorSubtype,
    requiresOperatorSubtypeCustom,
    resolveAgendaOperatorFields,
    resolveAppMediaUrl,
    saveAccountWorkspace,
    timezoneOptionLabel,
    timezoneShortLabel,
    type AccountWorkspaceState,
    type OperatorTier,
} from '@simple/utils';
import { AvatarUpload, type AvatarUploadHandle } from '@simple/ui';
import {
    BUSINESS_DESCRIPTION_FIELD,
    BUSINESS_OPERATING_TIMEZONE_HINT,
    BUSINESS_PUBLIC_NAME_FIELD,
    BusinessPublicContactCard,
    PanelBlockHeader,
    PanelCard,
    PanelField,
    PanelSectionSaveFooter,
    StructuredLocationFields,
    businessOperatingTimezoneLabel,
    businessProfileSaveSuccessMessage,
    type BusinessPublicContactForm,
} from '@simple/ui/panel';
import { AgendaMiNegocioLoading, AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaBusinessLocationsContent } from '@/components/panel/agenda-consultorios-content';
import {
    agendaBusinessLocationFromProfile,
    agendaBusinessLocationToProfilePayload,
} from '@/components/panel/agenda-business-location-fields';
import {
    IconBriefcase,
    IconBuildingStore,
    IconCamera,
    IconCheck,
    IconClock,
    IconLoader2,
    IconMapPin,
    IconNotebook,
    IconSparkles,
    IconUser,
    IconVideo,
} from '@tabler/icons-react';
import type { StructuredLocation } from '@simple/types';

export default function PerfilConfigPage() {
    const vocab = useAgendaVocab();
    const avatarUploadRef = useRef<AvatarUploadHandle>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [slug, setSlug] = useState('');

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const [form, setForm] = useState({
        displayName: '',
        headline: '',
        bio: '',
    });
    const [servesOnline, setServesOnline] = useState(true);
    const [servesPresential, setServesPresential] = useState(false);

    const [operator, setOperator] = useState<{
        accountKind: OperatorTier;
        operatorSubtype: string | null;
        operatorSubtypeCustom: string;
    }>({
        accountKind: 'individual',
        operatorSubtype: null,
        operatorSubtypeCustom: '',
    });
    const [workspaceState, setWorkspaceState] = useState<AccountWorkspaceState | null>(null);
    const [activeAccountIsPersonal, setActiveAccountIsPersonal] = useState<boolean | null>(null);
    const [accountName, setAccountName] = useState('');
    const [initialAccountName, setInitialAccountName] = useState('');
    const [contactForm, setContactForm] = useState<BusinessPublicContactForm>({
        publicEmail: '',
        publicPhone: '',
        publicWhatsapp: '',
        websiteUrl: '',
    });
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [timezone, setTimezone] = useState('America/Santiago');
    const [businessLocation, setBusinessLocation] = useState<StructuredLocation>(() =>
        normalizeStructuredLocation({ countryCode: 'CL' }),
    );
    const [businessLocations, setBusinessLocations] = useState<AgendaLocation[]>([]);

    useEffect(() => {
        const load = async () => {
            const [profile, loadedLocations, loadedWorkspace, accountContext] = await Promise.all([
                fetchAgendaProfile(),
                fetchAgendaLocations(),
                fetchAccountWorkspace('agenda'),
                fetchCurrentAccountContext(),
            ]);
            setWorkspaceState(loadedWorkspace);
            setActiveAccountIsPersonal(accountContext?.account?.isPersonal ?? null);
            const currentAccountName = loadedWorkspace?.accountName ?? '';
            setAccountName(currentAccountName);
            setInitialAccountName(currentAccountName);
            if (profile) {
                setSlug(profile.slug ?? '');
                setAvatarUrl(profile.avatarUrl ?? null);
                setInitialAvatarUrl(profile.avatarUrl ?? null);
                setForm({
                    displayName: profile.displayName ?? '',
                    headline: profile.headline ?? '',
                    bio: profile.bio ?? '',
                });
                setServesOnline(profile.servesOnline ?? true);
                setServesPresential(profile.servesPresential ?? false);
                const activity = loadedWorkspace?.workspace;
                const profileActivity = activity
                    ? {
                        accountKind: activity.accountKind,
                        operatorSubtype: activity.operatorSubtype,
                        profession: activity.operatorSubtypeCustom,
                    }
                    : accountContext?.account?.isPersonal === true
                        ? {
                            accountKind: profile.accountKind,
                            operatorSubtype: profile.operatorSubtype,
                            profession: profile.profession,
                        }
                        : { accountKind: 'company' as const, operatorSubtype: null, profession: null };
                setOperator(resolveAgendaOperatorFields(profileActivity));
                setContactForm({
                    publicEmail: profile.publicEmail ?? '',
                    publicPhone: profile.publicPhone ?? '',
                    publicWhatsapp: profile.publicWhatsapp ?? '',
                    websiteUrl: profile.websiteUrl ?? '',
                });
                setSocialLinks(loadSocialLinksFromProfile(profile as unknown as Record<string, unknown>));
                setTimezone(profile.timezone ?? 'America/Santiago');
                setBusinessLocation(agendaBusinessLocationFromProfile(profile));
            }
            setBusinessLocations(loadedLocations);
            const defaultLocation = loadedLocations.find((item) => item.isDefault) ?? null;
            if (defaultLocation) {
                setBusinessLocation(normalizeStructuredLocation({
                    countryCode: profile?.countryCode || 'CL',
                    regionName: defaultLocation.region,
                    localityName: defaultLocation.city,
                }));
            }
            setLoading(false);
        };
        void load();
    }, []);

    useEffect(() => {
        const reloadLocations = async () => {
            const locations = await fetchAgendaLocations();
            setBusinessLocations(locations);
            const defaultLocation = locations.find((item) => item.isDefault) ?? null;
            if (defaultLocation) {
                setBusinessLocation((curr) => normalizeStructuredLocation({
                    countryCode: curr.countryCode || 'CL',
                    regionName: defaultLocation.region,
                    localityName: defaultLocation.city,
                }));
            }
        };
        const onLocationsChanged = () => { void reloadLocations(); };
        window.addEventListener(AGENDA_LOCATIONS_CHANGED_EVENT, onLocationsChanged);
        return () => window.removeEventListener(AGENDA_LOCATIONS_CHANGED_EVENT, onLocationsChanged);
    }, []);

    const defaultLocation = useMemo(
        () => businessLocations.find((item) => item.isDefault) ?? null,
        [businessLocations],
    );

    const operatingTimezone = useMemo(
        () => normalizeTimezone(timezone ?? inferTimezoneFromStructuredLocation(businessLocation)),
        [timezone, businessLocation],
    );

    const workspace = workspaceState?.workspace;
    const canShowActivityEditor = workspaceState !== null
        && (
            workspaceState.workspace !== null
            || (workspaceState.canManage && activeAccountIsPersonal !== null)
        )
        && (workspaceState.canManage || Boolean(workspaceState.workspace?.onboardingCompletedAt));
    const tierLocked = activeAccountIsPersonal === false || (
        activeAccountIsPersonal === null && workspaceState?.workspace?.accountKind === 'company'
    );
    const tierOptions = useMemo(() => getOperatorTierOptions('agenda'), []);
    const subtypes = useMemo(
        () => getOperatorSubtypes('agenda', operator.accountKind),
        [operator.accountKind],
    );
    const showCustomSubtype = isOperatorSubtypeOther(operator.operatorSubtype);

    const customSubtype = operator.operatorSubtype === 'other' ? operator.operatorSubtypeCustom.trim() : '';
    const workspaceChanged = workspaceState?.canManage === true && (
        !workspace?.onboardingCompletedAt
        || workspace.accountKind !== operator.accountKind
        || workspace.operatorSubtype !== operator.operatorSubtype
        || (workspace.operatorSubtypeCustom ?? '') !== customSubtype
        || (operator.accountKind === 'company' && initialAccountName !== accountName.trim())
    );

    const set = (key: keyof typeof form, value: string) => {
        setSaved(false);
        setError('');
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setContact = (key: keyof BusinessPublicContactForm, value: string) => {
        setSaved(false);
        setError('');
        setContactForm((prev) => ({ ...prev, [key]: value }));
    };

    const setBusinessLocationField = (next: StructuredLocation) => {
        setSaved(false);
        setError('');
        setBusinessLocation(normalizeStructuredLocation(next));
    };

    const handleSaveAll = async () => {
        if (saving || avatarUploading) return;
        setError('');
        setSaved(false);

        if (workspaceChanged && workspaceState?.canManage) {
            if (requiresOperatorSubtype(operator.accountKind, subtypes) && !operator.operatorSubtype) {
                setError('Selecciona tu rubro principal.');
                return;
            }
            if (requiresOperatorSubtypeCustom(operator.operatorSubtype) && !operator.operatorSubtypeCustom.trim()) {
                setError('Describe tu rubro en el campo personalizado.');
                return;
            }
            if (operator.accountKind === 'company' && !accountName.trim()) {
                setError('Escribe el nombre de tu empresa o equipo.');
                return;
            }
        }

        if (!form.displayName.trim()) {
            setError('Escribe el nombre público que verán tus clientes.');
            return;
        }
        if (!servesOnline && !servesPresential) {
            setError('Selecciona al menos una modalidad de atención (Online o Presencial).');
            return;
        }

        setSaving(true);
        try {
            if (workspaceChanged && workspaceState?.canManage) {
                const workspaceResult = await saveAccountWorkspace('agenda', {
                    accountKind: operator.accountKind,
                    operatorSubtype: operator.operatorSubtype,
                    operatorSubtypeCustom: customSubtype,
                }, operator.accountKind === 'company' ? accountName.trim() : undefined);
                if (!workspaceResult.ok || !workspaceResult.workspace) {
                    setError(workspaceResult.error ?? 'No pudimos actualizar tu rubro o modalidad de cuenta.');
                    return;
                }
                if (workspaceResult.accountChanged) {
                    window.location.reload();
                    return;
                }
                setWorkspaceState({
                    workspace: workspaceResult.workspace,
                    accountName: workspaceResult.accountName,
                    canManage: workspaceResult.canManage ?? true,
                    memberRole: workspaceResult.memberRole ?? null,
                });
                if (operator.accountKind === 'company') {
                    setAccountName(accountName.trim());
                    setInitialAccountName(accountName.trim());
                }
                window.dispatchEvent(new Event('simple:workspace-activity-changed'));
            }

            const result = await saveAgendaProfile({
                ...form,
                headline: form.headline.trim() || null,
                servesOnline,
                servesPresential,
                ...(avatarUrl !== initialAvatarUrl ? { avatarUrl } : {}),
                ...contactForm,
                ...agendaBusinessLocationToProfilePayload(businessLocation),
                address: servesPresential && defaultLocation?.isActive ? defaultLocation.addressLine : null,
                ...buildSocialPayload(socialLinks),
            });
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar tu perfil.');
                return;
            }
            if (result.profile?.timezone) {
                setTimezone(result.profile.timezone);
            }
            setInitialAvatarUrl(avatarUrl);
            setSaved(true);
            window.dispatchEvent(new CustomEvent('simple:agenda-profile-changed'));
        } catch {
            setError('No pudimos comprobar el guardado. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const resolvedAvatarUrl = resolveAppMediaUrl(avatarUrl);
    const initials = form.displayName.trim().charAt(0).toUpperCase() || '?';
    const showLocationsManager = servesPresential || businessLocations.length > 0;

    if (loading) {
        return (
            <AgendaMiNegocioLoading
                activeKey="perfil"
                title="Perfil"
                description="Define tu identidad pública, modalidad de atención y canales de contacto."
                message="Cargando datos de tu perfil..."
            />
        );
    }

    return (
        <AgendaMiNegocioShell
            activeKey="perfil"
            title="Perfil"
            description="Define tu identidad pública, modalidad de atención y canales de contacto."
        >
            <div className="grid min-w-0 gap-6">
                {/* 1. Identidad pública */}
                <div id="agenda-public-profile" className="scroll-mt-24">
                    <PanelCard size="lg" className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div
                                        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-(--border) bg-(--bg-subtle) text-lg font-bold text-fg"
                                    >
                                        {resolvedAvatarUrl ? (
                                            <img src={resolvedAvatarUrl} alt={form.displayName || 'Foto de perfil'} className="h-full w-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={saving || avatarUploading}
                                        onClick={() => avatarUploadRef.current?.openPicker()}
                                        aria-label="Cambiar foto o logo"
                                        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-fg shadow-xs transition hover:bg-(--bg-subtle) disabled:opacity-50"
                                    >
                                        {avatarUploading ? (
                                            <IconLoader2 size={13} className="animate-spin" />
                                        ) : (
                                            <IconCamera size={13} />
                                        )}
                                    </button>
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-fg">Identidad pública</h2>
                                    <p className="text-xs text-fg-muted">
                                        Así te verán tus {vocab.clients} en tu ficha y en tus recordatorios.
                                    </p>
                                    <div className="mt-1.5">
                                        <Link
                                            href="/panel/mi-negocio/apariencia"
                                            className="text-xs font-semibold text-accent-ink hover:underline"
                                        >
                                            Logo y portada se editan en Página web →
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {operator.accountKind === 'company' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--border) bg-(--bg-subtle) px-3 py-1 text-xs font-medium text-fg-secondary">
                                    <IconBuildingStore size={13} aria-hidden />
                                    Cuenta de equipo
                                </span>
                            ) : null}
                        </div>

                        <AvatarUpload
                            ref={avatarUploadRef}
                            hideTrigger
                            currentUrl={resolvedAvatarUrl}
                            config={{
                                maxSize: RAW_IMAGE_MAX_SIZE_KB,
                                maxWidth: 512,
                                maxHeight: 512,
                                aspectRatio: 1,
                                circular: true,
                                shape: 'circle',
                                onUpload: async (file, croppedBlob) => {
                                    setAvatarUploading(true);
                                    try {
                                        const uploadFile = croppedBlob === file
                                            ? file
                                            : new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                                        const res = await uploadAvatar(uploadFile, 'logo');
                                        if (!res.ok || !res.url) {
                                            throw new Error(res.error ?? 'No se pudo subir la imagen.');
                                        }
                                        return { url: res.url };
                                    } finally {
                                        setAvatarUploading(false);
                                    }
                                },
                            }}
                            onSuccess={(url) => {
                                setAvatarUrl(url);
                                setSaved(false);
                                setError('');
                            }}
                            onError={(msg) => setError(msg)}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <PanelField
                                label={BUSINESS_PUBLIC_NAME_FIELD.label}
                                required
                                icon={<IconUser size={14} />}
                            >
                                <input
                                    type="text"
                                    value={form.displayName}
                                    onChange={(e) => set('displayName', e.target.value)}
                                    placeholder="Ej. Daniela Morales"
                                    className="form-input"
                                    disabled={saving}
                                />
                            </PanelField>

                            <PanelField
                                label="Especialidad o título corto"
                                icon={<IconSparkles size={14} />}
                            >
                                <input
                                    type="text"
                                    value={form.headline}
                                    onChange={(e) => set('headline', e.target.value)}
                                    maxLength={120}
                                    placeholder="Ej. Psicóloga Clínica · Terapia Adultos"
                                    className="form-input"
                                    disabled={saving}
                                />
                            </PanelField>

                            {/* Rubro / actividad compacto */}
                            {canShowActivityEditor ? (
                                <>
                                    <PanelField
                                        label="Rubro principal"
                                        icon={<IconBriefcase size={14} />}
                                    >
                                        <select
                                            className="form-input"
                                            value={operator.operatorSubtype ?? ''}
                                            disabled={workspaceState?.canManage !== true || saving}
                                            onChange={(event) => {
                                                const nextVal = normalizeOperatorSubtype('agenda', operator.accountKind, event.target.value);
                                                setSaved(false);
                                                setError('');
                                                setOperator((curr) => ({
                                                    ...curr,
                                                    operatorSubtype: nextVal,
                                                    operatorSubtypeCustom: nextVal === OPERATOR_SUBTYPE_OTHER_ID ? curr.operatorSubtypeCustom : '',
                                                }));
                                            }}
                                        >
                                            <option value="">Selecciona tu rubro</option>
                                            {subtypes.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </PanelField>

                                    {!tierLocked && workspaceState?.canManage ? (
                                        <PanelField label="Modalidad de cuenta">
                                            <select
                                                className="form-input"
                                                value={operator.accountKind}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const nextTier = event.target.value as OperatorTier;
                                                    setSaved(false);
                                                    setError('');
                                                    setOperator({
                                                        accountKind: nextTier,
                                                        operatorSubtype: null,
                                                        operatorSubtypeCustom: '',
                                                    });
                                                }}
                                            >
                                                {tierOptions.map((opt) => (
                                                    <option key={opt.tier} value={opt.tier}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </PanelField>
                                    ) : null}

                                    {operator.accountKind === 'company' && workspaceState?.canManage ? (
                                        <PanelField label="Nombre del equipo o centro" required>
                                            <input
                                                type="text"
                                                value={accountName}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    setSaved(false);
                                                    setError('');
                                                    setAccountName(event.target.value);
                                                }}
                                                maxLength={160}
                                                placeholder="Ej. Centro Norte"
                                                className="form-input"
                                            />
                                        </PanelField>
                                    ) : null}

                                    {showCustomSubtype ? (
                                        <PanelField label="Describe tu rubro" required className="sm:col-span-2">
                                            <input
                                                type="text"
                                                value={operator.operatorSubtypeCustom}
                                                disabled={workspaceState?.canManage !== true || saving}
                                                onChange={(event) => {
                                                    setSaved(false);
                                                    setError('');
                                                    setOperator((curr) => ({ ...curr, operatorSubtypeCustom: event.target.value }));
                                                }}
                                                maxLength={80}
                                                placeholder="Ej. Fonoaudiología infantil"
                                                className="form-input"
                                            />
                                        </PanelField>
                                    ) : null}
                                </>
                            ) : null}

                            <PanelField
                                label={`${BUSINESS_DESCRIPTION_FIELD.label} (opcional)`}
                                hint="Aparecerá en tu ficha pública y página web."
                                icon={<IconNotebook size={14} />}
                                className="sm:col-span-2"
                            >
                                <textarea
                                    value={form.bio}
                                    onChange={(e) => set('bio', e.target.value)}
                                    placeholder={`Cuéntale a tus ${vocab.clients} sobre ti, tu enfoque y experiencia...`}
                                    rows={4}
                                    className="form-textarea"
                                    disabled={saving}
                                />
                            </PanelField>
                        </div>
                    </PanelCard>
                </div>

                {/* 2. Modalidad y ubicación */}
                <PanelCard size="lg" className="space-y-6">
                    <PanelBlockHeader
                        title="Modalidad y ubicación"
                        description="Indica cómo atiendes y tu zona horaria para calcular los horarios de reserva."
                        className="mb-0"
                    />

                    <div>
                        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                            ¿Cómo atiendes a tus {vocab.clients}?
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                disabled={saving}
                                aria-pressed={servesOnline}
                                onClick={() => { setServesOnline((v) => !v); setSaved(false); setError(''); }}
                                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                                    servesOnline
                                        ? 'border-(--accent) bg-(--accent-subtle)/40'
                                        : 'border-(--border) bg-(--surface) hover:border-(--fg-muted)/40'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                                        style={{
                                            background: servesOnline ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                                            color: servesOnline ? 'var(--accent-ink)' : 'var(--fg-muted)',
                                        }}
                                    >
                                        <IconVideo size={18} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-fg">Atención online</p>
                                        <p className="text-xs text-fg-muted">Videollamada o remoto</p>
                                    </div>
                                </div>
                                <span
                                    className={`flex size-5 items-center justify-center rounded-full border ${
                                        servesOnline
                                            ? 'border-(--accent) bg-(--accent) text-(--accent-contrast)'
                                            : 'border-(--border)'
                                    }`}
                                >
                                    {servesOnline ? <IconCheck size={12} stroke={2.5} /> : null}
                                </span>
                            </button>

                            <button
                                type="button"
                                disabled={saving}
                                aria-pressed={servesPresential}
                                onClick={() => { setServesPresential((v) => !v); setSaved(false); setError(''); }}
                                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                                    servesPresential
                                        ? 'border-(--accent) bg-(--accent-subtle)/40'
                                        : 'border-(--border) bg-(--surface) hover:border-(--fg-muted)/40'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                                        style={{
                                            background: servesPresential ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                                            color: servesPresential ? 'var(--accent-ink)' : 'var(--fg-muted)',
                                        }}
                                    >
                                        <IconMapPin size={18} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-fg">Atención presencial</p>
                                        <p className="text-xs text-fg-muted">En consulta, oficina o local</p>
                                    </div>
                                </div>
                                <span
                                    className={`flex size-5 items-center justify-center rounded-full border ${
                                        servesPresential
                                            ? 'border-(--accent) bg-(--accent) text-(--accent-contrast)'
                                            : 'border-(--border)'
                                    }`}
                                >
                                    {servesPresential ? <IconCheck size={12} stroke={2.5} /> : null}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-(--border) pt-5">
                        <StructuredLocationFields
                            value={businessLocation}
                            onChange={setBusinessLocationField}
                            disabled={saving}
                            regionLabel="Región"
                            localityLabel="Comuna / ciudad"
                            showTimezonePreview={false}
                        />

                        <div className="flex items-start gap-2.5 rounded-xl border border-(--border) bg-(--bg-subtle) px-3.5 py-2.5 text-xs text-fg-muted">
                            <IconClock size={15} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
                            <span>
                                {businessOperatingTimezoneLabel('agenda')}:{' '}
                                <strong className="text-fg">
                                    {timezoneOptionLabel(operatingTimezone)} ({timezoneShortLabel(operatingTimezone)})
                                </strong>
                                {' · '}
                                {BUSINESS_OPERATING_TIMEZONE_HINT}
                            </span>
                        </div>
                    </div>

                    {showLocationsManager ? (
                        <div id="ubicaciones" className="scroll-mt-24 border-t border-(--border) pt-5">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-(--fg)">Direcciones presenciales</h3>
                                <p className="mt-0.5 text-xs text-fg-muted">
                                    Administra tus sedes o consultas y marca cuál se muestra en tu perfil público.
                                </p>
                            </div>
                            <AgendaBusinessLocationsContent />
                        </div>
                    ) : (
                        <div id="ubicaciones" className="scroll-mt-24 border-t border-(--border) pt-4">
                            <p className="text-xs text-fg-muted">
                                Activa <strong>Atiendo presencial</strong> arriba para administrar tus sedes o consultas físicas.
                            </p>
                        </div>
                    )}
                </PanelCard>

                {/* 3. Contacto y redes */}
                <BusinessPublicContactCard
                    form={contactForm}
                    onFormChange={setContact}
                    socialLinks={socialLinks}
                    onSocialLinksChange={(links) => {
                        setSaved(false);
                        setError('');
                        setSocialLinks(links);
                    }}
                    disabled={saving}
                    contactResetKey={slug}
                />

                <PanelSectionSaveFooter
                    saving={saving}
                    saved={saved}
                    saveError={error || null}
                    onSave={() => void handleSaveAll()}
                    saveLabel="Guardar perfil"
                    savedMessage={businessProfileSaveSuccessMessage('datos')}
                />
            </div>
        </AgendaMiNegocioShell>
    );
}
