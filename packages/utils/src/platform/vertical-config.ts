/** Platform core: verticals activate capabilities; core never hardcodes app names in new publish logic. */

export type PlatformCapability =
    | 'publications'
    | 'crm'
    | 'messages'
    | 'valuation'
    | 'boost'
    | 'calendar'
    | 'booking'
    | 'payments'
    | 'availability';

/** Tipo de publicación (UI: “¿Qué quieres publicar?”). */
export type PublishType = 'sale' | 'rent' | 'auction' | 'project' | 'service' | 'product';

export type VerticalId = 'autos' | 'propiedades' | 'agenda' | 'serenatas';

export type VerticalConfig = {
    id: VerticalId;
    name: string;
    publishTypes: readonly PublishType[];
    capabilities: readonly PlatformCapability[];
};

export const VERTICAL_CONFIGS: Record<'autos' | 'propiedades', VerticalConfig> = {
    autos: {
        id: 'autos',
        name: 'SimpleAutos',
        publishTypes: ['sale', 'rent', 'auction', 'service', 'product'],
        capabilities: ['publications', 'crm', 'messages', 'valuation', 'boost'],
    },
    propiedades: {
        id: 'propiedades',
        name: 'SimplePropiedades',
        publishTypes: ['sale', 'rent', 'project', 'service', 'product'],
        capabilities: ['publications', 'crm', 'messages', 'valuation', 'boost'],
    },
};

/** Norte (aún no cableado en apps): */
export const VERTICAL_CONFIG_NORTH: Record<'agenda' | 'serenatas', VerticalConfig> = {
    agenda: {
        id: 'agenda',
        name: 'SimpleAgenda',
        publishTypes: ['service'],
        capabilities: ['publications', 'calendar', 'booking', 'crm', 'payments', 'messages'],
    },
    serenatas: {
        id: 'serenatas',
        name: 'SimpleSerenatas',
        publishTypes: ['service', 'product'],
        capabilities: ['publications', 'calendar', 'payments', 'messages', 'availability'],
    },
};

export function getVerticalConfig(verticalId: 'autos' | 'propiedades'): VerticalConfig {
    return VERTICAL_CONFIGS[verticalId];
}

export function verticalSupportsPublishType(verticalId: 'autos' | 'propiedades', type: PublishType): boolean {
    return getVerticalConfig(verticalId).publishTypes.includes(type);
}

export function verticalHasCapability(verticalId: 'autos' | 'propiedades', capability: PlatformCapability): boolean {
    return getVerticalConfig(verticalId).capabilities.includes(capability);
}

export function isCatalogPublishType(type: PublishType): boolean {
    return type === 'service' || type === 'product';
}

export function isListingPublishType(type: PublishType): boolean {
    return type === 'sale' || type === 'rent' || type === 'auction' || type === 'project';
}
