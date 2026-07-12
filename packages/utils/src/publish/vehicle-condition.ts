export const VEHICLE_CONDITION_VALUES = [
    'Usado',
    'Seminuevo',
    'Nuevo',
    'Siniestrado',
    'Para desarme',
    'Colección',
] as const;

export type VehicleConditionValue = (typeof VEHICLE_CONDITION_VALUES)[number];

export const VEHICLE_CONDITION_OPTIONS = VEHICLE_CONDITION_VALUES.map((value) => ({
    value,
    label: value,
}));

export const DEFAULT_VEHICLE_CONDITION: VehicleConditionValue = 'Usado';

const CONDITION_SET = new Set<string>(VEHICLE_CONDITION_VALUES);

export function isVehicleConditionValue(value: unknown): value is VehicleConditionValue {
    return typeof value === 'string' && CONDITION_SET.has(value);
}

export function parseVehicleCondition(
    value: unknown,
    fallback: VehicleConditionValue | '' = '',
): VehicleConditionValue | '' {
    return isVehicleConditionValue(value) ? value : fallback;
}

export function vehicleConditionsForPublisher(canSelectNew: boolean): VehicleConditionValue[] {
    if (canSelectNew) return [...VEHICLE_CONDITION_VALUES];
    return VEHICLE_CONDITION_VALUES.filter((value) => value !== 'Nuevo');
}
