export type VehicleEquipmentOption = {
    code: string;
    label: string;
};

export const VEHICLE_WARRANTY_FEATURE_CODE = 'warranty';

export const VEHICLE_EQUIPMENT_OPTIONS: VehicleEquipmentOption[] = [
    { code: 'airbags', label: 'Airbags' },
    { code: 'abs', label: 'ABS' },
    { code: 'ac', label: 'Aire acondicionado' },
    { code: 'bluetooth', label: 'Bluetooth' },
    { code: 'backup_camera', label: 'Cámara de retroceso' },
    { code: 'leather_seats', label: 'Asientos de cuero' },
    { code: 'sunroof', label: 'Techo corredizo / panorámico' },
    { code: 'cruise_control', label: 'Control de crucero' },
    { code: 'parking_sensors', label: 'Sensores de estacionamiento' },
    { code: 'carplay_android_auto', label: 'Apple CarPlay / Android Auto' },
    { code: 'four_wheel_drive', label: 'Tracción 4x4' },
    { code: 'alloy_wheels', label: 'Llantas de aleación' },
    { code: 'fog_lights', label: 'Neblineros' },
    { code: 'keyless_entry', label: 'Llave inteligente' },
    { code: 'heated_seats', label: 'Asientos calefaccionados' },
    { code: 'lane_assist', label: 'Asistente de carril' },
];

const EQUIPMENT_CODE_SET = new Set(VEHICLE_EQUIPMENT_OPTIONS.map((option) => option.code));

const EQUIPMENT_LABEL_BY_CODE = new Map(
    VEHICLE_EQUIPMENT_OPTIONS.map((option) => [option.code, option.label]),
);

export function parseVehicleEquipmentCodes(featureCodes: unknown): string[] {
    if (!Array.isArray(featureCodes)) return [];
    return featureCodes.filter(
        (code): code is string =>
            typeof code === 'string'
            && EQUIPMENT_CODE_SET.has(code)
            && code !== VEHICLE_WARRANTY_FEATURE_CODE,
    );
}

export function buildVehicleFeatureCodes(equipmentCodes: string[], warranty: boolean): string[] {
    const codes = equipmentCodes.filter(
        (code) => typeof code === 'string' && EQUIPMENT_CODE_SET.has(code),
    );
    if (warranty) {
        codes.push(VEHICLE_WARRANTY_FEATURE_CODE);
    }
    return [...new Set(codes)];
}

export function getVehicleEquipmentLabels(codes: string[]): string[] {
    return codes
        .filter((code) => EQUIPMENT_CODE_SET.has(code))
        .map((code) => EQUIPMENT_LABEL_BY_CODE.get(code))
        .filter((label): label is string => Boolean(label));
}
