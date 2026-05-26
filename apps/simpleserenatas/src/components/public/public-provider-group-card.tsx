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
    IconStarFilled,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import {
    baseLocationMetaLine,
    cardFeaturedService,
    extraServicesLabel,
    normalizeGroupRating,
    zonesCoverageChip,
} from '@/lib/marketplace-group-display';
import { formatLandingMoney } from '@/lib/marketplace-display';
import { MarketplaceGroupLogo } from '@/components/panel/marketplace-group-media';
import { isMariachiSaved, subscribeSavedMariachis, toggleSavedMariachi } from '@/lib/saved-mariachis';
import type { ProviderGroup } from '@/lib/serenatas-api';

const FALLBACK_COVER =
    'https://images.unsplash.com/photo-1764593821767-352919115758?auto=format&fit=crop&w=900&q=82';

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
        'group/card flex h-full flex-col overflow-hidden rounded-[1.25rem] border landing-border landing-bg-surface shadow-sm ring-1 ring-black/5 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 dark:ring-white/10';

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
    const cover = group.coverUrl || group.logoUrl || FALLBACK_COVER;
    const featured = cardFeaturedService(group);
    const coverage = zonesCoverageChip(group);
    const moreServices = extraServicesLabel(group);
    const rating = normalizeGroupRating(group);

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
            <div className="relative h-[11.5rem] shrink-0 overflow-hidden bg-bg-subtle sm:h-[12.5rem]">
                <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04]"
                />
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5"
                    aria-hidden
                />

                {rating.count > 0 ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur-sm">
                        <IconStarFilled size={13} className="text-amber-500" aria-hidden />
                        {rating.average.toFixed(1)}
                        <span className="font-normal text-neutral-500">({rating.count})</span>
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
                    <h3 className="line-clamp-2 min-w-0 flex-1 pb-0.5 text-lg font-bold leading-tight text-white drop-shadow-sm">
                        {group.name}
                    </h3>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-end justify-between gap-3 rounded-xl border landing-border landing-bg-subtle px-3.5 py-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] landing-text-muted">
                            Desde
                        </p>
                        <p className="mt-0.5 text-2xl font-bold leading-none tracking-tight landing-text-fg">
                            {formatLandingMoney(group.startingPrice)}
                        </p>
                    </div>
                    {featured ? (
                        <p className="max-w-[9.5rem] text-right text-xs leading-snug landing-text-muted">
                            <span className="font-medium landing-text-secondary">{featured.name}</span>
                            {moreServices ? (
                                <span className="block text-[11px] landing-text-accent">{moreServices}</span>
                            ) : null}
                        </p>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs landing-text-muted">
                            <IconMusic size={14} className="landing-text-accent" aria-hidden />
                            Por publicar
                        </span>
                    )}
                </div>

                <ul className="space-y-2 text-sm landing-text-muted">
                    <li className="flex min-w-0 items-center gap-2">
                        <IconMapPin size={15} className="shrink-0 landing-text-accent" aria-hidden />
                        <span className="min-w-0 truncate" title={baseLocationMetaLine(group)}>
                            {baseLocationMetaLine(group)}
                        </span>
                    </li>
                    {coverage ? (
                        <li className="flex min-w-0 items-center gap-2">
                            <IconMap size={15} className="shrink-0 landing-text-accent" aria-hidden />
                            <span className="min-w-0 truncate" title={coverage.title}>
                                <span className="font-medium landing-text-secondary">Cobertura · </span>
                                {coverage.label}
                            </span>
                        </li>
                    ) : null}
                    {featured?.details ? (
                        <li className="pl-[1.35rem] text-xs leading-snug">{featured.details}</li>
                    ) : null}
                </ul>

                <div className="mt-auto flex items-center justify-between gap-2 border-t landing-border pt-3 text-sm font-semibold landing-text-accent">
                    <span>Ver mariachi</span>
                    <IconChevronRight
                        size={18}
                        className="transition-transform duration-300 group-hover/card:translate-x-0.5"
                        aria-hidden
                    />
                </div>
            </div>
        </CardShell>
    );
}

export function PublicProviderGroupCardSkeleton() {
    return (
        <div className="flex h-full flex-col overflow-hidden rounded-[1.25rem] border landing-border landing-bg-surface shadow-sm">
            <div className="h-[11.5rem] animate-pulse bg-bg-subtle sm:h-[12.5rem]" />
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
