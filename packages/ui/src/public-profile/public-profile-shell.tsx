'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
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
    IconUsers,
    IconWorld,
} from '@tabler/icons-react';
import { PanelCard } from '../panel/panel-card';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge } from '../panel/panel-primitives';

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

export type PublicProfileShellTeamMember = {
    id: string;
    name: string;
    roleTitle: string | null;
    bio: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    avatarImageUrl: string | null;
    isLeadContact: boolean;
    specialties: string[];
    socialLinks: {
        instagram: string | null;
        facebook: string | null;
        linkedin: string | null;
    };
};

export type PublicProfileShellData = {
    name: string;
    subscriptionPlanName: string;
    accountKindLabel: string;
    teamCount: number;
    locationLabel: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    companyName: string | null;
    headline: string | null;
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
    teamMembers: PublicProfileShellTeamMember[];
    businessHours: Array<{
        day: PublicProfileDay;
        open: string | null;
        close: string | null;
        closed: boolean;
    }>;
    scheduleNote: string | null;
    alwaysOpen: boolean;
    socialLinks: PublicProfileShellSocialLinks;
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
    companyNameExtra?: ReactNode;
    teamSectionDescription?: string;
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
    if (profile.alwaysOpen) {
        return {
            openNow: true,
            label: 'Disponible 24/7',
            detail: 'Atención declarada como permanente.',
        };
    }

    const todayMap: PublicProfileDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = todayMap[new Date().getDay()] ?? 'monday';
    const today = profile.businessHours.find((item) => item.day === todayKey);
    if (!today || today.closed || !today.open || !today.close) {
        return {
            openNow: false,
            label: `Hoy ${PUBLIC_PROFILE_DAY_LABELS[todayKey]} cerrado`,
            detail: profile.scheduleNote ?? 'Sin horario informado para hoy.',
        };
    }

    const now = new Date();
    const [openHour, openMinute] = today.open.split(':').map(Number);
    const [closeHour, closeMinute] = today.close.split(':').map(Number);
    const openAt = new Date(now);
    openAt.setHours(openHour, openMinute, 0, 0);
    const closeAt = new Date(now);
    closeAt.setHours(closeHour, closeMinute, 0, 0);
    const openNow = now >= openAt && now <= closeAt;

    return {
        openNow,
        label: openNow ? 'Abierto ahora' : `Atiende hoy ${formatPublicProfileTime(today.open)} - ${formatPublicProfileTime(today.close)}`,
        detail: profile.scheduleNote ?? `${PUBLIC_PROFILE_DAY_LABELS[today.day]} ${formatPublicProfileTime(today.open)} - ${formatPublicProfileTime(today.close)}`,
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

function resolveTeamSocialUrl(key: keyof PublicProfileShellTeamMember['socialLinks'], value: string | null) {
    const normalized = value?.trim();
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const handle = normalized.replace(/^@/, '');
    if (key === 'instagram') return `https://instagram.com/${handle}`;
    if (key === 'facebook') return `https://facebook.com/${handle}`;
    return `https://linkedin.com/in/${handle}`;
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
    companyNameExtra,
    teamSectionDescription = 'Asesores visibles conectados a esta cuenta y a su operación pública.',
}: PublicProfileShellProps) {
    const socialLinks = buildSocialLinks(profile);
    const heroStyle = profile.coverImageUrl
        ? {
              background: `linear-gradient(180deg, rgba(10,10,10,0.08), rgba(10,10,10,0.72)), url(${profile.coverImageUrl}) center/cover`,
          }
        : undefined;

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
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                                {profile.accountKindLabel}
                            </span>
                            {profile.teamCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                                    <IconUsers size={12} />
                                    {profile.teamCount} asesor{profile.teamCount === 1 ? '' : 'es'}
                                </span>
                            ) : null}
                            {profile.locationLabel ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-medium backdrop-blur">
                                    <IconMapPin size={12} />
                                    {profile.locationLabel}
                                </span>
                            ) : null}
                        </div>

                        <div className="flex flex-col gap-5 md:flex-row md:items-end">
                            {profile.avatarImageUrl ? (
                                <Image src={profile.avatarImageUrl} alt={profile.name} width={96} height={96} className="h-24 w-24 rounded-[28px] object-cover ring-1 ring-white/20" />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/12 text-3xl font-semibold ring-1 ring-white/20 backdrop-blur">
                                    {initials}
                                </div>
                            )}
                            <div className="space-y-3">
                                {profile.companyName ? (
                                    <p className="inline-flex items-center gap-2 text-sm text-white/75">
                                        {companyNameExtra}
                                        {profile.companyName}
                                    </p>
                                ) : null}
                                <div>
                                    <h1 className="text-3xl font-semibold md:text-4xl">{profile.name}</h1>
                                    {profile.headline ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78 md:text-base">{profile.headline}</p> : null}
                                </div>
                                {profile.bio ? <p className="max-w-3xl text-sm leading-7 text-white/78">{profile.bio}</p> : null}
                            </div>
                        </div>
                    </div>

                    <PanelCard size="lg" className="border-white/10 bg-white/95">
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] pp-contact-muted">Contacto directo</p>
                                <h2 className="mt-1 text-xl font-semibold pp-contact-fg">Ficha comercial</h2>
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
                                <PublicProfileActionLink href={`mailto:${profile.email}`} label={profile.email} icon={<IconMail size={16} />} />
                                {profile.phone ? <PublicProfileActionLink href={`tel:${profile.phone}`} label={profile.phone} icon={<IconPhone size={16} />} /> : null}
                                {profile.whatsapp ? <PublicProfileActionLink href={`https://wa.me/${profile.whatsapp.replace(/[^\d]/g, '')}`} label="WhatsApp" icon={<IconPhone size={16} />} external /> : null}
                                {profile.website ? <PublicProfileActionLink href={profile.website} label="Sitio web" icon={<IconWorld size={16} />} external /> : null}
                            </div>
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
                    <PanelCard size="lg" className="space-y-5">
                        <PanelBlockHeader title="Presentación" description="Información pública conectada a la cuenta y al inventario real." className="mb-0" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <PublicProfileInfoItem icon={<IconUsers size={16} />} label="Tipo de cuenta" value={profile.accountKindLabel} />
                            <PublicProfileInfoItem icon={<IconWorld size={16} />} label="Plan" value={profile.subscriptionPlanName} />
                            <PublicProfileInfoItem icon={<IconMapPin size={16} />} label="Ubicación" value={profile.locationLabel ?? 'No informada'} />
                            <PublicProfileInfoItem icon={<IconMail size={16} />} label="Correo" value={profile.email} />
                        </div>
                        {profile.specialties.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium pp-fg">Especialidades</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile.specialties.map((item) => (
                                        <PanelStatusBadge key={item} label={item} tone="neutral" size="sm" />
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {profile.teamCount > 0 ? (
                            <PanelNotice tone="neutral">
                                Esta cuenta opera con un equipo público de {profile.teamCount} asesor{profile.teamCount === 1 ? '' : 'es'} visible{profile.teamCount === 1 ? '' : 's'} en su ficha comercial.
                            </PanelNotice>
                        ) : null}
                    </PanelCard>

                    {profile.teamMembers.length > 0 ? (
                        <PanelCard size="lg" className="space-y-5">
                            <PanelBlockHeader title="Equipo comercial" description={teamSectionDescription} className="mb-0" />
                            <div className="grid gap-4 md:grid-cols-2">
                                {profile.teamMembers.map((member) => (
                                    <PublicProfileTeamMemberCard key={member.id} member={member} />
                                ))}
                            </div>
                        </PanelCard>
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
                                            {item.closed ? 'Cerrado' : `${formatPublicProfileTime(item.open)} - ${formatPublicProfileTime(item.close)}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {profile.scheduleNote ? <p className="text-sm leading-6 pp-secondary">{profile.scheduleNote}</p> : null}
                    </PanelCard>

                    {socialLinks.length > 0 ? (
                        <PanelCard size="lg" className="space-y-4">
                            <PanelBlockHeader title="Redes y presencia" description="Canales públicos asociados a la cuenta." className="mb-0" />
                            <div className="grid gap-3">
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
                        </PanelCard>
                    ) : null}
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

function PublicProfileInfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-[20px] border p-4 pp-surface-row">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full pp-icon-well">{icon}</div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] pp-muted">{label}</p>
            <p className="mt-2 text-sm font-medium leading-6 pp-fg">{value}</p>
        </div>
    );
}

function PublicProfileTeamMemberCard({ member }: { member: PublicProfileShellTeamMember }) {
    const socialEntries = [
        { key: 'instagram' as const, label: 'Instagram', icon: <IconBrandInstagram size={14} /> },
        { key: 'facebook' as const, label: 'Facebook', icon: <IconBrandFacebook size={14} /> },
        { key: 'linkedin' as const, label: 'LinkedIn', icon: <IconBrandLinkedin size={14} /> },
    ];
    const socials = socialEntries
        .map((item) => ({
            ...item,
            value: member.socialLinks[item.key],
            href: resolveTeamSocialUrl(item.key, member.socialLinks[item.key]),
        }))
        .filter((item) => item.value && item.href);
    const memberInitials = initialsFromPublicProfileName(member.name);

    return (
        <div className="rounded-[24px] border p-5 space-y-4 pp-team-card">
            <div className="flex items-start gap-4">
                {member.avatarImageUrl ? (
                    <Image src={member.avatarImageUrl} alt={member.name} width={64} height={64} className="h-16 w-16 rounded-[20px] object-cover" />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] text-lg font-semibold pp-icon-well">{memberInitials}</div>
                )}
                <div className="space-y-2">
                    <div>
                        <h3 className="text-base font-semibold pp-fg">{member.name}</h3>
                        <p className="text-sm pp-secondary">{member.roleTitle || 'Asesor comercial'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {member.isLeadContact ? <PanelStatusBadge label="Contacto destacado" tone="info" size="sm" /> : null}
                        {member.specialties.slice(0, 3).map((item) => (
                            <PanelStatusBadge key={`${member.id}-${item}`} label={item} tone="neutral" size="sm" />
                        ))}
                    </div>
                </div>
            </div>

            {member.bio ? <p className="text-sm leading-6 pp-secondary">{member.bio}</p> : null}

            <div className="grid gap-2">
                {member.email ? <PublicProfileActionLink href={`mailto:${member.email}`} label={member.email} icon={<IconMail size={15} />} /> : null}
                {member.phone ? <PublicProfileActionLink href={`tel:${member.phone}`} label={member.phone} icon={<IconPhone size={15} />} /> : null}
                {member.whatsapp ? <PublicProfileActionLink href={`https://wa.me/${member.whatsapp.replace(/[^\d]/g, '')}`} label="WhatsApp" icon={<IconPhone size={15} />} external /> : null}
            </div>

            {socials.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {socials.map((item) => (
                        <a
                            key={`${member.id}-${item.key}`}
                            href={item.href ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs pp-social-chip"
                        >
                            {item.icon}
                            {item.label}
                        </a>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function PublicProfileLoadingSkeleton() {
    return (
        <div className="container-app py-8">
            <div className="h-[420px] rounded-[32px] animate-pulse pp-skeleton" />
        </div>
    );
}
