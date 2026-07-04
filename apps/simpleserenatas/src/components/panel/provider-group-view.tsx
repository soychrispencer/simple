'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AddressBookEntry, StructuredLocation } from '@simple/types';
import {
    PanelButton,
    PanelCard,
    PanelField,
    PanelNotice,
    PanelBlockHeader,
    PanelSectionSaveFooter,
    BUSINESS_PUBLIC_INFO_SECTION,
    SERENATAS_BUSINESS_WORK_ZONES_SECTION,
    BUSINESS_DESCRIPTION_FIELD,
    BUSINESS_PUBLIC_NAME_FIELD,
    businessProfileSaveSuccessMessage,
    BusinessPublicContactCard,
    BusinessPublicLocationCard,
    resolveDefaultBusinessAddress,
    OperatorProfileFields,
} from '@simple/ui/panel';
import {
    fetchAddressBook,
    normalizeStructuredLocation,
    updateAddressBookEntry,
    buildAgendaSocialPayload,
    loadAgendaSocialLinksFromProfile,
    ADDRESS_BOOK_CHANGED_EVENT,
    addressBookEntryToWritePayload,
    type BusinessSocialLink,
    type AddressBookChangedDetail,
    type OperatorTier,
} from '@simple/utils';
import { serenatasApi } from '@/lib/serenatas-api';
import { ensureProviderGroupDraft, PROVIDER_GROUP_DRAFT_NAME } from '@/lib/ensure-provider-group';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { WorkZonesPicker } from '@/components/panel/work-zones-picker';
import { FieldInput, FieldTextarea, type FormStatus } from './shared';
import { publicMariachiProfileUrl } from '@/lib/public-mariachi-routes';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

function addressBookUpdatePayload(entry: AddressBookEntry, isPublicVisible: boolean) {
    return addressBookEntryToWritePayload(entry, { isPublicVisible });
}

function locationPayload(location: StructuredLocation) {
    const normalized = normalizeStructuredLocation(location);
    return {
        countryCode: normalized.countryCode,
        regionId: normalized.regionId,
        localityId: normalized.localityId,
        region: normalized.regionName,
        comunaBase: normalized.localityName,
    };
}

export function ProviderGroupView({ refresh }: { refresh: () => Promise<void> }) {
    const { group: mariachi, loading, error, refresh: refreshAll } = useProviderGroupScope(refresh);
    const [saveStatus, setSaveStatus] = useState<FormStatus>({ loading: false, error: null, ok: null });
    const profileSaved = Boolean(saveStatus.ok);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [publicEmail, setPublicEmail] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [socialLinks, setSocialLinks] = useState<BusinessSocialLink[]>([]);
    const [location, setLocation] = useState<StructuredLocation>(() => normalizeStructuredLocation({ countryCode: 'CL' }));
    const [serviceComunas, setServiceComunas] = useState<string[]>([]);
    const [businessAddresses, setBusinessAddresses] = useState<AddressBookEntry[]>([]);
    const [showPrimaryAddress, setShowPrimaryAddress] = useState(false);
    const [operator, setOperator] = useState<{
        accountKind: OperatorTier;
        operatorSubtype: string | null;
        operatorSubtypeCustom: string;
    }>({
        accountKind: 'individual',
        operatorSubtype: null,
        operatorSubtypeCustom: '',
    });

    const handleLocationChange = (next: StructuredLocation) => {
        setLocation(next);
        setSaveStatus((prev) => ({ ...prev, ok: null }));
    };

    const loadBusinessAddresses = useCallback(async () => {
        const result = await fetchAddressBook({ scope: 'business', vertical: 'serenatas' });
        const items = result.ok ? result.items : [];
        setBusinessAddresses(items);
        const defaultEntry = items.find((item) => item.isDefault);
        setShowPrimaryAddress(Boolean(defaultEntry?.isPublicVisible));
    }, []);

    useEffect(() => {
        void loadBusinessAddresses();
    }, [loadBusinessAddresses]);

    useEffect(() => {
        const onChanged = (event: Event) => {
            const detail = (event as CustomEvent<AddressBookChangedDetail>).detail;
            if (detail?.vertical && detail.vertical !== 'serenatas') return;
            void loadBusinessAddresses();
        };
        window.addEventListener(ADDRESS_BOOK_CHANGED_EVENT, onChanged);
        return () => window.removeEventListener(ADDRESS_BOOK_CHANGED_EVENT, onChanged);
    }, [loadBusinessAddresses]);

    const defaultAddress = useMemo(
        () => resolveDefaultBusinessAddress(businessAddresses),
        [businessAddresses],
    );

    const comunaBaseHint = location.localityName?.trim()
        ? `Tu comuna base es ${location.localityName.trim()}`
        : null;

    const previewSubtitle = useMemo(() => {
        const parts = [location.localityName, location.regionName]
            .map((part) => part?.trim())
            .filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : null;
    }, [location.localityName, location.regionName]);

    const publicPreviewHref = useMemo(
        () => (mariachi?.slug ? publicMariachiProfileUrl(mariachi.slug, APP_URL || undefined) : null),
        [mariachi?.slug],
    );

    useEffect(() => {
        if (!mariachi) return;
        setName(mariachi.name);
        setDescription(mariachi.description ?? '');
        setLogoUrl(mariachi.logoUrl ?? '');
        setCoverUrl(mariachi.coverUrl ?? '');
        setPhone(mariachi.phone ?? '');
        setWhatsapp(mariachi.whatsapp ?? '');
        setPublicEmail(mariachi.publicEmail ?? '');
        setWebsiteUrl(mariachi.websiteUrl ?? '');
        setSocialLinks(loadAgendaSocialLinksFromProfile(mariachi as unknown as Record<string, unknown>));
        setLocation(normalizeStructuredLocation({
            countryCode: mariachi.countryCode ?? 'CL',
            regionId: mariachi.regionId ?? null,
            regionName: mariachi.region ?? null,
            localityId: mariachi.localityId ?? null,
            localityName: mariachi.comunaBase ?? null,
        }));
        setServiceComunas(mariachi.serviceComunas ?? []);
        setOperator({
            accountKind: (mariachi.accountKind ?? 'individual') as OperatorTier,
            operatorSubtype: mariachi.operatorSubtype ?? null,
            operatorSubtypeCustom: mariachi.operatorSubtypeCustom ?? '',
        });
    }, [mariachi?.id, mariachi?.updatedAt]);

    const profilePayload = () => ({
        name: (name.trim().length >= 2 ? name.trim() : PROVIDER_GROUP_DRAFT_NAME),
        description: description.trim() || null,
        logoUrl: logoUrl.trim() || null,
        coverUrl: coverUrl.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        publicEmail: publicEmail.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        ...buildAgendaSocialPayload(socialLinks),
        ...locationPayload(location),
        serviceComunas,
        accountKind: operator.accountKind,
        operatorSubtype: operator.operatorSubtype,
        operatorSubtypeCustom: operator.operatorSubtypeCustom.trim() || null,
    });

    async function savePrimaryAddressVisibility(nextVisible = showPrimaryAddress) {
        const entry = businessAddresses.find((item) => item.isDefault);
        if (!entry || entry.isPublicVisible === nextVisible) return true;
        const result = await updateAddressBookEntry(entry.id, addressBookUpdatePayload(entry, nextVisible));
        if (!result.ok) return false;
        setBusinessAddresses(result.items);
        return true;
    }

    async function handleShowPrimaryAddressChange(show: boolean) {
        const entry = businessAddresses.find((item) => item.isDefault);
        if (!entry) {
            setShowPrimaryAddress(show);
            return;
        }
        if (entry.isPublicVisible === show) {
            setShowPrimaryAddress(show);
            return;
        }
        setSaveStatus({ loading: true, error: null, ok: null });
        const saved = await savePrimaryAddressVisibility(show);
        setSaveStatus({
            loading: false,
            error: saved ? null : 'No pudimos actualizar la dirección en ficha.',
            ok: saved ? 'Dirección actualizada en tu ficha' : null,
        });
        if (saved) {
            setShowPrimaryAddress(show);
        }
    }

    async function saveProfile() {
        setSaveStatus({ loading: true, error: null, ok: null });

        const addressSaved = await savePrimaryAddressVisibility();
        if (!addressSaved) {
            setSaveStatus({ loading: false, error: 'No pudimos guardar la dirección en ficha.', ok: null });
            return;
        }

        if (mariachi) {
            const response = await serenatasApi.updateProviderGroup(mariachi.id, profilePayload());
            if (!response.ok) {
                setSaveStatus({ loading: false, error: response.error ?? 'No pudimos guardar', ok: null });
                return;
            }
            await refreshAll();
            setSaveStatus({ loading: false, error: null, ok: 'Cambios guardados' });
            return;
        }

        const ensured = await ensureProviderGroupDraft({ name: name.trim(), refresh: refreshAll });
        if (!ensured.ok) {
            setSaveStatus({ loading: false, error: ensured.error, ok: null });
            return;
        }

        const response = await serenatasApi.updateProviderGroup(ensured.item.id, profilePayload());
        if (!response.ok) {
            setSaveStatus({ loading: false, error: response.error ?? 'No pudimos guardar', ok: null });
            return;
        }

        await refreshAll();
        setSaveStatus({
            loading: false,
            error: null,
            ok: ensured.created ? 'Perfil guardado. Completa servicios y medios antes de publicar.' : businessProfileSaveSuccessMessage('pagina'),
        });
    }

    if (loading) {
        return <p className="text-sm text-(--fg-muted)">Cargando…</p>;
    }

    if (error) {
        return (
            <PanelNotice tone="error">
                {error}
                <PanelButton className="mt-3" variant="secondary" size="sm" onClick={() => void refreshAll()}>
                    Reintentar
                </PanelButton>
            </PanelNotice>
        );
    }

    return (
        <div className="grid w-full gap-6">
            <div className="grid min-w-0 gap-5">
                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title={BUSINESS_PUBLIC_INFO_SECTION.title}
                        description="Tu mariachi es tu ficha pública en Serenatas: nombre y descripción visibles en el marketplace."
                        className="mb-0"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <PanelField label={BUSINESS_PUBLIC_NAME_FIELD.label} className="sm:col-span-2">
                            <FieldInput
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Mariachi Los Reyes"
                            />
                        </PanelField>
                        <div className="sm:col-span-2">
                            <OperatorProfileFields
                                vertical="serenatas"
                                tier={operator.accountKind}
                                subtype={operator.operatorSubtype}
                                subtypeCustom={operator.operatorSubtypeCustom}
                                onTierChange={(tier) => {
                                    setSaveStatus((prev) => ({ ...prev, ok: null }));
                                    setOperator({
                                        accountKind: tier,
                                        operatorSubtype: null,
                                        operatorSubtypeCustom: '',
                                    });
                                }}
                                onSubtypeChange={(subtype) => {
                                    setSaveStatus((prev) => ({ ...prev, ok: null }));
                                    setOperator((current) => ({
                                        ...current,
                                        operatorSubtype: subtype,
                                        operatorSubtypeCustom: subtype === 'other' ? current.operatorSubtypeCustom : '',
                                    }));
                                }}
                                onSubtypeCustomChange={(value) => {
                                    setSaveStatus((prev) => ({ ...prev, ok: null }));
                                    setOperator((current) => ({
                                        ...current,
                                        operatorSubtypeCustom: value,
                                    }));
                                }}
                            />
                        </div>
                        <PanelField label={BUSINESS_DESCRIPTION_FIELD.label} hint={BUSINESS_DESCRIPTION_FIELD.hint} className="sm:col-span-2">
                            <FieldTextarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Cuéntales a tus clientes sobre tu mariachi, experiencia y estilo."
                            />
                        </PanelField>
                    </div>
                </PanelCard>

                <BusinessPublicLocationCard
                    addressesHref="/panel/mi-negocio?tab=direcciones"
                    defaultAddress={defaultAddress}
                    showPrimaryAddress={showPrimaryAddress}
                    onShowPrimaryAddressChange={(show) => void handleShowPrimaryAddressChange(show)}
                    structuredLocation={location}
                    onStructuredLocationChange={handleLocationChange}
                    disabled={saveStatus.loading}
                    timezone={mariachi?.timezone}
                    timezoneContext="serenatas"
                    regionLabel="Región"
                    localityLabel="Comuna / ciudad"
                />

                <PanelCard size="lg" className="space-y-5">
                    <PanelBlockHeader
                        title={SERENATAS_BUSINESS_WORK_ZONES_SECTION.title}
                        description={SERENATAS_BUSINESS_WORK_ZONES_SECTION.description}
                        className="mb-0"
                    />
                    <WorkZonesPicker value={serviceComunas} onChange={setServiceComunas} />
                    {comunaBaseHint ? <p className="text-xs text-fg-muted">{comunaBaseHint}</p> : null}
                </PanelCard>

                <BusinessPublicContactCard
                    form={{
                        publicPhone: phone,
                        publicWhatsapp: whatsapp,
                        publicEmail,
                        websiteUrl,
                    }}
                    onFormChange={(key, value) => {
                        if (key === 'publicPhone') setPhone(value);
                        if (key === 'publicWhatsapp') setWhatsapp(value);
                        if (key === 'publicEmail') setPublicEmail(value);
                        if (key === 'websiteUrl') setWebsiteUrl(value);
                    }}
                    socialLinks={socialLinks}
                    onSocialLinksChange={setSocialLinks}
                    disabled={saveStatus.loading}
                    contactResetKey={mariachi?.id}
                />

                <PanelSectionSaveFooter
                    saving={saveStatus.loading}
                    saved={profileSaved}
                    saveError={saveStatus.error}
                    onSave={() => void saveProfile()}
                    savedMessage={typeof saveStatus.ok === 'string' ? saveStatus.ok : businessProfileSaveSuccessMessage('pagina')}
                />
            </div>
        </div>
    );
}
