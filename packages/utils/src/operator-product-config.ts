import type { PublicProfileVertical } from './public-profile-settings.js';
import type { PublicOperatorProviderSummary } from './operator-service-config.js';
import { validateOperatorPromoPrice } from './operator-service-config.js';

export type OperatorProductCategoryId =
    | 'interior'
    | 'exterior'
    | 'stickers'
    | 'protection'
    | 'lighting'
    | 'audio'
    | 'tools'
    | 'other';

export type OperatorProductRecord = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    category: OperatorProductCategoryId | string;
    price: string;
    promoPrice: string | null;
    currency: string;
    stock: number | null;
    sku: string | null;
    isActive: boolean;
    position: number;
};

export type PublicOperatorProductItem = OperatorProductRecord & {
    provider: PublicOperatorProviderSummary;
};

const AUTOS_PRODUCT_CATEGORIES: Array<{ id: OperatorProductCategoryId; label: string }> = [
    { id: 'interior', label: 'Interior y confort' },
    { id: 'exterior', label: 'Exterior y estética' },
    { id: 'stickers', label: 'Stickers y gráfica' },
    { id: 'protection', label: 'Protección (zócalos, films)' },
    { id: 'lighting', label: 'Iluminación' },
    { id: 'audio', label: 'Audio y multimedia' },
    { id: 'tools', label: 'Herramientas y mantención' },
    { id: 'other', label: 'Otros' },
];

const PROPIEDADES_PRODUCT_CATEGORIES: Array<{ id: OperatorProductCategoryId; label: string }> = [
    { id: 'interior', label: 'Interior' },
    { id: 'exterior', label: 'Exterior y jardín' },
    { id: 'tools', label: 'Herramientas' },
    { id: 'other', label: 'Otros' },
];

export function getOperatorProductCategories(vertical: PublicProfileVertical) {
    return vertical === 'propiedades' ? PROPIEDADES_PRODUCT_CATEGORIES : AUTOS_PRODUCT_CATEGORIES;
}

export function resolveOperatorProductCategoryLabel(vertical: PublicProfileVertical, category: string) {
    return getOperatorProductCategories(vertical).find((item) => item.id === category)?.label ?? category;
}

export function formatOperatorProductPrice(input: {
    price: string | null;
    promoPrice?: string | null;
    currency?: string;
}) {
    const value = input.promoPrice ?? input.price;
    if (!value) return 'Consultar precio';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return value;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: input.currency ?? 'CLP',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function validateOperatorProductPromoPrice(
    price: string | number | null | undefined,
    promoPrice: string | number | null | undefined,
) {
    return validateOperatorPromoPrice(price, promoPrice);
}

export type PublicProfileOperatorProductsInput = {
    products: Array<Omit<OperatorProductRecord, 'isActive' | 'position'> & Partial<Pick<OperatorProductRecord, 'isActive' | 'position'>>>;
};

export type PublicProfileOperatorProductsProfile = {
    id: string;
    name: string;
    username: string;
    city: string | null;
    region: string | null;
    coverImageUrl?: string | null;
    avatarImageUrl: string | null;
};

export function mapPublicProfileOperatorProducts(
    profile: PublicProfileOperatorProductsProfile,
    products: PublicProfileOperatorProductsInput['products'],
    profileHrefPrefix = '/perfil',
): PublicOperatorProductItem[] {
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

    return products.map((item) => ({
        ...item,
        isActive: item.isActive ?? true,
        position: item.position ?? 0,
        provider,
    }));
}

export function isPublicProfileOperatorProductsEmpty(products: readonly unknown[]) {
    return products.length === 0;
}
