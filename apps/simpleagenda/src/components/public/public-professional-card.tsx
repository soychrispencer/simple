'use client';

import { IconDeviceLaptop, IconMap, IconSparkles } from '@tabler/icons-react';
import {
    OperatorDirectoryCard,
    OperatorDirectoryCardSection,
    OperatorDirectoryCardStat,
    OperatorDirectoryHeroBadge,
} from '@simple/ui/listings';
import { resolveProfessionalMediaUrl, type MarketplaceProfessional } from '@/lib/marketplace-professionals';

export type FeaturedProfessional = MarketplaceProfessional & {
    coverUrl?: string | null;
    boosted?: boolean;
};

function modalityLabel(professional: FeaturedProfessional): string {
    if (professional.servesOnline && professional.servesPresential) return 'Online y presencial';
    if (professional.servesOnline) return 'Online';
    if (professional.servesPresential) return 'Presencial';
    return 'Por confirmar';
}

function locationLabel(professional: FeaturedProfessional): string {
    return [professional.city, professional.region].filter(Boolean).join(', ') || professional.countryCode;
}

export function PublicProfessionalCard({
    professional,
    href,
    onOpen,
}: {
    professional: FeaturedProfessional;
    href?: string;
    onOpen?: (slug: string) => void;
}) {
    const name = professional.displayName?.trim() || 'Profesional';
    const cover = resolveProfessionalMediaUrl(professional.coverUrl ?? professional.avatarUrl);
    const logo = resolveProfessionalMediaUrl(professional.avatarUrl);
    const targetHref = href ?? `/${professional.slug}`;
    const location = locationLabel(professional);
    const profession = professional.profession?.trim() || 'Sin rubro';

    return (
        <OperatorDirectoryCard
            href={onOpen ? undefined : targetHref}
            onOpen={onOpen ? () => onOpen(professional.slug) : undefined}
            ariaLabel={`Ver perfil de ${name}`}
            name={name}
            coverUrl={cover}
            logoUrl={logo}
            location={location}
            ctaLabel="Ver perfil"
            heroBadges={
                professional.boosted ? (
                    <OperatorDirectoryHeroBadge tone="dark">
                        <IconSparkles size={12} aria-hidden />
                        Destacado
                    </OperatorDirectoryHeroBadge>
                ) : null
            }
        >
            <div className="flex items-end justify-between gap-4">
                <OperatorDirectoryCardStat
                    label="Rubro"
                    value={profession}
                    icon={<IconMap size={15} aria-hidden />}
                />
                <OperatorDirectoryCardStat
                    label="Modalidad"
                    value={modalityLabel(professional)}
                    icon={<IconDeviceLaptop size={15} aria-hidden />}
                    align="right"
                />
            </div>

            {professional.headline?.trim() ? (
                <OperatorDirectoryCardSection
                    label="Presentación"
                    title={professional.headline.trim()}
                />
            ) : null}
        </OperatorDirectoryCard>
    );
}
