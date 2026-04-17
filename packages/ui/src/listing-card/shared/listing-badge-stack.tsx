import { PanelStatusBadge } from '../../index';
import type { ListingBadge } from '../types';

type Props = {
    badges: ListingBadge[];
    placement?: 'top-left' | 'inline';
    size?: 'xs' | 'sm';
};

export default function ListingBadgeStack({ badges, placement = 'top-left', size = 'sm' }: Props) {
    if (badges.length === 0) return null;
    const containerClass =
        placement === 'top-left'
            ? 'absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5'
            : 'inline-flex items-center gap-1.5 flex-wrap';
    return (
        <div className={containerClass}>
            {badges.map((badge, index) => (
                <PanelStatusBadge
                    key={`${badge.label}-${index}`}
                    label={badge.label}
                    tone={badge.tone ?? 'neutral'}
                    variant="solid"
                    size={size}
                    className="shadow-sm"
                />
            ))}
        </div>
    );
}
