import { IconBookmark, IconClick, IconClock, IconEye, IconMessage } from '@tabler/icons-react';
import { formatMetric } from './utils';
import type { ListingEngagement } from '../types';

type Props = {
    engagement: ListingEngagement;
    layout?: 'row' | 'grid';
    dense?: boolean;
};

function MetricCard({
    icon,
    value,
    label,
    compact = false,
}: {
    icon: React.ReactNode;
    value: string;
    label: string;
    compact?: boolean;
}) {
    if (compact) {
        // Ultra-compact for horizontal list view
        return (
            <div
                className="flex items-center gap-1 rounded-md border px-2 py-1"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
            >
                <span style={{ color: 'var(--accent)' }}>{icon}</span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--fg)' }}>
                    {value}
                </span>
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors hover:border-[var(--accent)]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
        >
            <span style={{ color: 'var(--accent)' }}>{icon}</span>
            <div className="flex flex-col leading-none">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--fg)' }}>
                    {value}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                    {label}
                </span>
            </div>
        </div>
    );
}

export default function ListingEngagementRow({ engagement, layout = 'row', dense = false }: Props) {
    const items: Array<{ key: string; icon: React.ReactNode; value: string; label: string }> = [];

    if (engagement.listedSinceLabel) {
        items.push({
            key: 'since',
            icon: <IconClock size={dense ? 12 : 14} />,
            value: engagement.listedSinceLabel,
            label: 'Publicado',
        });
    }
    if (typeof engagement.views === 'number') {
        items.push({
            key: 'views',
            icon: <IconEye size={dense ? 12 : 14} />,
            value: formatMetric(engagement.views),
            label: 'Vistas',
        });
    }
    if (typeof engagement.clicks === 'number') {
        items.push({
            key: 'clicks',
            icon: <IconClick size={dense ? 12 : 14} />,
            value: formatMetric(engagement.clicks),
            label: 'Clics',
        });
    }
    if (typeof engagement.conversionRate === 'number') {
        items.push({
            key: 'conversion',
            icon: <IconMessage size={dense ? 12 : 14} />,
            value: `${engagement.conversionRate.toFixed(1)}%`,
            label: 'Conversión',
        });
    }
    if (typeof engagement.messages === 'number') {
        items.push({
            key: 'messages',
            icon: <IconMessage size={dense ? 12 : 14} />,
            value: formatMetric(engagement.messages),
            label: 'Contactos',
        });
    }
    if (typeof engagement.saves === 'number') {
        items.push({
            key: 'saves',
            icon: <IconBookmark size={dense ? 12 : 14} />,
            value: formatMetric(engagement.saves),
            label: 'Guardados',
        });
    }

    if (items.length === 0) return null;

    // Compact horizontal row - for dense mode use ultra-compact chips and skip 'Publicado'
    if (layout === 'row') {
        const displayItems = dense
            ? items.filter((i) => i.label !== 'Publicado').slice(0, 4)
            : items.filter((i) => i.label !== 'Publicado');
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {displayItems.map((item) => (
                    <MetricCard key={item.key} icon={item.icon} value={item.value} label={item.label} compact={dense} />
                ))}
            </div>
        );
    }

    // Grid layout for vertical cards
    return (
        <div className="grid grid-cols-3 gap-2">
            {items
                .filter((item) => item.label !== 'Publicado')
                .slice(0, 3)
                .map((item) => (
                    <div
                        key={item.key}
                        className="rounded-lg border px-2 py-2 text-center transition-colors hover:border-[var(--accent)]"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                    >
                        <div className="flex items-center justify-center gap-1" style={{ color: 'var(--accent)' }}>
                            {item.icon}
                        </div>
                        <div className="mt-1 text-base font-semibold leading-none" style={{ color: 'var(--fg)' }}>
                            {item.value}
                        </div>
                        <div className="mt-0.5 text-[9px] uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                            {item.label}
                        </div>
                    </div>
                ))}
        </div>
    );
}
