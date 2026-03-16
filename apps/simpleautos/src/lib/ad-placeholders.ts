import type { AdPlacementSection } from '@/lib/advertising';

export type AdPlaceholderVisual = {
    imageUrl: string;
    label: string;
};

const DISCOVER_PLACEHOLDER: AdPlaceholderVisual = {
    imageUrl: '/hero/discover.svg',
    label: 'Publicidad',
};

const SELL_PLACEHOLDER: AdPlaceholderVisual = {
    imageUrl: '/hero/sell.svg',
    label: 'Publicidad',
};

const AUCTION_PLACEHOLDER: AdPlaceholderVisual = {
    imageUrl: '/hero/auction.svg',
    label: 'Publicidad',
};

const INLINE_PLACEHOLDERS: Record<AdPlacementSection, AdPlaceholderVisual> = {
    home: DISCOVER_PLACEHOLDER,
    ventas: DISCOVER_PLACEHOLDER,
    arriendos: SELL_PLACEHOLDER,
    subastas: AUCTION_PLACEHOLDER,
    proyectos: DISCOVER_PLACEHOLDER,
};

const CARD_PLACEHOLDERS: AdPlaceholderVisual[] = [
    DISCOVER_PLACEHOLDER,
    SELL_PLACEHOLDER,
    AUCTION_PLACEHOLDER,
];

export function getInlineAdPlaceholder(section: AdPlacementSection): AdPlaceholderVisual {
    return INLINE_PLACEHOLDERS[section];
}

export function getCardAdPlaceholders(): AdPlaceholderVisual[] {
    return CARD_PLACEHOLDERS;
}
