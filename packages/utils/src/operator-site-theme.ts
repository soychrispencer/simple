/** Estilos de landing pública del operador (compartidos entre verticales). */

export const OPERATOR_SITE_LAYOUTS = ['booking', 'portfolio', 'studio'] as const;
export type OperatorSiteLayout = (typeof OPERATOR_SITE_LAYOUTS)[number];

export const OPERATOR_SITE_COLOR_MODES = ['light', 'dark', 'system'] as const;
export type OperatorSiteColorMode = (typeof OPERATOR_SITE_COLOR_MODES)[number];

export type OperatorSiteLayoutOption = {
    id: OperatorSiteLayout;
    label: string;
    description: string;
    /** Resumen de la estructura visible en la miniatura del selector. */
    structure: string;
    /** Sugerencia de uso; no limita la vertical. */
    hint: string;
};

export const OPERATOR_SITE_LAYOUT_OPTIONS: OperatorSiteLayoutOption[] = [
    {
        id: 'booking',
        label: 'Reserva',
        description: 'Enfocado en convertir: servicios visibles y reserva al centro.',
        structure: 'Portada con tarjeta de reserva + servicios en grilla.',
        hint: 'Ideal para reservas online y perfiles con CTA claro.',
    },
    {
        id: 'portfolio',
        label: 'Portafolio',
        description: 'Editorial y visual: marca personal, fotos grandes y storytelling.',
        structure: 'Portada a pantalla completa + servicios en carrusel.',
        hint: 'Ideal para creativos, artistas y negocios con fuerte identidad.',
    },
    {
        id: 'studio',
        label: 'Estudio',
        description: 'Limpio y estructurado: tipografía clara y layout contenido.',
        structure: 'Encabezado compacto + bloques de información (bento).',
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

/* ── Accent color ────────────────────────────────────────────────────────── */

export const OPERATOR_SITE_ACCENT_COLORS = [
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
    'red',
    'orange',
    'amber',
    'lime',
    'emerald',
    'slate',
] as const;

export type OperatorSiteAccentColor = (typeof OPERATOR_SITE_ACCENT_COLORS)[number];

export const OPERATOR_SITE_ACCENT_OPTIONS: Array<{
    id: OperatorSiteAccentColor;
    label: string;
    value: string;
}> = [
    { id: 'teal', label: 'Teal', value: '#0F766E' },
    { id: 'cyan', label: 'Cian', value: '#0891B2' },
    { id: 'sky', label: 'Celeste', value: '#0284C7' },
    { id: 'blue', label: 'Azul', value: '#2563EB' },
    { id: 'indigo', label: 'Índigo', value: '#4F46E5' },
    { id: 'violet', label: 'Violeta', value: '#7C3AED' },
    { id: 'purple', label: 'Púrpura', value: '#9333EA' },
    { id: 'fuchsia', label: 'Fucsia', value: '#C026D3' },
    { id: 'pink', label: 'Rosa', value: '#DB2777' },
    { id: 'rose', label: 'Coral', value: '#E11D48' },
    { id: 'red', label: 'Rojo', value: '#DC2626' },
    { id: 'orange', label: 'Naranja', value: '#EA580C' },
    { id: 'amber', label: 'Ámbar', value: '#D97706' },
    { id: 'lime', label: 'Lima', value: '#65A30D' },
    { id: 'emerald', label: 'Esmeralda', value: '#059669' },
    { id: 'slate', label: 'Pizarra', value: '#475569' },
];

export const DEFAULT_OPERATOR_SITE_ACCENT: OperatorSiteAccentColor = 'teal';
export const DEFAULT_OPERATOR_SITE_ACCENT_HEX = '#0F766E';

export type OperatorSiteAccentEditorValue = {
    preset: OperatorSiteAccentColor | 'custom';
    customHex: string;
};

export function defaultOperatorSiteAccentEditorValue(): OperatorSiteAccentEditorValue {
    return {
        preset: DEFAULT_OPERATOR_SITE_ACCENT,
        customHex: DEFAULT_OPERATOR_SITE_ACCENT_HEX,
    };
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isOperatorSiteAccentHex(value: string): boolean {
    return HEX_COLOR_RE.test(value.trim());
}

/** Normaliza a `#RRGGBB` en mayúsculas, o `null` si no es válido. */
export function normalizeOperatorSiteAccentHex(value: string): string | null {
    const trimmed = value.trim();
    if (!HEX_COLOR_RE.test(trimmed)) return null;

    const raw = trimmed.slice(1);
    if (raw.length === 3) {
        const expanded = raw.split('').map((ch) => ch + ch).join('');
        return `#${expanded.toUpperCase()}`;
    }

    return `#${raw.toUpperCase()}`;
}

export function parseOperatorSiteAccent(raw: unknown): OperatorSiteAccentEditorValue {
    const str = typeof raw === 'string' ? raw.trim() : '';
    const hex = normalizeOperatorSiteAccentHex(str);
    if (hex) {
        return { preset: 'custom', customHex: hex };
    }

    if (OPERATOR_SITE_ACCENT_COLORS.includes(str as OperatorSiteAccentColor)) {
        const preset = str as OperatorSiteAccentColor;
        return {
            preset,
            customHex: OPERATOR_SITE_ACCENT_OPTIONS.find((option) => option.id === preset)?.value
                ?? DEFAULT_OPERATOR_SITE_ACCENT_HEX,
        };
    }

    return defaultOperatorSiteAccentEditorValue();
}

export function serializeOperatorSiteAccent(value: OperatorSiteAccentEditorValue): string {
    if (value.preset === 'custom') {
        return normalizeOperatorSiteAccentHex(value.customHex) ?? DEFAULT_OPERATOR_SITE_ACCENT;
    }
    return value.preset;
}

export function isValidOperatorSiteAccentStorage(value: string): boolean {
    if (normalizeOperatorSiteAccentHex(value)) return true;
    return OPERATOR_SITE_ACCENT_COLORS.includes(value as OperatorSiteAccentColor);
}

/** @deprecated Usar `parseOperatorSiteAccent` o `operatorSiteAccentCssValue`. */
export function normalizeOperatorSiteAccent(raw: unknown): OperatorSiteAccentColor {
    const parsed = parseOperatorSiteAccent(raw);
    return parsed.preset === 'custom' ? DEFAULT_OPERATOR_SITE_ACCENT : parsed.preset;
}

export function operatorSiteAccentValue(accent: OperatorSiteAccentColor): string {
    return OPERATOR_SITE_ACCENT_OPTIONS.find((option) => option.id === accent)?.value ?? DEFAULT_OPERATOR_SITE_ACCENT_HEX;
}

/** Resuelve el valor CSS (`#RRGGBB`) desde un preset, hex almacenado o valor del editor. */
export function operatorSiteAccentCssValue(raw: unknown): string {
    if (raw && typeof raw === 'object' && 'preset' in raw) {
        const editor = raw as OperatorSiteAccentEditorValue;
        if (editor.preset === 'custom') {
            return normalizeOperatorSiteAccentHex(editor.customHex) ?? DEFAULT_OPERATOR_SITE_ACCENT_HEX;
        }
        return operatorSiteAccentValue(editor.preset);
    }

    const parsed = parseOperatorSiteAccent(raw);
    if (parsed.preset === 'custom') {
        return normalizeOperatorSiteAccentHex(parsed.customHex) ?? DEFAULT_OPERATOR_SITE_ACCENT_HEX;
    }
    return operatorSiteAccentValue(parsed.preset);
}
