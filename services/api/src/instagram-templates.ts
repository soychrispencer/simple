export interface ListingData {
    id: string;
    vertical: 'autos' | 'propiedades' | 'agenda';
    title: string;
    price?: number;
    offerPrice?: number;
    priceLabel?: string;
    offerPriceLabel?: string;
    discountLabel?: string;
    brand?: string;
    model?: string;
    year?: number;
    category?: string;
    condition?: string;
    mileageKm?: number;
    mileageLabel?: string;
    fuelType?: string;
    transmission?: string;
    negotiable?: boolean;
    financingAvailable?: boolean;
    exchangeAvailable?: boolean;
    features?: string[];
    images?: Array<{ url: string }>;
    location?: string;
    description?: string;
    section?: string;
    summary?: string[];
}

export type InstagramTemplateCategory = 'auto' | 'propiedad' | 'agenda';
export type InstagramTemplateStyle = 'modern' | 'classic' | 'sport' | 'luxury' | 'minimal';
export type InstagramLayout = 'carousel' | 'single' | 'story';
export type InstagramLayoutVariant = 'square' | 'portrait';
export type InstagramOverlayVariant =
    | 'minimalista-centrado'
    | 'premium-corporativo'
    | 'dinamico-moderno'
    | 'auto-spec'
    | 'auto-focal'
    | 'auto-titan'
    | 'auto-studio'
    | 'auto-clean'
    | 'auto-watermark'
    | 'property-conversion'
    | 'property-project';

export interface InstagramTemplateView {
    id: string;
    name: string;
    category: InstagramTemplateCategory;
    style: InstagramTemplateStyle;
    layout: InstagramLayout;
    layoutVariant: InstagramLayoutVariant;
    overlayVariant: InstagramOverlayVariant;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        textPrimary: string;
        textSecondary: string;
        textInverse: string;
    };
    branding: {
        appName: string;
        badgeText: string;
        logoUrl?: string;
        appId?: 'simpleautos' | 'simplepropiedades';
    };
    eyebrow: string;
    title: string;
    headline?: string;
    subtitle?: string;
    locationLabel?: string;
    highlights?: string[];
    priceLabel: string;
    ctaLabel: string;
    score: number;
}

// Simplificando para evitar dependencias externas problemáticas
const BRAND = {
    name: 'SimpleAutos',
    logoUrl: undefined,
};

// Paletas de colores modernas y coherentes
const COLOR_PALETTES = {
    minimalista: {
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#000000',
        background: '#ffffff',
        surface: '#f8f9fa',
        textPrimary: '#000000',
        textSecondary: '#6c757d',
        textInverse: '#ffffff',
    },
    premium: {
        primary: '#1a1a1a',
        secondary: '#2c3e50',
        accent: '#3498db',
        background: '#ffffff',
        surface: '#ecf0f1',
        textPrimary: '#2c3e50',
        textSecondary: '#7f8c8d',
        textInverse: '#ffffff',
    },
    dinamico: {
        primary: '#ff6b6b',
        secondary: '#4ecdc4',
        accent: '#45b7d1',
        background: '#ffffff',
        surface: '#f8f9fa',
        textPrimary: '#2c3e50',
        textSecondary: '#6c757d',
        textInverse: '#ffffff',
    },
};

// Template 1: Minimalista Centrado
const createMinimalistaTemplate = (listing: ListingData): InstagramTemplateView => ({
    id: 'minimalista-centrado',
    name: 'Minimalista Centrado',
    category: 'auto',
    style: 'minimal',
    layout: 'single',
    layoutVariant: 'square',
    overlayVariant: 'minimalista-centrado',
    colors: COLOR_PALETTES.minimalista,
    branding: {
        appName: BRAND.name,
        badgeText: 'SIMPLE',
    },
    eyebrow: 'EXCLUSIVO',
    title: listing.title,
    headline: listing.title,
    subtitle: listing.brand && listing.model ? `${listing.brand} ${listing.model}` : undefined,
    locationLabel: listing.location,
    highlights: listing.features?.slice(0, 4) ?? [],
    priceLabel: listing.priceLabel || '$0',
    ctaLabel: 'Ver detalles',
    score: 95,
});

// Template 2: Premium Corporativo
const createPremiumTemplate = (listing: ListingData): InstagramTemplateView => ({
    id: 'premium-corporativo',
    name: 'Premium Corporativo',
    category: 'auto',
    style: 'luxury',
    layout: 'single',
    layoutVariant: 'square',
    overlayVariant: 'premium-corporativo',
    colors: COLOR_PALETTES.premium,
    branding: {
        appName: BRAND.name,
        badgeText: 'PREMIUM',
    },
    eyebrow: 'ALTA GAMA',
    title: listing.title,
    headline: listing.title,
    subtitle: listing.brand && listing.model ? `${listing.brand} ${listing.model}` : undefined,
    locationLabel: listing.location,
    highlights: listing.features?.slice(0, 4) ?? [],
    priceLabel: listing.priceLabel || '$0',
    ctaLabel: 'Consultar',
    score: 90,
});

// Template 3: Dinámico Moderno
const createDinamicoTemplate = (listing: ListingData): InstagramTemplateView => ({
    id: 'dinamico-moderno',
    name: 'Dinámico Moderno',
    category: 'auto',
    style: 'modern',
    layout: 'single',
    layoutVariant: 'square',
    overlayVariant: 'dinamico-moderno',
    colors: COLOR_PALETTES.dinamico,
    branding: {
        appName: BRAND.name,
        badgeText: 'MODERNO',
    },
    eyebrow: 'TENDENCIA',
    title: listing.title,
    headline: listing.title,
    subtitle: listing.brand && listing.model ? `${listing.brand} ${listing.model}` : undefined,
    locationLabel: listing.location,
    highlights: listing.features?.slice(0, 4) ?? [],
    priceLabel: listing.priceLabel || '$0',
    ctaLabel: 'Descubrir',
    score: 92,
});

// Función principal para generar templates
export function generateSmartTemplates(listing: ListingData): {
    recommendedTemplate: InstagramTemplateView;
    alternatives: InstagramTemplateView[];
} {
    const templates = [
        createMinimalistaTemplate(listing),
        createPremiumTemplate(listing),
        createDinamicoTemplate(listing),
    ];

    return {
        recommendedTemplate: templates[0],
        alternatives: templates.slice(1),
    };
}

// Función para obtener templates disponibles
export const getAvailableTemplates = (): InstagramTemplateView[] => {
    const mockListing: ListingData = {
        id: 'mock',
        vertical: 'autos',
        title: 'Vehículo Ejemplo',
        price: 25000,
        priceLabel: '$25,000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
    };

    return [
        createMinimalistaTemplate(mockListing),
        createPremiumTemplate(mockListing),
        createDinamicoTemplate(mockListing),
    ];
};

// Función para analizar listing y determinar mejor template
export const analyzeListingForTemplate = (listing: ListingData): InstagramOverlayVariant => {
    // Lógica simple para determinar el mejor template
    if (listing.price && listing.price > 50000) {
        return 'premium-corporativo';
    }
    if (listing.category?.includes('Deportivo') || listing.category?.includes('Sport')) {
        return 'dinamico-moderno';
    }
    return 'minimalista-centrado';
};

// Exportar funciones de utilidad
export const normalizeLocation = (location?: string): string => {
    if (!location) return '';
    return location.trim();
};

export const normalizePrice = (price?: number): string => {
    if (!price) return '$0';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};
