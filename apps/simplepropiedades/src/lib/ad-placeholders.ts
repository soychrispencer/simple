import type { AdPlacementSection } from '@/lib/advertising';

export type AdPlaceholderVisual = {
    imageUrl: string;
    label: string;
};

const HOME_PLACEHOLDER: AdPlaceholderVisual = {
    imageUrl: '/hero/home.svg',
    label: 'Publicidad',
};

const RENT_PLACEHOLDER: AdPlaceholderVisual = {
    imageUrl: '/hero/rent.svg',
    label: 'Publicidad',
};

const PROJECTS_PLACEHOLDER: AdPlaceholderVisual = {
    imageUrl: '/hero/projects.svg',
    label: 'Publicidad',
};

const INLINE_PLACEHOLDERS: Record<AdPlacementSection, AdPlaceholderVisual> = {
    home: HOME_PLACEHOLDER,
    ventas: HOME_PLACEHOLDER,
    arriendos: RENT_PLACEHOLDER,
    subastas: HOME_PLACEHOLDER,
    proyectos: PROJECTS_PLACEHOLDER,
};

const CARD_PLACEHOLDERS: AdPlaceholderVisual[] = [
    HOME_PLACEHOLDER,
    RENT_PLACEHOLDER,
    PROJECTS_PLACEHOLDER,
];

export function getInlineAdPlaceholder(section: AdPlacementSection): AdPlaceholderVisual {
    return INLINE_PLACEHOLDERS[section];
}

export function getCardAdPlaceholders(): AdPlaceholderVisual[] {
    return CARD_PLACEHOLDERS;
}
