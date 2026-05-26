'use client';

import { IconMusic } from '@tabler/icons-react';
import type { ProviderGroup } from '@/lib/serenatas-api';

export function MarketplaceGroupCover({
    group,
    className = 'h-32',
}: {
    group: Pick<ProviderGroup, 'name' | 'coverUrl'>;
    className?: string;
}) {
    if (group.coverUrl) {
        return (
            <div className={`w-full overflow-hidden bg-bg-subtle ${className}`}>
                <img
                    src={group.coverUrl}
                    alt={`Portada de ${group.name}`}
                    className="h-full w-full object-cover"
                />
            </div>
        );
    }
    return (
        <div
            className={`flex w-full items-center justify-center bg-gradient-to-br from-accent-soft via-bg-subtle to-bg-subtle text-accent/70 ${className}`}
            aria-hidden
        >
            <IconMusic size={28} stroke={1.25} />
        </div>
    );
}

const LOGO_SIZES = {
    sm: 'size-12 text-base',
    md: 'size-14 text-lg',
    lg: 'size-24 text-3xl',
    profile: 'size-20 text-2xl',
} as const;

const LOGO_FRAME =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-card border-4 border-[var(--bg)] bg-accent-soft font-bold text-accent shadow-sm';

export function MarketplaceGroupLogo({
    group,
    size = 'md',
    frameClassName,
}: {
    group: Pick<ProviderGroup, 'name' | 'logoUrl'>;
    size?: 'sm' | 'md' | 'lg' | 'profile';
    frameClassName?: string;
    /** @deprecated Solo tamaño; forma siempre semiredonda (`rounded-card`). */
    variant?: 'card' | 'profile';
}) {
    const box = LOGO_SIZES[size];

    return (
        <div className={`${frameClassName ?? LOGO_FRAME} ${box}`}>
            {group.logoUrl ? (
                <img src={group.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                <span>{group.name.slice(0, 1).toUpperCase()}</span>
            )}
        </div>
    );
}
