export type CatalogAppliesTo = 'all' | 'services';

export type CatalogServiceOption = {
    id: string;
    name: string;
};

export type CatalogPackFormValues = {
    name: string;
    description: string;
    sessionsCount: string;
    price: string;
    promoPrice: string;
    validityDays: string;
    imageUrl: string;
    appliesTo: CatalogAppliesTo;
    serviceIds: string[];
    isActive: boolean;
};

export type CatalogPromotionFormValues = {
    label: string;
    code: string;
    description: string;
    discountType: 'percent' | 'fixed';
    discountValue: string;
    appliesTo: CatalogAppliesTo;
    serviceIds: string[];
    minAmount: string;
    maxUses: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
};

export const EMPTY_CATALOG_PACK_FORM: CatalogPackFormValues = {
    name: '',
    description: '',
    sessionsCount: '3',
    price: '',
    promoPrice: '',
    validityDays: '',
    imageUrl: '',
    appliesTo: 'all',
    serviceIds: [],
    isActive: true,
};

export const EMPTY_CATALOG_PROMOTION_FORM: CatalogPromotionFormValues = {
    label: '',
    code: '',
    description: '',
    discountType: 'percent',
    discountValue: '10',
    appliesTo: 'all',
    serviceIds: [],
    minAmount: '',
    maxUses: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
};

export function toggleCatalogServiceId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function validateCatalogPackAppliesTo(values: CatalogPackFormValues): string | null {
    if (values.appliesTo === 'services' && values.serviceIds.length === 0) {
        return 'Selecciona al menos un servicio.';
    }
    return null;
}

export function validateCatalogPromotionAppliesTo(values: CatalogPromotionFormValues): string | null {
    if (values.appliesTo === 'services' && values.serviceIds.length === 0) {
        return 'Selecciona al menos un servicio.';
    }
    return null;
}
