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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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

export function MarketplaceGroupLogo({
    group,
    size = 'md',
}: {
    group: Pick<ProviderGroup, 'name' | 'logoUrl'>;
    size?: 'md' | 'lg';
}) {
    const box = size === 'lg' ? 'size-24 text-3xl' : 'size-20 text-2xl';
    return (
        <div
            className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-card border-4 border-surface bg-accent-soft font-bold text-accent shadow-sm`}
        >
            {group.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={group.logoUrl} alt={`Logo de ${group.name}`} className="h-full w-full object-cover" />
            ) : (
                <span>{group.name.slice(0, 1).toUpperCase()}</span>
            )}
        </div>
    );
}
