'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
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
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';
import { fetchPublicProfile, type PublicListing, type PublicProfile } from '@/lib/public-listings';
import { PanelBlockHeader, PanelCard, PanelNotice, PanelStatCard, PanelStatusBadge } from '@simple/ui';

const DAY_LABELS: Record<PublicProfile['businessHours'][number]['day'], string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

function toCardData(item: PublicListing): PropertyListingCardData {
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: item.section === 'project' ? 'Proyecto' : item.section === 'rent' ? 'Arriendo' : 'Precio',
        subtitle: item.description,
        meta: item.summary,
        highlights: item.summary,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'Cuenta SimplePropiedades',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        projectStatus: item.section === 'project' ? item.summary[3] : undefined,
        listedSince: `Actualizado hace ${item.publishedAgo}`,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
    };
}

function initialsFromName(name: string) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function resolveSocialUrl(key: keyof PublicProfile['socialLinks'], value: string | null) {
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

function resolveTeamSocialUrl(key: keyof PublicProfile['teamMembers'][number]['socialLinks'], value: string | null) {
    const normalized = value?.trim();
    if (!normalized) return null;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const handle = normalized.replace(/^@/, '');
    if (key === 'instagram') return `https://instagram.com/${handle}`;
    if (key === 'facebook') return `https://facebook.com/${handle}`;
    return `https://linkedin.com/in/${handle}`;
}

function formatTime(value: string | null) {
    return value ?? '--:--';
}

function getTodayBusinessState(profile: PublicProfile) {
    if (profile.alwaysOpen) {
        return {
            openNow: true,
            label: 'Disponible 24/7',
            detail: 'Atención declarada como permanente.',
        };
    }

    const todayMap: PublicProfile['businessHours'][number]['day'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = todayMap[new Date().getDay()] ?? 'monday';
    const today = profile.businessHours.find((item) => item.day === todayKey);
    if (!today || today.closed || !today.open || !today.close) {
        return {
            openNow: false,
            label: `Hoy ${DAY_LABELS[todayKey]} cerrado`,
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
        label: openNow ? 'Abierto ahora' : `Atiende hoy ${formatTime(today.open)} - ${formatTime(today.close)}`,
        detail: profile.scheduleNote ?? `${DAY_LABELS[today.day]} ${formatTime(today.open)} - ${formatTime(today.close)}`,
    };
}

export default function PublicProfilePage() {
    const params = useParams<{ username: string }>();
    const username = Array.isArray(params?.username) ? params.username[0] : params?.username;
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Awaited<ReturnType<typeof fetchPublicProfile>>>(null);

    useEffect(() => {
        if (!username) return;
        setLoading(true);
        void (async () => {
            const nextData = await fetchPublicProfile(username);
            setData(nextData);
            setLoading(false);
        })();
    }, [username]);

    const cards = useMemo(() => (data?.listings ?? []).map((item) => toCardData(item)), [data]);
    const profile = data?.profile ?? null;
    const initials = initialsFromName(profile?.name ?? 'SP');
    const todayState = profile ? getTodayBusinessState(profile) : null;
    const socialLinks = useMemo(() => {
        if (!profile) return [];
        const entries = [
            { key: 'instagram', label: 'Instagram', icon: <IconBrandInstagram size={16} /> },
            { key: 'facebook', label: 'Facebook', icon: <IconBrandFacebook size={16} /> },
            { key: 'linkedin', label: 'LinkedIn', icon: <IconBrandLinkedin size={16} /> },
            { key: 'youtube', label: 'YouTube', icon: <IconBrandYoutube size={16} /> },
            { key: 'tiktok', label: 'TikTok', icon: <IconBrandTiktok size={16} /> },
            { key: 'x', label: 'X', icon: <IconBrandX size={16} /> },
        ] as const;
        return entries
            .map((entry) => ({
                ...entry,
                value: profile.socialLinks[entry.key],
                href: resolveSocialUrl(entry.key, profile.socialLinks[entry.key]),
            }))
            .filter((entry) => entry.value && entry.href);
    }, [profile]);

    if (loading) {
        return <div className="container-app py-8"><div className="h-[420px] rounded-[32px] animate-pulse" style={{ background: 'var(--bg-muted)' }} /></div>;
    }

    if (!data || !profile) {
        return <div className="container-app py-8"><PanelNotice tone="warning">No encontramos este perfil público.</PanelNotice></div>;
    }

    return (
        <div className="container-app py-8 space-y-8">
            <section
                className="relative overflow-hidden rounded-[32px] border"
                style={{
                    borderColor: 'var(--border)',
                    background: profile.coverImageUrl
                        ? `linear-gradient(180deg, rgba(10,10,10,0.08), rgba(10,10,10,0.72)), url(${profile.coverImageUrl}) center/cover`
                        : 'linear-gradient(135deg, #0b0b0b 0%, #232323 100%)',
                }}
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
                                {profile.companyName ? <p className="text-sm text-white/75">{profile.companyName}</p> : null}
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
                                <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--fg-muted)' }}>Contacto directo</p>
                                <h2 className="mt-1 text-xl font-semibold" style={{ color: 'var(--fg)' }}>Ficha comercial</h2>
                            </div>

                            {todayState ? (
                                <div className="rounded-[20px] border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                            <IconClock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{todayState.label}</p>
                                            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--fg-secondary)' }}>{todayState.detail}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-3">
                                <ActionLink href={`mailto:${profile.email}`} label={profile.email} icon={<IconMail size={16} />} />
                                {profile.phone ? <ActionLink href={`tel:${profile.phone}`} label={profile.phone} icon={<IconPhone size={16} />} /> : null}
                                {profile.whatsapp ? <ActionLink href={`https://wa.me/${profile.whatsapp.replace(/[^\d]/g, '')}`} label="WhatsApp" icon={<IconPhone size={16} />} external /> : null}
                                {profile.website ? <ActionLink href={profile.website} label="Sitio web" icon={<IconWorld size={16} />} external /> : null}
                            </div>
                        </div>
                    </PanelCard>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <PanelStatCard label="Publicaciones activas" value={String(profile.activeListings)} />
                <PanelStatCard label="Visitas" value={profile.totalViews.toLocaleString('es-CL')} />
                <PanelStatCard label="Guardados" value={profile.totalFavorites.toLocaleString('es-CL')} />
                <PanelStatCard label="Seguidores" value={profile.followers.toLocaleString('es-CL')} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="space-y-6">
                    <PanelCard size="lg" className="space-y-5">
                        <PanelBlockHeader title="Presentación" description="Información pública conectada a la cuenta y al inventario real." className="mb-0" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <InfoItem icon={<IconUsers size={16} />} label="Tipo de cuenta" value={profile.accountKindLabel} />
                            <InfoItem icon={<IconWorld size={16} />} label="Plan" value={profile.subscriptionPlanName} />
                            <InfoItem icon={<IconMapPin size={16} />} label="Ubicación" value={profile.locationLabel ?? 'No informada'} />
                            <InfoItem icon={<IconMail size={16} />} label="Correo" value={profile.email} />
                        </div>
                        {profile.specialties.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Especialidades</p>
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
                            <PanelBlockHeader title="Equipo comercial" description="Asesores visibles conectados a esta cuenta y a su operación pública." className="mb-0" />
                            <div className="grid gap-4 md:grid-cols-2">
                                {profile.teamMembers.map((member) => (
                                    <TeamMemberCard key={member.id} member={member} />
                                ))}
                            </div>
                        </PanelCard>
                    ) : null}

                    <section className="space-y-4">
                        <PanelBlockHeader title="Inventario activo" description="Solo se muestra inventario público y vigente del perfil." className="mb-0" />
                        {cards.length === 0 ? (
                            <PanelNotice tone="neutral">Este perfil no tiene publicaciones activas.</PanelNotice>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {cards.map((item) => (
                                    <PropertyListingCard key={item.id} data={item} mode="grid" />
                                ))}
                            </div>
                        )}
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
                                    <div key={item.day} className="flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                        <span style={{ color: 'var(--fg)' }}>{DAY_LABELS[item.day]}</span>
                                        <span style={{ color: 'var(--fg-secondary)' }}>
                                            {item.closed ? 'Cerrado' : `${formatTime(item.open)} - ${formatTime(item.close)}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {profile.scheduleNote ? <p className="text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>{profile.scheduleNote}</p> : null}
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
                                        className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm transition-colors"
                                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {item.icon}
                                            {item.label}
                                        </span>
                                        <span style={{ color: 'var(--fg-secondary)' }}>{item.value}</span>
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

function ActionLink({ href, label, icon, external = false }: { href: string; label: string; icon: React.ReactNode; external?: boolean }) {
    return (
        <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
        >
            <span className="inline-flex items-center gap-2">
                {icon}
                {label}
            </span>
            {external ? <span style={{ color: 'var(--fg-secondary)' }}>Abrir</span> : null}
        </a>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-[20px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                {icon}
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-2 text-sm font-medium leading-6" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

function TeamMemberCard({ member }: { member: PublicProfile['teamMembers'][number] }) {
    const socialEntries = [
        { key: 'instagram', label: 'Instagram', icon: <IconBrandInstagram size={14} /> },
        { key: 'facebook', label: 'Facebook', icon: <IconBrandFacebook size={14} /> },
        { key: 'linkedin', label: 'LinkedIn', icon: <IconBrandLinkedin size={14} /> },
    ] as const;
    const socials = socialEntries
        .map((item) => ({
            ...item,
            value: member.socialLinks[item.key],
            href: resolveTeamSocialUrl(item.key, member.socialLinks[item.key]),
        }))
        .filter((item) => item.value && item.href);
    const initials = initialsFromName(member.name);

    return (
        <div className="rounded-[24px] border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start gap-4">
                {member.avatarImageUrl ? (
                    <Image src={member.avatarImageUrl} alt={member.name} width={64} height={64} className="h-16 w-16 rounded-[20px] object-cover" />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] text-lg font-semibold" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                        {initials}
                    </div>
                )}
                <div className="space-y-2">
                    <div>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{member.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{member.roleTitle || 'Asesor comercial'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {member.isLeadContact ? <PanelStatusBadge label="Contacto destacado" tone="info" size="sm" /> : null}
                        {member.specialties.slice(0, 3).map((item) => (
                            <PanelStatusBadge key={`${member.id}-${item}`} label={item} tone="neutral" size="sm" />
                        ))}
                    </div>
                </div>
            </div>

            {member.bio ? <p className="text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>{member.bio}</p> : null}

            <div className="grid gap-2">
                {member.email ? <ActionLink href={`mailto:${member.email}`} label={member.email} icon={<IconMail size={15} />} /> : null}
                {member.phone ? <ActionLink href={`tel:${member.phone}`} label={member.phone} icon={<IconPhone size={15} />} /> : null}
                {member.whatsapp ? <ActionLink href={`https://wa.me/${member.whatsapp.replace(/[^\d]/g, '')}`} label="WhatsApp" icon={<IconPhone size={15} />} external /> : null}
            </div>

            {socials.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {socials.map((item) => (
                        <a
                            key={`${member.id}-${item.key}`}
                            href={item.href ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg-muted)' }}
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
