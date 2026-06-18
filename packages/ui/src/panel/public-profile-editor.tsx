'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    IconAt,
    IconArrowDown,
    IconArrowUp,
    IconBadgeTm,
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
    IconBuildingStore,
    IconClock,
    IconLink,
    IconLock,
    IconMail,
    IconMapPin,
    IconNotebook,
    IconPhone,
    IconPhoto,
    IconTrash,
    IconUser,
    IconUsersGroup,
    IconWorld,
} from '@tabler/icons-react';
import { getSimpleAppBrand, type SimpleAppId } from '@simple/config';
import {
    checkPublicProfileSlugAvailability as checkPublicProfileSlugAvailabilityForVertical,
    fetchAccountPublicProfile as fetchAccountPublicProfileForVertical,
    updateAccountPublicProfile as updateAccountPublicProfileForVertical,
    uploadMediaFile,
    type EditablePublicProfile as BaseEditablePublicProfile,
    type EditablePublicProfileTeamMember,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelBlockHeader, PanelChoiceCard, PanelNotice, PanelStatusBadge, PanelSwitch } from './panel-primitives.js';
import { PanelProfileBrandImages } from './panel-profile-brand-images.js';

export type PublicProfileVertical = 'autos' | 'propiedades';

export type PublicProfileEditorSection = 'pagina' | 'contacto' | 'redes' | 'horarios' | 'equipo';

export type PublicProfileEditorProps = {
    vertical: PublicProfileVertical;
    section?: PublicProfileEditorSection;
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

function checkPublicProfileSlugAvailability(vertical: PublicProfileVertical, slug: string) {
    return checkPublicProfileSlugAvailabilityForVertical(vertical, slug);
}

function updateAccountPublicProfile(
    vertical: PublicProfileVertical,
    input: Omit<EditablePublicProfile, 'id' | 'userId' | 'vertical' | 'publicUrl'>,
) {
    return updateAccountPublicProfileForVertical(vertical, input);
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

function joinSpecialties(value: string[]) {
    return value.join(', ');
}

function splitSpecialties(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8);
}

function splitTeamSpecialties(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6);
}

function PublicProfileFeatureGate({ currentPlanName }: { currentPlanName: string }) {
    return (
        <PanelCard
            size="lg"
            className="border-(--accent)/25 bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface))]"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                        background: 'color-mix(in oklab, var(--accent) 14%, var(--surface))',
                        color: 'var(--accent)',
                    }}
                >
                    <IconLock size={20} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                            Disponible con suscripción
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                            Tu plan {currentPlanName} no incluye la ficha pública del marketplace.
                        </p>
                    </div>
                    <Link href="/panel/mi-cuenta/suscripcion" className="inline-flex">
                        <PanelButton type="button">Ver planes</PanelButton>
                    </Link>
                </div>
            </div>
        </PanelCard>
    );
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

function createEmptyTeamMember(): EditablePublicProfileTeamMember {
    return {
        id: null,
        name: '',
        roleTitle: null,
        bio: null,
        email: null,
        phone: null,
        whatsapp: null,
        avatarImageUrl: null,
        socialLinks: {
            instagram: null,
            facebook: null,
            linkedin: null,
        },
        specialties: [],
        isPublished: true,
    };
}

function previewUrl(pathname: string | null): string | null {
    if (!pathname || typeof window === 'undefined') return null;
    return `${window.location.origin}${pathname}`;
}

function createClientUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const tail = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12);
    return `00000000-0000-4000-8000-${tail}`;
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                {icon}
                {label}
            </label>
            {children}
        </div>
    );
}

function SocialField({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: string | null; onChange: (value: string) => void }) {
    return (
        <Field label={label} icon={icon}>
            <input className="form-input" value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder={label} />
        </Field>
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

export function PublicProfileEditor({ vertical, section }: PublicProfileEditorProps) {
    const appId: SimpleAppId = vertical === 'autos' ? 'simpleautos' : 'simplepropiedades';
    const brand = getSimpleAppBrand(appId);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [featureEnabled, setFeatureEnabled] = useState(false);
    const [currentPlanName, setCurrentPlanName] = useState('Gratuito');
    const [currentPlanId, setCurrentPlanId] = useState<'free' | 'basic' | 'pro' | 'enterprise'>('free');
    const [form, setForm] = useState<EditablePublicProfile | null>(null);
    const [slugDirty, setSlugDirty] = useState(false);
    const [slugMessage, setSlugMessage] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [teamDraft, setTeamDraft] = useState<EditablePublicProfileTeamMember>(createEmptyTeamMember);
    const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void (async () => {
            const response = await fetchAccountPublicProfile(vertical);
            if (!active) return;
            if (response?.ok) {
                setFeatureEnabled(response.featureEnabled);
                setCurrentPlanName(response.currentPlanName);
                setCurrentPlanId(response.currentPlanId);
                setForm(response.profile);
                setTeamDraft(createEmptyTeamMember());
                setEditingTeamMemberId(null);
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

    const publicPreviewPath = useMemo(() => {
        if (!form) return null;
        if (form.publicUrl) return form.publicUrl;
        if (form.isPublished && form.slug) return `/perfil/${normalizeSlug(form.slug)}`;
        return null;
    }, [form?.publicUrl, form?.isPublished, form?.slug]);

    const publicPreview = useMemo(() => previewUrl(publicPreviewPath), [publicPreviewPath]);

    const updateForm = <K extends keyof EditablePublicProfile>(key: K, value: EditablePublicProfile[K]) => {
        setForm((current) => (current ? { ...current, [key]: value } : current));
    };

    const handleDisplayNameChange = (value: string) => {
        setForm((current) => {
            if (!current) return current;
            return {
                ...current,
                displayName: value,
                slug: slugDirty ? current.slug : normalizeSlug(value),
            };
        });
    };

    const handleCheckSlug = async () => {
        if (!form) return;
        const slug = normalizeSlug(form.slug || form.displayName);
        if (!slug) {
            setSlugMessage('Define un enlace público válido.');
            return;
        }
        setCheckingSlug(true);
        const result = await checkPublicProfileSlugAvailability(vertical, slug);
        setCheckingSlug(false);
        if (!result.ok) {
            setSlugMessage(result.error ?? 'No pudimos verificar el enlace público.');
            return;
        }
        setForm((current) => (current ? { ...current, slug: result.slug ?? slug } : current));
        setSlugMessage(result.available ? 'Disponible.' : 'Ese enlace ya está en uso.');
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
    };

    const resetTeamDraft = () => {
        setTeamDraft(createEmptyTeamMember());
        setEditingTeamMemberId(null);
    };

    const saveTeamDraft = () => {
        const normalizedName = teamDraft.name.trim();
        if (!normalizedName) {
            setNotice('Ingresa el nombre del integrante del equipo antes de guardarlo.');
            return;
        }

        setForm((current) => {
            if (!current) return current;
            const normalizedMember: EditablePublicProfileTeamMember = {
                ...teamDraft,
                id: teamDraft.id ?? createClientUuid(),
                name: normalizedName,
                roleTitle: teamDraft.roleTitle?.trim() || null,
                bio: teamDraft.bio?.trim() || null,
                email: teamDraft.email?.trim() || null,
                phone: teamDraft.phone?.trim() || null,
                whatsapp: teamDraft.whatsapp?.trim() || null,
                avatarImageUrl: teamDraft.avatarImageUrl?.trim() || null,
                socialLinks: {
                    instagram: teamDraft.socialLinks.instagram?.trim() || null,
                    facebook: teamDraft.socialLinks.facebook?.trim() || null,
                    linkedin: teamDraft.socialLinks.linkedin?.trim() || null,
                },
                specialties: teamDraft.specialties,
                isPublished: teamDraft.isPublished,
            };
            const nextTeam = editingTeamMemberId
                ? current.teamMembers.map((item) => (item.id === editingTeamMemberId ? normalizedMember : item))
                : [...current.teamMembers, normalizedMember];
            return {
                ...current,
                teamMembers: nextTeam,
            };
        });
        setNotice(editingTeamMemberId ? 'Integrante actualizado. Guarda la página para publicarlo.' : 'Integrante agregado al equipo. Guarda la página para publicarlo.');
        resetTeamDraft();
    };

    const editTeamMember = (member: EditablePublicProfileTeamMember) => {
        setTeamDraft(member);
        setEditingTeamMemberId(member.id);
        setNotice(null);
    };

    const removeTeamMember = (memberId: string | null) => {
        if (!memberId) return;
        setForm((current) => current ? {
            ...current,
            teamMembers: current.teamMembers.filter((item) => item.id !== memberId),
        } : current);
        if (editingTeamMemberId === memberId) {
            resetTeamDraft();
        }
        setNotice('Integrante eliminado del borrador del equipo. Guarda la página para confirmar el cambio.');
    };

    const moveTeamMember = (memberId: string | null, direction: -1 | 1) => {
        if (!memberId) return;
        setForm((current) => {
            if (!current) return current;
            const index = current.teamMembers.findIndex((item) => item.id === memberId);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= current.teamMembers.length) return current;
            const nextTeam = [...current.teamMembers];
            const [item] = nextTeam.splice(index, 1);
            nextTeam.splice(nextIndex, 0, item);
            return {
                ...current,
                teamMembers: nextTeam,
            };
        });
    };

    const handleSave = async () => {
        if (!form) return;
        setSaving(true);
        setNotice(null);
        const fresh = await fetchAccountPublicProfile(vertical);
        const isPublished = fresh?.ok ? fresh.profile.isPublished : form.isPublished;
        const { id: _id, userId: _userId, vertical: _vertical, publicUrl: _publicUrl, ...payload } = form;
        const response = await updateAccountPublicProfile(vertical, {
            ...payload,
            isPublished,
            slug: normalizeSlug(payload.slug || payload.displayName),
        });
        setSaving(false);
        if (!response.ok) {
            setNotice(response.error ?? 'No pudimos guardar tu perfil público.');
            return;
        }
        setFeatureEnabled(response.featureEnabled);
        setCurrentPlanId(response.currentPlanId);
        setCurrentPlanName(response.currentPlanName);
        setForm(response.profile);
        setNotice('Perfil público guardado.');
        window.dispatchEvent(new CustomEvent('simple:marketplace-profile-changed', { detail: { vertical } }));
    };

    if (loading) {
        return <PanelCard className="min-h-[240px] animate-pulse" size="lg"><div /></PanelCard>;
    }

    if (!form) {
        return <PanelNotice tone="warning">No pudimos cargar tu perfil público.</PanelNotice>;
    }

    if (!featureEnabled) {
        return <PublicProfileFeatureGate currentPlanName={currentPlanName} />;
    }

    const tabbed = section !== undefined;
    const show = (name: PublicProfileEditorSection) => !tabbed || section === name;

    const brandImagesCard = (
        <PanelCard size="lg" className="space-y-4">
            <PanelBlockHeader
                title="Imágenes del negocio"
                description="Portada y logo de tu empresa o negocio en la ficha pública. No reemplaza tu foto personal de Mi cuenta."
                className="mb-0"
            />
            <PanelProfileBrandImages
                displayName={form.displayName}
                logoUrl={form.avatarImageUrl}
                coverUrl={form.coverImageUrl}
                subtitle={form.headline?.trim() || [form.city, form.region].filter(Boolean).join(', ') || null}
                previewHref={publicPreview}
                onLogoChange={(url) => updateForm('avatarImageUrl', url || null)}
                onCoverChange={(url) => updateForm('coverImageUrl', url || null)}
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
                            title="Identidad pública"
                            description={`Define cómo quieres presentarte en ${brand.name}.`}
                            className="mb-0"
                        />

                        <div className="grid gap-3 md:grid-cols-3">
                            {[
                                { value: 'individual', label: 'Particular', desc: 'Un vendedor individual con atención directa.', icon: <IconUser size={18} /> },
                                { value: 'independent', label: 'Independiente', desc: 'Asesor o vendedor profesional sin marca corporativa.', icon: <IconBadgeTm size={18} /> },
                                { value: 'company', label: 'Empresa', desc: 'Automotora o negocio con imagen comercial propia.', icon: <IconBuildingStore size={18} /> },
                            ].map((option) => (
                                <PanelChoiceCard
                                    key={option.value}
                                    selected={form.accountKind === option.value}
                                    onClick={() => updateForm('accountKind', option.value as EditablePublicProfile['accountKind'])}
                                    className="text-left"
                                >
                                    <div className="space-y-2">
                                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                            {option.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</p>
                                            <p className="text-xs leading-5" style={{ color: 'var(--fg-secondary)' }}>{option.desc}</p>
                                        </div>
                                    </div>
                                </PanelChoiceCard>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Nombre visible" icon={<IconUser size={14} />}>
                                <input className="form-input" value={form.displayName} onChange={(event) => handleDisplayNameChange(event.target.value)} placeholder="Ej: Ignacio Autos Boutique" />
                            </Field>
                            <Field label="Enlace público" icon={<IconLink size={14} />}>
                                <div className="flex gap-2">
                                    <input
                                        className="form-input flex-1"
                                        value={form.slug}
                                        onChange={(event) => {
                                            setSlugDirty(true);
                                            updateForm('slug', normalizeSlug(event.target.value));
                                        }}
                                        placeholder="ignacio-autos"
                                    />
                                    <PanelButton type="button" variant="secondary" onClick={() => void handleCheckSlug()} disabled={checkingSlug}>
                                        {checkingSlug ? '...' : 'Verificar'}
                                    </PanelButton>
                                </div>
                                {slugMessage ? <p className="mt-1 text-xs" style={{ color: slugMessage === 'Disponible.' ? 'var(--fg-secondary)' : 'var(--fg-muted)' }}>{slugMessage}</p> : null}
                            </Field>
                            <Field label="Titular" icon={<IconBadgeTm size={14} />}>
                                <input className="form-input" value={form.headline ?? ''} onChange={(event) => updateForm('headline', event.target.value)} placeholder="Ej: Atención directa, usados seleccionados y financiamiento." />
                            </Field>
                            {form.accountKind === 'company' ? (
                                <Field label="Nombre de empresa" icon={<IconBuildingStore size={14} />}>
                                    <input className="form-input" value={form.companyName ?? ''} onChange={(event) => updateForm('companyName', event.target.value)} placeholder="Ej: Autos Las Condes SpA" />
                                </Field>
                            ) : <div />}
                        </div>

                        <Field label="Descripción" icon={<IconBadgeTm size={14} />}>
                            <textarea className="form-textarea min-h-[160px]" value={form.bio ?? ''} onChange={(event) => updateForm('bio', event.target.value)} placeholder="Cuenta quién eres, cómo trabajas, qué tipo de vehículos manejas y por qué un comprador debería contactarte." />
                        </Field>
                    </PanelCard>
    );

    const contactCard = (
                    <PanelCard size="lg" className="space-y-5">
                        <PanelBlockHeader
                            title="Contacto y operación"
                            description="Estos datos sostienen la credibilidad del perfil y facilitan el contacto."
                            className="mb-0"
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Correo público" icon={<IconMail size={14} />}>
                                <input className="form-input" value={form.publicEmail ?? ''} onChange={(event) => updateForm('publicEmail', event.target.value)} placeholder="ventas@tuempresa.cl" />
                            </Field>
                            <Field label="Teléfono" icon={<IconPhone size={14} />}>
                                <input className="form-input" value={form.publicPhone ?? ''} onChange={(event) => updateForm('publicPhone', event.target.value)} placeholder="+56 9 1234 5678" />
                            </Field>
                            <Field label="WhatsApp" icon={<IconPhone size={14} />}>
                                <input className="form-input" value={form.publicWhatsapp ?? ''} onChange={(event) => updateForm('publicWhatsapp', event.target.value)} placeholder="+56 9 1234 5678" />
                            </Field>
                            <Field label="Sitio web" icon={<IconWorld size={14} />}>
                                <input className="form-input" value={form.website ?? ''} onChange={(event) => updateForm('website', event.target.value)} placeholder="www.tusitio.cl" />
                            </Field>
                            <Field label="Región" icon={<IconMapPin size={14} />}>
                                <input className="form-input" value={form.region ?? ''} onChange={(event) => updateForm('region', event.target.value)} placeholder="Región Metropolitana" />
                            </Field>
                            <Field label="Ciudad o comuna" icon={<IconMapPin size={14} />}>
                                <input className="form-input" value={form.city ?? ''} onChange={(event) => updateForm('city', event.target.value)} placeholder="Las Condes" />
                            </Field>
                            <Field label="Dirección de atención" icon={<IconMapPin size={14} />}>
                                <input className="form-input" value={form.addressLine ?? ''} onChange={(event) => updateForm('addressLine', event.target.value)} placeholder="Av. Apoquindo 1234" />
                            </Field>
                            <Field label="Especialidades" icon={<IconAt size={14} />}>
                                <input
                                    className="form-input"
                                    value={joinSpecialties(form.specialties)}
                                    onChange={(event) => updateForm('specialties', splitSpecialties(event.target.value))}
                                    placeholder="SUV, sedanes, usados premium, flotas"
                                />
                            </Field>
                        </div>
                    </PanelCard>
    );

    const socialCard = (
                    <PanelCard size="lg" className="space-y-5">
                        <PanelBlockHeader
                            title="Redes sociales"
                            description="Puedes ingresar URLs completas o solo el nombre de usuario."
                            className="mb-0"
                        />

                        <div className="space-y-3">
                            <SocialField icon={<IconBrandInstagram size={15} />} label="Instagram" value={form.socialLinks.instagram} onChange={(value) => updateForm('socialLinks', { ...form.socialLinks, instagram: value })} />
                            <SocialField icon={<IconBrandFacebook size={15} />} label="Facebook" value={form.socialLinks.facebook} onChange={(value) => updateForm('socialLinks', { ...form.socialLinks, facebook: value })} />
                            <SocialField icon={<IconBrandLinkedin size={15} />} label="LinkedIn" value={form.socialLinks.linkedin} onChange={(value) => updateForm('socialLinks', { ...form.socialLinks, linkedin: value })} />
                            <SocialField icon={<IconBrandYoutube size={15} />} label="YouTube" value={form.socialLinks.youtube} onChange={(value) => updateForm('socialLinks', { ...form.socialLinks, youtube: value })} />
                            <SocialField icon={<IconBrandTiktok size={15} />} label="TikTok" value={form.socialLinks.tiktok} onChange={(value) => updateForm('socialLinks', { ...form.socialLinks, tiktok: value })} />
                            <SocialField icon={<IconBrandX size={15} />} label="X / Twitter" value={form.socialLinks.x} onChange={(value) => updateForm('socialLinks', { ...form.socialLinks, x: value })} />
                        </div>
                    </PanelCard>
    );

    const hoursCard = (
                    <PanelCard size="lg" className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <PanelBlockHeader
                                title="Horario de atención"
                                description="Muestra cuándo respondes o atiendes compradores."
                                className="mb-0"
                            />
                            <div className="flex items-center gap-2">
                                <PanelSwitch checked={form.alwaysOpen} onChange={(next) => updateForm('alwaysOpen', next)} ariaLabel="Disponibilidad 24/7" size="sm" />
                                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>24/7</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {form.businessHours.map((item) => (
                                <div key={item.day} className="rounded-card border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            <IconClock size={14} />
                                            {DAY_LABELS[item.day]}
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                                            <input type="checkbox" checked={item.closed} onChange={(event) => handleHourChange(item.day, 'closed', event.target.checked)} />
                                            Cerrado
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="time"
                                            className="form-input"
                                            value={item.open ?? ''}
                                            disabled={form.alwaysOpen || item.closed}
                                            onChange={(event) => handleHourChange(item.day, 'open', event.target.value)}
                                        />
                                        <input
                                            type="time"
                                            className="form-input"
                                            value={item.close ?? ''}
                                            disabled={form.alwaysOpen || item.closed}
                                            onChange={(event) => handleHourChange(item.day, 'close', event.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Field label="Nota adicional" icon={<IconClock size={14} />}>
                            <input className="form-input" value={form.scheduleNote ?? ''} onChange={(event) => updateForm('scheduleNote', event.target.value)} placeholder="Ej: Atendemos por agenda previa los sábados." />
                        </Field>
                    </PanelCard>
    );

    const summaryCard = (
                    <PanelCard size="lg" className="space-y-4">
                        <PanelBlockHeader
                            title="Resumen"
                            description="Así se conectará tu página con tu cuenta y tu inventario."
                            className="mb-0"
                        />
                        <SummaryItem label="Tipo" value={form.accountKind === 'company' ? 'Empresa' : form.accountKind === 'independent' ? 'Independiente' : 'Particular'} />
                        <SummaryItem label="Plan" value={currentPlanName} />
                        <SummaryItem label="Publicación" value={form.isPublished ? 'Visible al público' : 'Guardada como borrador'} />
                        <SummaryItem label="Equipo" value={`${form.teamMembers.length} integrante${form.teamMembers.length === 1 ? '' : 's'}`} />
                        <SummaryItem label="URL" value={publicPreview ?? 'Aún no publicada'} />
                        <div className="pt-2">
                            <PanelButton type="button" onClick={() => void handleSave()} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar perfil público'}
                            </PanelButton>
                        </div>
                    </PanelCard>
    );

    const teamCard = (
            <PanelCard size="lg" className="space-y-5">
                <PanelBlockHeader
                    title="Equipo visible"
                    description="Agrega vendedores o asesores que quieras mostrar en la ficha pública."
                    className="mb-0"
                />
                <PanelNotice tone="neutral">
                    Configura los integrantes visibles en tu perfil público. Las consultas de publicaciones llegan por mensajes en el panel.
                </PanelNotice>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                    <div className="space-y-3">
                        {form.teamMembers.length === 0 ? (
                            <PanelNotice tone="neutral">
                                Aún no agregas integrantes del equipo. Puedes dejar la ficha solo con la cuenta principal o sumar vendedores visibles.
                            </PanelNotice>
                        ) : (
                            form.teamMembers.map((member, index) => (
                                <div key={member.id ?? `${member.name}-${index}`} className="rounded-card border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl overflow-hidden" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                                    {member.avatarImageUrl ? (
                                                        <Image src={member.avatarImageUrl} alt={member.name} width={44} height={44} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <IconUsersGroup size={18} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{member.name}</p>
                                                    <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{member.roleTitle || 'Asesor comercial'}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {!member.isPublished ? <PanelStatusBadge label="Oculto" tone="neutral" size="sm" /> : null}
                                                {member.specialties.slice(0, 3).map((item) => (
                                                    <PanelStatusBadge key={`${member.id ?? member.name}-${item}`} label={item} tone="neutral" size="sm" />
                                                ))}
                                            </div>
                                            {member.bio ? <p className="text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>{member.bio}</p> : null}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <PanelButton type="button" variant="secondary" onClick={() => moveTeamMember(member.id, -1)} disabled={index === 0}>
                                                <IconArrowUp size={14} />
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => moveTeamMember(member.id, 1)} disabled={index === form.teamMembers.length - 1}>
                                                <IconArrowDown size={14} />
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => editTeamMember(member)}>
                                                Editar
                                            </PanelButton>
                                            <PanelButton type="button" variant="secondary" onClick={() => removeTeamMember(member.id)}>
                                                <IconTrash size={14} />
                                            </PanelButton>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="rounded-card border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                {editingTeamMemberId ? 'Editar integrante' : 'Agregar integrante'}
                            </p>
                            <p className="text-xs leading-5" style={{ color: 'var(--fg-secondary)' }}>
                                Estos datos construyen la cara pública de tu equipo en el perfil.
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                            <Field label="Nombre" icon={<IconUser size={14} />}>
                                <input className="form-input" value={teamDraft.name} onChange={(event) => setTeamDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej: Carolina Muñoz" />
                            </Field>
                            <Field label="Cargo o rol" icon={<IconBadgeTm size={14} />}>
                                <input className="form-input" value={teamDraft.roleTitle ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, roleTitle: event.target.value }))} placeholder="Ej: Ejecutiva comercial" />
                            </Field>
                            <Field label="Correo" icon={<IconMail size={14} />}>
                                <input className="form-input" value={teamDraft.email ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, email: event.target.value }))} placeholder="asesor@tuempresa.cl" />
                            </Field>
                            <Field label="Teléfono" icon={<IconPhone size={14} />}>
                                <input className="form-input" value={teamDraft.phone ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="+56 9 1234 5678" />
                            </Field>
                            <Field label="WhatsApp" icon={<IconPhone size={14} />}>
                                <input className="form-input" value={teamDraft.whatsapp ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, whatsapp: event.target.value }))} placeholder="+56 9 1234 5678" />
                            </Field>
                            <Field label="Avatar URL" icon={<IconPhoto size={14} />}>
                                <input className="form-input" value={teamDraft.avatarImageUrl ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, avatarImageUrl: event.target.value }))} placeholder="https://..." />
                            </Field>
                        </div>

                        <Field label="Especialidades" icon={<IconAt size={14} />}>
                            <input
                                className="form-input"
                                value={joinSpecialties(teamDraft.specialties)}
                                onChange={(event) => setTeamDraft((current) => ({ ...current, specialties: splitTeamSpecialties(event.target.value) }))}
                                placeholder="SUV, pickup, financiamiento"
                            />
                        </Field>

                        <Field label="Bio breve" icon={<IconNotebook size={14} />}>
                            <textarea className="form-textarea min-h-[120px]" value={teamDraft.bio ?? ''} onChange={(event) => setTeamDraft((current) => ({ ...current, bio: event.target.value }))} placeholder="Describe su foco comercial, tipo de vehículos o especialidad." />
                        </Field>

                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                            <SocialField icon={<IconBrandInstagram size={15} />} label="Instagram" value={teamDraft.socialLinks.instagram} onChange={(value) => setTeamDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, instagram: value } }))} />
                            <SocialField icon={<IconBrandFacebook size={15} />} label="Facebook" value={teamDraft.socialLinks.facebook} onChange={(value) => setTeamDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, facebook: value } }))} />
                            <SocialField icon={<IconBrandLinkedin size={15} />} label="LinkedIn" value={teamDraft.socialLinks.linkedin} onChange={(value) => setTeamDraft((current) => ({ ...current, socialLinks: { ...current.socialLinks, linkedin: value } }))} />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                <input type="checkbox" checked={teamDraft.isPublished} onChange={(event) => setTeamDraft((current) => ({ ...current, isPublished: event.target.checked }))} />
                                Mostrar en ficha pública
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <PanelButton type="button" onClick={saveTeamDraft}>
                                {editingTeamMemberId ? 'Actualizar integrante' : 'Agregar integrante'}
                            </PanelButton>
                            {editingTeamMemberId ? (
                                <PanelButton type="button" variant="secondary" onClick={resetTeamDraft}>
                                    Cancelar edición
                                </PanelButton>
                            ) : null}
                        </div>
                    </div>
                </div>
            </PanelCard>
    );

    const saveFooter = (
        <PanelCard size="lg" className="space-y-4">
            <PanelButton type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar perfil público'}
            </PanelButton>
        </PanelCard>
    );

    return (
        <div className="space-y-6">
            {tabbed && notice ? <PanelNotice tone="neutral">{notice}</PanelNotice> : null}

            {tabbed ? (
                <>
                    {show('pagina') ? brandImagesCard : null}
                    {show('pagina') ? identityCard : null}
                    {show('contacto') ? contactCard : null}
                    {show('redes') ? socialCard : null}
                    {show('horarios') ? hoursCard : null}
                    {show('equipo') ? teamCard : null}
                    {saveFooter}
                </>
            ) : (
                <>
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                        <div className="space-y-6">
                            {brandImagesCard}
                            {identityCard}
                            {contactCard}
                        </div>
                        <div className="space-y-6">
                            {socialCard}
                            {hoursCard}
                            {summaryCard}
                        </div>
                    </div>
                    {teamCard}
                </>
            )}
        </div>
    );
}
