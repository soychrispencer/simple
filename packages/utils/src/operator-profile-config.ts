import type { PublicProfileVertical } from './public-profile-settings.js';
import { AGENDA_OPERATOR_SUBTYPES } from './agenda-profession-config.js';

/** Alias de producto: particular | profesional | empresa (persistido como accountKind). */
export type OperatorTier = 'individual' | 'independent' | 'company';

export type OperatorProfileVertical = PublicProfileVertical | 'agenda' | 'serenatas';

export type OperatorSubtypeId = string;

export const OPERATOR_SUBTYPE_OTHER_ID = 'other';

export const OPERATOR_SUBTYPE_OTHER_OPTION = {
    id: OPERATOR_SUBTYPE_OTHER_ID,
    label: 'Otros',
    description: 'Describe tu negocio manualmente.',
} as const;

export type OperatorTierOption = {
    tier: OperatorTier;
    label: string;
    description: string;
};

export type OperatorSubtypeOption = {
    id: OperatorSubtypeId;
    label: string;
    description?: string;
};

function withOtherOption(options: OperatorSubtypeOption[]): OperatorSubtypeOption[] {
    if (options.some((item) => item.id === OPERATOR_SUBTYPE_OTHER_ID)) return options;
    return [...options, OPERATOR_SUBTYPE_OTHER_OPTION];
}

const TIER_OPTIONS_BASE: OperatorTierOption[] = [
    {
        tier: 'individual',
        label: 'Particular',
        description: 'Operas en nombre propio, con atención directa.',
    },
    {
        tier: 'independent',
        label: 'Profesional',
        description: 'Operas con tu marca personal como asesor o vendedor independiente.',
    },
    {
        tier: 'company',
        label: 'Empresa',
        description: 'Marca comercial con operación estructurada y, si aplica, equipo.',
    },
];

const TIER_LABELS_BY_VERTICAL: Partial<
    Record<OperatorProfileVertical, Partial<Record<OperatorTier, string>>>
> = {
    agenda: {
        company: 'Centro o empresa',
    },
};

const TIER_DESCRIPTIONS_BY_VERTICAL: Partial<
    Record<OperatorProfileVertical, Partial<Record<OperatorTier, string>>>
> = {
    propiedades: {
        individual: 'Vendes o arriendas inmuebles propios, con atención directa.',
        independent: 'Asesor, corredor o tasador con tu marca personal.',
        company: 'Inmobiliaria, gestora o desarrolladora con operación estructurada.',
    },
    autos: {
        individual: 'Vendes tu vehículo o flota pequeña en nombre propio.',
        independent: 'Vendedor o asesor automotriz independiente con tu marca.',
        company: 'Automotora, rent a car o consignación con operación estructurada.',
    },
    agenda: {
        individual: 'Atiendes en nombre propio, con agenda personal.',
        independent: 'Profesional con marca personal y consulta propia.',
        company: 'Centro, clínica o empresa con uno o más profesionales.',
    },
    serenatas: {
        individual: 'Tocas o organizas serenatas en nombre propio.',
        independent: 'Mariachi o músico con tu marca personal.',
        company: 'Grupo mariachi o empresa de eventos con operación estructurada.',
    },
};

const SUBTYPES_BASE: Record<OperatorProfileVertical, Record<OperatorTier, OperatorSubtypeOption[]>> = {
    propiedades: {
        individual: [
            { id: 'owner', label: 'Propietario', description: 'Vendes o arriendas inmuebles propios.' },
            { id: 'landlord', label: 'Arrendador', description: 'Administras arriendos de tus propiedades.' },
        ],
        independent: [
            { id: 'advisor', label: 'Asesor inmobiliario', description: 'Asesoras compra, venta o arriendo sin ser corredor.' },
            { id: 'broker', label: 'Corredor de propiedades', description: 'Intermedias operaciones con cartera propia o de terceros.' },
            { id: 'appraiser', label: 'Tasador', description: 'Ofreces tasaciones comerciales o hipotecarias.' },
            { id: 'auctioneer', label: 'Martillero / remates', description: 'Remates judiciales o comerciales de propiedades.' },
        ],
        company: [
            { id: 'real_estate_agency', label: 'Inmobiliaria', description: 'Venta y arriendo con marca y equipo comercial.' },
            { id: 'property_manager', label: 'Gestora', description: 'Administras arriendos y propiedades de terceros.' },
            { id: 'developer', label: 'Desarrolladora / proyectos', description: 'Comercializas proyectos nuevos o en verde.' },
            { id: 'coworking', label: 'Coworking / espacios', description: 'Arriendo de oficinas, salas o espacios flexibles.' },
        ],
    },
    autos: {
        individual: [
            { id: 'owner', label: 'Vendedor particular', description: 'Vendes tu vehículo.' },
        ],
        independent: [
            { id: 'independent_seller', label: 'Vendedor independiente', description: 'Compras y vendes vehículos con tu propia cartera.' },
            { id: 'buyer_agent', label: 'Asesor automotriz', description: 'Asesoras compradores o vendedores por comisión.' },
            { id: 'importer', label: 'Importador / compra internacional', description: 'Traes o intermedias vehículos desde el exterior.' },
            { id: 'fleet_broker', label: 'Flota / leasing', description: 'Arriendo o leasing de vehículos como independiente.' },
        ],
        company: [
            { id: 'dealership', label: 'Automotora / concesionario', description: 'Stock propio, financiamiento y postventa.' },
            { id: 'rent_a_car', label: 'Rent a car', description: 'Arriendo diario o corporativo con flota propia.' },
            { id: 'consignment', label: 'Consignación / compraventa', description: 'Recibes vehículos en consignación para vender.' },
            { id: 'workshop', label: 'Taller / servicio automotriz', description: 'Mecánica, revisión técnica o postventa con marca.' },
        ],
    },
    agenda: {
        individual: AGENDA_OPERATOR_SUBTYPES.individual,
        independent: AGENDA_OPERATOR_SUBTYPES.independent,
        company: AGENDA_OPERATOR_SUBTYPES.company,
    },
    serenatas: {
        individual: [
            { id: 'solo_musician', label: 'Músico independiente', description: 'Ofreces serenatas en nombre propio.' },
        ],
        independent: [
            { id: 'mariachi_leader', label: 'Líder de mariachi', description: 'Diriges un mariachi con tu marca personal.' },
            { id: 'event_musician', label: 'Músico de eventos', description: 'Contratas serenatas y coordinas músicos por encargo.' },
        ],
        company: [
            { id: 'mariachi_group', label: 'Grupo mariachi', description: 'Mariachi con marca, equipo y repertorio propio.' },
            { id: 'events_company', label: 'Empresa de eventos', description: 'Producción o coordinación de serenatas y eventos.' },
        ],
    },
};

const SUBTYPES: Record<OperatorProfileVertical, Record<OperatorTier, OperatorSubtypeOption[]>> = {
    propiedades: {
        individual: withOtherOption(SUBTYPES_BASE.propiedades.individual),
        independent: withOtherOption(SUBTYPES_BASE.propiedades.independent),
        company: withOtherOption(SUBTYPES_BASE.propiedades.company),
    },
    autos: {
        individual: withOtherOption(SUBTYPES_BASE.autos.individual),
        independent: withOtherOption(SUBTYPES_BASE.autos.independent),
        company: withOtherOption(SUBTYPES_BASE.autos.company),
    },
    agenda: {
        individual: withOtherOption(SUBTYPES_BASE.agenda.individual),
        independent: withOtherOption(SUBTYPES_BASE.agenda.independent),
        company: withOtherOption(SUBTYPES_BASE.agenda.company),
    },
    serenatas: {
        individual: withOtherOption(SUBTYPES_BASE.serenatas.individual),
        independent: withOtherOption(SUBTYPES_BASE.serenatas.independent),
        company: withOtherOption(SUBTYPES_BASE.serenatas.company),
    },
};

const OPERATION_TAGS: Record<PublicProfileVertical, { id: string; label: string }[]> = {
    propiedades: [
        { id: 'sale', label: 'Venta' },
        { id: 'rent', label: 'Arriendo' },
        { id: 'project', label: 'Proyectos' },
        { id: 'administration', label: 'Administración' },
        { id: 'appraisal', label: 'Tasaciones' },
    ],
    autos: [
        { id: 'sale', label: 'Venta' },
        { id: 'rent', label: 'Arriendo' },
        { id: 'fleet', label: 'Flota' },
        { id: 'consignment', label: 'Consignación' },
        { id: 'financing', label: 'Financiamiento' },
    ],
};

export function isOperatorSubtypeOther(subtype: string | null | undefined): boolean {
    return subtype === OPERATOR_SUBTYPE_OTHER_ID;
}

export function getOperatorTierOptions(vertical?: OperatorProfileVertical): OperatorTierOption[] {
    const labelOverrides = vertical ? TIER_LABELS_BY_VERTICAL[vertical] : undefined;
    const descriptionOverrides = vertical ? TIER_DESCRIPTIONS_BY_VERTICAL[vertical] : undefined;
    return TIER_OPTIONS_BASE.map((option) => ({
        ...option,
        label: labelOverrides?.[option.tier] ?? option.label,
        description: descriptionOverrides?.[option.tier] ?? option.description,
    }));
}

export function getOperatorSubtypes(vertical: OperatorProfileVertical, tier: OperatorTier): OperatorSubtypeOption[] {
    return SUBTYPES[vertical][tier] ?? [];
}

export function getOperationTags(vertical: PublicProfileVertical): { id: string; label: string }[] {
    return OPERATION_TAGS[vertical];
}

export function isValidOperatorSubtype(
    vertical: OperatorProfileVertical,
    tier: OperatorTier,
    subtype: string | null | undefined,
): boolean {
    if (!subtype?.trim()) return getOperatorSubtypes(vertical, tier).length <= 1;
    return getOperatorSubtypes(vertical, tier).some((item) => item.id === subtype);
}

export function normalizeOperatorSubtype(
    vertical: OperatorProfileVertical,
    tier: OperatorTier,
    subtype: string | null | undefined,
): string | null {
    if (!subtype?.trim()) return null;
    return isValidOperatorSubtype(vertical, tier, subtype) ? subtype.trim() : null;
}

export function resolveOperatorSubtypeLabel(
    vertical: OperatorProfileVertical,
    tier: OperatorTier,
    subtype: string | null | undefined,
    customLabel?: string | null,
): string | null {
    if (!subtype) return null;
    if (isOperatorSubtypeOther(subtype)) {
        return customLabel?.trim() || OPERATOR_SUBTYPE_OTHER_OPTION.label;
    }
    return getOperatorSubtypes(vertical, tier).find((item) => item.id === subtype)?.label ?? null;
}

export function resolveOperationTagLabels(
    vertical: PublicProfileVertical,
    tagIds: string[],
): string[] {
    const tags = getOperationTags(vertical);
    return tagIds.map((id) => tags.find((item) => item.id === id)?.label ?? id);
}

/** Tags sugeridos al elegir subtipo (Fase 6 — profundidad por vertical). */
const SUBTYPE_SUGGESTED_TAGS: Record<
    PublicProfileVertical,
    Partial<Record<OperatorSubtypeId, string[]>>
> = {
    propiedades: {
        landlord: ['rent', 'administration'],
        broker: ['sale', 'rent'],
        appraiser: ['appraisal'],
        real_estate_agency: ['sale', 'rent'],
        property_manager: ['rent', 'administration'],
        developer: ['project', 'sale'],
    },
    autos: {
        rent_a_car: ['rent', 'fleet'],
        consignment: ['consignment', 'sale'],
        dealership: ['sale', 'financing'],
        buyer_agent: ['sale'],
        fleet_broker: ['rent', 'fleet'],
    },
};

export function getSuggestedOperationTags(
    vertical: PublicProfileVertical,
    tier: OperatorTier,
    subtype: string | null | undefined,
): string[] {
    if (!subtype?.trim() || isOperatorSubtypeOther(subtype)) return [];
    const byVertical = SUBTYPE_SUGGESTED_TAGS[vertical];
    const suggested = byVertical?.[subtype.trim()];
    if (suggested?.length) return suggested;
    if (tier === 'individual') return ['sale'];
    return [];
}

export function mergeOperationTags(current: string[], suggested: string[]): string[] {
    if (!suggested.length) return current;
    return [...new Set([...current, ...suggested])];
}

export function requiresOperatorSubtype(
    _tier: OperatorTier,
    subtypes: OperatorSubtypeOption[],
): boolean {
    return subtypes.length > 1;
}

export function requiresOperatorSubtypeCustom(subtype: string | null | undefined): boolean {
    return isOperatorSubtypeOther(subtype);
}

export function resolveOperatorDisplayLabel(
    vertical: OperatorProfileVertical,
    tier: OperatorTier,
    subtype: string | null | undefined,
    customLabel?: string | null,
): string {
    const subtypeLabel = resolveOperatorSubtypeLabel(vertical, tier, subtype, customLabel);
    if (isOperatorSubtypeOther(subtype)) {
        return subtypeLabel ?? OPERATOR_SUBTYPE_OTHER_OPTION.label;
    }
    if (vertical === 'agenda') {
        return subtypeLabel ?? 'Profesional';
    }
    if (vertical === 'propiedades') {
        if (tier === 'company') return subtypeLabel ?? 'Inmobiliaria o empresa';
        if (tier === 'independent') return subtypeLabel ?? 'Corredor independiente';
        return subtypeLabel ?? 'Propietario o vendedor';
    }
    if (tier === 'company') return subtypeLabel ?? 'Automotora o empresa';
    if (tier === 'independent') return subtypeLabel ?? 'Vendedor independiente';
    return subtypeLabel ?? 'Vendedor particular';
}

export function resolveOperatorTierLabel(
    vertical: OperatorProfileVertical,
    tier: OperatorTier,
): string {
    return getOperatorTierOptions(vertical).find((item) => item.tier === tier)?.label ?? tier;
}
