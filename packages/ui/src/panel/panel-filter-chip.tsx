'use client';

import { joinClasses } from '../shared/join-classes';

export type PanelFilterChipProps = {
    label: string;
    active?: boolean;
    count?: number;
    /** Si es mayor que `count`, se muestra en el badge (p. ej. total pendiente de cierre). */
    badgeTotal?: number;
    onClick: () => void;
    className?: string;
};

export function PanelFilterChip(props: PanelFilterChipProps) {
    const { label, active = false, count, badgeTotal, onClick, className } = props;
    const displayCount = count != null
        ? (badgeTotal != null && badgeTotal > count ? badgeTotal : count)
        : null;

    return (
        <button
            type="button"
            onClick={onClick}
            data-active={active ? 'true' : 'false'}
            className={joinClasses('panel-filter-chip', className)}
        >
            {label}
            {displayCount != null ? (
                <span className="panel-filter-chip__count">{displayCount}</span>
            ) : null}
        </button>
    );
}
