export type VehicleEquipmentOption = {
    code: string;
    label: string;
    group: 'appearance' | 'equipment';
};

export const VEHICLE_WARRANTY_FEATURE_CODE = 'warranty';

/** Detalles estéticos / de estilo (sección Apariencia). */
export const VEHICLE_APPEARANCE_OPTIONS: VehicleEquipmentOption[] = [
    { code: 'leather_seats', label: 'Asientos de cuero', group: 'appearance' },
    { code: 'sunroof', label: 'Techo corredizo / panorámico', group: 'appearance' },
    { code: 'alloy_wheels', label: 'Llantas de aleación', group: 'appearance' },
    { code: 'fog_lights', label: 'Neblineros', group: 'appearance' },
    { code: 'heated_seats', label: 'Asientos calefaccionados', group: 'appearance' },
];

/** Equipamiento técnico / confort (sección Equipamiento). */
export const VEHICLE_TECH_EQUIPMENT_OPTIONS: VehicleEquipmentOption[] = [
    { code: 'airbags', label: 'Airbags', group: 'equipment' },
    { code: 'abs', label: 'ABS', group: 'equipment' },
    { code: 'ac', label: 'Aire acondicionado', group: 'equipment' },
    { code: 'bluetooth', label: 'Bluetooth', group: 'equipment' },
    { code: 'backup_camera', label: 'Cámara de retroceso', group: 'equipment' },
    { code: 'cruise_control', label: 'Control de crucero', group: 'equipment' },
    { code: 'parking_sensors', label: 'Sensores de estacionamiento', group: 'equipment' },
    { code: 'carplay_android_auto', label: 'Apple CarPlay / Android Auto', group: 'equipment' },
    { code: 'four_wheel_drive', label: 'Tracción 4x4', group: 'equipment' },
    { code: 'keyless_entry', label: 'Llave inteligente', group: 'equipment' },
    { code: 'lane_assist', label: 'Asistente de carril', group: 'equipment' },
];

/** Todas las opciones (apariencia + técnico) para parseo y labels. */
export const VEHICLE_EQUIPMENT_OPTIONS: VehicleEquipmentOption[] = [
    ...VEHICLE_APPEARANCE_OPTIONS,
    ...VEHICLE_TECH_EQUIPMENT_OPTIONS,
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
