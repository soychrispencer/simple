export type SimpleAppId =
    | 'simpleautos'
    | 'simplepropiedades'
    | 'simpleadmin'
    | 'simpleplataforma'
    | 'simpleagenda';

// ─────────────────────────────────────────────────────────────────────────────
// Storage Provider (abstraction layer for file uploads)
// ─────────────────────────────────────────────────────────────────────────────

export type StorageFileType = 'image' | 'video' | 'document';

export type StorageUploadInput = {
    file: any; // Can be File (browser) or Buffer (Node.js)
    fileName: string;
    mimeType: string;
    fileType: StorageFileType;
    userId: string;
    listingId?: string;
};

export type StorageUploadResult = {
    fileId: string;
    url: string;
    publicUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: number;
};

export interface StorageProvider {
    /**
     * Upload a file to storage
     */
    upload(input: StorageUploadInput): Promise<StorageUploadResult>;

    /**
     * Delete a file from storage
     */
    delete(fileId: string): Promise<void>;

    /**
     * Get a public URL for a file
     */
    getUrl(fileId: string): string;

    /**
     * Verify storage is accessible
     */
    health(): Promise<boolean>;
}

export type SimpleAppBrand = {
    id: SimpleAppId;
    name: string;
    shortName: string;
    title: string;
    description: string;
    category: string;
    siteUrl: string;
    keywords: string[];
    accentLight: string;
    accentDark: string;
};

export type PublicationLifecycleState =
    | 'active'
    | 'paused'
    | 'closed'
    | 'review_required'
    | 'review_expired';

export type PublicationLifecycleStep =
    | 'sale'
    | 'rent'
    | 'auction'
    | 'project';

export type PublicationLifecyclePolicy = {
    appId: Extract<SimpleAppId, 'simpleautos' | 'simplepropiedades'>;
    operationType: PublicationLifecycleStep;
    initialStatus: 'active';
    reviewIntervalDays: number | null;
    reviewGraceDays: number | null;
    summaryLabel: string;
    notice: string;
    states: Array<{
        id: PublicationLifecycleState;
        label: string;
        description: string;
    }>;
};

export type PublicationLifecycleView = {
    state: PublicationLifecycleState;
    label: string;
    description: string;
    nextReviewAt: number | null;
    reviewRequiredAt: number | null;
    reviewExpiredAt: number | null;
};

const SHARED_THEME = {
    locale: 'es_CL',
    backgroundColorLight: '#fafafa',
    backgroundColorDark: '#111111',
    surfaceLight: '#ffffff',
    surfaceDark: '#1a1a1a',
    foregroundLight: '#09090b',
    foregroundDark: '#fafafa',
    themeColor: '#111111',
    generator: 'Simple V2',
} as const;

const SIMPLE_APP_BRANDS: Record<SimpleAppId, SimpleAppBrand> = {
    simpleautos: {
        id: 'simpleautos',
        name: 'SimpleAutos',
        shortName: 'SimpleAutos',
        title: 'SimpleAutos | Marketplace de Vehículos en Chile',
        description: 'SimpleAutos simplifica la compra, venta y arriendo de vehículos en Chile.',
        category: 'automotive',
        siteUrl: 'http://localhost:3000',
        keywords: ['SimpleAutos', 'autos', 'vehículos', 'Chile', 'compra', 'venta', 'arriendo', 'subastas'],
        accentLight: '#ff3600',
        accentDark: '#ff3600',
    },
    simplepropiedades: {
        id: 'simplepropiedades',
        name: 'SimplePropiedades',
        shortName: 'SimplePropiedades',
        title: 'SimplePropiedades | Marketplace Inmobiliario en Chile',
        description: 'SimplePropiedades simplifica la compra, venta y arriendo de propiedades en Chile.',
        category: 'real_estate',
        siteUrl: 'http://localhost:3001',
        keywords: ['SimplePropiedades', 'propiedades', 'inmobiliaria', 'Chile', 'compra', 'venta', 'arriendo', 'proyectos'],
        accentLight: '#3232FF',
        accentDark: '#3232FF',
    },
    simpleadmin: {
        id: 'simpleadmin',
        name: 'SimpleAdmin',
        shortName: 'SimpleAdmin',
        title: 'SimpleAdmin | Panel de administración',
        description: 'SimpleAdmin centraliza la administración del ecosistema Simple.',
        category: 'business',
        siteUrl: 'http://localhost:3002',
        keywords: ['SimpleAdmin', 'admin', 'panel', 'moderación', 'ecosistema', 'Simple'],
        accentLight: '#111111',
        accentDark: '#ffffff',
    },
    simpleplataforma: {
        id: 'simpleplataforma',
        name: 'SimplePlataforma',
        shortName: 'SimplePlataforma',
        title: 'SimplePlataforma | Ecosistema de Marketplaces',
        description: 'SimplePlataforma conecta todos los marketplaces de Chile. Autos, propiedades, tiendas y más.',
        category: 'business',
        siteUrl: 'http://localhost:3003',
        keywords: ['SimplePlataforma', 'ecosistema', 'marketplaces', 'Chile', 'autos', 'propiedades', 'tiendas'],
        accentLight: '#111111',
        accentDark: '#ffffff',
    },
    simpleagenda: {
        id: 'simpleagenda',
        name: 'SimpleAgenda',
        shortName: 'SimpleAgenda',
        title: 'SimpleAgenda | Agenda y Gestión de Citas en Chile',
        description: 'SimpleAgenda simplifica la gestión de citas, pacientes y pagos para profesionales independientes en Chile.',
        category: 'business',
        siteUrl: 'http://localhost:3004',
        keywords: ['SimpleAgenda', 'agenda', 'citas', 'psicología', 'salud', 'Chile', 'reservas', 'consultas'],
        accentLight: '#0D9488',
        accentDark: '#0D9488',
    },
};

const PUBLICATION_LIFECYCLE_STATES: PublicationLifecyclePolicy['states'] = [
    {
        id: 'active',
        label: 'Activo',
        description: 'Visible y recibiendo contactos.',
    },
    {
        id: 'paused',
        label: 'Pausado',
        description: 'Oculto temporalmente hasta que lo reanudes.',
    },
    {
        id: 'closed',
        label: 'Cerrado',
        description: 'Dejó de estar disponible por venta, arriendo o cierre manual.',
    },
    {
        id: 'review_required',
        label: 'Requiere renovación',
        description: 'Debe confirmar vigencia o refrescar datos antes de seguir expuesto con normalidad.',
    },
    {
        id: 'review_expired',
        label: 'Vencido por revisión',
        description: 'Se despublica hasta que el aviso se actualice o confirme vigencia.',
    },
];

const PUBLICATION_LIFECYCLE_RULES: Record<`${Extract<SimpleAppId, 'simpleautos' | 'simplepropiedades'>}:${PublicationLifecycleStep}`, Omit<PublicationLifecyclePolicy, 'states'>> = {
    'simpleautos:sale': {
        appId: 'simpleautos',
        operationType: 'sale',
        initialStatus: 'active',
        reviewIntervalDays: 60,
        reviewGraceDays: 15,
        summaryLabel: 'Revisión cada 60 días',
        notice: 'El aviso quedará activo por defecto. Revisaremos su vigencia cada 60 días y, si hace falta renovarlo, te avisaremos antes de despublicarlo.',
    },
    'simpleautos:rent': {
        appId: 'simpleautos',
        operationType: 'rent',
        initialStatus: 'active',
        reviewIntervalDays: 60,
        reviewGraceDays: 15,
        summaryLabel: 'Revisión cada 60 días',
        notice: 'El aviso quedará activo por defecto. Revisaremos su vigencia cada 60 días y, si hace falta renovarlo, te avisaremos antes de despublicarlo.',
    },
    'simpleautos:auction': {
        appId: 'simpleautos',
        operationType: 'auction',
        initialStatus: 'active',
        reviewIntervalDays: null,
        reviewGraceDays: null,
        summaryLabel: 'Vigente hasta el cierre de la subasta',
        notice: 'La subasta quedará activa hasta su fecha de cierre o hasta que la pauses manualmente. No requiere revisión periódica mientras siga vigente.',
    },
    'simpleautos:project': {
        appId: 'simpleautos',
        operationType: 'project',
        initialStatus: 'active',
        reviewIntervalDays: 60,
        reviewGraceDays: 15,
        summaryLabel: 'Revisión cada 60 días',
        notice: 'El aviso quedará activo por defecto. Revisaremos su vigencia cada 60 días y, si hace falta renovarlo, te avisaremos antes de despublicarlo.',
    },
    'simplepropiedades:sale': {
        appId: 'simplepropiedades',
        operationType: 'sale',
        initialStatus: 'active',
        reviewIntervalDays: 90,
        reviewGraceDays: 15,
        summaryLabel: 'Revisión cada 90 días',
        notice: 'El aviso quedará activo por defecto. Revisaremos su vigencia cada 90 días y, si hace falta renovarlo, te avisaremos antes de despublicarlo.',
    },
    'simplepropiedades:rent': {
        appId: 'simplepropiedades',
        operationType: 'rent',
        initialStatus: 'active',
        reviewIntervalDays: 90,
        reviewGraceDays: 15,
        summaryLabel: 'Revisión cada 90 días',
        notice: 'El aviso quedará activo por defecto. Revisaremos su vigencia cada 90 días y, si hace falta renovarlo, te avisaremos antes de despublicarlo.',
    },
    'simplepropiedades:auction': {
        appId: 'simplepropiedades',
        operationType: 'auction',
        initialStatus: 'active',
        reviewIntervalDays: null,
        reviewGraceDays: null,
        summaryLabel: 'Vigente hasta el cierre de la subasta',
        notice: 'La subasta quedará activa hasta su fecha de cierre o hasta que la pauses manualmente. No requiere revisión periódica mientras siga vigente.',
    },
    'simplepropiedades:project': {
        appId: 'simplepropiedades',
        operationType: 'project',
        initialStatus: 'active',
        reviewIntervalDays: 120,
        reviewGraceDays: 30,
        summaryLabel: 'Revisión cada 120 días',
        notice: 'El proyecto quedará activo por defecto. Revisaremos su vigencia cada 120 días y, si hace falta renovar la información de entrega, unidades o rangos, te lo avisaremos antes de despublicarlo.',
    },
};

export function getSimpleAppBrand(appId: SimpleAppId): SimpleAppBrand {
    return SIMPLE_APP_BRANDS[appId];
}

export function getPublicationLifecyclePolicy(
    appId: Extract<SimpleAppId, 'simpleautos' | 'simplepropiedades'>,
    operationType: PublicationLifecycleStep
): PublicationLifecyclePolicy {
    const rule = PUBLICATION_LIFECYCLE_RULES[`${appId}:${operationType}`];

    if (!rule) {
        throw new Error(`Missing publication lifecycle policy for ${appId}:${operationType}`);
    }

    return {
        ...rule,
        states: PUBLICATION_LIFECYCLE_STATES,
    };
}

export function evaluatePublicationLifecycle(
    policy: PublicationLifecyclePolicy,
    status: 'draft' | 'active' | 'paused' | 'sold' | 'archived' | 'closed',
    updatedAt: number
): PublicationLifecycleView {
    const activeState = policy.states.find((item) => item.id === 'active')!;
    const pausedState = policy.states.find((item) => item.id === 'paused')!;
    const closedState = policy.states.find((item) => item.id === 'closed')!;
    const reviewRequiredState = policy.states.find((item) => item.id === 'review_required')!;
    const reviewExpiredState = policy.states.find((item) => item.id === 'review_expired')!;

    if (status === 'paused') {
        return {
            state: 'paused',
            label: pausedState.label,
            description: pausedState.description,
            nextReviewAt: null,
            reviewRequiredAt: null,
            reviewExpiredAt: null,
        };
    }

    if (status === 'sold' || status === 'archived' || status === 'closed') {
        return {
            state: 'closed',
            label: closedState.label,
            description: closedState.description,
            nextReviewAt: null,
            reviewRequiredAt: null,
            reviewExpiredAt: null,
        };
    }

    if (!policy.reviewIntervalDays) {
        return {
            state: 'active',
            label: activeState.label,
            description: activeState.description,
            nextReviewAt: null,
            reviewRequiredAt: null,
            reviewExpiredAt: null,
        };
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const reviewRequiredAt = updatedAt + policy.reviewIntervalDays * dayMs;
    const reviewExpiredAt = reviewRequiredAt + (policy.reviewGraceDays ?? 0) * dayMs;
    const now = Date.now();

    if (now >= reviewExpiredAt) {
        return {
            state: 'review_expired',
            label: reviewExpiredState.label,
            description: reviewExpiredState.description,
            nextReviewAt: null,
            reviewRequiredAt,
            reviewExpiredAt,
        };
    }

    if (now >= reviewRequiredAt) {
        return {
            state: 'review_required',
            label: reviewRequiredState.label,
            description: reviewRequiredState.description,
            nextReviewAt: null,
            reviewRequiredAt,
            reviewExpiredAt,
        };
    }

    return {
        state: 'active',
        label: activeState.label,
        description: activeState.description,
        nextReviewAt: reviewRequiredAt,
        reviewRequiredAt,
        reviewExpiredAt,
    };
}

export function buildSimpleAppMetadata(appId: SimpleAppId) {
    const brand = getSimpleAppBrand(appId);

    return {
        metadataBase: new URL(brand.siteUrl),
        title: brand.title,
        description: brand.description,
        applicationName: brand.name,
        generator: SHARED_THEME.generator,
        keywords: brand.keywords,
        category: brand.category,
        alternates: {
            canonical: '/',
        },
        openGraph: {
            type: 'website',
            locale: SHARED_THEME.locale,
            url: brand.siteUrl,
            siteName: brand.name,
            title: brand.title,
            description: brand.description,
            images: [
                {
                    url: `${brand.siteUrl}/icon`,
                    width: 512,
                    height: 512,
                    alt: `${brand.name} icon`,
                },
            ],
        },
        twitter: {
            card: 'summary',
            title: brand.title,
            description: brand.description,
            images: [`${brand.siteUrl}/icon`],
        },
        appleWebApp: {
            capable: true,
            statusBarStyle: 'default' as const,
            title: brand.name,
        },
        icons: {
            icon: [
                { url: '/icon', type: 'image/png', sizes: '512x512' },
            ],
            apple: [
                { url: '/apple-icon', type: 'image/png', sizes: '180x180' },
            ],
            shortcut: ['/icon'],
        },
        manifest: '/manifest.webmanifest',
    };
}

export function buildSimpleAppManifest(appId: SimpleAppId) {
    const brand = getSimpleAppBrand(appId);

    return {
        name: brand.name,
        short_name: brand.shortName,
        description: brand.description,
        start_url: '/',
        scope: '/',
        display: 'browser' as const,
        lang: 'es-CL',
        background_color: SHARED_THEME.backgroundColorLight,
        theme_color: SHARED_THEME.themeColor,
        icons: [
            {
                src: '/icon',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any' as const,
            },
            {
                src: '/apple-icon',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    };
}

export function getSimpleBrandIconTokens(appId: SimpleAppId) {
    const brand = getSimpleAppBrand(appId);

    return {
        canvas: SHARED_THEME.backgroundColorLight,
        tile: SHARED_THEME.foregroundLight,
        glyph: SHARED_THEME.surfaceLight,
        accent: brand.accentLight,
        ring: '#e7e5e4',
    };
}
