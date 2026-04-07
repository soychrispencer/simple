import { getSimpleAppBrand } from '@simple/config';

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
    | 'auto-performance'
    | 'auto-spec'
    | 'auto-premium'
    | 'property-editorial'
    | 'property-project'
    | 'property-conversion';

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
        textInverse: string;
    };
    score: number;
    adaptations: {
        colors: boolean;
        layout: boolean;
        content: boolean;
    };
    branding: {
        appId: 'simpleautos' | 'simplepropiedades';
        appName: string;
        badgeText: string;
    };
    eyebrow: string;
    headline: string;
    priceLabel: string;
    locationLabel: string;
    highlights: string[];
    ctaLabel: string;
}

export interface InstagramTemplate extends InstagramTemplateView {}

export interface SmartTemplateConfig {
    template: InstagramTemplate;
    adaptations: {
        colors: boolean;
        layout: boolean;
        content: boolean;
    };
    score: number;
}

function normalizeLocation(value?: string): string {
    return value?.trim() || 'Chile';
}

function clampTemplateText(value: string | undefined, maxLength: number, fallback: string): string {
    const normalized = value?.replace(/\s+/g, ' ').trim() || fallback;
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeTemplateHighlights(values: string[]): string[] {
    return values
        .filter(Boolean)
        .map((value) => clampTemplateText(value, 18, value))
        .slice(0, 4);
}

function normalizePrice(listing: ListingData): string {
    if (listing.priceLabel?.trim()) return listing.priceLabel.trim();
    if (typeof listing.price === 'number' && Number.isFinite(listing.price)) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(listing.price);
    }
    return 'Consultar precio';
}

function buildAutosHighlights(listing: ListingData): string[] {
    return [
        listing.discountLabel,
        listing.mileageLabel,
        listing.transmission,
        listing.fuelType,
    ].filter(Boolean) as string[];
}

function buildAutosCommercialLabel(listing: ListingData): string {
    const conditions = [
        listing.negotiable ? 'Negociable' : '',
        listing.financingAvailable ? 'Financiamiento' : '',
        listing.exchangeAvailable ? 'Permuta' : '',
    ].filter(Boolean);

    if (conditions.length === 0) return 'Coordina visita';
    return clampTemplateText(conditions.join(' · '), 28, 'Coordina visita');
}

function buildPropertyHighlights(listing: ListingData): string[] {
    const summary = listing.summary?.filter(Boolean) ?? [];
    const fallback = [listing.category ?? '', listing.condition ?? '', ...(listing.features ?? [])];
    return [...summary, ...fallback].filter(Boolean).slice(0, 4);
}

function buildAutosTemplates(listing: ListingData): InstagramTemplate[] {
    const brand = getSimpleAppBrand('simpleautos');
    const modelLabel = clampTemplateText([listing.brand, listing.model].filter(Boolean).join(' ').trim() || listing.title, 34, 'Vehiculo destacado');
    const priceLabel = normalizePrice(listing);
    const locationLabel = normalizeLocation(listing.location);
    const highlights = normalizeTemplateHighlights(buildAutosHighlights(listing));
    const commercialLabel = buildAutosCommercialLabel(listing);
    const badgeText = listing.discountLabel ?? 'DESTACADO';

    return [
        {
            id: 'auto-performance-square',
            name: 'Performance',
            category: 'auto',
            style: 'sport',
            layout: 'single',
            layoutVariant: 'square',
            overlayVariant: 'auto-performance',
            colors: {
                primary: '#111111',
                secondary: '#F5F2EB',
                accent: brand.accentLight,
                background: '#0F0F10',
                surface: 'rgba(17,17,17,0.78)',
                textPrimary: '#111111',
                textInverse: '#FFFFFF',
            },
            score: 92,
            adaptations: { colors: true, layout: true, content: true },
            branding: {
                appId: 'simpleautos',
                appName: brand.shortName,
                badgeText,
            },
            eyebrow: clampTemplateText(listing.condition?.toUpperCase() || listing.category?.toUpperCase(), 22, 'DISPONIBLE'),
            headline: modelLabel,
            priceLabel,
            locationLabel: clampTemplateText(locationLabel, 28, 'Chile'),
            highlights,
            ctaLabel: commercialLabel,
        },
        {
            id: 'auto-spec-square',
            name: 'Ficha Tecnica',
            category: 'auto',
            style: 'classic',
            layout: 'single',
            layoutVariant: 'square',
            overlayVariant: 'auto-spec',
            colors: {
                primary: '#F5F2EB',
                secondary: '#111111',
                accent: brand.accentLight,
                background: '#FFFFFF',
                surface: 'rgba(245,242,235,0.9)',
                textPrimary: '#111111',
                textInverse: '#FFFFFF',
            },
            score: 86,
            adaptations: { colors: true, layout: false, content: true },
            branding: {
                appId: 'simpleautos',
                appName: brand.shortName,
                badgeText,
            },
            eyebrow: clampTemplateText(listing.category?.toUpperCase(), 22, 'DETALLES CLAVE'),
            headline: clampTemplateText(listing.title, 34, 'Vehiculo disponible'),
            priceLabel,
            locationLabel: clampTemplateText(locationLabel, 28, 'Chile'),
            highlights,
            ctaLabel: commercialLabel,
        },
        {
            id: 'auto-premium-square',
            name: 'Premium',
            category: 'auto',
            style: 'luxury',
            layout: 'single',
            layoutVariant: 'square',
            overlayVariant: 'auto-premium',
            colors: {
                primary: '#111111',
                secondary: '#1F2937',
                accent: brand.accentLight,
                background: '#111111',
                surface: 'rgba(17,17,17,0.68)',
                textPrimary: '#111111',
                textInverse: '#FFFFFF',
            },
            score: listing.price && listing.price > 35000000 ? 90 : 80,
            adaptations: { colors: true, layout: false, content: true },
            branding: {
                appId: 'simpleautos',
                appName: brand.shortName,
                badgeText,
            },
            eyebrow: clampTemplateText(listing.discountLabel ? 'PRECIO AJUSTADO' : (listing.condition?.toUpperCase() || 'DESTACADO'), 22, 'DESTACADO'),
            headline: modelLabel,
            priceLabel,
            locationLabel: clampTemplateText(locationLabel, 28, 'Chile'),
            highlights,
            ctaLabel: commercialLabel,
        },
    ];
}

function buildPropertyTemplates(listing: ListingData): InstagramTemplate[] {
    const brand = getSimpleAppBrand('simplepropiedades');
    const priceLabel = normalizePrice(listing);
    const locationLabel = normalizeLocation(listing.location);
    const highlights = normalizeTemplateHighlights(buildPropertyHighlights(listing));
    const isProject = listing.section === 'project';
    const isRent = listing.section === 'rent';
    const headline = clampTemplateText(listing.title, 42, 'Propiedad destacada');

    return [
        {
            id: 'property-editorial-portrait',
            name: 'Editorial',
            category: 'propiedad',
            style: 'modern',
            layout: 'single',
            layoutVariant: 'portrait',
            overlayVariant: 'property-editorial',
            colors: {
                primary: '#0B1020',
                secondary: '#111111',
                accent: brand.accentLight,
                background: '#F5F7FF',
                surface: 'rgba(11,16,32,0.72)',
                textPrimary: '#0B1020',
                textInverse: '#FFFFFF',
            },
            score: isProject ? 82 : 90,
            adaptations: { colors: true, layout: true, content: true },
            branding: {
                appId: 'simplepropiedades',
                appName: brand.shortName,
                badgeText: 'DESTACADO',
            },
            eyebrow: isRent ? 'ARRIENDO DISPONIBLE' : 'PROPIEDAD EN VENTA',
            headline,
            priceLabel,
            locationLabel: clampTemplateText(locationLabel, 30, 'Chile'),
            highlights,
            ctaLabel: 'Solicita visita',
        },
        {
            id: 'property-project-portrait',
            name: 'Proyecto',
            category: 'propiedad',
            style: 'luxury',
            layout: 'single',
            layoutVariant: 'portrait',
            overlayVariant: 'property-project',
            colors: {
                primary: '#111111',
                secondary: '#0B1020',
                accent: brand.accentLight,
                background: '#111111',
                surface: 'rgba(17,17,17,0.72)',
                textPrimary: '#111111',
                textInverse: '#FFFFFF',
            },
            score: isProject ? 95 : 84,
            adaptations: { colors: true, layout: true, content: true },
            branding: {
                appId: 'simplepropiedades',
                appName: brand.shortName,
                badgeText: 'PROYECTO',
            },
            eyebrow: isProject ? 'PROYECTO EN VENTA' : 'OPORTUNIDAD',
            headline,
            priceLabel,
            locationLabel: clampTemplateText(locationLabel, 30, 'Chile'),
            highlights,
            ctaLabel: 'Conoce las unidades',
        },
        {
            id: 'property-conversion-portrait',
            name: 'Conversion',
            category: 'propiedad',
            style: 'minimal',
            layout: 'single',
            layoutVariant: 'portrait',
            overlayVariant: 'property-conversion',
            colors: {
                primary: '#FFFFFF',
                secondary: '#0B1020',
                accent: brand.accentLight,
                background: '#FFFFFF',
                surface: 'rgba(255,255,255,0.88)',
                textPrimary: '#0B1020',
                textInverse: '#FFFFFF',
            },
            score: isRent ? 91 : 83,
            adaptations: { colors: true, layout: true, content: true },
            branding: {
                appId: 'simplepropiedades',
                appName: brand.shortName,
                badgeText: isRent ? 'ARRIENDO' : 'VENTA',
            },
            eyebrow: isRent ? 'LISTA PARA ARRENDAR' : 'LISTA PARA HABITAR',
            headline,
            priceLabel,
            locationLabel: clampTemplateText(locationLabel, 30, 'Chile'),
            highlights,
            ctaLabel: 'Recibe informacion',
        },
    ];
}

function buildTemplates(listing: ListingData): InstagramTemplate[] {
    if (listing.vertical === 'autos') return buildAutosTemplates(listing);
    if (listing.vertical === 'propiedades') return buildPropertyTemplates(listing);
    return [];
}

function scoreTemplate(template: InstagramTemplate, listing: ListingData): number {
    let score = template.score;

    if (listing.vertical === 'autos') {
        if (template.overlayVariant === 'auto-premium' && (listing.price ?? 0) > 35000000) score += 8;
        if (template.overlayVariant === 'auto-spec' && (listing.summary?.length ?? 0) >= 3) score += 6;
    }

    if (listing.vertical === 'propiedades') {
        if (listing.section === 'project' && template.overlayVariant === 'property-project') score += 10;
        if (listing.section === 'rent' && template.overlayVariant === 'property-conversion') score += 8;
        if (listing.section === 'sale' && template.overlayVariant === 'property-editorial') score += 6;
    }

    return Math.min(score, 100);
}

export function analyzeListingForTemplate(listing: ListingData): SmartTemplateConfig[] {
    return buildTemplates(listing)
        .map((template) => ({
            template: {
                ...template,
                score: scoreTemplate(template, listing),
            },
            adaptations: template.adaptations,
            score: scoreTemplate(template, listing),
        }))
        .sort((a, b) => b.score - a.score);
}

export function generateFinalTemplate(config: SmartTemplateConfig, listing: ListingData): InstagramTemplate {
    return {
        ...config.template,
        headline: config.template.headline || listing.title,
        priceLabel: config.template.priceLabel || normalizePrice(listing),
        locationLabel: config.template.locationLabel || normalizeLocation(listing.location),
        highlights: config.template.highlights.length > 0
            ? config.template.highlights
            : listing.summary?.slice(0, 4) ?? [],
        score: config.score,
    };
}

export function getAvailableTemplates(category: InstagramTemplateCategory): InstagramTemplate[] {
    const listing: ListingData =
        category === 'auto'
            ? { id: 'sample-auto', vertical: 'autos', title: 'Demo Auto' }
            : { id: 'sample-property', vertical: 'propiedades', title: 'Demo Propiedad' };

    return buildTemplates(listing).filter((template) => template.category === category);
}

export function generateSmartTemplates(listing: ListingData): {
    recommendedTemplate: InstagramTemplateView;
    alternatives: InstagramTemplateView[];
    adaptations: {
        colors: boolean;
        layout: boolean;
        content: boolean;
    };
    score: number;
} {
    const configs = analyzeListingForTemplate(listing);
    const best = configs[0];

    if (!best) {
        throw new Error('No se encontraron templates compatibles para esta vertical.');
    }

    const recommendedTemplate = generateFinalTemplate(best, listing);
    const alternatives = configs.slice(1, 3).map((config) => generateFinalTemplate(config, listing));

    return {
        recommendedTemplate,
        alternatives,
        adaptations: best.adaptations,
        score: best.score,
    };
}
