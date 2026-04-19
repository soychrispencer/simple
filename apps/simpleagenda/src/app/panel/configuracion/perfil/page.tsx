'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconAlertCircle, IconLoader2, IconCamera, IconX, IconSparkles, IconBrandInstagram, IconBrandFacebook, IconBrandLinkedin, IconBrandTiktok, IconBrandYoutube, IconBrandX, IconWorld, IconChevronDown } from '@tabler/icons-react';
import { fetchAgendaProfile, saveAgendaProfile, uploadAvatar, fetchAgendaLocations, updateAgendaLocation, type AgendaLocation } from '@/lib/agenda-api';
import { vocab } from '@/lib/vocabulary';
import { generatePolicies } from '@/actions/generate-policies';
import Link from 'next/link';
import { IconChevronRight, IconMapPin, IconPlus, IconLoader2 as IconLoader2Loc } from '@tabler/icons-react';
import { PanelCard, PanelField, PanelButton, PanelNotice, PanelBlockHeader, PanelPageHeader, PanelSwitch } from '@simple/ui';

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
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [coverUploading, setCoverUploading] = useState(false);
    const [generatingPolicies, setGeneratingPolicies] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

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
        confirmationMode: 'auto' as 'auto' | 'manual',
        allowsRecurrentBooking: true,
        bookingWindowDays: 30,
        cancellationHours: 24,
        currency: 'CLP',
        encuadre: '',
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
                    confirmationMode: (profile.confirmationMode as 'auto' | 'manual') ?? 'auto',
                    allowsRecurrentBooking: profile.allowsRecurrentBooking ?? true,
                    bookingWindowDays: profile.bookingWindowDays ?? 30,
                    cancellationHours: profile.cancellationHours ?? 24,
                    currency: profile.currency ?? 'CLP',
                    encuadre: profile.encuadre ?? '',
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

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) { setError('La imagen no puede pesar más de 8 MB.'); return; }
        setCoverUploading(true);
        setError('');
        const result = await uploadAvatar(file);
        setCoverUploading(false);
        if (!result.ok) { setError(result.error ?? 'Error al subir la imagen.'); return; }
        if (result.url) set('coverUrl', result.url);
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no puede pesar más de 5 MB.');
            return;
        }
        setAvatarUploading(true);
        setError('');
        const result = await uploadAvatar(file);
        setAvatarUploading(false);
        if (!result.ok) {
            setError(result.error ?? 'Error al subir la imagen.');
            return;
        }
        if (result.url) {
            setAvatarError(false);
            set('avatarUrl', result.url);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGeneratePolicies = async () => {
        setGeneratingPolicies(true);
        setError('');
        const result = await generatePolicies({
            profession: form.profession,
            displayName: form.displayName,
            cancellationHours: form.cancellationHours,
            bookingWindowDays: form.bookingWindowDays,
            existingText: form.encuadre,
        });
        setGeneratingPolicies(false);
        if (result.text) {
            set('encuadre', result.text);
        } else if (result.error) {
            setError(result.error);
        }
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
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando perfil...
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Perfil profesional"
                description="Esta información aparecerá en tu página pública de reservas."
            />

            <div className="flex flex-col gap-6">
                {/* Cover + Avatar Preview */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Imágenes de perfil" className="mb-3" />
                    <div className="flex flex-col items-center gap-4">
                        {/* Cover Preview - matching public profile layout */}
                        <div className="relative w-full">
                            <div
                                className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm"
                                style={{
                                    height: 240,
                                    background: form.coverUrl
                                        ? `url('${encodeURI(form.coverUrl)}') center/cover no-repeat`
                                        : 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 40%, #1a1a2e) 50%, #0f0f23 100%)',
                                }}
                            />
                            {/* Avatar overlapping cover - responsive size */}
                            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -36 }}>
                                <div
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg"
                                    style={{
                                        border: '4px solid var(--bg)',
                                        background: form.avatarUrl && !avatarError
                                            ? `url('${encodeURI(form.avatarUrl)}') center/cover no-repeat`
                                            : 'linear-gradient(135deg, var(--accent-soft) 0%, var(--accent-subtle) 100%)',
                                        color: form.avatarUrl && !avatarError ? 'transparent' : 'var(--accent)',
                                    }}
                                >
                                    {(!form.avatarUrl || avatarError) && (form.displayName?.charAt(0)?.toUpperCase() ?? '?')}
                                </div>
                            </div>
                        </div>

                        {/* Upload buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-10">
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                disabled={coverUploading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                            >
                                {coverUploading ? <IconLoader2 size={16} className="animate-spin" /> : <IconCamera size={16} />}
                                {form.coverUrl ? 'Cambiar portada' : 'Subir portada'}
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                            >
                                {avatarUploading ? <IconLoader2 size={16} className="animate-spin" /> : <IconCamera size={16} />}
                                {form.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                            </button>
                            {(form.coverUrl || form.avatarUrl) && (
                                <button
                                    onClick={() => { set('coverUrl', ''); set('avatarUrl', ''); }}
                                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                                    style={{ color: 'var(--color-error)' }}
                                >
                                    <IconX size={14} /> Eliminar
                                </button>
                            )}
                        </div>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>
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
                            href="/panel/configuracion/direcciones"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 shrink-0"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg)' }}
                        >
                            <IconPlus size={13} /> Gestionar
                        </Link>
                    </div>
                    {locations.length === 0 ? (
                        <Link
                            href="/panel/configuracion/direcciones"
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

                {/* Configuracion de reservas */}
                <PanelCard size="md">
                    <PanelBlockHeader title="Configuración de reservas" className="mb-3" />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <PanelField label="Confirmación de citas" className="sm:col-span-2">
                            <div className="flex gap-3">
                                {(['auto', 'manual'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => set('confirmationMode', mode)}
                                        className="flex-1 py-2.5 rounded-xl border text-sm transition-colors"
                                        style={{
                                            borderColor: form.confirmationMode === mode ? 'var(--accent)' : 'var(--border)',
                                            background: form.confirmationMode === mode ? 'var(--accent-soft)' : 'transparent',
                                            color: form.confirmationMode === mode ? 'var(--accent)' : 'var(--fg-secondary)',
                                            fontWeight: form.confirmationMode === mode ? 600 : 400,
                                        }}
                                    >
                                        {mode === 'auto' ? 'Automatica' : 'Manual'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs mt-1.5" style={{ color: 'var(--fg-muted)' }}>
                                {form.confirmationMode === 'auto'
                                    ? 'Las reservas se confirman inmediatamente.'
                                    : 'Debes aprobar cada reserva manualmente.'}
                            </p>
                        </PanelField>

                        <PanelField label="Ventana de reserva (días)" hint="Cuántos días antes pueden reservar">
                            <input
                                type="number"
                                min={1}
                                max={365}
                                value={form.bookingWindowDays}
                                onChange={(e) => set('bookingWindowDays', Number(e.target.value))}
                                className="form-input"
                            />
                        </PanelField>
                        <PanelField label="Aviso de cancelación (horas)" hint="Mínimo de horas para cancelar">
                            <input
                                type="number"
                                min={0}
                                max={168}
                                value={form.cancellationHours}
                                onChange={(e) => set('cancellationHours', Number(e.target.value))}
                                className="form-input"
                            />
                        </PanelField>
                    </div>

                    <div className="mt-4 pt-4 flex items-start gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Permitir reservas recurrentes</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                Tus {vocab.clients} podrán agendar varias sesiones (semanal, quincenal o mensual) desde tu link público.
                            </p>
                        </div>
                        <PanelSwitch
                            checked={form.allowsRecurrentBooking}
                            onChange={(v) => set('allowsRecurrentBooking', v)}
                            size="sm"
                            ariaLabel={form.allowsRecurrentBooking ? 'Desactivar reservas recurrentes' : 'Activar reservas recurrentes'}
                        />
                    </div>
                </PanelCard>

                {/* Políticas y condiciones */}
                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Políticas y condiciones"
                        description={`El ${vocab.client} deberá leerlas y aceptarlas antes de reservar.`}
                        className="mb-3"
                        actions={
                            <PanelButton
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleGeneratePolicies()}
                                disabled={generatingPolicies}
                            >
                                {generatingPolicies
                                    ? <IconLoader2 size={14} className="animate-spin" />
                                    : <IconSparkles size={14} />}
                                {generatingPolicies ? 'Generando...' : 'Generar con IA'}
                            </PanelButton>
                        }
                    />
                    <PanelField
                        label="Texto de políticas"
                        hint="Puedes generarlas con IA y luego editarlas a tu gusto."
                    >
                        <textarea
                            value={form.encuadre}
                            onChange={(e) => set('encuadre', e.target.value)}
                            placeholder={`Escribe aquí tus políticas y condiciones para los ${vocab.clients}...`}
                            rows={8}
                            className="form-textarea"
                        />
                    </PanelField>
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
            </div>

            {/* Siguiente paso */}
            <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                <Link
                    href="/panel/configuracion/servicios"
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
        </div>
    );
}
