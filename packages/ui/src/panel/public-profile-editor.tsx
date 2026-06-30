'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    IconBadgeTm,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
    IconMail,
    IconNotebook,
    IconPhone,
    IconUser,
    IconWorld,
} from '@tabler/icons-react';
import { getSimpleAppBrand, type SimpleAppId } from '@simple/config';
import {
    fetchAccountPublicProfile as fetchAccountPublicProfileForVertical,
    formatStructuredLocationLabel,
    fetchAddressBook,
    getOperatorSubtypes,
    getOperatorTierOptions,
    loadMarketplaceSocialLinks,
    marketplaceSocialLinksFromPicker,
    publicProfileFieldsFromStructuredLocation,
    resolveOperatorDisplayLabel,
    structuredLocationFromAddressBookEntry,
    structuredLocationFromPublicProfileFields,
    updateAddressBookEntry,
    updateAccountPublicProfile as updateAccountPublicProfileForVertical,
    ADDRESS_BOOK_CHANGED_EVENT,
    addressBookEntryToWritePayload,
    type AddressBookChangedDetail,
    uploadMediaFile,
    type EditablePublicProfile as BaseEditablePublicProfile,
    type BusinessSocialLink,
    type ScheduleBlockedSlot,
    validateBusinessScheduleRange,
    validateBusinessScheduleBreak,
    buildTypicalMarketplaceBusinessHours,
} from '@simple/utils';
import type { AddressBookEntry } from '@simple/types';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelSectionSaveFooter, panelSectionSaveLabel } from './panel-section-save-footer.js';
import { PanelProfileBrandImages } from './panel-profile-brand-images.js';
import { OperatorProfileFields } from './operator-profile-fields.js';
import { BusinessPublicLocationCard, resolveDefaultBusinessAddress } from './business-public-location-card.js';
import { BusinessPublicContactCard } from './business-public-contact-card.js';
import { BusinessSchedulePanel } from './business-schedule-panel.js';
import { type BusinessBlockedDaysFormState } from './business-blocked-days-section.js';
import {
    BUSINESS_BRAND_IMAGES_SECTION,
    BUSINESS_DESCRIPTION_FIELD,
    BUSINESS_PUBLIC_INFO_SECTION,
    BUSINESS_PUBLIC_NAME_FIELD,
    businessBrandImageSavedMessage,
    businessProfileSaveSuccessMessage,
    type BusinessProfileSaveSection,
} from './business-copy.js';

export type PublicProfileVertical = 'autos' | 'propiedades';

export type PublicProfileEditorSection = 'pagina' | 'contacto' | 'redes' | 'horarios';

export type PublicProfileEditorProps = {
    vertical: PublicProfileVertical;
    section?: PublicProfileEditorSection;
    /** Slot compacto de link/QR, debajo de logo y portada en Perfil público. */
    publicLinkBelowBrand?: React.ReactNode;
};

type EditablePublicProfile = Omit<BaseEditablePublicProfile, 'vertical'> & { vertical: PublicProfileVertical };

function fetchAccountPublicProfile(vertical: PublicProfileVertical) {
    return fetchAccountPublicProfileForVertical(vertical) as Promise<{
        ok: boolean;
        profile: EditablePublicProfile;
        featureEnabled: boolean;
        currentPlanName: string;
        currentPlanId: 'free' | 'basic' | 'pro' | 'enterprise';
    } | null>;
}

function updateAccountPublicProfile(
    vertical: PublicProfileVertical,
    input: Omit<EditablePublicProfile, 'id' | 'userId' | 'vertical' | 'publicUrl'>,
) {
    return updateAccountPublicProfileForVertical(vertical, input);
}

function buildPublicProfileSavePayload(
    form: EditablePublicProfile,
    vertical: PublicProfileVertical,
    isPublished: boolean,
) {
    const { id: _id, userId: _userId, vertical: _vertical, publicUrl: _publicUrl, ...payload } = form;
    const subtypes = getOperatorSubtypes(vertical, payload.accountKind);
    const operatorSubtype = payload.operatorSubtype
        ?? (subtypes.length === 1 ? subtypes[0]?.id ?? null : null);
    const operatorSubtypeCustom = operatorSubtype === 'other'
        ? payload.operatorSubtypeCustom?.trim() || null
        : null;
    return {
        ...payload,
        companyName: null,
        headline: null,
        specialties: [],
        operatorSubtype,
        operatorSubtypeCustom,
        isPublished,
        slug: normalizeSlug(payload.slug || payload.displayName),
        addressLine: payload.primaryAddressId ? null : payload.addressLine,
    };
}

const DAY_LABELS: Record<EditablePublicProfile['businessHours'][number]['day'], string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

function buildScheduleSnapshot(profile: Pick<
    EditablePublicProfile,
    'alwaysOpen' | 'scheduleNote' | 'businessHours' | 'weeklyBreakStart' | 'weeklyBreakEnd' | 'scheduleBlockedSlots'
>) {
    return JSON.stringify({
        alwaysOpen: profile.alwaysOpen,
        scheduleNote: profile.scheduleNote,
        businessHours: profile.businessHours,
        weeklyBreakStart: profile.weeklyBreakStart,
        weeklyBreakEnd: profile.weeklyBreakEnd,
        scheduleBlockedSlots: profile.scheduleBlockedSlots,
    });
}

function normalizeLoadedProfile(profile: BaseEditablePublicProfile): EditablePublicProfile {
    return {
        ...profile,
        vertical: profile.vertical as PublicProfileVertical,
        weeklyBreakStart: profile.weeklyBreakStart ?? null,
        weeklyBreakEnd: profile.weeklyBreakEnd ?? null,
        scheduleBlockedSlots: profile.scheduleBlockedSlots ?? [],
    };
}

function normalizeSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .slice(0, 80);
}

function uploadPublicProfileImage(purpose: 'logo' | 'cover', file: File): Promise<{ url: string }> {
    return uploadMediaFile(file, { fileType: 'image', purpose }).then((result) => {
        const url = result.result?.publicUrl ?? result.result?.url;
        if (!result.ok || !url) {
            throw new Error(result.error ?? 'No pudimos subir la imagen.');
        }
        return { url };
    });
}

function previewUrl(pathname: string | null): string | null {
    if (!pathname || typeof window === 'undefined') return null;
    return `${window.location.origin}${pathname}`;
}

function Field({ label, icon, children, className }: { label: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
            <label className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                {icon}
                {label}
            </label>
            {children}
        </div>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-card border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <span style={{ color: 'var(--fg-secondary)' }}>{label}</span>
            <span className="text-right font-medium break-all" style={{ color: 'var(--fg)' }}>{value}</span>
        </div>
    );
}

export function PublicProfileEditor({ vertical, section, publicLinkBelowBrand }: PublicProfileEditorProps) {
    const appId: SimpleAppId = vertical === 'autos' ? 'simpleautos' : 'simplepropiedades';
    const brand = getSimpleAppBrand(appId);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
    const [currentPlanId, setCurrentPlanId] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('free');
    const [form, setForm] = useState<EditablePublicProfile | null>(null);
    const [businessAddresses, setBusinessAddresses] = useState<AddressBookEntry[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [profileSaved, setProfileSaved] = useState(false);
    const [brandSaving, setBrandSaving] = useState(false);
    const formRef = useRef<EditablePublicProfile | null>(null);
    const [scheduleSavedSnapshot, setScheduleSavedSnapshot] = useState('');
    const [showBlockedForm, setShowBlockedForm] = useState(false);
    const [blockedForm, setBlockedForm] = useState<BusinessBlockedDaysFormState>({
        mode: 'fullDay',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '10:00',
        reason: '',
    });
    const [scheduleStatus, setScheduleStatus] = useState('');

    useEffect(() => {
        let active = true;
        void (async () => {
            const response = await fetchAccountPublicProfile(vertical);
            if (!active) return;
            if (response?.ok) {
                setFeatureEnabled(response.featureEnabled);
                setCurrentPlanName(response.currentPlanName);
                setCurrentPlanId(response.currentPlanId);
                const loaded = normalizeLoadedProfile(response.profile);
                setForm(loaded);
                setScheduleSavedSnapshot(buildScheduleSnapshot(loaded));
            }
            setLoading(false);
        })();
        const onPublishChanged = (event: Event) => {
            const detail = (event as CustomEvent<{ vertical: PublicProfileVertical; isPublished: boolean; publicUrl: string | null }>).detail;
            if (!detail || detail.vertical !== vertical) return;
            setForm((current) => (
                current
                    ? {
                        ...current,
                        isPublished: detail.isPublished,
                        publicUrl: detail.publicUrl,
                    }
                    : current
            ));
        };
        window.addEventListener('simple:marketplace-publish-changed', onPublishChanged);
        return () => {
            active = false;
            window.removeEventListener('simple:marketplace-publish-changed', onPublishChanged);
        };
    }, [vertical]);

    useEffect(() => {
        let active = true;
        const reloadAddresses = async () => {
            const [bookResult, profileResult] = await Promise.all([
                fetchAddressBook({ scope: 'business', vertical }),
                fetchAccountPublicProfile(vertical),
            ]);
            if (!active) return;
            if (bookResult.ok) setBusinessAddresses(bookResult.items);
            if (profileResult?.ok) {
                setForm((current) => (
                    current
                        ? {
                            ...current,
                            primaryAddressId: profileResult.profile.primaryAddressId,
                            ...publicProfileFieldsFromStructuredLocation(
                                structuredLocationFromPublicProfileFields(profileResult.profile),
                            ),
                        }
                        : current
                ));
            }
        };
        void reloadAddresses();

        const onAddressBookChanged = (event: Event) => {
            const detail = (event as CustomEvent<AddressBookChangedDetail>).detail;
            if (detail?.vertical && detail.vertical !== vertical) return;
            void reloadAddresses();
        };
        window.addEventListener(ADDRESS_BOOK_CHANGED_EVENT, onAddressBookChanged);
        return () => {
            active = false;
            window.removeEventListener(ADDRESS_BOOK_CHANGED_EVENT, onAddressBookChanged);
        };
    }, [vertical]);

    formRef.current = form;

    const persistBrandImages = useCallback(async (
        avatarImageUrl: string | null,
        coverImageUrl: string | null,
        kind: 'logo' | 'cover',
    ) => {
        const current = formRef.current;
        if (!current) return;
        setBrandSaving(true);
        setNotice(null);
        const fresh = await fetchAccountPublicProfile(vertical);
        const isPublished = fresh?.ok ? fresh.profile.isPublished : current.isPublished;
        const response = await updateAccountPublicProfile(
            vertical,
            buildPublicProfileSavePayload({ ...current, avatarImageUrl, coverImageUrl }, vertical, isPublished),
        );
        setBrandSaving(false);
        if (!response.ok) {
            setNotice(response.error ?? 'No pudimos guardar la imagen.');
            return;
        }
        setFeatureEnabled(response.featureEnabled);
        setCurrentPlanId(response.currentPlanId);
        setCurrentPlanName(response.currentPlanName);
        setForm(response.profile);
        setNotice(businessBrandImageSavedMessage(kind));
        window.dispatchEvent(new CustomEvent('simple:marketplace-profile-changed', { detail: { vertical } }));
    }, [vertical]);

    const publicPreviewPath = useMemo(() => {
        if (!form) return null;
        if (form.publicUrl) return form.publicUrl;
        if (form.isPublished && form.slug) return `/perfil/${normalizeSlug(form.slug)}`;
        return null;
    }, [form?.publicUrl, form?.isPublished, form?.slug]);

    const publicPreview = useMemo(() => previewUrl(publicPreviewPath), [publicPreviewPath]);

    const updateForm = <K extends keyof EditablePublicProfile>(key: K, value: EditablePublicProfile[K]) => {
        setProfileSaved(false);
        setForm((current) => (current ? { ...current, [key]: value } : current));
    };

    const defaultAddress = useMemo(
        () => resolveDefaultBusinessAddress(businessAddresses),
        [businessAddresses],
    );

    const marketplaceSocialLinks = useMemo(
        () => (form ? loadMarketplaceSocialLinks(form.socialLinks) : []),
        [form?.socialLinks],
    );

    const handleMarketplaceSocialLinksChange = (links: BusinessSocialLink[]) => {
        updateForm('socialLinks', marketplaceSocialLinksFromPicker(links));
    };

    const handleShowPrimaryAddressChange = async (show: boolean) => {
        const defaultEntry = businessAddresses.find((item) => item.isDefault);
        if (show && defaultEntry) {
            if (!defaultEntry.isPublicVisible) {
                const updated = await updateAddressBookEntry(
                    defaultEntry.id,
                    addressBookEntryToWritePayload(defaultEntry, { isPublicVisible: true }),
                );
                if (updated.ok) setBusinessAddresses(updated.items);
            }
            const locationFields = publicProfileFieldsFromStructuredLocation(
                structuredLocationFromAddressBookEntry(defaultEntry),
            );
            setForm((current) => {
                if (!current) return current;
                return {
                    ...current,
                    primaryAddressId: defaultEntry.id,
                    ...locationFields,
                    addressLine: null,
                };
            });
            return;
        }
        setForm((current) => {
            if (!current) return current;
            return { ...current, primaryAddressId: null };
        });
    };

    const handleDisplayNameChange = (value: string) => {
        updateForm('displayName', value);
    };

    const handleHourChange = (day: EditablePublicProfile['businessHours'][number]['day'], field: 'open' | 'close' | 'closed', value: string | boolean) => {
        setForm((current) => {
            if (!current) return current;
            return {
                ...current,
                businessHours: current.businessHours.map((item) => {
                    if (item.day !== day) return item;
                    if (field === 'closed') {
                        return {
                            ...item,
                            closed: Boolean(value),
                            open: value ? null : item.open ?? '09:00',
                            close: value ? null : item.close ?? '18:00',
                        };
                    }
                    return {
                        ...item,
                        [field]: value,
                    };
                }),
            };
        });
        setScheduleStatus('');
    };

    const handleSave = async () => {
        if (!form) return;
        if (!form.alwaysOpen) {
            for (const item of form.businessHours) {
                if (item.closed) continue;
                const validation = validateBusinessScheduleRange(item.open ?? '', item.close ?? '');
                if (!validation.ok) {
                    setSaveError(`${DAY_LABELS[item.day]}: ${validation.error}`);
                    return;
                }
            }
        }
        setSaving(true);
        setSaveError(null);
        setProfileSaved(false);
        setNotice(null);
        const fresh = await fetchAccountPublicProfile(vertical);
        const isPublished = fresh?.ok ? fresh.profile.isPublished : form.isPublished;
        const response = await updateAccountPublicProfile(
            vertical,
            buildPublicProfileSavePayload(form, vertical, isPublished),
        );
        setSaving(false);
        if (!response.ok) {
            setSaveError(response.error ?? 'No pudimos guardar tu perfil público.');
            return;
        }
        setFeatureEnabled(response.featureEnabled);
        setCurrentPlanId(response.currentPlanId);
        setCurrentPlanName(response.currentPlanName);
        const saved = normalizeLoadedProfile(response.profile);
        setForm(saved);
        setScheduleSavedSnapshot(buildScheduleSnapshot(saved));
        setProfileSaved(true);
        window.setTimeout(() => setProfileSaved(false), 2500);
        window.dispatchEvent(new CustomEvent('simple:marketplace-profile-changed', { detail: { vertical } }));
    };

    if (loading) {
        return null;
    }

        if (!form) {
        return <PanelNotice tone="warning">No pudimos cargar tu perfil público.</PanelNotice>;
    }

    const tabbed = section !== undefined;
    const show = (name: PublicProfileEditorSection) => !tabbed || section === name;
    const structuredLocation = structuredLocationFromPublicProfileFields(form);
    const publicLocationLabel = formatStructuredLocationLabel(structuredLocation);
    const showPrimaryAddress = Boolean(form.primaryAddressId);

    const brandImagesCard = (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader
                title={BUSINESS_BRAND_IMAGES_SECTION.title}
                description={BUSINESS_BRAND_IMAGES_SECTION.description}
                className="mb-0"
            />
            <PanelProfileBrandImages
                previewVariant="profile-page"
                displayName={form.displayName}
                logoUrl={form.avatarImageUrl}
                coverUrl={form.coverImageUrl}
                profession={resolveOperatorDisplayLabel(
                    vertical,
                    form.accountKind,
                    form.operatorSubtype,
                    form.operatorSubtypeCustom,
                )}
                location={publicLocationLabel || null}
                previewHref={publicPreview}
                disabled={brandSaving}
                onLogoChange={(url) => {
                    const nextAvatar = url || null;
                    updateForm('avatarImageUrl', nextAvatar);
                    void persistBrandImages(nextAvatar, form.coverImageUrl ?? null, 'logo');
                }}
                onCoverChange={(url) => {
                    const nextCover = url || null;
                    updateForm('coverImageUrl', nextCover);
                    void persistBrandImages(form.avatarImageUrl ?? null, nextCover, 'cover');
                }}
                onUploadLogo={async (_file, croppedBlob) => {
                    const uploadFile = new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                    return uploadPublicProfileImage('logo', uploadFile);
                }}
                onUploadCover={async (_file, croppedBlob) => {
                    const uploadFile = new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
                    return uploadPublicProfileImage('cover', uploadFile);
                }}
                onError={(message) => setNotice(message)}
            />
        </PanelCard>
    );

    const identityCard = (
        <PanelCard size="lg" className="space-y-5">
                        <PanelBlockHeader
                            title={BUSINESS_PUBLIC_INFO_SECTION.title}
                            description={BUSINESS_PUBLIC_INFO_SECTION.description}
                            className="mb-0"
                        />

                        <Field label={BUSINESS_PUBLIC_NAME_FIELD.label} icon={<IconUser size={14} />} className="sm:col-span-2">
                            <input className="form-input" value={form.displayName} onChange={(event) => handleDisplayNameChange(event.target.value)} placeholder={vertical === 'propiedades' ? 'Ej: Inmobiliaria Las Condes' : 'Ej: Ignacio Autos Boutique'} />
                        </Field>

                        <OperatorProfileFields
                            vertical={vertical}
                            tier={form.accountKind}
                            subtype={form.operatorSubtype}
                            subtypeCustom={form.operatorSubtypeCustom ?? ''}
                            onTierChange={(tier) => {
                                setForm((current) => (
                                    current
                                        ? {
                                            ...current,
                                            accountKind: tier,
                                            operatorSubtype: null,
                                            operatorSubtypeCustom: null,
                                            companyName: null,
                                        }
                                        : current
                                ));
                            }}
                            onSubtypeChange={(subtype) => {
                                setForm((current) => (
                                    current
                                        ? {
                                            ...current,
                                            operatorSubtype: subtype,
                                            operatorSubtypeCustom:
                                                subtype === 'other' ? (current.operatorSubtypeCustom ?? '') : null,
                                        }
                                        : current
                                ));
                            }}
                            onSubtypeCustomChange={(value) => {
                                setForm((current) => (
                                    current ? { ...current, operatorSubtypeCustom: value } : current
                                ));
                            }}
                        />

                        <Field label={BUSINESS_DESCRIPTION_FIELD.label} icon={<IconNotebook size={14} />}>
                            <textarea className="form-textarea min-h-[160px]" value={form.bio ?? ''} onChange={(event) => updateForm('bio', event.target.value)} placeholder={vertical === 'propiedades' ? BUSINESS_DESCRIPTION_FIELD.placeholderMarketplacePropiedades : BUSINESS_DESCRIPTION_FIELD.placeholderMarketplaceAutos} />
                            <p className="text-xs leading-5" style={{ color: 'var(--fg-muted)' }}>{BUSINESS_DESCRIPTION_FIELD.hint}</p>
                        </Field>
                    </PanelCard>
    );

    const locationCard = (
                    <BusinessPublicLocationCard
                        addressesHref="/panel/mi-negocio/direcciones"
                        defaultAddress={defaultAddress}
                        showPrimaryAddress={showPrimaryAddress}
                        onShowPrimaryAddressChange={handleShowPrimaryAddressChange}
                        structuredLocation={structuredLocation}
                        onStructuredLocationChange={(next) => {
                            setForm((current) => (
                                current
                                    ? { ...current, ...publicProfileFieldsFromStructuredLocation(next) }
                                    : current
                            ));
                        }}
                        timezone={form?.timezone}
                        timezoneContext={vertical}
                    />
    );

    const contactCard = (
        <BusinessPublicContactCard
            form={{
                publicPhone: form.publicPhone ?? '',
                publicWhatsapp: form.publicWhatsapp ?? '',
                publicEmail: form.publicEmail ?? '',
                websiteUrl: form.website ?? '',
            }}
            onFormChange={(key, value) => {
                if (key === 'websiteUrl') {
                    updateForm('website', value || null);
                    return;
                }
                updateForm(key, value || null);
            }}
            socialLinks={marketplaceSocialLinks}
            onSocialLinksChange={handleMarketplaceSocialLinksChange}
            contactResetKey={form.slug ?? ''}
        />
    );

    const scheduleDirty = form ? buildScheduleSnapshot(form) !== scheduleSavedSnapshot : false;

    const resetBlockedForm = () => {
        setShowBlockedForm(false);
        setBlockedForm({
            mode: 'fullDay',
            startDate: '',
            endDate: '',
            startTime: '09:00',
            endTime: '10:00',
            reason: '',
        });
    };

    const handleAddBlockedSlot = () => {
        if (!form) return;
        let startsAtIso: string;
        let endsAtIso: string;
        let error = '';

        if (blockedForm.mode === 'fullDay') {
            if (!blockedForm.startDate || !blockedForm.endDate) error = 'Selecciona las fechas de inicio y fin.';
            else if (blockedForm.endDate < blockedForm.startDate) error = 'La fecha de fin debe ser igual o posterior a la de inicio.';
            else {
                startsAtIso = new Date(`${blockedForm.startDate}T00:00:00`).toISOString();
                endsAtIso = new Date(`${blockedForm.endDate}T23:59:59`).toISOString();
            }
        } else if (!blockedForm.startDate) {
            error = 'Selecciona la fecha del bloqueo.';
        } else if (blockedForm.endTime <= blockedForm.startTime) {
            error = 'La hora de fin debe ser posterior a la de inicio.';
        } else {
            startsAtIso = new Date(`${blockedForm.startDate}T${blockedForm.startTime}:00`).toISOString();
            endsAtIso = new Date(`${blockedForm.startDate}T${blockedForm.endTime}:00`).toISOString();
        }

        if (error) {
            setBlockedForm((prev) => ({ ...prev, error }));
            return;
        }

        const slot: ScheduleBlockedSlot = {
            id: crypto.randomUUID(),
            startsAt: startsAtIso!,
            endsAt: endsAtIso!,
            reason: blockedForm.reason || null,
        };
        updateForm('scheduleBlockedSlots', [...(form.scheduleBlockedSlots ?? []), slot]);
        setScheduleStatus('');
        resetBlockedForm();
    };

    const handleDeleteBlockedSlot = (id: string) => {
        if (!form) return;
        updateForm('scheduleBlockedSlots', (form.scheduleBlockedSlots ?? []).filter((slot) => slot.id !== id));
        setScheduleStatus('');
    };

    const handleLoadTypicalSchedule = () => {
        if (!form) return;
        setForm({
            ...form,
            alwaysOpen: false,
            scheduleNote: '',
            weeklyBreakStart: '13:00',
            weeklyBreakEnd: '14:00',
            businessHours: buildTypicalMarketplaceBusinessHours(),
        });
        setScheduleStatus('');
    };

    const handleSaveSchedule = async () => {
        if (!form) return;
        if (!form.alwaysOpen) {
            if (form.weeklyBreakStart && form.weeklyBreakEnd) {
                const breakRangeValidation = validateBusinessScheduleRange(form.weeklyBreakStart, form.weeklyBreakEnd);
                if (!breakRangeValidation.ok) {
                    setScheduleStatus(breakRangeValidation.error);
                    return;
                }
            }
            for (const item of form.businessHours) {
                if (item.closed) continue;
                const validation = validateBusinessScheduleRange(item.open ?? '', item.close ?? '');
                if (!validation.ok) {
                    setScheduleStatus(`${DAY_LABELS[item.day]}: ${validation.error}`);
                    return;
                }
                if (form.weeklyBreakStart && form.weeklyBreakEnd) {
                    const breakError = validateBusinessScheduleBreak(
                        form.weeklyBreakStart,
                        form.weeklyBreakEnd,
                        item.open ?? '',
                        item.close ?? '',
                    );
                    if (breakError) {
                        setScheduleStatus(`${DAY_LABELS[item.day]}: ${breakError}`);
                        return;
                    }
                }
            }
        }
        setSaving(true);
        setScheduleStatus('');
        setNotice(null);
        const fresh = await fetchAccountPublicProfile(vertical);
        const isPublished = fresh?.ok ? fresh.profile.isPublished : form.isPublished;
        const response = await updateAccountPublicProfile(
            vertical,
            buildPublicProfileSavePayload(form, vertical, isPublished),
        );
        setSaving(false);
        if (!response.ok) {
            setScheduleStatus(response.error ?? 'No pudimos guardar el horario.');
            return;
        }
        const saved = normalizeLoadedProfile(response.profile);
        setForm(saved);
        setScheduleSavedSnapshot(buildScheduleSnapshot(saved));
        setScheduleStatus('Guardado');
        setNotice(businessProfileSaveSuccessMessage('horarios'));
        window.dispatchEvent(new CustomEvent('simple:marketplace-profile-changed', { detail: { vertical } }));
    };

    const hoursCard = form ? (
        <BusinessSchedulePanel
            hideTitle
            days={form.businessHours.map((item) => ({
                key: item.day,
                dayLabel: DAY_LABELS[item.day],
                startTime: item.open ?? '09:00',
                endTime: item.close ?? '18:00',
                isActive: !item.closed,
            }))}
            alwaysOpen={form.alwaysOpen}
            onAlwaysOpenChange={(next) => {
                updateForm('alwaysOpen', next);
                setScheduleStatus('');
            }}
            onStartTimeChange={(key, value) => handleHourChange(key as EditablePublicProfile['businessHours'][number]['day'], 'open', value)}
            onEndTimeChange={(key, value) => handleHourChange(key as EditablePublicProfile['businessHours'][number]['day'], 'close', value)}
            onDayToggle={(key) => {
                const item = form.businessHours.find((hour) => hour.day === key);
                if (item) handleHourChange(item.day, 'closed', !item.closed);
            }}
            weeklyBreak={{
                enabled: Boolean(form.weeklyBreakStart && form.weeklyBreakEnd),
                startTime: form.weeklyBreakStart ?? '13:00',
                endTime: form.weeklyBreakEnd ?? '14:00',
                onEnabledChange: (enabled) => {
                    setForm((current) => (
                        current
                            ? {
                                ...current,
                                weeklyBreakStart: enabled ? (current.weeklyBreakStart ?? '13:00') : null,
                                weeklyBreakEnd: enabled ? (current.weeklyBreakEnd ?? '14:00') : null,
                            }
                            : current
                    ));
                    setScheduleStatus('');
                },
                onStartTimeChange: (value) => {
                    updateForm('weeklyBreakStart', value);
                    setScheduleStatus('');
                },
                onEndTimeChange: (value) => {
                    updateForm('weeklyBreakEnd', value);
                    setScheduleStatus('');
                },
            }}
            scheduleNote={form.scheduleNote ?? ''}
            onScheduleNoteChange={(value) => {
                updateForm('scheduleNote', value || null);
                setScheduleStatus('');
            }}
            fieldsDisabled={form.alwaysOpen}
            showLoadTypicalSchedule
            onLoadTypicalSchedule={handleLoadTypicalSchedule}
            blockedSlots={form.scheduleBlockedSlots ?? []}
            showBlockedForm={showBlockedForm}
            onShowBlockedFormChange={setShowBlockedForm}
            blockedForm={blockedForm}
            onBlockedFormFieldChange={(key, value) => setBlockedForm((prev) => ({ ...prev, [key]: value }))}
            onBlockedSubmit={handleAddBlockedSlot}
            onBlockedCancel={resetBlockedForm}
            onDeleteBlockedSlot={handleDeleteBlockedSlot}
            batchSave={{
                dirty: scheduleDirty,
                saving,
                status: scheduleStatus,
                onSave: () => void handleSaveSchedule(),
            }}
        />
    ) : null;

    const summaryCard = (
                    <PanelCard size="lg" className="space-y-4">
                        <PanelBlockHeader
                            title="Resumen"
                            description="Así se conectará tu página con tu cuenta y tu inventario."
                            className="mb-0"
                        />
                        <SummaryItem
                            label="Tipo"
                            value={getOperatorTierOptions(vertical).find((item) => item.tier === form.accountKind)?.label ?? form.accountKind}
                        />
                        <SummaryItem
                            label="Negocio"
                            value={resolveOperatorDisplayLabel(
                                vertical,
                                form.accountKind,
                                form.operatorSubtype,
                                form.operatorSubtypeCustom,
                            )}
                        />
                        <SummaryItem label="Plan" value={currentPlanName} />
                        <SummaryItem label="Publicación" value={form.isPublished ? 'Visible al público' : 'Guardada como borrador'} />
                        <SummaryItem label="URL" value={publicPreview ?? 'Aún no publicada'} />
                    </PanelCard>
    );

    const saveSection: BusinessProfileSaveSection | undefined = section === 'horarios'
        ? section
        : section === 'pagina' || section === undefined
            ? 'pagina'
            : undefined;

    const saveFooter = saveSection && section !== 'horarios' ? (
        <PanelSectionSaveFooter
            saving={saving}
            saved={profileSaved}
            saveError={saveError}
            disabled={brandSaving}
            onSave={handleSave}
            saveLabel={panelSectionSaveLabel(saveSection)}
            savedMessage={businessProfileSaveSuccessMessage(saveSection)}
        />
    ) : null;

    return (
        <div className="space-y-6">
            {tabbed ? (
                <>
                    {show('pagina') ? brandImagesCard : null}
                    {show('pagina') ? publicLinkBelowBrand : null}
                    {show('pagina') ? identityCard : null}
                    {show('pagina') ? locationCard : null}
                    {show('pagina') ? contactCard : null}
                    {show('horarios') ? hoursCard : null}
                    {saveFooter}
                </>
            ) : (
                <>
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                        <div className="space-y-6">
            {brandImagesCard}
            {publicLinkBelowBrand}
            {identityCard}
                            {locationCard}
                            {contactCard}
                        </div>
                        <div className="space-y-6">
                            {hoursCard}
                            {summaryCard}
                        </div>
                    </div>
                    {saveFooter}
                </>
            )}
        </div>
    );
}
