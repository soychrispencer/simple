'use client';

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
    IconChevronRight,
    IconHeart,
    IconHeartFilled,
    IconMap,
    IconMapPin,
    IconMusic,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import {
    baseLocationMetaLine,
    cardFeaturedService,
    extraServicesLabel,
    isRecentlyCreatedGroup,
    zonesCoverageChip,
} from '@/lib/marketplace-group-display';
import { formatLandingMoney } from '@/lib/marketplace-display';
import { MarketplaceGroupLogo } from '@/components/panel/marketplace-group-media';
import { isMariachiSaved, subscribeSavedMariachis, toggleSavedMariachi } from '@/lib/saved-mariachis';
import type { ProviderGroup } from '@/lib/serenatas-api';

const HERO_LOGO_FRAME =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-white/90 bg-accent-soft font-bold text-accent shadow-md';

function CardShell({
    href,
    groupName,
    onOpen,
    slug,
    children,
}: {
    href?: string;
    groupName: string;
    onOpen?: (slug: string) => void;
    slug: string;
    children: ReactNode;
}) {
    const className =
        'group/card flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-border bg-surface shadow-sm ring-1 ring-black/[0.03] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 dark:ring-white/10';

    if (href) {
        return (
            <Link href={href} className={className} aria-label={`Ver perfil de ${groupName}`}>
                {children}
            </Link>
        );
    }

    return (
        <article
            className={`${className} cursor-pointer`}
            tabIndex={0}
            role="link"
            onClick={() => onOpen?.(slug)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen?.(slug);
                }
            }}
            aria-label={`Ver perfil de ${groupName}`}
        >
            {children}
        </article>
    );
}

export function PublicProviderGroupCard({
    group,
    href,
    onOpen,
}: {
    group: ProviderGroup;
    href?: string;
    onOpen?: (slug: string) => void;
}) {
    const { isLoggedIn, openAuth } = useAuth();
    const [favorite, setFavorite] = useState(false);
    const cover = group.coverUrl;
    const featured = cardFeaturedService(group);
    const coverage = zonesCoverageChip(group);
    const moreServices = extraServicesLabel(group);
    const compactMoreServices = moreServices?.replace(' más', '');
    const showNewBadge = isRecentlyCreatedGroup(group);
    const location = baseLocationMetaLine(group);

    useEffect(() => {
        setFavorite(isMariachiSaved(group.id));
        return subscribeSavedMariachis(() => setFavorite(isMariachiSaved(group.id)));
    }, [group.id]);

    const handleSave = async (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isLoggedIn) {
            openAuth('login');
            return;
        }
        const result = await toggleSavedMariachi(group.id);
        if (result.ok) setFavorite(result.saved);
    };

    return (
        <CardShell href={href} groupName={group.name} onOpen={onOpen} slug={group.slug}>
            <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-bg-subtle">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-accent-soft text-sm font-semibold text-accent">
                        Portada pendiente
                    </div>
                )}
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-black/0"
                    aria-hidden
                />

                {showNewBadge ? (
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm">
                        Nuevo
                    </span>
                ) : null}

                <button
                    type="button"
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55"
                    aria-label={favorite ? 'Quitar de guardados' : 'Guardar mariachi'}
                    aria-pressed={favorite}
                    onClick={(event) => {
                        void handleSave(event);
                    }}
                >
                    {favorite ? (
                        <IconHeartFilled size={18} className="text-red-400" aria-hidden />
                    ) : (
                        <IconHeart size={18} aria-hidden />
                    )}
                </button>

                <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3.5 sm:p-4">
                    <MarketplaceGroupLogo group={group} size="md" frameClassName={HERO_LOGO_FRAME} />
                    <div className="min-w-0 flex-1 pb-0.5">
                        <h3
                            className="truncate text-lg font-bold leading-tight text-white drop-shadow-sm"
                            title={group.name}
                        >
                            {group.name}
                        </h3>
                        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-medium text-white/85">
                            <IconMapPin size={14} className="shrink-0" aria-hidden />
                            <span className="truncate" title={location}>
                                {location}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3.5 p-4">
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                            Cobertura
                        </p>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg-secondary">
                            <IconMap size={15} className="shrink-0 text-accent" aria-hidden />
                            <span className="truncate" title={coverage?.title ?? 'Cobertura por confirmar'}>
                                {coverage?.label ?? 'Por confirmar'}
                            </span>
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                            Desde
                        </p>
                        <p className="mt-1 text-xl font-bold leading-none tracking-tight text-fg">
                            {formatLandingMoney(group.startingPrice)}
                        </p>
                    </div>
                </div>

                {featured ? (
                    <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                                Servicio principal
                            </p>
                            <p className="mt-1 truncate text-base font-semibold text-fg">
                                {featured.name}
                            </p>
                            {featured.details ? (
                                <p className="mt-1 text-xs text-fg-muted">{featured.details}</p>
                            ) : null}
                        </div>
                        {compactMoreServices ? (
                            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                                {compactMoreServices}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-fg-muted">
                        <IconMusic size={16} className="shrink-0 text-accent" aria-hidden />
                        Servicios pendientes de publicar
                    </div>
                )}

                <span className="btn btn-primary mt-auto h-10 w-full justify-center text-sm font-semibold">
                    Ver mariachi
                    <IconChevronRight
                        size={16}
                        className="transition-transform duration-300 group-hover/card:translate-x-0.5"
                        aria-hidden
                    />
                </span>
            </div>
        </CardShell>
    );
}

export function PublicProviderGroupCardSkeleton() {
    return (
        <div className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-sm">
            <div className="aspect-[16/9] animate-pulse bg-bg-subtle" />
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="h-[4.25rem] animate-pulse rounded-xl bg-bg-subtle" />
                <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded-full bg-bg-subtle" />
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-bg-subtle" />
                </div>
                <div className="mt-auto h-4 w-28 animate-pulse rounded-full bg-bg-subtle" />
            </div>
        </div>
    );
}
