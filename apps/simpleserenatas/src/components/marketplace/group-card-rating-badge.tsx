'use client';

import type { ProviderGroup } from '@/lib/serenatas-api';
import { GroupRatingDisplay } from '@/components/public/group-rating-display';
import { normalizeGroupRating } from '@/lib/marketplace-group-display';

/** Badge de valoración reutilizable en tarjetas panel y catálogo público. */
export function GroupCardRatingBadge({
    group,
    className = 'absolute right-2.5 top-2.5 rounded-full border border-border/80 bg-surface/90 px-2 py-0.5 shadow-sm backdrop-blur-sm',
}: {
    group: ProviderGroup;
    className?: string;
}) {
    const rating = normalizeGroupRating(group);
    if (rating.count <= 0) return null;
    return (
        <span className={className}>
            <GroupRatingDisplay group={group} size="sm" showCount={false} />
        </span>
    );
}
