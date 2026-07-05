/** Pasos estándar del wizard de publicación (alineado con @simple/utils STANDARD_MARKETPLACE_PUBLISH_STEPS). */
export const PROPERTY_PUBLISH_STEPS = [
    { id: 'media' as const, label: 'Multimedia', helper: 'Fotos y video' },
    { id: 'details' as const, label: 'Detalles', helper: 'Atributos y precio' },
    { id: 'publish' as const, label: 'Publicar', helper: 'Ubicación y revisión' },
];

export type PropertyPublishStepId = (typeof PROPERTY_PUBLISH_STEPS)[number]['id'];
