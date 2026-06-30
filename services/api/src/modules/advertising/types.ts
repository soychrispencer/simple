// Advertising types and constants
export type AdFormat = 'hero' | 'card' | 'inline';
export type AdDurationDays = 7 | 15 | 30;
export type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'proyectos' | 'subastas';
export type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
export type AdOverlayAlign = 'left' | 'center' | 'right';

export type PaymentOrderStatus = 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';

export type VerticalType = 'autos' | 'propiedades' | 'agenda' | 'serenatas' | 'plataforma';

export type AdCampaignRecord = {
    id: string;
    accountId?: string | null;
    userId: string;
    vertical: VerticalType;
    name: string;
    format: AdFormat;
    status: AdStatus;
    paymentStatus: AdPaymentStatus;
    destinationType: AdDestinationType;
    destinationUrl: string | null;
    listingHref: string | null;
    profileSlug: string | null;
    desktopImageDataUrl: string;
    mobileImageDataUrl: string | null;
    overlayEnabled: boolean;
    overlayTitle: string | null;
    overlaySubtitle: string | null;
    overlayCta: string | null;
    overlayAlign: AdOverlayAlign;
    placementSection: AdPlacementSection | null;
    startAt: number;
    endAt: number;
    durationDays: AdDurationDays;
    paidAt: number | null;
    createdAt: number;
    updatedAt: number;
};

export type SubscriptionPlanRecord = {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    currency: string;
    maxListings: number;
    maxFeaturedListings: number;
    maxImagesPerListing: number;
    analyticsEnabled: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    maxFreeBoostsPerMonth: number;
    recommended?: boolean;
    features: string[];
};

// Constants
export const AD_FORMAT_LABELS: Record<AdFormat, string> = {
    hero: 'Hero principal',
    card: 'Card destacada',
    inline: 'Banner inline',
};

export const MAX_CAMPAIGNS_TOTAL = 10;
export const MAX_ACTIVE_HERO_CAMPAIGNS = 5;

export const AD_PRICING_BY_VERTICAL: Record<VerticalType, Record<AdFormat, Record<AdDurationDays, number>>> = {
    autos: {
        hero: { 7: 29990, 15: 49990, 30: 79990 },
        card: { 7: 9990, 15: 14990, 30: 24990 },
        inline: { 7: 4990, 15: 9990, 30: 14990 },
    },
    propiedades: {
        hero: { 7: 29990, 15: 49990, 30: 79990 },
        card: { 7: 9990, 15: 14990, 30: 24990 },
        inline: { 7: 4990, 15: 9990, 30: 14990 },
    },
    agenda: {
        hero: { 7: 0, 15: 0, 30: 0 },
        card: { 7: 0, 15: 0, 30: 0 },
        inline: { 7: 0, 15: 0, 30: 0 },
    },
    serenatas: {
        hero: { 7: 0, 15: 0, 30: 0 },
        card: { 7: 0, 15: 0, 30: 0 },
        inline: { 7: 0, 15: 0, 30: 0 },
    },
    plataforma: {
        hero: { 7: 0, 15: 0, 30: 0 },
        card: { 7: 0, 15: 0, 30: 0 },
        inline: { 7: 0, 15: 0, 30: 0 },
    },
};

export const SUBSCRIPTION_PLANS_BY_VERTICAL: Record<VerticalType, SubscriptionPlanRecord[]> = {
    autos: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Plan base para comenzar a publicar vehículos.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 3,
            maxFeaturedListings: 0,
            maxImagesPerListing: 5,
            analyticsEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['3 publicaciones activas', '5 fotos por aviso', 'Soporte básico'],
        },
        {
            id: 'pro',
            name: 'Profesional',
            description: 'Para equipos comerciales con operación diaria.',
            priceMonthly: 39990,
            currency: 'CLP',
            maxListings: 50,
            maxFeaturedListings: 5,
            maxImagesPerListing: 20,
            analyticsEnabled: true,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 3,
            features: ['50 publicaciones activas', '20 fotos por aviso', 'Analytics básico', 'Soporte prioritario'],
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Para grandes operaciones con necesidades avanzadas.',
            priceMonthly: 99990,
            currency: 'CLP',
            maxListings: -1, // ilimitado
            maxFeaturedListings: -1,
            maxImagesPerListing: 50,
            analyticsEnabled: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            maxFreeBoostsPerMonth: -1,
            features: ['Publicaciones ilimitadas', '50 fotos por aviso', 'Analytics avanzado', 'API access', 'Branding personalizado', 'Soporte dedicado'],
        },
    ],
    propiedades: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Plan base para comenzar a publicar propiedades.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 3,
            maxFeaturedListings: 0,
            maxImagesPerListing: 5,
            analyticsEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['3 publicaciones activas', '5 fotos por aviso', 'Soporte básico'],
        },
        {
            id: 'pro',
            name: 'Profesional',
            description: 'Para inmobiliarias con operación diaria.',
            priceMonthly: 39990,
            currency: 'CLP',
            maxListings: 50,
            maxFeaturedListings: 5,
            maxImagesPerListing: 20,
            analyticsEnabled: true,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 3,
            features: ['50 publicaciones activas', '20 fotos por aviso', 'Analytics básico', 'Soporte prioritario'],
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Para grandes operaciones inmobiliarias.',
            priceMonthly: 99990,
            currency: 'CLP',
            maxListings: -1,
            maxFeaturedListings: -1,
            maxImagesPerListing: 50,
            analyticsEnabled: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            maxFreeBoostsPerMonth: -1,
            features: ['Publicaciones ilimitadas', '50 fotos por aviso', 'Analytics avanzado', 'API access', 'Branding personalizado', 'Soporte dedicado'],
        },
    ],
    agenda: [
        {
            id: 'free',
            name: 'Prueba completa',
            description: '30 días con todas las funciones para configurar tu agenda y validar el flujo.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 0,
            maxFeaturedListings: 0,
            maxImagesPerListing: 0,
            analyticsEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['30 días de acceso completo', 'Perfil, servicios y agenda', 'Reservas, clientes y pagos', 'Recordatorios y reportes', 'Sin comisión por reserva'],
        },
        {
            id: 'pro',
            name: 'Pro',
            description: 'Para profesionales y equipos con operación diaria.',
            priceMonthly: 19990,
            currency: 'CLP',
            maxListings: 0,
            maxFeaturedListings: 0,
            maxImagesPerListing: 0,
            analyticsEnabled: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            maxFreeBoostsPerMonth: 0,
            recommended: true,
            features: ['Perfil público activo', 'Marketplace y link de reservas', 'Agenda avanzada', 'Clientes, historial y notas', 'Pagos, packs y promociones', 'Recordatorios avanzados', 'Reportes, NPS y referidos', 'Automatización y múltiples ubicaciones', 'Sin comisión por reserva'],
        },
    ],
    serenatas: [
        {
            id: 'free',
            name: 'Prueba gratis',
            description: '30 días para configurar tu perfil, probar el panel y recibir solicitudes sin comisión.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 0,
            maxFeaturedListings: 0,
            maxImagesPerListing: 0,
            analyticsEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: ['30 días de prueba', 'Crear cuenta y perfil', 'Configurar negocio y servicios', 'Probar solicitudes, agenda y disponibilidad', 'Sin comisión por serenata'],
        },
        {
            id: 'pro',
            name: 'Pro',
            description: 'Opera tu grupo completo: solicitudes, agenda, músicos, finanzas y WhatsApp.',
            priceMonthly: 19990,
            currency: 'CLP',
            maxListings: 0,
            maxFeaturedListings: 0,
            maxImagesPerListing: 0,
            analyticsEnabled: true,
            prioritySupport: true,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            recommended: true,
            features: ['Perfil público activo', 'Marketplace y WhatsApp visible', 'Servicios y repertorio completos', 'Solicitudes y agenda avanzada', 'Invitaciones y gestión de músicos', 'Finanzas y pagos a músicos', 'Chat WhatsApp desde panel', 'Mapa y rutas', 'Mayor visibilidad', 'Sin comisión por serenata'],
        },
    ],
    plataforma: [
        {
            id: 'free',
            name: 'Gratuito',
            description: 'Plan base para plataforma.',
            priceMonthly: 0,
            currency: 'CLP',
            maxListings: 0,
            maxFeaturedListings: 0,
            maxImagesPerListing: 0,
            analyticsEnabled: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            maxFreeBoostsPerMonth: 0,
            features: [],
        },
    ],
};
