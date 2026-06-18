'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconAlertCircle, IconLoader2, IconBrandInstagram, IconBrandFacebook, IconBrandLinkedin, IconBrandTiktok, IconBrandYoutube, IconBrandX, IconWorld, IconChevronDown, IconX } from '@tabler/icons-react';
import { fetchAgendaProfile, saveAgendaProfile, uploadAvatar, fetchAgendaLocations, updateAgendaLocation, type AgendaLocation } from '@/lib/agenda-api';
import { vocab } from '@/lib/vocabulary';
import Link from 'next/link';
import { IconChevronRight, IconMapPin, IconPlus, IconLoader2 as IconLoader2Loc } from '@tabler/icons-react';
import { PanelCard, PanelProfileBrandImages, PanelField, PanelButton, PanelNotice, PanelBlockHeader, PanelSwitch } from '@simple/ui/panel';
import { AgendaMiNegocioShell, AgendaMiNegocioLoading } from '@/components/panel/agenda-mi-negocio-shell';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { AGENDA_BUSINESS_PERFIL_PAGE } from '@simple/ui/panel';

type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'twitter';
type SocialLink = { platform: SocialPlatform; username: string };

const SOCIAL_PLATFORMS: Record<SocialPlatform, { label: string; Icon: React.ElementType; shortBase: string; base: string; placeholder: string }> = {
    instagram: { label: 'Instagram', Icon: IconBrandInstagram, shortBase: 'instagram.com/', base: 'https://instagram.com/', placeholder: 'tu_usuario' },
    facebook:  { label: 'Facebook',  Icon: IconBrandFacebook,  shortBase: 'facebook.com/',  base: 'https://facebook.com/',  placeholder: 'tu_pagina'  },
    linkedin:  { label: 'LinkedIn',  Icon: IconBrandLinkedin,  shortBase: 'linkedin.com/in/', base: 'https://linkedin.com/in/', placeholder: 'tu_perfil' },
    tiktok:    { label: 'TikTok',    Icon: IconBrandTiktok,    shortBase: 'tiktok.com/@',   base: 'https://tiktok.com/@',   placeholder: 'tu_usuario' },
    youtube:   { label: 'YouTube',   Icon: IconBrandYoutube,   shortBase: 'youtube.com/@',  base: 'https://youtube.com/@',  placeholder: 'tu_canal'   },
    twitter:   { label: 'X / Twitter', Icon: IconBrandX,       shortBase: 'x.com/',         base: 'https://x.com/',         placeholder: 'tu_usuario' },
};

const ALL_PLATFORMS = Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[];

function urlToUsername(url: string | null | undefined, base: string): string {
    if (!url) return '';
    return url.replace(base, '').replace(/^@/, '').replace(/\/$/, '');
}

export default function PerfilConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [locations, setLocations] = useState<AgendaLocation[]>([]);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        displayName: '',
        profession: '',
        headline: '',
        bio: '',
        avatarUrl: '',
        coverUrl: '',
        publicEmail: '',
        publicPhone: '',
        publicWhatsapp: '',
        websiteUrl: '',
    });
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [showPlatformPicker, setShowPlatformPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            const profile = await fetchAgendaProfile();
            if (profile) {
                setForm({
                    displayName: profile.displayName ?? '',
                    profession: profile.profession ?? '',
                    headline: profile.headline ?? '',
                    bio: profile.bio ?? '',
                    avatarUrl: profile.avatarUrl ?? '',
                    coverUrl: profile.coverUrl ?? '',
                    publicEmail: profile.publicEmail ?? '',
                    publicPhone: profile.publicPhone ?? '',
                    publicWhatsapp: profile.publicWhatsapp ?? '',
                    websiteUrl: profile.websiteUrl ?? '',
                });
                const loaded: SocialLink[] = [];
                for (const p of ALL_PLATFORMS) {
                    const username = urlToUsername((profile as any)[`${p}Url`], SOCIAL_PLATFORMS[p].base);
                    if (username) loaded.push({ platform: p, username });
                }
                if (loaded.length === 0) loaded.push({ platform: 'instagram', username: '' });
                setSocialLinks(loaded);
            }
            setLoading(false);
        };
        void load();
    }, []);

    useEffect(() => {
        void fetchAgendaLocations().then(setLocations);
    }, []);

    const handleToggleActive = async (loc: AgendaLocation) => {
        setTogglingId(loc.id);
        const next = !loc.isActive;
        const result = await updateAgendaLocation(loc.id, { isActive: next });
        if (result.ok) {
            setLocations((prev) => prev.map((l) => l.id === loc.id ? { ...l, isActive: next } : l));
        }
        setTogglingId(null);
    };

    const set = (key: keyof typeof form, value: string | boolean | number) => {
        setSaved(false);
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!form.displayName.trim()) { setError('El nombre visible es requerido.'); return; }
        setSaving(true);
        setError('');
        const socialPayload: Record<string, string | null> = {
            instagramUrl: null, facebookUrl: null, linkedinUrl: null,
            tiktokUrl: null, youtubeUrl: null, twitterUrl: null,
        };
        for (const link of socialLinks) {
            const info = SOCIAL_PLATFORMS[link.platform];
            socialPayload[`${link.platform}Url`] = link.username.trim() ? `${info.base}${link.username.trim()}` : null;
        }
        const result = await saveAgendaProfile({ ...form, ...socialPayload });
        setSaving(false);
        if (!result.ok) { setError(result.error ?? 'Error al guardar.'); return; }
        setSaved(true);
        window.dispatchEvent(new CustomEvent('simple:agenda-profile-changed'));
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return (
            <AgendaMiNegocioLoading
                activeKey="pagina"
                title={AGENDA_BUSINESS_PERFIL_PAGE.title}
                description={AGENDA_BUSINESS_PERFIL_PAGE.description}
                message="Cargando datos comerciales..."
            />
        );
    }

    return (
        <AgendaMiNegocioShell
            activeKey="pagina"
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_PERFIL_PAGE.title}
            description={AGENDA_BUSINESS_PERFIL_PAGE.description}
        >
                <PanelCard size="lg">
                    <PanelBlockHeader
                        title="Imágenes del negocio"
                        description="Portada y logo de tu consulta o negocio. Tu foto personal se configura en Mi cuenta."
                        className="mb-3"
                    />
                    <PanelProfileBrandImages
                        displayName={form.displayName}
                        logoUrl={form.avatarUrl || null}
                        coverUrl={form.coverUrl || null}
                        subtitle={form.profession?.trim() || form.headline?.trim() || null}
                        onLogoChange={(url) => set('avatarUrl', url)}
                        onCoverChange={(url) => set('coverUrl', url)}
                        onUploadLogo={async (_file, croppedBlob) => {
                            const uploadFile = new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                            const result = await uploadAvatar(uploadFile);
                            if (!result.ok || !result.url) {
                                throw new Error(result.error ?? 'Error al subir el logo.');
                            }
                            return { url: result.url };
                        }}
                        onUploadCover={async (_file, croppedBlob) => {
                            const uploadFile = new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
                            const result = await uploadAvatar(uploadFile);
                            if (!result.ok || !result.url) {
                                throw new Error(result.error ?? 'Error al subir la imagen.');
                            }
                            return { url: result.url };
                        }}
                        onError={(message) => setError(message)}
                    />
                </PanelCard>

                {/* Info basica */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Información pública" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="Nombre visible" required>
                            <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ej: Dra. Maria Gonzalez" className="form-input" />
                        </PanelField>
                        <PanelField label="Profesión">
                            <input type="text" value={form.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Ej: Psicologa Clinica" className="form-input" />
                        </PanelField>
                        <PanelField label="Titular" hint="Aparece bajo tu nombre" className="sm:col-span-2">
                            <input type="text" value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Ej: Especialista en ansiedad y relaciones" className="form-input" />
                        </PanelField>
                        <PanelField label="Biografía" className="sm:col-span-2">
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

                {/* Contacto */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Contacto" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="WhatsApp">
                            <input type="tel" value={form.publicWhatsapp} onChange={(e) => set('publicWhatsapp', e.target.value)} placeholder="+56 9 1234 5678" className="form-input" />
                        </PanelField>
                        <PanelField label="Teléfono">
                            <input type="tel" value={form.publicPhone} onChange={(e) => set('publicPhone', e.target.value)} placeholder="+56 2 1234 5678" className="form-input" />
                        </PanelField>
                        <PanelField label="Email público">
                            <input type="email" value={form.publicEmail} onChange={(e) => set('publicEmail', e.target.value)} placeholder="contacto@ejemplo.cl" className="form-input" />
                        </PanelField>
                        {/* Sitio web — siempre visible */}
                        <PanelField label="Sitio web">
                            <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                                <span className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 text-xs" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRight: '1px solid var(--border)' }}>
                                    <IconWorld size={13} /> https://
                                </span>
                                <input
                                    type="text"
                                    value={form.websiteUrl.replace(/^https?:\/\//, '')}
                                    onChange={(e) => set('websiteUrl', e.target.value ? `https://${e.target.value}` : '')}
                                    placeholder="tuweb.cl"
                                    className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
                                    style={{ color: 'var(--fg)' }}
                                />
                            </div>
                        </PanelField>
                    </div>

                    {/* Redes sociales — lista dinámica */}
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--fg-secondary)' }}>Redes sociales</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {socialLinks.map((link, idx) => {
                                const info = SOCIAL_PLATFORMS[link.platform];
                                const Icon = info.Icon;
                                return (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            <Icon size={15} />
                                        </div>
                                        <div className="flex-1 flex items-center rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                                            <span className="px-2.5 py-2 text-[11px] shrink-0 whitespace-nowrap" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRight: '1px solid var(--border)' }}>
                                                {info.shortBase}
                                            </span>
                                            <input
                                                type="text"
                                                value={link.username}
                                                onChange={(e) => setSocialLinks((prev) => prev.map((l, i) => i === idx ? { ...l, username: e.target.value } : l))}
                                                placeholder={info.placeholder}
                                                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                                                style={{ color: 'var(--fg)' }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== idx))}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                            style={{ color: 'var(--fg-muted)' }}
                                            aria-label="Eliminar"
                                        >
                                            <IconX size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Agregar red social */}
                        <div className="relative mt-3" ref={pickerRef}>
                            {(() => {
                                const usedPlatforms = new Set(socialLinks.map((l) => l.platform));
                                const available = ALL_PLATFORMS.filter((p) => !usedPlatforms.has(p));
                                if (available.length === 0) return null;
                                return (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowPlatformPicker((v) => !v)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg)' }}
                                        >
                                            <IconPlus size={13} /> Agregar red social <IconChevronDown size={11} />
                                        </button>
                                        {showPlatformPicker && (
                                            <div
                                                className="absolute left-0 mt-1.5 rounded-xl border shadow-lg z-20 p-1 min-w-[180px]"
                                                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                                            >
                                                {available.map((platform) => {
                                                    const info = SOCIAL_PLATFORMS[platform];
                                                    const PIcon = info.Icon;
                                                    return (
                                                        <button
                                                            key={platform}
                                                            type="button"
                                                            onClick={() => {
                                                                setSocialLinks((prev) => [...prev, { platform, username: '' }]);
                                                                setShowPlatformPicker(false);
                                                            }}
                                                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[--bg-muted]"
                                                            style={{ color: 'var(--fg)' }}
                                                        >
                                                            <PIcon size={15} style={{ color: 'var(--fg-muted)' }} />
                                                            {info.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </PanelCard>

                {/* Ubicaciones — seleccionables desde perfil */}
                <PanelCard size="md">
                    <div className="flex items-center justify-between mb-3">
                        <PanelBlockHeader
                            title="Direcciones"
                            description="Activa los consultorios donde atiendes esta semana."
                        />
                        <Link
                            href="/panel/mi-cuenta/direcciones"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 shrink-0"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg)' }}
                        >
                            <IconPlus size={13} /> Gestionar
                        </Link>
                    </div>
                    {locations.length === 0 ? (
                        <Link
                            href="/panel/mi-cuenta/direcciones"
                            className="flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors hover:border-[--accent-border]"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                <IconMapPin size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Agrega tu primera dirección</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Consultorios y lugares donde atiendes de forma presencial.</p>
                            </div>
                            <IconChevronRight size={15} style={{ color: 'var(--accent)' }} />
                        </Link>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {locations.map((loc) => (
                                <div
                                    key={loc.id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                                    style={{ borderColor: 'var(--border)', background: 'var(--bg)', opacity: loc.isActive ? 1 : 0.55 }}
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                        <IconMapPin size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{loc.name}</p>
                                        {loc.addressLine && (
                                            <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{loc.addressLine}{loc.city ? `, ${loc.city}` : ''}</p>
                                        )}
                                    </div>
                                    {togglingId === loc.id ? (
                                        <IconLoader2Loc size={16} className="animate-spin shrink-0" style={{ color: 'var(--fg-muted)' }} />
                                    ) : (
                                        <PanelSwitch
                                            checked={loc.isActive}
                                            onChange={() => void handleToggleActive(loc)}
                                            size="sm"
                                            ariaLabel={loc.isActive ? 'Desactivar' : 'Activar'}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </PanelCard>

                {error && (
                    <PanelNotice tone="error">
                        <span className="flex items-center gap-2"><IconAlertCircle size={15} /> {error}</span>
                    </PanelNotice>
                )}

                <div className="flex">
                    <PanelButton
                        variant="accent"
                        onClick={() => void handleSave()}
                        disabled={saving}
                    >
                        {saving ? <IconLoader2 size={14} className="animate-spin" /> : saved ? <IconCheck size={14} /> : null}
                        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
                    </PanelButton>
                </div>

            {/* Siguiente paso */}
            <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                <Link
                    href="/panel/mi-negocio/servicios"
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div>
                        <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>Siguiente paso</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Servicios y sesiones</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Define los tipos de consulta, duración y precio.</p>
                    </div>
                    <IconChevronRight size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </Link>
            </div>
        </AgendaMiNegocioShell>
    );
}
