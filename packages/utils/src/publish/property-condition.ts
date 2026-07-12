export const PROPERTY_UNIT_CONDITION_VALUES = [
    'Nuevo',
    'Usado',
    'Remodelado',
    'A refaccionar',
] as const;

export type PropertyUnitConditionValue = (typeof PROPERTY_UNIT_CONDITION_VALUES)[number];

export const PROPERTY_CONDITION_OPTIONS = PROPERTY_UNIT_CONDITION_VALUES.map((value) => ({
    value,
    label: value,
}));

const LAND_PROPERTY_TYPES = new Set(['Terreno', 'Parcela']);
const CONDITION_SET = new Set<string>(PROPERTY_UNIT_CONDITION_VALUES);

export function isLandPropertyType(propertyType?: string | null): boolean {
    return LAND_PROPERTY_TYPES.has(String(propertyType ?? '').trim());
}

/** Condición del inmueble: venta/arriendo de unidad; no aplica a proyecto ni terreno. */
export function showsPropertyCondition(input: {
    operationType?: string | null;
    propertyType?: string | null;
}): boolean {
    if (String(input.operationType ?? '').trim() === 'project') return false;
    if (isLandPropertyType(input.propertyType)) return false;
    return true;
}

export function isPropertyUnitConditionValue(value: string): value is PropertyUnitConditionValue {
    return CONDITION_SET.has(value);
}

export function normalizePropertyCondition(
    value: string | null | undefined,
    input: { operationType?: string | null; propertyType?: string | null },
): string {
    if (!showsPropertyCondition(input)) return '';
    const trimmed = String(value ?? '').trim();
    return isPropertyUnitConditionValue(trimmed) ? trimmed : '';
}
