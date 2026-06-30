/** Estilos de landing pública del operador (compartidos entre verticales). */

export const OPERATOR_SITE_LAYOUTS = ['booking', 'portfolio', 'studio'] as const;
export type OperatorSiteLayout = (typeof OPERATOR_SITE_LAYOUTS)[number];

export const OPERATOR_SITE_COLOR_MODES = ['light', 'dark', 'system'] as const;
export type OperatorSiteColorMode = (typeof OPERATOR_SITE_COLOR_MODES)[number];

export type OperatorSiteLayoutOption = {
    id: OperatorSiteLayout;
    label: string;
    description: string;
    /** Sugerencia de uso; no limita la vertical. */
    hint: string;
};

export const OPERATOR_SITE_LAYOUT_OPTIONS: OperatorSiteLayoutOption[] = [
    {
        id: 'booking',
        label: 'Reserva',
        description: 'Enfocado en convertir: servicios visibles y reserva al centro.',
        hint: 'Ideal para agenda, citas y marketplace con CTA claro.',
    },
    {
        id: 'portfolio',
        label: 'Portafolio',
        description: 'Editorial y visual: marca personal, fotos grandes y storytelling.',
        hint: 'Ideal para creativos, artistas y negocios con fuerte identidad.',
    },
    {
        id: 'studio',
        label: 'Estudio',
        description: 'Limpio y estructurado: tipografía clara y layout contenido.',
        hint: 'Ideal para consultorías, clínicas y perfiles corporativos.',
    },
];

export type OperatorSiteColorModeOption = {
    id: OperatorSiteColorMode;
    label: string;
    description: string;
};

export const OPERATOR_SITE_COLOR_MODE_OPTIONS: OperatorSiteColorModeOption[] = [
    { id: 'light', label: 'Claro', description: 'Fondo claro por defecto para quien visita tu página.' },
    { id: 'dark', label: 'Oscuro', description: 'Fondo oscuro por defecto.' },
    { id: 'system', description: 'Respeta la preferencia del dispositivo del visitante.', label: 'Sistema' },
];

export const DEFAULT_OPERATOR_SITE_LAYOUT: OperatorSiteLayout = 'booking';
export const DEFAULT_OPERATOR_SITE_COLOR_MODE: OperatorSiteColorMode = 'system';

export function normalizeOperatorSiteLayout(raw: unknown): OperatorSiteLayout {
    return OPERATOR_SITE_LAYOUTS.includes(raw as OperatorSiteLayout)
        ? (raw as OperatorSiteLayout)
        : DEFAULT_OPERATOR_SITE_LAYOUT;
}

export function normalizeOperatorSiteColorMode(raw: unknown): OperatorSiteColorMode {
    return OPERATOR_SITE_COLOR_MODES.includes(raw as OperatorSiteColorMode)
        ? (raw as OperatorSiteColorMode)
        : DEFAULT_OPERATOR_SITE_COLOR_MODE;
}

export function operatorSiteLayoutLabel(layout: OperatorSiteLayout): string {
    return OPERATOR_SITE_LAYOUT_OPTIONS.find((item) => item.id === layout)?.label ?? layout;
}

export function operatorSiteVisitorColorMode(
    operatorDefault: OperatorSiteColorMode,
    visitorOverride: 'light' | 'dark' | null,
): 'light' | 'dark' {
    if (visitorOverride) return visitorOverride;
    if (operatorDefault === 'dark') return 'dark';
    if (operatorDefault === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function operatorSiteThemeStorageKey(slug: string): string {
    return `simple:operator-site-color:${slug}`;
}
