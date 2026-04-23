export interface ListingData {
    id: string;
    vertical: 'autos' | 'propiedades' | 'agenda' | 'serenatas';
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
    // Property-specific fields
    propertyType?: string;
    rooms?: number;
    bathrooms?: number;
    surfaceLabel?: string;
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
    offerPriceLabel?: string;
    discountLabel?: string;
    locationLabel?: string;
    highlights?: string[];
    badges?: string[];
    priceLabel: string;
    ctaLabel: string;
    score: number;
}

// Branding de plataforma - presente pero nunca dominante
function getPlatformBrand(vertical: string) {
    if (vertical === 'propiedades') {
        return { name: 'SimplePropiedades', appId: 'simplepropiedades' as const, tagline: 'Publicado vía', watermarkOpacity: 0.4 };
    }
    return { name: 'SimpleAutos', appId: 'simpleautos' as const, tagline: 'Publicado vía', watermarkOpacity: 0.4 };
}

// Paletas de colores - Solo negro, blanco, grises y color principal del branding
const COLOR_PALETTES = {
    // Essential: Puro blanco y negro, sin color
    essential: {
        primary: '#111111',
        secondary: '#f5f5f5',
        accent: '#111111',
        background: '#ffffff',
        surface: '#fafafa',
        textPrimary: '#111111',
        textSecondary: '#888888',
        textInverse: '#ffffff',
    },
    // Professional: Blanco, negro con gris medio
    professional: {
        primary: '#1a1a1a',
        secondary: '#ffffff',
        accent: '#1a1a1a',
        background: '#ffffff',
        surface: '#f5f5f5',
        textPrimary: '#1a1a1a',
        textSecondary: '#777777',
        textInverse: '#ffffff',
    },
    // Signature: Negro profundo, blanco, gris oscuro
    signature: {
        primary: '#0a0a0a',
        secondary: '#1a1a1a',
        accent: '#ffffff',
        background: '#0a0a0a',
        surface: '#1a1a1a',
        textPrimary: '#ffffff',
        textSecondary: '#999999',
        textInverse: '#0a0a0a',
    },
};

// Función helper: construir highlights según vertical
function buildVerticalHighlights(listing: ListingData): string[] {
    const items: string[] = [];
    const sectionLabel = sectionToSpanish(listing.section);
    if (sectionLabel) items.push(sectionLabel);

    if (listing.vertical === 'propiedades') {
        if (listing.propertyType) items.push(listing.propertyType);
        if (listing.rooms != null) items.push(`${listing.rooms} Dorm.`);
        if (listing.bathrooms != null) items.push(`${listing.bathrooms} Baños`);
        if (listing.surfaceLabel) items.push(listing.surfaceLabel);
    } else {
        if (listing.condition) items.push(listing.condition);
        if (listing.mileageLabel) items.push(listing.mileageLabel);
        if (listing.fuelType) items.push(listing.fuelType);
    }
    return items;
}

// Template 1: BÁSICO - Solo marca de agua centrada, sin información
// Concepto: La propiedad/vehículo es el protagonista absoluto
const createBasicoTemplate = (listing: ListingData): InstagramTemplateView => {
    const brand = getPlatformBrand(listing.vertical);
    return {
        id: 'essential-watermark',
        name: 'Básico',
        category: listing.vertical === 'propiedades' ? 'propiedad' : 'auto',
        style: 'minimal',
        layout: 'single',
        layoutVariant: 'portrait',
        overlayVariant: 'essential-watermark',
        colors: COLOR_PALETTES.essential,
        branding: {
            appName: brand.name,
            badgeText: '',
            appId: brand.appId,
        },
        eyebrow: '',
        title: '',
        headline: '',
        subtitle: undefined,
        locationLabel: undefined,
        highlights: [],
        badges: [],
        priceLabel: '',
        ctaLabel: '',
        score: 85,
    };
};

// Template 2: PROFESIONAL - Información centrada, card con todos los datos relevantes
// Concepto: Balance perfecto entre información y estética
function sectionToSpanish(section?: string): string | undefined {
    if (!section) return undefined;
    const map: Record<string, string> = { sale: 'Venta', rent: 'Arriendo', auction: 'Subasta', project: 'Proyecto' };
    return map[section.toLowerCase()] || section;
}

const createProfesionalTemplate = (listing: ListingData): InstagramTemplateView => {
    const brand = getPlatformBrand(listing.vertical);
    const infoItems = buildVerticalHighlights(listing);

    // Badges: conversable, financiamiento, permuta
    const badgeItems: string[] = [];
    if (listing.negotiable) badgeItems.push('Conversable');
    if (listing.financingAvailable) badgeItems.push('Financiamiento');
    if (listing.exchangeAvailable) badgeItems.push('Permuta');

    return {
        id: 'professional-centered',
        name: 'Profesional',
        category: listing.vertical === 'propiedades' ? 'propiedad' : 'auto',
        style: 'modern',
        layout: 'single',
        layoutVariant: 'portrait',
        overlayVariant: 'professional-centered',
        colors: COLOR_PALETTES.professional,
        branding: {
            appName: brand.name,
            badgeText: '',
            appId: brand.appId,
        },
        eyebrow: '',
        title: listing.title,
        headline: listing.priceLabel || 'Consultar',
        subtitle: undefined,
        locationLabel: listing.location,
        highlights: infoItems,
        badges: badgeItems,
        priceLabel: listing.priceLabel || 'Consultar precio',
        offerPriceLabel: listing.offerPriceLabel,
        discountLabel: listing.discountLabel,
        ctaLabel: '',
        score: 95,
    };
};

// Template 3: PREMIUM - Diseño completo premium, presencia fuerte
// Concepto: Información exclusiva, posicionamiento alto
const createPremiumTemplate = (listing: ListingData): InstagramTemplateView => {
    const brand = getPlatformBrand(listing.vertical);
    const highlights = buildVerticalHighlights(listing);

    // Badges premium
    const badgeItems: string[] = [];
    if (listing.negotiable) badgeItems.push('Conversable');
    if (listing.financingAvailable) badgeItems.push('Financiamiento');
    if (listing.exchangeAvailable) badgeItems.push('Permuta');

    return {
        id: 'signature-complete',
        name: 'Premium',
        category: listing.vertical === 'propiedades' ? 'propiedad' : 'auto',
        style: 'luxury',
        layout: 'single',
        layoutVariant: 'portrait',
        overlayVariant: 'signature-complete',
        colors: COLOR_PALETTES.signature,
        branding: {
            appName: brand.name,
            badgeText: '',
            appId: brand.appId,
        },
        eyebrow: '',
        title: listing.title,
        headline: listing.priceLabel || 'Consultar',
        subtitle: listing.location || undefined,
        locationLabel: listing.location,
        highlights,
        badges: badgeItems,
        priceLabel: listing.priceLabel || 'Consultar precio',
        offerPriceLabel: listing.offerPriceLabel,
        discountLabel: listing.discountLabel,
        ctaLabel: '',
        score: 92,
    };
};

// Función principal para generar templates
export function generateSmartTemplates(listing: ListingData): {
    recommendedTemplate: InstagramTemplateView;
    alternatives: InstagramTemplateView[];
} {
    const templates = [
        createBasicoTemplate(listing),
        createProfesionalTemplate(listing),
        createPremiumTemplate(listing),
    ];

    return {
        recommendedTemplate: templates[1], // Profesional como default
        alternatives: [templates[0], templates[2]], // Básico, Premium
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
        createBasicoTemplate(mockListing),
        createProfesionalTemplate(mockListing),
        createPremiumTemplate(mockListing),
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
