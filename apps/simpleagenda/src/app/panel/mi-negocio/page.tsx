'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    fetchAgendaLocations,
    fetchAgendaProfile,
    saveAgendaProfile,
    updateAgendaLocation,
    type AgendaLocation,
} from '@/lib/agenda-api';
import {
    buildSocialPayload,
    loadSocialLinksFromProfile,
    type SocialLink,
} from '@/lib/agenda-mi-negocio-social';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';
import {
    getOperatorSubtypes,
    requiresOperatorSubtype,
    requiresOperatorSubtypeCustom,
    resolveAgendaOperatorFields,
    resolveOperatorDisplayLabel,
    normalizeStructuredLocation,
    AGENDA_LOCATIONS_CHANGED_EVENT,
    type OperatorTier,
} from '@simple/utils';
import {
    PanelCard,
    PanelField,
    PanelBlockHeader,
    PanelSectionSaveFooter,
    OperatorProfileFields,
    AGENDA_BUSINESS_PERFIL_PAGE,
    BUSINESS_DESCRIPTION_FIELD,
    BUSINESS_PUBLIC_INFO_SECTION,
    BUSINESS_PUBLIC_NAME_FIELD,
    businessProfileSaveSuccessMessage,
} from '@simple/ui/panel';
import { AgendaMiNegocioShell, AgendaMiNegocioLoading } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaSetupTip } from '@/components/panel/agenda-setup-tip';
import { AgendaBusinessLocationsContent } from '@/components/panel/agenda-consultorios-content';
import { AgendaPublicProfileLocationContact, resolveDefaultAgendaLocation, type AgendaPublicContactForm } from '@/components/panel/agenda-public-profile-location-contact';
import { IconNotebook, IconUser } from '@tabler/icons-react';
import type { StructuredLocation } from '@simple/types';
import {
    agendaBusinessLocationFromProfile,
    agendaBusinessLocationToProfilePayload,
} from '@/components/panel/agenda-business-location-fields';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import {
    fetchAccountWorkspace,
    saveAccountWorkspace,
    type AccountWorkspaceState,
} from '@simple/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app';

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
    const [operator, setOperator] = useState<{ accountKind: OperatorTier; operatorSubtype: string | null; operatorSubtypeCustom: string }>({
        accountKind: 'individual',
        operatorSubtype: null,
        operatorSubtypeCustom: '',
    });
    const [workspaceState, setWorkspaceState] = useState<AccountWorkspaceState | null>(null);
    const [accountName, setAccountName] = useState('');
    const [initialAccountName, setInitialAccountName] = useState('');
    const [contactForm, setContactForm] = useState<AgendaPublicContactForm>({
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
    const [showPrimaryAddress, setShowPrimaryAddress] = useState(false);
    const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
    const [locationsOpen, setLocationsOpen] = useState(false);
    const formRef = useRef(form);
    formRef.current = form;

    useEffect(() => {
        const load = async () => {
            const [profile, loadedLocations, loadedWorkspace] = await Promise.all([
                fetchAgendaProfile(),
                fetchAgendaLocations(),
                fetchAccountWorkspace('agenda'),
            ]);
            setWorkspaceState(loadedWorkspace);
            const currentAccountName = loadedWorkspace?.accountName ?? '';
            setAccountName(currentAccountName);
            setInitialAccountName(currentAccountName);
            if (profile) {
                setSlug(profile.slug ?? '');
                setForm({
                    displayName: profile.displayName ?? '',
                    bio: profile.bio ?? '',
                });
                setOperator(resolveAgendaOperatorFields({
                    accountKind: loadedWorkspace?.workspace?.accountKind ?? profile.accountKind,
                    operatorSubtype: loadedWorkspace?.workspace?.operatorSubtype ?? profile.operatorSubtype,
                    profession: loadedWorkspace?.workspace?.operatorSubtypeCustom ?? profile.profession,
                }));
                setContactForm({
                    publicEmail: profile.publicEmail ?? '',
                    publicPhone: profile.publicPhone ?? '',
                    publicWhatsapp: profile.publicWhatsapp ?? '',
                    websiteUrl: profile.websiteUrl ?? '',
                });
                setSocialLinks(loadSocialLinksFromProfile(profile as unknown as Record<string, unknown>));
                setTimezone(profile.timezone ?? 'America/Santiago');
                setBusinessLocation(agendaBusinessLocationFromProfile(profile));
                setOptionalDetailsOpen(Boolean(
                    profile.publicEmail?.trim()
                    || profile.publicPhone?.trim()
                    || profile.publicWhatsapp?.trim()
                    || profile.websiteUrl?.trim()
                    || profile.address?.trim()
                    || profile.city?.trim()
                    || profile.region?.trim()
                    || profile.instagramUrl?.trim()
                    || profile.facebookUrl?.trim()
                    || profile.linkedinUrl?.trim()
                    || profile.tiktokUrl?.trim()
                    || profile.youtubeUrl?.trim()
                    || profile.twitterUrl?.trim()
                ));
            }
            setBusinessLocations(loadedLocations);
            setLocationsOpen(window.location.hash === '#ubicaciones');
            const defaultLocation = loadedLocations.find((item) => item.isDefault) ?? null;
            setShowPrimaryAddress(Boolean(defaultLocation?.isActive));
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

    const publicPreviewHref = useMemo(
        () => (slug ? `${APP_URL}/${slug}` : null),
        [slug],
    );

    const businessLabel = useMemo(
        () => resolveOperatorDisplayLabel(
            'agenda',
            operator.accountKind,
            operator.operatorSubtype,
            operator.operatorSubtypeCustom,
        ),
        [operator.accountKind, operator.operatorSubtype, operator.operatorSubtypeCustom],
    );

    const set = (key: keyof typeof form, value: string) => {
        setSaved(false);
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setContact = (key: keyof AgendaPublicContactForm, value: string) => {
        setSaved(false);
        setContactForm((prev) => ({ ...prev, [key]: value }));
    };

    const setBusinessLocationField = (next: StructuredLocation) => {
        setSaved(false);
        setBusinessLocation(next);
    };

    useEffect(() => {
        const reloadLocations = async () => {
            const locations = await fetchAgendaLocations();
            setBusinessLocations(locations);
            const defaultLocation = locations.find((item) => item.isDefault) ?? null;
            setShowPrimaryAddress(Boolean(defaultLocation?.isActive));
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

    const defaultAddress = useMemo(
        () => resolveDefaultAgendaLocation(businessLocations),
        [businessLocations],
    );

    const setShowPrimaryAddressField = async (show: boolean) => {
        if (!defaultLocation) return;
        setSaving(true);
        setError('');
        const result = await updateAgendaLocation(defaultLocation.id, { isActive: show });
        setSaving(false);
        if (!result.ok) {
            setError(result.error ?? 'No pudimos actualizar la dirección en ficha.');
            return;
        }
        const locations = await fetchAgendaLocations();
        setBusinessLocations(locations);
        const defaultLoc = locations.find((item) => item.id === defaultLocation.id) ?? defaultLocation;
        setShowPrimaryAddress(show);
        setSaved(false);
        await saveAgendaProfile({
            address: show && defaultLoc.isActive ? defaultLoc.addressLine : null,
        });
    };

    const handleSave = async () => {
        if (!form.displayName.trim()) {
            setError('El nombre visible es requerido.');
            return;
        }
        const subtypes = getOperatorSubtypes('agenda', operator.accountKind);
        if (requiresOperatorSubtype(operator.accountKind, subtypes) && !operator.operatorSubtype) {
            setError('Selecciona tu negocio.');
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
        setSaving(true);
        setError('');
        const customSubtype = operator.operatorSubtype === 'other'
            ? operator.operatorSubtypeCustom.trim()
            : '';
        const workspace = workspaceState?.workspace;
        const workspaceChanged = workspaceState?.canManage === true && (
            !workspace?.onboardingCompletedAt
            || workspace.accountKind !== operator.accountKind
            || workspace.operatorSubtype !== operator.operatorSubtype
            || (workspace.operatorSubtypeCustom ?? '') !== customSubtype
            || (operator.accountKind === 'company' && initialAccountName !== accountName.trim())
        );
        if (workspaceChanged) {
            const workspaceResult = await saveAccountWorkspace('agenda', {
                accountKind: operator.accountKind,
                operatorSubtype: operator.operatorSubtype,
                operatorSubtypeCustom: customSubtype,
            }, operator.accountKind === 'company' ? accountName.trim() : undefined);
            if (!workspaceResult.ok || !workspaceResult.workspace) {
                setSaving(false);
                setError(workspaceResult.error ?? 'No pudimos actualizar la actividad del espacio.');
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
        const defaultLoc = businessLocations.find((item) => item.isDefault) ?? null;
        const result = await saveAgendaProfile({
            ...form,
            ...contactForm,
            ...agendaBusinessLocationToProfilePayload(businessLocation),
            address: showPrimaryAddress && defaultLoc?.isActive ? defaultLoc.addressLine : null,
            headline: null,
            ...buildSocialPayload(socialLinks),
        });
        if (!result.ok) {
            setSaving(false);
            setError(result.error ?? 'Error al guardar.');
            return;
        }

        setSaving(false);
        setSaved(true);
        window.dispatchEvent(new CustomEvent('simple:agenda-profile-changed'));
        window.setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return (
            <AgendaMiNegocioLoading
                activeKey="perfil"
                title={AGENDA_BUSINESS_PERFIL_PAGE.title}
                description={AGENDA_BUSINESS_PERFIL_PAGE.description}
                message="Cargando datos comerciales..."
            />
        );
    }

    return (
        <AgendaMiNegocioShell
            activeKey="perfil"
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_PERFIL_PAGE.title}
            description={AGENDA_BUSINESS_PERFIL_PAGE.description}
        >
            <div className="grid min-w-0 gap-5">
                <AgendaSetupTip focusStepId={['perfil', 'publicar']} />
                <div id="agenda-public-profile" className="scroll-mt-24">
                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title={BUSINESS_PUBLIC_INFO_SECTION.title}
                        description="Nombre y presentación visibles en tu ficha. La actividad se define para el espacio de trabajo."
                        className="mb-0"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <PanelField label={BUSINESS_PUBLIC_NAME_FIELD.label} required icon={<IconUser size={14} />} className="sm:col-span-2">
                            <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ej: Dra. Maria Gonzalez" className="form-input" />
                        </PanelField>
                        <div className="sm:col-span-2">
                            <OperatorProfileFields
                                vertical="agenda"
                                tier={operator.accountKind}
                                subtype={operator.operatorSubtype}
                                subtypeCustom={operator.operatorSubtypeCustom}
                                disabled={workspaceState?.canManage !== true || saving}
                                onTierChange={(tier) => {
                                    setSaved(false);
                                    setOperator({
                                        accountKind: tier,
                                        operatorSubtype: null,
                                        operatorSubtypeCustom: '',
                                    });
                                }}
                                onSubtypeChange={(subtype) => {
                                    setSaved(false);
                                    setOperator((current) => ({
                                        ...current,
                                        operatorSubtype: subtype,
                                        operatorSubtypeCustom:
                                            subtype === 'other' ? current.operatorSubtypeCustom : '',
                                    }));
                                }}
                                onSubtypeCustomChange={(value) => {
                                    setSaved(false);
                                    setOperator((current) => ({
                                        ...current,
                                        operatorSubtypeCustom: value,
                                    }));
                                }}
                            />
                        </div>
                        {workspaceState?.canManage === false ? (
                            <p className="sm:col-span-2 rounded-xl border px-3 py-2.5 text-sm leading-5" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                La actividad de este espacio la configura quien lo administra. Puedes actualizar tu nombre y presentación personal aquí.
                            </p>
                        ) : null}
                        {workspaceState === null ? (
                            <p className="sm:col-span-2 rounded-xl border px-3 py-2.5 text-sm leading-5" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                No pudimos revisar los permisos del espacio. Recarga la página para cambiar su actividad.
                            </p>
                        ) : null}
                        {operator.accountKind === 'company' && workspaceState?.canManage === true ? (
                            <PanelField label="Nombre de la empresa o equipo" hint="Identifica el espacio compartido. Puede ser distinto de tu nombre público." required className="sm:col-span-2">
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(event) => {
                                        setSaved(false);
                                        setAccountName(event.target.value);
                                    }}
                                    maxLength={160}
                                    placeholder="Ej. Centro de Atención Norte"
                                    className="form-input"
                                />
                            </PanelField>
                        ) : null}
                        <PanelField label={`${BUSINESS_DESCRIPTION_FIELD.label} (opcional)`} hint={BUSINESS_DESCRIPTION_FIELD.hint} icon={<IconNotebook size={14} />} className="sm:col-span-2">
                            <textarea
                                value={form.bio}
                                onChange={(e) => set('bio', e.target.value)}
                                placeholder={`Cuéntale a tus ${vocab.clients} sobre ti, tu enfoque y experiencia...`}
                                rows={4}
                                className="form-textarea"
                            />
                        </PanelField>
                    </div>
                </PanelCard>
                </div>

                <details
                    open={optionalDetailsOpen}
                    onToggle={(event) => setOptionalDetailsOpen(event.currentTarget.open)}
                    className="scroll-mt-24 rounded-2xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-(--fg) sm:px-5">
                        Ubicación principal, contacto y redes
                        <span className="mt-1 block text-xs font-normal text-fg-muted">
                            Información adicional que aparecerá en tu perfil público.
                        </span>
                    </summary>
                    <div className="grid min-w-0 gap-5 px-4 pb-5 sm:px-5">
                        <AgendaPublicProfileLocationContact
                            form={contactForm}
                            onFormChange={setContact}
                            socialLinks={socialLinks}
                            onSocialLinksChange={(links) => {
                                setSaved(false);
                                setSocialLinks(links);
                            }}
                            businessLocation={businessLocation}
                            onBusinessLocationChange={setBusinessLocationField}
                            defaultAddress={defaultAddress}
                            showPrimaryAddress={showPrimaryAddress}
                            onShowPrimaryAddressChange={setShowPrimaryAddressField}
                            timezone={timezone}
                            saving={saving}
                            contactResetKey={slug}
                        />
                    </div>
                </details>

                <details
                    id="ubicaciones"
                    open={locationsOpen}
                    onToggle={(event) => setLocationsOpen(event.currentTarget.open)}
                    className="scroll-mt-24 rounded-2xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-(--fg) sm:px-5">
                        Ubicaciones de atención
                        <span className="mt-1 block text-xs font-normal text-fg-muted">
                            Administra las direcciones que pueden ver tus clientes.
                        </span>
                    </summary>
                    <div className="px-4 pb-5 sm:px-5">
                        <AgendaBusinessLocationsContent />
                    </div>
                </details>

                <PanelSectionSaveFooter
                    saving={saving}
                    saved={saved}
                    saveError={error || null}
                    onSave={handleSave}
                    savedMessage={businessProfileSaveSuccessMessage('datos')}
                />
            </div>
        </AgendaMiNegocioShell>
    );
}
