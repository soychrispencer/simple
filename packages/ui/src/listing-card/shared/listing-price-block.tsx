import { formatChileanPeso } from './utils';
import type { ListingPrice } from '../types';

type Props = {
    price: ListingPrice;
    size?: 'hero' | 'md' | 'sm';
    alignment?: 'start' | 'center';
    showSecondary?: boolean;
};

export default function ListingPriceBlock({ price, size = 'hero', alignment = 'start', showSecondary = true }: Props) {
    const primaryClass =
        size === 'hero'
            ? 'text-[clamp(1.35rem,0.9rem+1.8vw,1.75rem)] font-bold tracking-tight leading-[1.05]'
            : size === 'md'
                ? 'text-[1.05rem] font-semibold tracking-tight leading-tight'
                : 'text-sm font-semibold tracking-tight leading-tight';
    const alignClass = alignment === 'center' ? 'justify-center' : 'justify-start';

    return (
        <div className="space-y-0.5">
            <div className={`flex items-baseline gap-2 flex-wrap ${alignClass}`}>
                {price.caption ? (
                    <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-muted)' }}>
                        {price.caption}
                    </span>
                ) : null}
                <span className={primaryClass} style={{ color: 'var(--fg)' }}>
                    {formatChileanPeso(price.amount)}
                </span>
                {price.original != null && price.original > price.amount ? (
                    <span className="text-xs line-through" style={{ color: 'var(--fg-muted)' }}>
                        {formatChileanPeso(price.original)}
                    </span>
                ) : null}
                {price.discountLabel ? (
                    <span
                        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                    >
                        {price.discountLabel}
                    </span>
                ) : null}
            </div>
            {showSecondary && price.secondary ? (
                <p className={`text-xs ${alignment === 'center' ? 'text-center' : ''}`} style={{ color: 'var(--fg-secondary)' }}>
                    {price.secondary}
                </p>
            ) : null}
        </div>
    );
}
