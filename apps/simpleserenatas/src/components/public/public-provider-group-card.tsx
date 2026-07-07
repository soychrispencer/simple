'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import {
    IconHeart,
    IconHeartFilled,
    IconMap,
    IconMusic,
    IconSparkles,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import {
    OperatorDirectoryCard,
    OperatorDirectoryCardSection,
    OperatorDirectoryCardStat,
    OperatorDirectoryHeroBadge,
} from '@simple/ui/listings';
import {
    baseLocationMetaLine,
    cardFeaturedService,
    extraServicesLabel,
    isRecentlyCreatedGroup,
    zonesCoverageChip,
} from '@/lib/marketplace-group-display';
import { formatLandingMoney } from '@/lib/marketplace-display';
import { isMariachiSaved, subscribeSavedMariachis, toggleSavedMariachi } from '@/lib/saved-mariachis';
import type { ProviderGroup } from '@/lib/serenatas-api';

export function PublicProviderGroupCard({
    group,
    href,
    onOpen,
    boosted = false,
}: {
    group: ProviderGroup;
    href?: string;
    onOpen?: (slug: string) => void;
    boosted?: boolean;
}) {
    const { isLoggedIn, openAuth } = useAuth();
    const [favorite, setFavorite] = useState(false);
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
        <OperatorDirectoryCard
            href={href}
            onOpen={onOpen ? () => onOpen(group.slug) : undefined}
            ariaLabel={`Ver perfil de ${group.name}`}
            name={group.name}
            coverUrl={group.coverUrl}
            coverFallback={
                <div className="flex h-full w-full items-center justify-center bg-accent-soft text-sm font-semibold text-accent">
                    Portada pendiente
                </div>
            }
            logoUrl={group.logoUrl}
            location={location}
            ctaLabel="Ver mariachi"
            heroBadges={
                boosted || showNewBadge ? (
                    <div className="flex flex-wrap gap-2">
                        {boosted ? (
                            <OperatorDirectoryHeroBadge tone="dark">
                                <IconSparkles size={12} aria-hidden />
                                Destacado
                            </OperatorDirectoryHeroBadge>
                        ) : null}
                        {showNewBadge ? (
                            <OperatorDirectoryHeroBadge tone="light">Nuevo</OperatorDirectoryHeroBadge>
                        ) : null}
                    </div>
                ) : null
            }
            heroAction={
                <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/55"
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
            }
        >
            <div className="flex items-end justify-between gap-4">
                <OperatorDirectoryCardStat
                    label="Cobertura"
                    value={coverage?.label ?? 'Por confirmar'}
                    icon={<IconMap size={15} aria-hidden />}
                />
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
                <OperatorDirectoryCardSection
                    label="Servicio principal"
                    title={featured.name}
                    detail={featured.details ?? undefined}
                    trailing={compactMoreServices ?? undefined}
                />
            ) : (
                <OperatorDirectoryCardSection
                    label="Servicio principal"
                    empty={
                        <>
                            <IconMusic size={16} className="shrink-0 text-accent" aria-hidden />
                            Servicios pendientes de publicar
                        </>
                    }
                />
            )}
        </OperatorDirectoryCard>
    );
}
