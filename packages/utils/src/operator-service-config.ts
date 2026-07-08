import type { PublicProfileVertical } from './public-profile-settings.js';

export type OperatorServiceCategoryId =
    | 'maintenance'
    | 'car_wash'
    | 'mechanics'
    | 'detailing'
    | 'rt'
    | 'tow'
    | 'bodywork'
    | 'pre_purchase'
    | 'tires'
    | 'accessories'
    | 'cleaning'
    | 'moving'
    | 'appraisal'
    | 'management'
    | 'other';

export type OperatorServicePricingMode = 'fixed' | 'quote';

export type OperatorServiceRecord = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    category: OperatorServiceCategoryId | string;
    pricingMode: OperatorServicePricingMode;
    price: string | null;
    promoPrice: string | null;
    currency: string;
    durationMinutes: number | null;
    color: string | null;
    isOnline: boolean;
    isPresential: boolean;
    isActive: boolean;
    position: number;
};

export type OperatorServicePackRecord = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    sessionsCount: number;
    price: string;
    promoPrice: string | null;
    currency: string;
    appliesTo: 'all' | 'services';
    serviceIds: string[];
    validityDays: number | null;
    isActive: boolean;
    position: number;
};

export type OperatorServicePromotionRecord = {
    id: string;
    label: string;
    description: string | null;
    discountType: 'percent' | 'fixed';
    discountValue: string;
    appliesTo: 'all' | 'services';
    serviceIds: string[];
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
    position: number;
};

export type PublicOperatorServiceItem = OperatorServiceRecord & {
    provider: PublicOperatorProviderSummary;
};

export type PublicOperatorProviderSummary = {
    profileId: string;
    name: string;
    slug: string;
    profileHref: string;
    city: string | null;
    region: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
};

export type PublicOperatorPackItem = OperatorServicePackRecord & {
    provider: PublicOperatorProviderSummary;
};

export type PublicOperatorPromotionItem = OperatorServicePromotionRecord & {
    provider: PublicOperatorProviderSummary;
};

export type PublicOperatorCatalog = {
    services: PublicOperatorServiceItem[];
    packs: PublicOperatorPackItem[];
    promotions: PublicOperatorPromotionItem[];
};

const AUTOS_CATEGORIES: Array<{ id: OperatorServiceCategoryId; label: string }> = [
    { id: 'maintenance', label: 'Mantención' },
    { id: 'car_wash', label: 'Lavado y detailing' },
    { id: 'mechanics', label: 'Mecánica y reparación' },
    { id: 'detailing', label: 'Estética automotriz' },
    { id: 'rt', label: 'Revisión técnica' },
    { id: 'tow', label: 'Grúa y asistencia' },
    { id: 'bodywork', label: 'Desabolladura y pintura' },
    { id: 'pre_purchase', label: 'Inspección pre-compra' },
    { id: 'tires', label: 'Neumáticos y llantas' },
    { id: 'accessories', label: 'Accesorios e instalación' },
    { id: 'other', label: 'Otros' },
];

const PROPIEDADES_CATEGORIES: Array<{ id: OperatorServiceCategoryId; label: string }> = [
    { id: 'cleaning', label: 'Aseo y limpieza' },
    { id: 'maintenance', label: 'Mantención' },
    { id: 'moving', label: 'Mudanzas' },
    { id: 'appraisal', label: 'Tasaciones' },
    { id: 'management', label: 'Administración' },
    { id: 'other', label: 'Otros' },
];

export function getOperatorServiceCategories(vertical: PublicProfileVertical) {
    return vertical === 'propiedades' ? PROPIEDADES_CATEGORIES : AUTOS_CATEGORIES;
}

export function resolveOperatorServiceCategoryLabel(vertical: PublicProfileVertical, category: string) {
    return getOperatorServiceCategories(vertical).find((item) => item.id === category)?.label ?? category;
}

/** Valida que el precio promo sea menor al precio base. Retorna mensaje de error o null. */
export function validateOperatorPromoPrice(
    price: string | number | null | undefined,
    promoPrice: string | number | null | undefined,
): string | null {
    const promoRaw = typeof promoPrice === 'string' ? promoPrice.trim() : promoPrice;
    if (promoRaw == null || promoRaw === '') return null;
    const promo = Number(promoRaw);
    const base = Number(price);
    if (!Number.isFinite(promo) || promo <= 0) return 'El precio promo debe ser mayor a 0.';
    if (!Number.isFinite(base) || base <= 0) return 'Indica un precio normal antes de agregar promo.';
    if (promo >= base) return 'El precio promo debe ser menor al precio normal.';
    return null;
}

export function formatOperatorServicePrice(input: {
    pricingMode: OperatorServicePricingMode;
    price: string | null;
    promoPrice?: string | null;
    currency?: string;
    fromPrice?: boolean;
}) {
    if (input.pricingMode === 'quote') return 'Cotizar';
    const value = input.promoPrice ?? input.price;
    if (!value) return 'Consultar precio';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return value;
    const formatted = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: input.currency ?? 'CLP',
        maximumFractionDigits: 0,
    }).format(amount);
    return input.fromPrice ? `Desde ${formatted}` : formatted;
}

export function formatOperatorPackPrice(pack: Pick<OperatorServicePackRecord, 'price' | 'promoPrice' | 'currency'>) {
    return formatOperatorServicePrice({
        pricingMode: 'fixed',
        price: pack.price,
        promoPrice: pack.promoPrice,
        currency: pack.currency,
    });
}

export function formatOperatorPromotionLabel(promo: Pick<OperatorServicePromotionRecord, 'discountType' | 'discountValue'>) {
    if (promo.discountType === 'fixed') {
        return formatOperatorServicePrice({ pricingMode: 'fixed', price: promo.discountValue, currency: 'CLP' });
    }
    return `-${promo.discountValue}%`;
}

export function isOperatorPromotionActiveNow(
    promo: Pick<OperatorServicePromotionRecord, 'startsAt' | 'endsAt' | 'isActive'>,
    now = new Date(),
) {
    if (!promo.isActive) return false;
    if (promo.startsAt && now < new Date(promo.startsAt)) return false;
    if (promo.endsAt && now > new Date(promo.endsAt)) return false;
    return true;
}

export function resolveServicePublicBadge(
    serviceId: string,
    service: Pick<OperatorServiceRecord, 'promoPrice'>,
    promotions: OperatorServicePromotionRecord[],
) {
    if (service.promoPrice) return 'Oferta';
    const activePromo = promotions.find((promo) => isOperatorPromotionActiveNow(promo)
        && (promo.appliesTo === 'all' || promo.serviceIds.includes(serviceId)));
    if (activePromo) return activePromo.label;
    return null;
}

export type PublicProfileOperatorCatalogInput = {
    services: Array<Omit<OperatorServiceRecord, 'isActive' | 'position'> & Partial<Pick<OperatorServiceRecord, 'isActive' | 'position'>>>;
    packs: Array<Omit<OperatorServicePackRecord, 'isActive' | 'position'> & Partial<Pick<OperatorServicePackRecord, 'isActive' | 'position'>>>;
    promotions: Array<Omit<OperatorServicePromotionRecord, 'isActive' | 'position'> & Partial<Pick<OperatorServicePromotionRecord, 'isActive' | 'position'>>>;
};

export type PublicProfileOperatorCatalogProfile = {
    id: string;
    name: string;
    username: string;
    city: string | null;
    region: string | null;
    coverImageUrl?: string | null;
    avatarImageUrl: string | null;
};

export function mapPublicProfileOperatorCatalog(
    profile: PublicProfileOperatorCatalogProfile,
    catalog: PublicProfileOperatorCatalogInput,
    profileHrefPrefix = '/perfil',
): PublicOperatorCatalog {
    const provider: PublicOperatorProviderSummary = {
        profileId: profile.id,
        name: profile.name,
        slug: profile.username,
        profileHref: `${profileHrefPrefix}/${profile.username}`,
        city: profile.city,
        region: profile.region,
        coverImageUrl: profile.coverImageUrl ?? null,
        avatarImageUrl: profile.avatarImageUrl,
    };

    const attachProvider = (item: PublicProfileOperatorCatalogInput['services'][number]): PublicOperatorServiceItem => ({
        ...item,
        isActive: item.isActive ?? true,
        position: item.position ?? 0,
        provider,
    });

    return {
        services: catalog.services.map(attachProvider),
        packs: catalog.packs.map((item) => ({
            ...item,
            isActive: item.isActive ?? true,
            position: item.position ?? 0,
            provider,
        })),
        promotions: catalog.promotions.map((item) => ({
            ...item,
            isActive: item.isActive ?? true,
            position: item.position ?? 0,
            provider,
        })),
    };
}

export function isPublicProfileOperatorCatalogEmpty(catalog: {
    services: readonly unknown[];
    packs: readonly unknown[];
    promotions: readonly unknown[];
}) {
    return catalog.services.length + catalog.packs.length + catalog.promotions.length === 0;
}
