export type BusinessServiceModality = {
    isOnline: boolean;
    isPresential: boolean;
};

/** Citas / marketplace: suele ofrecerse online primero. */
export const DEFAULT_BUSINESS_SERVICE_MODALITY_ONLINE_FIRST: BusinessServiceModality = {
    isOnline: true,
    isPresential: false,
};

/** Marketplace: muchos servicios pueden ser híbridos. */
export const DEFAULT_BUSINESS_SERVICE_MODALITY_HYBRID: BusinessServiceModality = {
    isOnline: true,
    isPresential: true,
};

/** Serenatas: presencial por defecto, online opcional. */
export const DEFAULT_BUSINESS_SERVICE_MODALITY_PRESENTIAL_FIRST: BusinessServiceModality = {
    isOnline: false,
    isPresential: true,
};

export function validateBusinessServiceModality(modality: BusinessServiceModality): string | null {
    if (!modality.isOnline && !modality.isPresential) {
        return 'Selecciona al menos una modalidad.';
    }
    return null;
}

export function formatBusinessServiceModality(
    modality: Partial<BusinessServiceModality> | null | undefined,
): string | null {
    if (!modality) return null;
    const parts: string[] = [];
    if (modality.isOnline) parts.push('Online');
    if (modality.isPresential) parts.push('Presencial');
    return parts.length > 0 ? parts.join(' · ') : null;
}

/** Chips de modalidad para servicios automotrices (público). */
export function getAutosServiceModalityChips(
    modality: Partial<BusinessServiceModality> | null | undefined,
): string[] {
    if (!modality) return [];
    const chips: string[] = [];
    if (modality.isOnline) chips.push('A domicilio');
    if (modality.isPresential) chips.push('En taller');
    return chips;
}

/** Resuelve modalidad de reserva (cita) a partir del servicio y preferencia del cliente. */
export function resolveBookingModality(
    service: BusinessServiceModality,
    requested?: string | null,
): 'online' | 'presential' | null {
    const wantsOnline = requested === 'online';
    const wantsPresential = requested === 'presential';
    if (service.isOnline && service.isPresential) {
        if (wantsPresential) return 'presential';
        if (wantsOnline) return 'online';
        return 'online';
    }
    if (service.isOnline) return wantsPresential ? null : 'online';
    if (service.isPresential) return wantsOnline ? null : 'presential';
    return null;
}
