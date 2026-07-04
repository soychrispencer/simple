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
import { vocab } from '@/lib/vocabulary';
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
import { AgendaPublicProfileLocationContact, resolveDefaultAgendaLocation, type AgendaPublicContactForm } from '@/components/panel/agenda-public-profile-location-contact';
import type { StructuredLocation } from '@simple/types';
import {
    agendaBusinessLocationFromProfile,
    agendaBusinessLocationToProfilePayload,
} from '@/components/panel/agenda-business-location-fields';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app';

export default function PerfilConfigPage() {
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
    const formRef = useRef(form);
    formRef.current = form;

    useEffect(() => {
        const load = async () => {
            const [profile, loadedLocations] = await Promise.all([
                fetchAgendaProfile(),
                fetchAgendaLocations(),
            ]);
            if (profile) {
                setSlug(profile.slug ?? '');
                setForm({
                    displayName: profile.displayName ?? '',
                    bio: profile.bio ?? '',
                });
                setOperator(resolveAgendaOperatorFields(profile));
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
        setSaving(true);
        setError('');
        const defaultLoc = businessLocations.find((item) => item.isDefault) ?? null;
        const result = await saveAgendaProfile({
            ...form,
            ...contactForm,
            ...agendaBusinessLocationToProfilePayload(businessLocation),
            address: showPrimaryAddress && defaultLoc?.isActive ? defaultLoc.addressLine : null,
            accountKind: operator.accountKind,
            operatorSubtype: operator.operatorSubtype,
            ...(operator.operatorSubtype === 'other'
                ? { profession: operator.operatorSubtypeCustom.trim() }
                : {}),
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
                activeKey="datos"
                title={AGENDA_BUSINESS_PERFIL_PAGE.title}
                description={AGENDA_BUSINESS_PERFIL_PAGE.description}
                message="Cargando datos comerciales..."
            />
        );
    }

    return (
        <AgendaMiNegocioShell
            activeKey="datos"
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_PERFIL_PAGE.title}
            description={AGENDA_BUSINESS_PERFIL_PAGE.description}
        >
            <div className="grid min-w-0 gap-5">
                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title={BUSINESS_PUBLIC_INFO_SECTION.title}
                        description={BUSINESS_PUBLIC_INFO_SECTION.description}
                        className="mb-0"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <PanelField label={BUSINESS_PUBLIC_NAME_FIELD.label} required className="sm:col-span-2">
                            <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ej: Dra. Maria Gonzalez" className="form-input" />
                        </PanelField>
                        <div className="sm:col-span-2">
                            <OperatorProfileFields
                                vertical="agenda"
                                tier={operator.accountKind}
                                subtype={operator.operatorSubtype}
                                subtypeCustom={operator.operatorSubtypeCustom}
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
                        <PanelField label={BUSINESS_DESCRIPTION_FIELD.label} hint={BUSINESS_DESCRIPTION_FIELD.hint} className="sm:col-span-2">
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
