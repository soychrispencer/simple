export const SIMPLE_PUBLISH_STEPS = [
    { key: 'media', label: 'Multimedia', helper: 'Fotos y video' },
    { key: 'details', label: 'Detalles', helper: 'Datos esenciales' },
    { key: 'publish', label: 'Publicar', helper: 'Ubicación y revisión' },
] as const;

export const SIMPLE_PUBLISH_AUTOS_STEPS = [
    { key: '1', label: 'Multimedia', helper: 'Fotos y video' },
    { key: '2', label: 'Detalles', helper: 'Vehículo y precio' },
    { key: '3', label: 'Publicar', helper: 'Ubicación y revisión' },
] as const;

export const SIMPLE_PUBLISH_MIN_DESCRIPTION_LENGTH = 40;

export const SIMPLE_PUBLISH_INTEGRATIONS_CONNECT_HREF = '/panel/mi-cuenta/integraciones';
