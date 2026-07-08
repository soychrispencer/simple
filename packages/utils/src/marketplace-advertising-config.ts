import type { MarketplaceAdFormat } from './marketplace-pricing.js';
import type { BoostTargetType } from './boost.js';

export type AdvertisingVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type { BoostTargetType };

export type VerticalAdvertisingConfig = {
    vertical: AdvertisingVertical;
    boostTargetType: BoostTargetType;
    boostSections: Array<{ id: string; label: string; href?: string }>;
    adInlinePlacements: Array<{ id: string; label: string }>;
    adFormats: MarketplaceAdFormat[];
    copy: {
        pageTitle: string;
        pageDescription: string;
        boostTabLabel: string;
        campaignsTabLabel: string;
        boostActivateTitle: string;
        boostActivateDescription: string;
        boostTargetLabel: string;
        boostEmptyTargets: string;
        boostEmptyTargetsLink: string;
        profileDestinationLabel: string;
    };
};

const LISTING_SECTIONS_AUTOS = [
    { id: 'sale', label: 'Ventas', href: '/ventas' },
    { id: 'rent', label: 'Arriendos', href: '/arriendos' },
    { id: 'auction', label: 'Subastas', href: '/subastas' },
] as const;

const LISTING_SECTIONS_PROP = [
    { id: 'sale', label: 'Ventas', href: '/ventas' },
    { id: 'rent', label: 'Arriendos', href: '/arriendos' },
    { id: 'project', label: 'Proyectos', href: '/proyectos' },
] as const;

const OPERATOR_SECTIONS = [
    { id: 'marketplace', label: 'Directorio', href: undefined },
    { id: 'landing', label: 'Portada', href: undefined },
] as const;

export const MARKETPLACE_ADVERTISING_CONFIG: Record<AdvertisingVertical, VerticalAdvertisingConfig> = {
    autos: {
        vertical: 'autos',
        boostTargetType: 'listing',
        boostSections: [...LISTING_SECTIONS_AUTOS],
        adInlinePlacements: [
            { id: 'ventas', label: 'Ventas' },
            { id: 'arriendos', label: 'Arriendos' },
            { id: 'subastas', label: 'Subastas' },
        ],
        adFormats: ['hero', 'card', 'inline'],
        copy: {
            pageTitle: 'Publicidad',
            pageDescription: 'Gestiona campañas promocionales y boosts de publicaciones, productos y servicios.',
            boostTabLabel: 'Boost de avisos',
            campaignsTabLabel: 'Campañas',
            boostActivateTitle: 'Activar boost',
            boostActivateDescription: 'Destaca publicaciones, productos o servicios en su sección del directorio.',
            boostTargetLabel: 'Recurso',
            boostEmptyTargets: 'No tienes publicaciones, productos ni servicios activos para impulsar.',
            boostEmptyTargetsLink: '/panel/publicar',
            profileDestinationLabel: 'Perfil público',
        },
    },
    propiedades: {
        vertical: 'propiedades',
        boostTargetType: 'listing',
        boostSections: [...LISTING_SECTIONS_PROP],
        adInlinePlacements: [
            { id: 'ventas', label: 'Ventas' },
            { id: 'arriendos', label: 'Arriendos' },
            { id: 'proyectos', label: 'Proyectos' },
        ],
        adFormats: ['hero', 'card', 'inline'],
        copy: {
            pageTitle: 'Publicidad',
            pageDescription: 'Gestiona campañas promocionales y boosts de publicaciones, productos y servicios desde una sola sección.',
            boostTabLabel: 'Boost de avisos',
            campaignsTabLabel: 'Campañas',
            boostActivateTitle: 'Activar boost',
            boostActivateDescription: 'Destaca publicaciones, productos o servicios en su sección del directorio.',
            boostTargetLabel: 'Recurso',
            boostEmptyTargets: 'No tienes publicaciones, productos ni servicios activos para impulsar.',
            boostEmptyTargetsLink: '/panel/publicar',
            profileDestinationLabel: 'Perfil público',
        },
    },
    serenatas: {
        vertical: 'serenatas',
        boostTargetType: 'serenata_group',
        boostSections: [...OPERATOR_SECTIONS],
        adInlinePlacements: [
            { id: 'mariachis', label: 'Directorio mariachis' },
            { id: 'home', label: 'Portada' },
        ],
        adFormats: ['hero', 'card', 'inline'],
        copy: {
            pageTitle: 'Publicidad',
            pageDescription: 'Impulsa tu mariachi en el marketplace y lanza campañas para eventos y fechas especiales.',
            boostTabLabel: 'Boost de grupo',
            campaignsTabLabel: 'Campañas',
            boostActivateTitle: 'Activar boost',
            boostActivateDescription: 'Aparece primero cuando buscan mariachis en tu zona.',
            boostTargetLabel: 'Grupo mariachi',
            boostEmptyTargets: 'Publica tu grupo en el marketplace para poder impulsarlo.',
            boostEmptyTargetsLink: '/panel/mi-negocio',
            profileDestinationLabel: 'Perfil del grupo',
        },
    },
    agenda: {
        vertical: 'agenda',
        boostTargetType: 'operator_profile',
        boostSections: [...OPERATOR_SECTIONS],
        adInlinePlacements: [
            { id: 'professionals', label: 'Directorio profesionales' },
            { id: 'home', label: 'Portada' },
        ],
        adFormats: ['hero', 'card', 'inline'],
        copy: {
            pageTitle: 'Publicidad',
            pageDescription: 'Destaca tu perfil profesional y promociona servicios en el directorio de Agenda.',
            boostTabLabel: 'Boost de perfil',
            campaignsTabLabel: 'Campañas',
            boostActivateTitle: 'Activar boost',
            boostActivateDescription: 'Sube tu posición cuando pacientes buscan tu especialidad.',
            boostTargetLabel: 'Perfil profesional',
            boostEmptyTargets: 'Publica tu perfil en el directorio para poder impulsarlo.',
            boostEmptyTargetsLink: '/panel/mi-negocio',
            profileDestinationLabel: 'Perfil profesional',
        },
    },
};

export function getVerticalAdvertisingConfig(vertical: AdvertisingVertical): VerticalAdvertisingConfig {
    return MARKETPLACE_ADVERTISING_CONFIG[vertical];
}

export function isAdvertisingVertical(value: string): value is AdvertisingVertical {
    return value === 'autos' || value === 'propiedades' || value === 'agenda' || value === 'serenatas';
}
