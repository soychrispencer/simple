'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    fetchAgendaLocations,
    fetchAgendaProfile,
    saveAgendaProfile,
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
    inferTimezoneFromStructuredLocation,
    normalizeStructuredLocation,
    normalizeTimezone,
    requiresOperatorSubtype,
    requiresOperatorSubtypeCustom,
    resolveAgendaOperatorFields,
    saveAccountWorkspace,
    timezoneOptionLabel,
    timezoneShortLabel,
    type AccountWorkspaceState,
    type OperatorTier,
} from '@simple/utils';
import {
    AGENDA_BUSINESS_PERFIL_PAGE,
    BUSINESS_DESCRIPTION_FIELD,
    BUSINESS_OPERATING_TIMEZONE_HINT,
    BUSINESS_PUBLIC_NAME_FIELD,
    BusinessPublicContactCard,
    OperatorProfileFields,
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
import { AgendaSetupTip } from '@/components/panel/agenda-setup-tip';
import { AgendaBusinessLocationsContent } from '@/components/panel/agenda-consultorios-content';
import {
    agendaBusinessLocationFromProfile,
    agendaBusinessLocationToProfilePayload,
} from '@/components/panel/agenda-business-location-fields';
import { IconClock, IconMapPin, IconNotebook, IconSparkles, IconUser } from '@tabler/icons-react';
import type { StructuredLocation } from '@simple/types';

export default function PerfilConfigPage() {
    const vocab = useAgendaVocab();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [slug, setSlug] = useState('');

    const [form, setForm] = useState({
        displayName: '',
        bio: '',
    });
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
                setForm({
                    displayName: profile.displayName ?? '',
                    bio: profile.bio ?? '',
                });
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
                    countryCode: 'CL',
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
                setBusinessLocation(normalizeStructuredLocation({
                    countryCode: 'CL',
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
        if (saving) return;
        setError('');
        setSaved(false);

        if (workspaceChanged && workspaceState?.canManage) {
            const subtypes = getOperatorSubtypes('agenda', operator.accountKind);
            if (requiresOperatorSubtype(operator.accountKind, subtypes) && !operator.operatorSubtype) {
                setError('Selecciona tu rubro en Identidad y rubro.');
                return;
            }
            if (requiresOperatorSubtypeCustom(operator.operatorSubtype) && !operator.operatorSubtypeCustom.trim()) {
                setError('Describe tu negocio si elegiste Otros.');
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

        setSaving(true);
        try {
            if (workspaceChanged && workspaceState?.canManage) {
                const workspaceResult = await saveAccountWorkspace('agenda', {
                    accountKind: operator.accountKind,
                    operatorSubtype: operator.operatorSubtype,
                    operatorSubtypeCustom: customSubtype,
                }, operator.accountKind === 'company' ? accountName.trim() : undefined);
                if (!workspaceResult.ok || !workspaceResult.workspace) {
                    setError(workspaceResult.error ?? 'No pudimos actualizar la actividad del espacio.');
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
                ...contactForm,
                ...agendaBusinessLocationToProfilePayload(businessLocation),
                address: defaultLocation?.isActive ? defaultLocation.addressLine : null,
                ...buildSocialPayload(socialLinks),
            });
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar tu perfil.');
                return;
            }
            if (result.profile?.timezone) {
                setTimezone(result.profile.timezone);
            }
            setSaved(true);
            window.dispatchEvent(new CustomEvent('simple:agenda-profile-changed'));
        } catch {
            setError('No pudimos comprobar el guardado. Revisa tu conexión e inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AgendaMiNegocioLoading
                activeKey="perfil"
                title={AGENDA_BUSINESS_PERFIL_PAGE.title}
                description={AGENDA_BUSINESS_PERFIL_PAGE.description}
                message="Cargando datos de tu negocio..."
            />
        );
    }

    return (
        <AgendaMiNegocioShell
            activeKey="perfil"
            title={AGENDA_BUSINESS_PERFIL_PAGE.title}
            description={AGENDA_BUSINESS_PERFIL_PAGE.description}
        >
            <div className="grid min-w-0 gap-6">
                <AgendaSetupTip focusStepId={['perfil', 'publicar']} />

                {/* 1. Identidad, rubro y presentación unificados */}
                <div id="agenda-public-profile" className="scroll-mt-24">
                    <PanelCard size="lg" className="space-y-6">
                        <div className="flex items-start gap-3">
                            <span
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent-ink)' }}
                            >
                                <IconSparkles size={19} aria-hidden />
                            </span>
                            <PanelBlockHeader
                                title="Identidad y rubro"
                                description="Define quién eres, qué servicio ofreces y cómo te presentas ante tus clientes."
                                className="mb-0"
                            />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <PanelField
                                label={BUSINESS_PUBLIC_NAME_FIELD.label}
                                required
                                icon={<IconUser size={14} />}
                                className={operator.accountKind === 'company' ? '' : 'sm:col-span-2'}
                            >
                                <input
                                    type="text"
                                    value={form.displayName}
                                    onChange={(e) => set('displayName', e.target.value)}
                                    placeholder="Ej. Daniela Morales · Psicóloga Clínica"
                                    className="form-input"
                                    disabled={saving}
                                />
                            </PanelField>

                            {operator.accountKind === 'company' && workspaceState?.canManage === true ? (
                                <PanelField
                                    label="Nombre interno del equipo o centro"
                                    hint="Identifica el espacio compartido en el panel."
                                    required
                                >
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
                                        placeholder="Ej. Centro de Atención Norte"
                                        className="form-input"
                                    />
                                </PanelField>
                            ) : null}

                            <div className="sm:col-span-2 rounded-2xl border border-(--border) bg-(--bg-subtle) p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                                    Actividad y modalidad de operación
                                </p>
                                {!canShowActivityEditor && workspaceState === null ? (
                                    <p className="text-sm text-fg-muted">
                                        No pudimos revisar los permisos del espacio. Recarga la página para consultar o cambiar su actividad.
                                    </p>
                                ) : !canShowActivityEditor && workspaceState?.canManage === false ? (
                                    <p className="text-sm text-fg-muted">
                                        Este espacio aún no tiene una actividad configurada. Pide a quien lo administra que la configure.
                                    </p>
                                ) : !canShowActivityEditor ? (
                                    <p className="text-sm text-fg-muted">
                                        No pudimos confirmar el tipo de este espacio. Recarga la página antes de cambiar su actividad.
                                    </p>
                                ) : (
                                    <>
                                        <OperatorProfileFields
                                            vertical="agenda"
                                            tier={operator.accountKind}
                                            subtype={operator.operatorSubtype}
                                            subtypeCustom={operator.operatorSubtypeCustom}
                                            tierLocked={activeAccountIsPersonal === false || (
                                                activeAccountIsPersonal === null && workspaceState?.workspace?.accountKind === 'company'
                                            )}
                                            disabled={workspaceState?.canManage !== true || saving}
                                            onTierChange={(tier) => {
                                                setSaved(false);
                                                setError('');
                                                setOperator({
                                                    accountKind: tier,
                                                    operatorSubtype: null,
                                                    operatorSubtypeCustom: '',
                                                });
                                            }}
                                            onSubtypeChange={(subtype) => {
                                                setSaved(false);
                                                setError('');
                                                setOperator((current) => ({
                                                    ...current,
                                                    operatorSubtype: subtype,
                                                    operatorSubtypeCustom:
                                                        subtype === 'other' ? current.operatorSubtypeCustom : '',
                                                }));
                                            }}
                                            onSubtypeCustomChange={(value) => {
                                                setSaved(false);
                                                setError('');
                                                setOperator((current) => ({
                                                    ...current,
                                                    operatorSubtypeCustom: value,
                                                }));
                                            }}
                                        />
                                        {workspaceState?.canManage === false ? (
                                            <p className="mt-3 text-xs text-fg-muted">
                                                La actividad pertenece al espacio. Quien lo administra puede modificarla.
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>

                            <PanelField
                                label={`${BUSINESS_DESCRIPTION_FIELD.label} (opcional)`}
                                hint="Se usará automáticamente en tu ficha pública y en tu página web."
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

                {/* 2. Ubicación, zona horaria y sedes presenciales en un solo lugar */}
                <PanelCard size="lg" className="space-y-6">
                    <div className="flex items-start gap-3">
                        <span
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-ink)' }}
                        >
                            <IconMapPin size={19} aria-hidden />
                        </span>
                        <PanelBlockHeader
                            title="Ubicación y lugares de atención"
                            description="Define tu región de operación para la zona horaria y administra las direcciones donde atiendes presencialmente."
                            className="mb-0"
                        />
                    </div>

                    <div className="space-y-4">
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

                    <div id="ubicaciones" className="scroll-mt-24 border-t border-(--border) pt-6">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-(--fg)">Direcciones y sedes presenciales</h3>
                            <p className="mt-0.5 text-xs text-fg-muted">
                                Agrega tu consulta u oficina si atiendes presencialmente y decide si se muestra en tu perfil público.
                            </p>
                        </div>
                        <AgendaBusinessLocationsContent />
                    </div>
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
