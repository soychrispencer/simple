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
    | 'essential-watermark'
    | 'professional-centered'
    | 'signature-complete'
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

// Branding de plataforma - presente pero nunca dominante
const PLATFORM_BRAND = {
    name: 'SimpleAutos',
    tagline: 'Publicado vía',
    watermarkOpacity: 0.4,
};

// Paletas de colores por estrategia de template
const COLOR_PALETTES = {
    // Essential: Minimalista, neutro, no compite con el vehículo
    essential: {
        primary: '#1a1a1a',
        secondary: '#f5f5f5',
        accent: '#333333',
        background: '#ffffff',
        surface: '#fafafa',
        textPrimary: '#1a1a1a',
        textSecondary: '#666666',
        textInverse: '#ffffff',
    },
    // Professional: Corporativo, balanceado, confiable
    professional: {
        primary: '#1e3a5f',
        secondary: '#ffffff',
        accent: '#e74c3c',
        background: '#ffffff',
        surface: '#f8f9fa',
        textPrimary: '#1e3a5f',
        textSecondary: '#5a6c7d',
        textInverse: '#ffffff',
    },
    // Signature: Premium, elegante, posicionamiento alto
    signature: {
        primary: '#0d1b2a',
        secondary: '#1b263b',
        accent: '#c9a227',
        background: '#ffffff',
        surface: '#f0f2f5',
        textPrimary: '#0d1b2a',
        textSecondary: '#415a77',
        textInverse: '#ffffff',
    },
};

// Template 1: ESSENTIAL - Marca de agua mínima, para vendedores individuales
// Concepto: El vehículo es el protagonista, branding sutil no invasivo
const createEssentialTemplate = (listing: ListingData): InstagramTemplateView => ({
    id: 'essential-watermark',
    name: 'Essential',
    category: 'auto',
    style: 'minimal',
    layout: 'single',
    layoutVariant: 'square',
    overlayVariant: 'essential-watermark',
    colors: COLOR_PALETTES.essential,
    branding: {
        appName: PLATFORM_BRAND.name,
        badgeText: '', // Sin badge - solo marca de agua visual
    },
    eyebrow: listing.year ? `${listing.year}` : '',
    title: listing.title,
    headline: listing.priceLabel || 'Consultar',
    subtitle: listing.brand && listing.model ? `${listing.brand} ${listing.model}` : undefined,
    locationLabel: listing.location,
    highlights: listing.features?.slice(0, 2) ?? [], // Mínimo destacados
    priceLabel: listing.priceLabel || 'Consultar precio',
    ctaLabel: '', // Sin CTA visible - el vehículo habla por sí solo
    score: 90,
});

// Template 2: PROFESSIONAL - Información centrada, para concesionarias medianas
// Concepto: Balance perfecto entre información y estética
const createProfessionalTemplate = (listing: ListingData): InstagramTemplateView => ({
    id: 'professional-centered',
    name: 'Professional',
    category: 'auto',
    style: 'modern',
    layout: 'single',
    layoutVariant: 'square',
    overlayVariant: 'professional-centered',
    colors: COLOR_PALETTES.professional,
    branding: {
        appName: PLATFORM_BRAND.name,
        badgeText: '', // Sin badge amateur
    },
    eyebrow: listing.brand && listing.model 
        ? `${listing.brand} ${listing.model}` 
        : (listing.year ? `${listing.year}` : ''),
    title: listing.title,
    headline: listing.priceLabel || 'Consultar',
    subtitle: listing.condition && listing.mileageLabel 
        ? `${listing.condition} • ${listing.mileageLabel}` 
        : listing.condition,
    locationLabel: listing.location,
    highlights: listing.features?.slice(0, 3) ?? [],
    priceLabel: listing.priceLabel || 'Consultar precio',
    ctaLabel: 'Ver detalles →',
    score: 95,
});

// Template 3: SIGNATURE - Diseño completo premium, para grandes concesionarias
// Concepto: Presencia fuerte de marca, posicionamiento premium
const createSignatureTemplate = (listing: ListingData): InstagramTemplateView => ({
    id: 'signature-complete',
    name: 'Signature',
    category: 'auto',
    style: 'luxury',
    layout: 'single',
    layoutVariant: 'square',
    overlayVariant: 'signature-complete',
    colors: COLOR_PALETTES.signature,
    branding: {
        appName: PLATFORM_BRAND.name,
        badgeText: '', // Sin badge - el diseño habla por sí solo
    },
    eyebrow: listing.brand || 'Vehículo Destacado',
    title: listing.title,
    headline: listing.priceLabel || 'Consultar',
    subtitle: [
        listing.year,
        listing.condition,
        listing.mileageLabel,
        listing.fuelType,
    ].filter(Boolean).join(' • '),
    locationLabel: listing.location,
    highlights: listing.features?.slice(0, 4) ?? [],
    priceLabel: listing.priceLabel || 'Consultar precio',
    ctaLabel: listing.financingAvailable ? 'Financiamiento disponible' : 'Ver en SimpleAutos',
    score: 92,
});

// Función principal para generar templates
export function generateSmartTemplates(listing: ListingData): {
    recommendedTemplate: InstagramTemplateView;
    alternatives: InstagramTemplateView[];
} {
    const templates = [
        createEssentialTemplate(listing),
        createProfessionalTemplate(listing),
        createSignatureTemplate(listing),
    ];

    return {
        recommendedTemplate: templates[1], // Professional como default
        alternatives: [templates[0], templates[2]],
    };
}

// Función para obtener templates disponibles
export const getAvailableTemplates = (): InstagramTemplateView[] => {
    const mockListing: ListingData = {
        id: 'mock',
        vertical: 'autos',
        title: 'Toyota Corolla 2023',
        price: 18500000,
        priceLabel: '$18.500.000',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        condition: 'Semi-nuevo',
        mileageLabel: '45.000 km',
        fuelType: 'Nafta',
        features: ['Aire acondicionado', 'Bluetooth', 'Cámara de retro', 'Control crucero'],
    };

    return [
        createEssentialTemplate(mockListing),
        createProfessionalTemplate(mockListing),
        createSignatureTemplate(mockListing),
    ];
};

// Función para analizar listing y determinar mejor template
export const analyzeListingForTemplate = (listing: ListingData): InstagramOverlayVariant => {
    // Estrategia: Recomendar según perfil del vendedor
    // Nota: En el futuro esto podría usar el perfil del usuario para decidir
    
    // Si es un vehículo premium o con muchos features → Signature
    if ((listing.price && listing.price > 50000000) || 
        (listing.features && listing.features.length >= 5)) {
        return 'signature-complete';
    }
    
    // Si tiene información completa (marca, modelo, año, km) → Professional
    if (listing.brand && listing.model && listing.year && listing.mileageLabel) {
        return 'professional-centered';
    }
    
    // Default: Essential (limpio, minimalista)
    return 'essential-watermark';
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
