import { IconBookmark, IconClock, IconEye, IconMessage } from '@tabler/icons-react';
import { formatMetric } from './utils';
import type { ListingEngagement } from '../types';

type Props = {
    engagement: ListingEngagement;
    layout?: 'row' | 'grid';
    dense?: boolean;
};

export default function ListingEngagementRow({ engagement, layout = 'row', dense = false }: Props) {
    const items: Array<{ key: string; icon: React.ReactNode; value: string; label?: string }> = [];

    if (engagement.listedSinceLabel) {
        items.push({ key: 'since', icon: <IconClock size={dense ? 11 : 12} />, value: engagement.listedSinceLabel });
    }
    if (typeof engagement.views === 'number') {
        items.push({ key: 'views', icon: <IconEye size={dense ? 11 : 12} />, value: formatMetric(engagement.views), label: 'Vistas' });
    }
    if (typeof engagement.saves === 'number') {
        items.push({ key: 'saves', icon: <IconBookmark size={dense ? 11 : 12} />, value: formatMetric(engagement.saves), label: 'Guardados' });
    }
    if (typeof engagement.messages === 'number') {
        items.push({ key: 'msgs', icon: <IconMessage size={dense ? 11 : 12} />, value: formatMetric(engagement.messages), label: 'Mensajes' });
    }

    if (items.length === 0) return null;

    if (layout === 'grid') {
        return (
            <div className="grid grid-cols-3 gap-1.5">
                {items
                    .filter((item) => item.label)
                    .map((item) => (
                        <div
                            key={item.key}
                            className="rounded-lg border px-2 py-1.5 text-center"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                        >
                            <div className="flex items-center justify-center gap-1 text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                                {item.icon}
                                <span className="uppercase tracking-wide">{item.label}</span>
                            </div>
                            <div className="mt-0.5 text-base font-semibold leading-none" style={{ color: 'var(--fg)' }}>
                                {item.value}
                            </div>
                        </div>
                    ))}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {items.map((item) => (
                <span
                    key={item.key}
                    className={`inline-flex items-center gap-1 ${dense ? 'text-[10px]' : 'text-[11px]'}`}
                    style={{ color: 'var(--fg-muted)' }}
                >
                    {item.icon}
                    <span style={{ color: 'var(--fg-secondary)' }}>{item.value}</span>
                </span>
            ))}
        </div>
    );
}
