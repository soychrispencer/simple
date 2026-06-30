'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { resolveAppMediaUrl, isBusinessOpenNow, formatBusinessScheduleRange, isInstantBlocked, isInstantInWeeklyBreak, type PublicBusinessPaymentMethods } from '@simple/utils';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
    IconClock,
    IconMail,
    IconMapPin,
    IconPhone,
    IconWorld,
} from '@tabler/icons-react';
import { PanelCard } from '../panel/panel-card';
import { PanelBlockHeader, PanelNotice } from '../panel/panel-primitives';
import { BusinessPublicPaymentMethodsSection } from './business-public-payment-methods.js';

export type PublicProfileDay =
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';

export const PUBLIC_PROFILE_DAY_LABELS: Record<PublicProfileDay, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

export type PublicProfileShellSocialLinks = {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    youtube: string | null;
    tiktok: string | null;
    x: string | null;
};

export type PublicProfileShellData = {
    name: string;
    subscriptionPlanName: string;
    accountKindLabel: string;
    locationLabel: string | null;
    addressLine?: string | null;
    city?: string | null;
    region?: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    bio: string | null;
    email: string;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    activeListings: number;
    totalViews: number;
    totalFavorites: number;
    followers: number;
    specialties: string[];
    businessHours: Array<{
        day: PublicProfileDay;
        open: string | null;
        close: string | null;
        closed: boolean;
    }>;
    scheduleNote: string | null;
    alwaysOpen: boolean;
    weeklyBreakStart?: string | null;
    weeklyBreakEnd?: string | null;
    scheduleBlockedSlots?: Array<{ id: string; startsAt: string; endsAt: string; reason?: string | null }>;
    socialLinks: PublicProfileShellSocialLinks;
    paymentMethods?: PublicBusinessPaymentMethods | null;
};

export type PublicProfileTodayState = {
    openNow: boolean;
    label: string;
    detail: string;
};

export type PublicProfileShellProps = {
    profile: PublicProfileShellData;
    todayState: PublicProfileTodayState | null;
    initials: string;
    listings: ReactNode;
    services?: ReactNode;
};

export function initialsFromPublicProfileName(name: string) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export function formatPublicProfileTime(value: string | null) {
    return value ?? '--:--';
}

export function getPublicProfileTodayState(profile: PublicProfileShellData): PublicProfileTodayState {
    const now = new Date();
    const activeBlocks = (profile.scheduleBlockedSlots ?? []).filter((slot) => new Date(slot.endsAt).getTime() > now.getTime());
    if (isInstantBlocked(now, activeBlocks)) {
        const current = activeBlocks.find((slot) => isInstantBlocked(now, [slot]));
        return {
            openNow: false,
            label: 'No disponible',
            detail: current?.reason ?? 'Bloqueo temporal de atención.',
        };
    }

    if (profile.alwaysOpen) {
        return {
            openNow: true,
            label: 'Disponible 24/7',
            detail: 'Atención declarada como permanente.',
        };
    }

    const todayMap: PublicProfileDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = todayMap[now.getDay()] ?? 'monday';
    const today = profile.businessHours.find((item) => item.day === todayKey);
    if (!today || today.closed || !today.open || !today.close) {
        return {
            openNow: false,
            label: `Hoy ${PUBLIC_PROFILE_DAY_LABELS[todayKey]} cerrado`,
            detail: profile.scheduleNote ?? 'Sin horario informado para hoy.',
        };
    }

    if (profile.weeklyBreakStart && profile.weeklyBreakEnd && isInstantInWeeklyBreak(now, profile.weeklyBreakStart, profile.weeklyBreakEnd)) {
        return {
            openNow: false,
            label: 'En colación',
            detail: `Pausa ${formatBusinessScheduleRange(profile.weeklyBreakStart, profile.weeklyBreakEnd)}.`,
        };
    }

    const openNow = isBusinessOpenNow(today.open, today.close, now);
    const rangeLabel = formatBusinessScheduleRange(today.open, today.close);

    return {
        openNow,
        label: openNow ? 'Abierto ahora' : `Atiende hoy ${rangeLabel}`,
        detail: profile.scheduleNote ?? `${PUBLIC_PROFILE_DAY_LABELS[today.day]} ${rangeLabel}`,
    };
}

function resolveSocialUrl(key: keyof PublicProfileShellSocialLinks, value: string | null) {
    const normalized = value?.trim();
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const handle = normalized.replace(/^@/, '');
    if (key === 'instagram') return `https://instagram.com/${handle}`;
    if (key === 'facebook') return `https://facebook.com/${handle}`;
    if (key === 'linkedin') return `https://linkedin.com/in/${handle}`;
    if (key === 'youtube') return `https://youtube.com/@${handle}`;
    if (key === 'tiktok') return `https://tiktok.com/@${handle}`;
    return `https://x.com/${handle}`;
}

function buildSocialLinks(profile: PublicProfileShellData) {
    const entries = [
        { key: 'instagram' as const, label: 'Instagram', icon: <IconBrandInstagram size={16} /> },
        { key: 'facebook' as const, label: 'Facebook', icon: <IconBrandFacebook size={16} /> },
        { key: 'linkedin' as const, label: 'LinkedIn', icon: <IconBrandLinkedin size={16} /> },
        { key: 'youtube' as const, label: 'YouTube', icon: <IconBrandYoutube size={16} /> },
        { key: 'tiktok' as const, label: 'TikTok', icon: <IconBrandTiktok size={16} /> },
        { key: 'x' as const, label: 'X', icon: <IconBrandX size={16} /> },
    ];
    return entries
        .map((entry) => ({
            ...entry,
            value: profile.socialLinks[entry.key],
            href: resolveSocialUrl(entry.key, profile.socialLinks[entry.key]),
        }))
        .filter((entry) => entry.value && entry.href);
}

function PublicProfileStatCard({ label, value }: { label: string; value: string }) {
    return (
        <PanelCard size="sm" className="pp-surface-row">
            <p className="text-xs pp-muted">{label}</p>
            <p className="mt-1 text-xl font-semibold pp-fg">{value}</p>
        </PanelCard>
    );
}

export function PublicProfileShell({
    profile,
    todayState,
    initials,
    listings,
    services,
}: PublicProfileShellProps) {
    const socialLinks = buildSocialLinks(profile);
    const coverSrc = resolveAppMediaUrl(profile.coverImageUrl);
    const avatarSrc = resolveAppMediaUrl(profile.avatarImageUrl);
    const heroStyle = coverSrc
        ? {
              background: `linear-gradient(180deg, rgba(10,10,10,0.08), rgba(10,10,10,0.72)), url(${coverSrc}) center/cover`,
          }
        : undefined;
    const hasLocationDetails = Boolean(profile.city || profile.region || profile.addressLine || profile.locationLabel);
    const locationLines = [
        profile.city && profile.region ? `${profile.city}, ${profile.region}` : profile.city || profile.region || profile.locationLabel,
        profile.addressLine,
    ].filter(Boolean) as string[];

    return (
        <div className="container-app py-8 space-y-8">
            <section
                className={`relative overflow-hidden rounded-[32px] border pp-hero ${heroStyle ? '' : 'pp-hero--fallback'}`}
                style={heroStyle}
            >
                <div className="grid gap-6 px-6 py-8 text-white md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                                {profile.subscriptionPlanName}
                            </span>
                        </div>

                        <div className="flex flex-col gap-5 md:flex-row md:items-end">
                            {avatarSrc ? (
                                <Image src={avatarSrc} alt={profile.name} width={96} height={96} className="h-24 w-24 rounded-[28px] object-cover ring-1 ring-white/20" />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/12 text-3xl font-semibold ring-1 ring-white/20 backdrop-blur">
                                    {initials}
                                </div>
                            )}
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-semibold md:text-4xl">{profile.name}</h1>
                                    <p className="text-sm font-medium text-white/82">{profile.accountKindLabel}</p>
                                    {profile.bio ? (
                                        <p className="max-w-3xl text-sm leading-7 text-white/72">{profile.bio}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <PanelCard size="lg" className="border-white/10 bg-white/95">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] pp-contact-muted">Contacto</p>
                                <h2 className="mt-1 text-xl font-semibold pp-contact-fg">Canales directos</h2>
                            </div>

                            {todayState ? (
                                <div className="rounded-[20px] border px-4 py-3 pp-surface-row">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full pp-icon-well">
                                            <IconClock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium pp-fg">{todayState.label}</p>
                                            <p className="mt-1 text-xs leading-5 pp-secondary">{todayState.detail}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-3">
                                {profile.phone ? <PublicProfileActionLink href={`tel:${profile.phone}`} label={profile.phone} icon={<IconPhone size={16} />} /> : null}
                                {profile.whatsapp ? <PublicProfileActionLink href={`https://wa.me/${profile.whatsapp.replace(/[^\d]/g, '')}`} label="WhatsApp" icon={<IconPhone size={16} />} external /> : null}
                                <PublicProfileActionLink href={`mailto:${profile.email}`} label={profile.email} icon={<IconMail size={16} />} />
                                {profile.website ? <PublicProfileActionLink href={profile.website} label="Sitio web" icon={<IconWorld size={16} />} external /> : null}
                            </div>

                            {socialLinks.length > 0 ? (
                                <div className="grid gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                    {socialLinks.map((item) => (
                                        <a
                                            key={item.key}
                                            href={item.href ?? '#'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm transition-colors pp-surface-row pp-fg"
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                {item.icon}
                                                {item.label}
                                            </span>
                                            <span className="pp-secondary">{item.value}</span>
                                        </a>
                                    ))}
                                </div>
                            ) : null}

                            {profile.paymentMethods ? (
                                <BusinessPublicPaymentMethodsSection paymentMethods={profile.paymentMethods} />
                            ) : null}
                        </div>
                    </PanelCard>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <PublicProfileStatCard label="Publicaciones activas" value={String(profile.activeListings)} />
                <PublicProfileStatCard label="Visitas" value={profile.totalViews.toLocaleString('es-CL')} />
                <PublicProfileStatCard label="Guardados" value={profile.totalFavorites.toLocaleString('es-CL')} />
                <PublicProfileStatCard label="Seguidores" value={profile.followers.toLocaleString('es-CL')} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="space-y-6">
                    {hasLocationDetails ? (
                        <PanelCard size="lg" className="space-y-4">
                            <PanelBlockHeader title="Ubicación" description="Zona de operación y dirección de atención." className="mb-0" />
                            <div className="space-y-3">
                                {locationLines.map((line) => (
                                    <div key={line} className="flex items-start gap-3 rounded-[18px] border px-4 py-3 pp-surface-row">
                                        <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full pp-icon-well">
                                            <IconMapPin size={16} />
                                        </div>
                                        <p className="text-sm leading-6 pp-fg">{line}</p>
                                    </div>
                                ))}
                            </div>
                        </PanelCard>
                    ) : null}

                    {services ? (
                        <section className="space-y-4">
                            <PanelBlockHeader title="Servicios" description="Servicios, packs y ofertas activas del negocio." className="mb-0" />
                            {services}
                        </section>
                    ) : null}

                    <section className="space-y-4">
                        <PanelBlockHeader title="Inventario activo" description="Solo se muestra inventario público y vigente del perfil." className="mb-0" />
                        {listings}
                    </section>
                </div>

                <div className="space-y-6">
                    <PanelCard size="lg" className="space-y-4">
                        <PanelBlockHeader title="Horario" description="Disponibilidad pública de atención." className="mb-0" />
                        {profile.alwaysOpen ? (
                            <PanelNotice tone="success">Disponible 24/7</PanelNotice>
                        ) : (
                            <div className="space-y-3">
                                {profile.businessHours.map((item) => (
                                    <div key={item.day} className="flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3 text-sm pp-surface-row">
                                        <span className="pp-fg">{PUBLIC_PROFILE_DAY_LABELS[item.day]}</span>
                                        <span className="pp-secondary">
                                            {item.closed
                                                ? 'Cerrado'
                                                : formatBusinessScheduleRange(item.open ?? '', item.close ?? '')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {profile.weeklyBreakStart && profile.weeklyBreakEnd ? (
                            <p className="text-sm leading-6 pp-secondary">
                                Colación: {formatBusinessScheduleRange(profile.weeklyBreakStart, profile.weeklyBreakEnd)}
                            </p>
                        ) : null}
                        {profile.scheduleNote ? <p className="text-sm leading-6 pp-secondary">{profile.scheduleNote}</p> : null}
                    </PanelCard>
                </div>
            </div>
        </div>
    );
}

function PublicProfileActionLink({ href, label, icon, external = false }: { href: string; label: string; icon: ReactNode; external?: boolean }) {
    return (
        <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm transition-colors pp-surface-row pp-fg"
        >
            <span className="inline-flex items-center gap-2">
                {icon}
                {label}
            </span>
            {external ? <span className="pp-secondary">Abrir</span> : null}
        </a>
    );
}
