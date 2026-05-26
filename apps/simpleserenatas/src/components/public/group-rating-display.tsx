'use client';

import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { formatGroupRating, normalizeGroupRating } from '@/lib/marketplace-group-display';
import type { ProviderGroup } from '@/lib/serenatas-api';

type RatingGroup = Pick<ProviderGroup, 'ratingAverage' | 'ratingCount'>;

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }, (_, index) => {
                const starValue = index + 1;
                const filled = value >= starValue - 0.25;
                const Icon = filled ? IconStarFilled : IconStar;
                return (
                    <Icon
                        key={starValue}
                        size={size}
                        className={filled ? 'text-amber-500' : 'text-amber-500/35'}
                    />
                );
            })}
        </span>
    );
}

export function GroupRatingDisplay({
    group,
    size = 'md',
    showCount = true,
    onDark = false,
    className = '',
}: {
    group: RatingGroup;
    size?: 'sm' | 'md';
    showCount?: boolean;
    onDark?: boolean;
    className?: string;
}) {
    const { average, count } = normalizeGroupRating(group);
    if (count <= 0) return null;

    const label = formatGroupRating(group);
    const starSize = size === 'sm' ? 13 : 15;
    const textClass = size === 'sm' ? 'text-sm' : 'text-base';
    const valueClass = onDark ? 'text-white' : 'landing-text-fg';
    const countClass = onDark ? 'text-white/80' : 'landing-text-muted';

    return (
        <div
            className={`inline-flex flex-wrap items-center gap-1.5 ${className}`.trim()}
            title={label ? `Valoración ${label}` : undefined}
        >
            <StarRow value={average} size={starSize} />
            <span className={`font-semibold leading-none ${valueClass} ${textClass}`}>
                {average.toFixed(1)}
            </span>
            {showCount ? (
                <span className={`text-xs ${countClass}`}>
                    ({count} {count === 1 ? 'valoración' : 'valoraciones'})
                </span>
            ) : null}
        </div>
    );
}
