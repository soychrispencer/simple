'use client';

import { IconMapPin } from '@tabler/icons-react';
import { PanelStatusBadge } from '../panel/panel-primitives';
import type { PanelStatusBadgeProps } from '../panel/panel-primitives';

export type PublicListingDetailHeaderProps = {
    title: string;
    location?: string;
    badgeLabel: string;
    badgeTone?: PanelStatusBadgeProps['tone'];
    highlightTags?: string[];
    className?: string;
};

export default function PublicListingDetailHeader({
    title,
    location,
    badgeLabel,
    badgeTone = 'success',
    highlightTags = [],
    className,
}: PublicListingDetailHeaderProps) {
    const visibleTags = highlightTags.filter(Boolean);

    return (
        <header className={['public-listing-detail-header', className].filter(Boolean).join(' ')}>
            <div className="public-listing-detail-header__top">
                <PanelStatusBadge label={badgeLabel} tone={badgeTone} variant="solid" size="sm" />
                {visibleTags.length > 0 ? (
                    <div className="public-listing-detail-header__tags">
                        {visibleTags.map((tag) => (
                            <span key={tag} className="public-listing-detail-header__tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}
            </div>
            <h1 className="public-listing-detail-header__title">{title}</h1>
            <p className="public-listing-detail-header__location">
                <IconMapPin size={16} />
                {location || 'Ubicación por confirmar'}
            </p>
        </header>
    );
}
